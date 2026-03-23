// api/_extract.js
// Extrae texto de archivos PDF, Excel y texto plano en el servidor.
// Usado por analyze-rc.js, analyze-do.js y analyze-esg.js.

/**
 * Convierte un array de { name, content, mimeType, base64 } en texto extraído.
 * - PDF:   extrae texto con pdf-parse
 * - Excel: convierte hojas a CSV con xlsx
 * - Texto: usa content directamente (ya viene como string)
 * 
 * Devuelve array de { name, text, type }
 */
export async function extractFileTexts(fileContents) {
  const results = [];

  for (const f of fileContents) {
    const name = f.name || "archivo";
    const ext  = name.split(".").pop().toLowerCase();

    // Si ya viene como texto plano (CSV, TXT, etc.)
    if (f.content && !f.base64) {
      results.push({
        name,
        text: f.content.slice(0, 15000),
        type: "text",
      });
      continue;
    }

    // PDF — extraer texto en servidor
    if (ext === "pdf" && f.base64) {
      try {
        const pdfParse = (await import("pdf-parse/lib/pdf-parse.js")).default;
        const buffer   = Buffer.from(f.base64, "base64");
        const parsed   = await pdfParse(buffer, { max: 10 }); // max 10 pages
        const text     = parsed.text?.slice(0, 15000) || "[PDF sin texto extraíble]";
        results.push({ name, text, type: "pdf" });
      } catch (e) {
        results.push({ name, text: `[Error extrayendo PDF: ${e.message}]`, type: "pdf_error" });
      }
      continue;
    }

    // Excel / XLSX / XLS
    if (["xlsx","xls","ods"].includes(ext) && f.base64) {
      try {
        const XLSX   = (await import("xlsx")).default;
        const buffer = Buffer.from(f.base64, "base64");
        const wb     = XLSX.read(buffer, { type:"buffer" });
        const parts  = [];
        for (const sheetName of wb.SheetNames.slice(0, 5)) {
          const ws  = wb.Sheets[sheetName];
          const csv = XLSX.utils.sheet_to_csv(ws, { blankrows:false });
          if (csv.trim()) parts.push(`## Hoja: ${sheetName}\n${csv.slice(0, 5000)}`);
        }
        results.push({ name, text: parts.join("\n\n").slice(0, 15000) || "[Excel vacío]", type: "excel" });
      } catch (e) {
        results.push({ name, text: `[Error extrayendo Excel: ${e.message}]`, type: "excel_error" });
      }
      continue;
    }

    // Fallback: usar content como texto si existe, si no indicar que no se pudo
    results.push({
      name,
      text: f.content?.slice(0, 15000) || `[Formato no soportado: ${ext}]`,
      type: "unknown",
    });
  }

  return results;
}

/**
 * Formatea múltiples archivos para triangulación.
 * Si hay más de un archivo, los analiza separadamente antes de sintetizar.
 */
export function formatFilesForPrompt(extractedFiles) {
  if (extractedFiles.length === 1) {
    return `### ${extractedFiles[0].name} (${extractedFiles[0].type})\n${extractedFiles[0].text}`;
  }

  // Múltiples archivos: separar claramente para triangulación
  return extractedFiles.map((f, i) =>
    `### FUENTE ${i + 1}: ${f.name} (${f.type})\n${f.text}`
  ).join("\n\n---\n\n");
}

/**
 * Construye el bloque de contexto del proyecto (historial, actores, compromisos).
 * Se agrega al prompt para que el modelo tenga narrativa longitudinal.
 */
export function buildProjectContext(ctx) {
  const parts = [];

  if (ctx.scoreHistory?.length > 0) {
    const hist = ctx.scoreHistory
      .slice(-5) // últimos 5 cambios
      .map(h => `  • ${h.method === "ai_analysis" ? "Análisis IA" : h.method === "baseline_instrument" ? "Instrumento" : "Manual"}: overall ${h.value_before ?? "—"} → ${h.value_after} (${new Date(h.created_at).toLocaleDateString("es-CL")})`)
      .join("\n");
    parts.push(`HISTORIAL DE CAMBIOS RECIENTES:\n${hist}`);
  }

  if (ctx.actors?.length > 0) {
    const actors = ctx.actors
      .slice(0, 10)
      .map(a => `  • ${a.name} [${a.actor_type || "sin tipo"}] — influencia: ${a.influence_level}, relación: ${a.relationship_status}`)
      .join("\n");
    parts.push(`ACTORES / STAKEHOLDERS REGISTRADOS:\n${actors}`);
  }

  if (ctx.commitments?.length > 0) {
    const comms = ctx.commitments
      .filter(c => c.status !== "completed")
      .slice(0, 8)
      .map(c => `  • ${c.title} [${c.status}]${c.due_date ? ` — vence ${c.due_date}` : ""}`)
      .join("\n");
    if (comms) parts.push(`COMPROMISOS ACTIVOS:\n${comms}`);
  }

  if (ctx.recentActivities?.length > 0) {
    const acts = ctx.recentActivities
      .slice(0, 5)
      .map(a => `  • ${a.activity_date}: ${a.title}${a.nps_score != null ? ` (NPS ${a.nps_score})` : ""}`)
      .join("\n");
    parts.push(`ACTIVIDADES RECIENTES:\n${acts}`);
  }

  return parts.length > 0
    ? `\n## CONTEXTO DEL PROYECTO\n${parts.join("\n\n")}\n`
    : "";
}

/**
 * Instrucciones de triangulación para múltiples fuentes.
 */
export function triangulationInstructions(fileCount) {
  if (fileCount <= 1) return "";
  return `
## INSTRUCCIÓN DE TRIANGULACIÓN
Hay ${fileCount} fuentes distintas. Antes de proponer scores:
1. Analiza cada fuente por separado e identifica qué dice sobre cada dimensión
2. Detecta si hay CONSISTENCIA (fuentes que se confirman entre sí) o CONTRADICCIÓN (fuentes que dicen cosas distintas)
3. Si hay contradicción, explícita cuál fuente pesa más y por qué
4. El campo "reason" de cada dimensión debe indicar si se basó en una sola fuente o en triangulación
`;
}
