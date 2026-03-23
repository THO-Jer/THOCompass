import { extractFileTexts, formatFilesForPrompt, buildProjectContext, triangulationInstructions } from "./_extract.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "ANTHROPIC_API_KEY no configurada" });

  const { fileContents, projectName, currentScores, projectContext } = req.body;
  if (!fileContents?.length) return res.status(400).json({ error: "No se enviaron archivos" });

  // Extract text from all files (PDF, Excel, text)
  const extracted = await extractFileTexts(fileContents);
  const filesText  = formatFilesForPrompt(extracted);
  const ctxBlock   = buildProjectContext(projectContext || {});
  const triangulation = triangulationInstructions(extracted.length);
  const scores = currentScores || {};

  const prompt = `Eres un consultor experto en Relacionamiento Comunitario (RC) y Licencia Social de Operación (LSO) para proyectos de inversión en Chile.

Tu tarea es analizar documentos reales y proponer actualizaciones de scores basadas EXCLUSIVAMENTE en evidencia explícita. No puedes inventar ni inferir más allá de lo que el texto dice.

## PROYECTO: "${projectName}"
${ctxBlock}
## SCORES ACTUALES
- Percepción y confianza: ${scores.percepcion ?? "sin medición previa"}
- Gestión de compromisos: ${scores.compromisos ?? "sin medición previa"}
- Calidad del diálogo: ${scores.dialogo ?? "sin medición previa"}
- Conflictividad activa: ${scores.conflictividad ?? "sin medición previa"}

## RÚBRICA DE CALIBRACIÓN

### Percepción y confianza (30% del LSO)
- 85-100: Percepción ampliamente positiva, NPS > 50, menciones espontáneas de confianza
- 70-84:  Percepción favorable con reservas menores, NPS 20-50
- 50-69:  Percepción mixta o neutral, desconfianza en algunos grupos
- 30-49:  Percepción negativa generalizada, NPS negativo, quejas recurrentes
- 0-29:   Desconfianza activa, rechazo explícito, movilización en contra

### Gestión de compromisos (25% del LSO)
- 85-100: 100% de compromisos cumplidos en plazo, registro formal actualizado
- 70-84:  >80% cumplidos, incumplimientos menores con fecha reprogramada
- 50-69:  50-80% cumplidos, algunos vencidos sin resolución
- 30-49:  <50% cumplidos, quejas por incumplimiento documentadas
- 0-29:   Compromisos incumplidos reiteradamente, pérdida de credibilidad

### Calidad del diálogo (25% del LSO)
- 85-100: Instancias regulares (mensual+), representación diversa, acuerdos documentados
- 70-84:  Reuniones frecuentes con brechas, algún grupo subrepresentado
- 50-69:  Reuniones esporádicas, participación limitada a interlocutores habituales
- 30-49:  Diálogo reactivo (solo ante conflictos), sin agenda proactiva
- 0-29:   Ausencia de diálogo, rechazo a reunirse

### Conflictividad activa (20% del LSO — inverso: más conflicto = score más bajo)
- 85-100: Sin conflictos activos, relación fluida
- 70-84:  Tensiones menores contenidas y en resolución
- 50-69:  Conflicto activo pero localizado, hay mesa de trabajo
- 30-49:  Conflicto grave o múltiples frentes, afecta imagen o cronograma
- 0-29:   Crisis: paralización, judicialización, intervención de autoridades
${triangulation}
## DOCUMENTOS
${filesText}

## INSTRUCCIONES
Para cada dimensión: (1) cita evidencia textual, (2) identifica rango de rúbrica, (3) propón número. Si no hay evidencia → null. Considera el historial y contexto del proyecto al interpretar la evidencia.

Responde ÚNICAMENTE con JSON válido:
{
  "summary": "Síntesis 2-3 oraciones del contenido y relevancia LSO",
  "insights": ["hallazgo con cita del documento", "hallazgo 2", "hallazgo 3 si aplica"],
  "source_consistency": "consistente|mixta|contradictoria",
  "proposed_scores": {
    "percepcion":     { "current": ${scores.percepcion ?? null},     "proposed": <0-100 o null>, "reason": "Evidencia: '...' → rango X-Y" },
    "compromisos":    { "current": ${scores.compromisos ?? null},    "proposed": <0-100 o null>, "reason": "Evidencia: '...' → rango X-Y" },
    "dialogo":        { "current": ${scores.dialogo ?? null},        "proposed": <0-100 o null>, "reason": "Evidencia: '...' → rango X-Y" },
    "conflictividad": { "current": ${scores.conflictividad ?? null}, "proposed": <0-100 o null>, "reason": "Evidencia: '...' → rango X-Y" }
  }
}`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type":"application/json", "x-api-key":apiKey, "anthropic-version":"2023-06-01" },
      body: JSON.stringify({ model:"claude-haiku-4-5-20251001", max_tokens:1600,
        messages:[{ role:"user", content:prompt }] }),
    });
    if (!response.ok) return res.status(response.status).json({ error: await response.text() });
    const data  = await response.json();
    const clean = (data.content?.[0]?.text || "{}").replace(/```json|```/g,"").trim();
    try { return res.status(200).json(JSON.parse(clean)); }
    catch { return res.status(500).json({ error:"JSON inválido", raw:clean }); }
  } catch(err) {
    return res.status(500).json({ error: err.message });
  }
}
