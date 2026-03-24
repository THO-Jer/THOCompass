// api/_extract.js
// Extrae texto de archivos PDF, Excel y texto plano en el servidor.

export async function extractFileTexts(fileContents) {
  const results = [];

  for (const f of fileContents) {
    const name = f.name || "archivo";
    const ext  = name.split(".").pop().toLowerCase();

    // Texto plano (CSV, TXT, etc.) — ya viene como string
    if (f.content && !f.base64) {
      results.push({ name, text: f.content.slice(0, 15000), type: "text" });
      continue;
    }

    // PDF
    if (ext === "pdf" && f.base64) {
      const text = await extractPdf(f.base64, name);
      results.push({ name, text, type: "pdf" });
      continue;
    }

    // Excel / XLSX / XLS / ODS
    if (["xlsx","xls","ods"].includes(ext) && f.base64) {
      const text = await extractExcel(f.base64, name);
      results.push({ name, text, type: "excel" });
      continue;
    }

    // Fallback
    results.push({
      name,
      text: f.content?.slice(0, 15000) || `[Formato no soportado: ${ext}]`,
      type: "unknown",
    });
  }

  return results;
}

async function extractPdf(base64, name) {
  const buffer = Buffer.from(base64, "base64");

  // Strategy 1: pdf-parse (preferred)
  try {
    // Use require-style import for better Vercel compatibility
    let pdfParse;
    try {
      pdfParse = (await import("pdf-parse")).default;
    } catch {
      pdfParse = require("pdf-parse");
    }
    const parsed = await pdfParse(buffer, { max: 15 });
    const text = (parsed.text || "").trim();
    if (text.length > 50) return text.slice(0, 15000);
  } catch (e) {
    console.warn("pdf-parse failed:", e.message);
  }

  // Strategy 2: Extract raw text from PDF bytes (simple regex-based fallback)
  // PDFs store text in streams — we can pull out readable strings
  try {
    const raw = buffer.toString("binary");
    // Extract text between BT (begin text) and ET (end text) markers
    const textBlocks = [];
    const btEtRegex  = /BT[\s\S]*?ET/g;
    const tjRegex    = /\(([^)]+)\)\s*Tj/g;
    const arrayRegex = /\[([^\]]+)\]\s*TJ/g;

    let btMatch;
    while ((btMatch = btEtRegex.exec(raw)) !== null) {
      const block = btMatch[0];
      let m;
      while ((m = tjRegex.exec(block)) !== null) {
        textBlocks.push(m[1].replace(/\\n/g," ").replace(/\\/g,""));
      }
      while ((m = arrayRegex.exec(block)) !== null) {
        const parts = m[1].match(/\(([^)]*)\)/g) || [];
        textBlocks.push(parts.map(p=>p.slice(1,-1)).join(""));
      }
    }

    const extracted = textBlocks
      .filter(t => t.trim().length > 2)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 15000);

    if (extracted.length > 100) return extracted;
  } catch (e) {
    console.warn("PDF fallback failed:", e.message);
  }

  return `[PDF: "${name}" — no se pudo extraer texto. El PDF puede estar escaneado o protegido. Sube una versión en texto o CSV con los mismos datos.]`;
}

async function extractExcel(base64, name) {
  try {
    let XLSX;
    try {
      XLSX = (await import("xlsx")).default;
    } catch {
      XLSX = require("xlsx");
    }
    const buffer = Buffer.from(base64, "base64");
    const wb     = XLSX.read(buffer, { type:"buffer" });
    const parts  = [];
    for (const sheetName of wb.SheetNames.slice(0, 5)) {
      const ws  = wb.Sheets[sheetName];
      const csv = XLSX.utils.sheet_to_csv(ws, { blankrows:false });
      if (csv.trim()) parts.push(`## Hoja: ${sheetName}\n${csv.slice(0, 5000)}`);
    }
    const result = parts.join("\n\n").slice(0, 15000);
    return result || "[Excel vacío o sin datos]";
  } catch (e) {
    return `[Error extrayendo Excel: ${e.message}]`;
  }
}

export function formatFilesForPrompt(extractedFiles) {
  if (extractedFiles.length === 1) {
    return `### ${extractedFiles[0].name} (${extractedFiles[0].type})\n${extractedFiles[0].text}`;
  }
  return extractedFiles.map((f, i) =>
    `### FUENTE ${i + 1}: ${f.name} (${f.type})\n${f.text}`
  ).join("\n\n---\n\n");
}

export function buildProjectContext(ctx) {
  const parts = [];

  if (ctx.scoreHistory?.length > 0) {
    const hist = ctx.scoreHistory
      .slice(-5)
      .map(h => `  • ${h.method==="ai_analysis"?"Análisis IA":h.method==="baseline_instrument"?"Instrumento":"Manual"}: overall ${h.value_before??"—"} → ${h.value_after} (${new Date(h.created_at).toLocaleDateString("es-CL")})`)
      .join("\n");
    parts.push(`HISTORIAL DE CAMBIOS RECIENTES:\n${hist}`);
  }

  if (ctx.actors?.length > 0) {
    const actors = ctx.actors
      .slice(0, 10)
      .map(a => `  • ${a.name} [${a.actor_type||"sin tipo"}] — influencia: ${a.influence_level}, relación: ${a.relationship_status}`)
      .join("\n");
    parts.push(`ACTORES / STAKEHOLDERS REGISTRADOS:\n${actors}`);
  }

  if (ctx.commitments?.length > 0) {
    const comms = ctx.commitments
      .filter(c => !["completed","resolved","closed"].includes(c.status))
      .slice(0, 8)
      .map(c => `  • ${c.title} [${c.status}]${c.due_date?` — vence ${c.due_date}`:""}`)
      .join("\n");
    if (comms) parts.push(`COMPROMISOS ACTIVOS:\n${comms}`);
  }

  if (ctx.recentActivities?.length > 0) {
    const acts = ctx.recentActivities
      .slice(0, 5)
      .map(a => `  • ${a.activity_date}: ${a.title}${a.nps_score!=null?` (NPS ${a.nps_score})`:""}`)
      .join("\n");
    parts.push(`ACTIVIDADES RECIENTES:\n${acts}`);
  }

  return parts.length > 0
    ? `\n## CONTEXTO DEL PROYECTO\n${parts.join("\n\n")}\n`
    : "";
}

export function triangulationInstructions(fileCount) {
  if (fileCount <= 1) return "";
  return `
## INSTRUCCIÓN DE TRIANGULACIÓN
Hay ${fileCount} fuentes distintas. Antes de proponer scores:
1. Analiza cada fuente por separado e identifica qué dice sobre cada dimensión
2. Detecta CONSISTENCIA (fuentes que se confirman) o CONTRADICCIÓN (fuentes que discrepan)
3. Si hay contradicción, indica cuál fuente pesa más y por qué
4. El campo "reason" debe indicar si se basó en una sola fuente o en triangulación
`;
}
