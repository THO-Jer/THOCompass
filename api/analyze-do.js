import { extractFileTexts, formatFilesForPrompt, buildProjectContext, triangulationInstructions } from "./_extract.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "ANTHROPIC_API_KEY no configurada" });

  const { fileContents, projectName, currentScores, projectContext } = req.body;
  if (!fileContents?.length) return res.status(400).json({ error: "No se enviaron archivos" });

  const extracted     = await extractFileTexts(fileContents);
  const filesText     = formatFilesForPrompt(extracted);
  const ctxBlock      = buildProjectContext(projectContext || {});
  const triangulation = triangulationInstructions(extracted.length);
  const scores        = currentScores || {};

  const prompt = `Eres un consultor experto en Desarrollo Organizacional (DO) y salud organizacional en Chile.

Analiza documentos reales y propón scores basados EXCLUSIVAMENTE en evidencia explícita del documento.

## PROYECTO: "${projectName}"
${ctxBlock}
## SCORES ACTUALES
- Cultura organizacional: ${scores.cultura ?? "sin medición previa"}
- Engagement y clima: ${scores.engagement ?? "sin medición previa"}
- Liderazgo: ${scores.liderazgo ?? "sin medición previa"}

## RÚBRICA

### Cultura organizacional (35%)
- 85-100: Valores vividos en práctica diaria, baja rotación, reconocimiento externo
- 70-84:  Cultura definida con brechas menores, mayoría adhiere a valores
- 50-69:  Cultura declarada débilmente practicada, brechas entre discurso y acción
- 30-49:  Cultura fragmentada, subculturas en conflicto
- 0-29:   Cultura tóxica, comportamientos contrarios a valores

### Engagement y clima (35%)
- 85-100: eNPS > 50, alta satisfacción, bajo ausentismo
- 70-84:  eNPS 20-50, satisfacción general positiva
- 50-69:  eNPS 0-20, satisfacción mixta, desmotivación en algunos segmentos
- 30-49:  eNPS negativo, quejas frecuentes, ausentismo elevado
- 0-29:   eNPS < -30, desvinculación activa, conflictos laborales

### Liderazgo (30%)
- 85-100: Líderes evaluados positivamente en 360°, alta confianza
- 70-84:  Liderazgo efectivo con oportunidades de mejora
- 50-69:  Liderazgo inconsistente, algunos jefes bien evaluados y otros con brechas
- 30-49:  Liderazgo cuestionado, baja confianza, decisiones percibidas como arbitrarias
- 0-29:   Liderazgo disfuncional, abuso de poder documentado
${triangulation}
## DOCUMENTOS
${filesText}

Responde ÚNICAMENTE con JSON válido:
{
  "summary": "Síntesis 2-3 oraciones",
  "insights": ["hallazgo con cita", "hallazgo 2", "hallazgo 3"],
  "source_consistency": "consistente|mixta|contradictoria",
  "proposed": {
    "cultura":    { "current": ${scores.cultura ?? null},    "proposed": <0-100 o null>, "reason": "Evidencia → rango" },
    "engagement": { "current": ${scores.engagement ?? null}, "proposed": <0-100 o null>, "reason": "Evidencia → rango" },
    "liderazgo":  { "current": ${scores.liderazgo ?? null},  "proposed": <0-100 o null>, "reason": "Evidencia → rango" }
  }
}`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method:"POST",
      headers:{ "Content-Type":"application/json","x-api-key":apiKey,"anthropic-version":"2023-06-01" },
      body: JSON.stringify({ model:"claude-haiku-4-5-20251001", max_tokens:1400,
        messages:[{ role:"user", content:prompt }] }),
    });
    if (!response.ok) return res.status(response.status).json({ error: await response.text() });
    const data  = await response.json();
    const clean = (data.content?.[0]?.text||"{}").replace(/```json|```/g,"").trim();
    try { return res.status(200).json(JSON.parse(clean)); }
    catch { return res.status(500).json({ error:"JSON inválido", raw:clean }); }
  } catch(err) { return res.status(500).json({ error:err.message }); }
}
