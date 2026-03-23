// api/analyze-esg.js
// Vercel Serverless Function — análisis ESG con rúbrica anclada

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "ANTHROPIC_API_KEY no configurada" });

  const { fileContents, projectName, currentScores, currentMaturity, activePillars } = req.body;
  if (!fileContents?.length) return res.status(400).json({ error: "No se enviaron archivos" });

  const scores   = currentScores   || {};
  const maturity = currentMaturity || {};
  const pillars  = activePillars   || ["ambiental", "social", "gobernanza"];
  const filesText = fileContents
    .map(f => `### ${f.name}\n${f.content?.slice(0, 10000) || "[sin contenido]"}`)
    .join("\n\n");

  const prompt = `Eres un consultor experto en Sostenibilidad (ESG), estándares GRI y cumplimiento normativo en Chile.

Tu tarea es analizar documentos (reportes de sostenibilidad, auditorías, políticas, bases de datos de indicadores) y proponer actualizaciones basadas EXCLUSIVAMENTE en evidencia explícita del documento.

## PROYECTO
Nombre: "${projectName}"
Pilares activos: ${pillars.join(", ")}

## SCORES ACTUALES (línea base)
${pillars.map(k => `- ${k}: score ${scores[k] ?? "sin medición"} | madurez ${maturity[k] ?? 1}/5`).join("\n")}

## RÚBRICA DE CALIBRACIÓN — SCORES (0-100 por pilar)

### Ambiental
- 85-100: Certificaciones ISO 14001/50001, huella de carbono medida y reducida, cero incidentes ambientales
- 70-84:  Cumplimiento normativo completo, métricas ambientales registradas, plan de reducción activo
- 50-69:  Cumplimiento básico, algunas métricas registradas, sin plan formal de reducción
- 30-49:  Incumplimientos menores, métricas incompletas, gestión reactiva
- 0-29:   Incumplimientos graves, multas o sanciones, pasivos ambientales no gestionados

### Social
- 85-100: eNPS > 40, tasa de accidentes < 1%, programas de diversidad activos, certificación Great Place to Work
- 70-84:  Indicadores laborales positivos, tasa accidentes < 3%, iniciativas de bienestar documentadas
- 50-69:  Cumplimiento laboral básico, algunos indicadores negativos, sin programas formales
- 30-49:  Conflictos laborales documentados, tasa accidentes > 5%, alta rotación
- 0-29:   Infracciones laborales, accidentes graves, litigios activos

### Gobernanza
- 85-100: Modelo de prevención Ley 21.595 certificado, canal denuncias activo, reporte GRI verificado externamente
- 70-84:  Modelo de prevención implementado, políticas anticorrupción documentadas, reporte GRI sin verificación
- 50-69:  Políticas básicas de ética, modelo de prevención en desarrollo, reporte parcial
- 30-49:  Sin modelo de prevención formal, políticas declarativas sin implementación
- 0-29:   Investigaciones activas, incidentes de corrupción documentados, incumplimiento Ley 21.595

## RÚBRICA DE MADUREZ GRI (1-5 por pilar)
1 - Inicial:    Sin política ni métricas formales
2 - Básico:     Política declarada, sin medición sistemática
3 - Definido:   Métricas registradas, reporte interno
4 - Gestionado: Reporte GRI publicado, objetivos con seguimiento
5 - Optimizado: Verificación externa, mejora continua documentada, benchmarking sectorial

## ESTÁNDARES GRI RELEVANTES POR PILAR
Ambiental:   GRI 302 (energía), GRI 303 (agua), GRI 305 (emisiones), GRI 306 (residuos)
Social:      GRI 401 (empleo), GRI 403 (seguridad), GRI 405 (diversidad), GRI 413 (comunidades)
Gobernanza:  GRI 205 (anticorrupción), GRI 2-26 (denuncias), Ley 21.595 (Chile)

## DOCUMENTOS
${filesText}

## INSTRUCCIONES

Para cada pilar activo:
1. Cita textualmente la evidencia del documento
2. Identifica el rango de score (0-100) y nivel de madurez (1-5) que corresponde según rúbricas
3. Para GRI: indica qué estándar específico aplica y si el documento lo cumple, cumple parcialmente o no aplica
4. Si no hay evidencia suficiente → null

Responde ÚNICAMENTE con JSON válido, sin texto extra ni markdown:
{
  "detected_pillar": "<pilar con más evidencia en el documento: ${pillars[0]}>",
  "summary": "Síntesis de 2-3 oraciones sobre el contenido y su relevancia ESG",
  "insights": [
    "Hallazgo 1 con cita textual del documento",
    "Hallazgo 2",
    "Hallazgo 3 si aplica"
  ],
  "gri_updates": [
    { "id": "<GRI 302 o similar>", "current": "<cumple|parcial|pendiente|no_aplica>", "proposed": "<cumple|parcial|pendiente|no_aplica>", "reason": "Evidencia del documento" }
  ],
  "proposed_scores": {
    ${pillars.map(k => `"${k}": { "current": ${scores[k] ?? null}, "proposed": <0-100 o null>, "reason": "Evidencia: '...' → rango X-Y de rúbrica" }`).join(",\n    ")}
  },
  "proposed_maturity": {
    ${pillars.map(k => `"${k}": { "current": ${maturity[k] ?? 1}, "proposed": <1-5>, "reason": "Evidencia: '...' → nivel X según rúbrica" }`).join(",\n    ")}
  }
}`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 1600,
        messages: [{ role: "user", content: prompt }] }),
    });
    if (!response.ok) return res.status(response.status).json({ error: await response.text() });
    const data = await response.json();
    const clean = (data.content?.[0]?.text || "{}").replace(/```json|```/g, "").trim();
    try { return res.status(200).json(JSON.parse(clean)); }
    catch { return res.status(500).json({ error: "JSON inválido", raw: clean }); }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
