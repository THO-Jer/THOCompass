import { extractFileTexts, formatFilesForPrompt, buildProjectContext, triangulationInstructions } from "./_extract.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "ANTHROPIC_API_KEY no configurada" });

  const { fileContents, projectName, currentScores, currentMaturity, activePillars, projectContext } = req.body;
  if (!fileContents?.length) return res.status(400).json({ error: "No se enviaron archivos" });

  const extracted     = await extractFileTexts(fileContents);
  const filesText     = formatFilesForPrompt(extracted);
  const ctxBlock      = buildProjectContext(projectContext || {});
  const triangulation = triangulationInstructions(extracted.length);
  const scores        = currentScores   || {};
  const maturity      = currentMaturity || {};
  const pillars       = activePillars   || ["ambiental","social","gobernanza"];

  const prompt = `Eres un consultor experto en Sostenibilidad (ESG), estándares GRI y cumplimiento normativo en Chile.

Analiza documentos reales y propón actualizaciones basadas EXCLUSIVAMENTE en evidencia explícita.

## PROYECTO: "${projectName}"
Pilares activos: ${pillars.join(", ")}
${ctxBlock}
## SCORES Y MADUREZ ACTUALES
${pillars.map(k=>`- ${k}: score ${scores[k]??"sin medición"} | madurez ${maturity[k]??1}/5`).join("\n")}

## RÚBRICA DE SCORES (0-100)

### Ambiental
- 85-100: ISO 14001/50001, huella carbono medida y reducida, cero incidentes
- 70-84:  Cumplimiento normativo completo, métricas registradas, plan de reducción
- 50-69:  Cumplimiento básico, sin plan formal de reducción
- 30-49:  Incumplimientos menores, métricas incompletas
- 0-29:   Incumplimientos graves, multas, pasivos no gestionados

### Social
- 85-100: eNPS > 40, accidentes < 1%, Great Place to Work
- 70-84:  Indicadores laborales positivos, accidentes < 3%
- 50-69:  Cumplimiento básico, sin programas formales
- 30-49:  Conflictos laborales, accidentes > 5%
- 0-29:   Infracciones laborales, accidentes graves, litigios

### Gobernanza
- 85-100: Modelo prevención Ley 21.595 certificado, canal denuncias activo, reporte GRI verificado
- 70-84:  Modelo implementado, políticas anticorrupción, reporte sin verificación
- 50-69:  Políticas básicas, modelo en desarrollo, reporte parcial
- 30-49:  Sin modelo formal, políticas declarativas
- 0-29:   Investigaciones activas, incidentes documentados

## MADUREZ GRI (1-5)
1-Inicial | 2-Básico | 3-Definido | 4-Gestionado | 5-Optimizado
${triangulation}
## DOCUMENTOS
${filesText}

Responde ÚNICAMENTE con JSON válido:
{
  "detected_pillar": "<pilar más relevante>",
  "summary": "Síntesis 2-3 oraciones",
  "insights": ["hallazgo con cita", "hallazgo 2", "hallazgo 3"],
  "source_consistency": "consistente|mixta|contradictoria",
  "gri_updates": [
    { "id": "<GRI XXX>", "current": "<cumple|parcial|pendiente|no_aplica>", "proposed": "<cumple|parcial|pendiente|no_aplica>", "reason": "evidencia" }
  ],
  "proposed_scores": {
    ${pillars.map(k=>`"${k}": { "current": ${scores[k]??null}, "proposed": <0-100 o null>, "reason": "Evidencia → rango" }`).join(",\n    ")}
  },
  "proposed_maturity": {
    ${pillars.map(k=>`"${k}": { "current": ${maturity[k]??1}, "proposed": <1-5>, "reason": "Evidencia → nivel" }`).join(",\n    ")}
  }
}`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method:"POST",
      headers:{ "Content-Type":"application/json","x-api-key":apiKey,"anthropic-version":"2023-06-01" },
      body: JSON.stringify({ model:"claude-haiku-4-5-20251001", max_tokens:1800,
        messages:[{ role:"user", content:prompt }] }),
    });
    if (!response.ok) return res.status(response.status).json({ error: await response.text() });
    const data  = await response.json();
    const clean = (data.content?.[0]?.text||"{}").replace(/```json|```/g,"").trim();
    try { return res.status(200).json(JSON.parse(clean)); }
    catch { return res.status(500).json({ error:"JSON inválido", raw:clean }); }
  } catch(err) { return res.status(500).json({ error:err.message }); }
}
