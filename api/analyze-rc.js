// api/analyze-rc.js
// Vercel Serverless Function — análisis RC con rúbrica anclada
// Requiere: ANTHROPIC_API_KEY en variables de entorno de Vercel

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "ANTHROPIC_API_KEY no configurada" });

  const { fileContents, projectName, currentScores } = req.body;
  if (!fileContents?.length) return res.status(400).json({ error: "No se enviaron archivos" });

  const scores = currentScores || {};
  const filesText = fileContents
    .map(f => `### Archivo: ${f.name}\n${f.content?.slice(0, 10000) || "[sin contenido]"}`)
    .join("\n\n");

  const prompt = `Eres un consultor experto en Relacionamiento Comunitario (RC) y Licencia Social de Operación (LSO) para proyectos de inversión en Chile.

Tu tarea es analizar documentos reales (actas, encuestas, registros de actividades, reportes) y proponer actualizaciones de scores basadas EXCLUSIVAMENTE en evidencia explícita del documento. No puedes inventar ni inferir más allá de lo que el texto dice literalmente.

## PROYECTO
Nombre: "${projectName}"

## SCORES ACTUALES (mantén estos como referencia de la línea base)
- Percepción y confianza: ${scores.percepcion ?? "sin medición previa"}
- Gestión de compromisos: ${scores.compromisos ?? "sin medición previa"}
- Calidad del diálogo: ${scores.dialogo ?? "sin medición previa"}
- Conflictividad activa: ${scores.conflictividad ?? "sin medición previa"}

## RÚBRICA DE CALIBRACIÓN (usa SIEMPRE estos criterios para proponer scores)

### Percepción y confianza (30% del LSO)
Qué mide: cómo perciben a la organización sus stakeholders clave.
- 85-100: Percepción ampliamente positiva, menciones espontáneas de confianza, NPS > 50
- 70-84:  Percepción favorable con reservas menores, NPS entre 20-50
- 50-69:  Percepción mixta o neutral, desconfianza en algunos grupos
- 30-49:  Percepción negativa generalizada, NPS negativo o quejas recurrentes
- 0-29:   Desconfianza activa, rechazo explícito, movilización en contra

### Gestión de compromisos (25% del LSO)
Qué mide: cumplimiento de acuerdos adquiridos con la comunidad.
- 85-100: 100% de compromisos cumplidos en plazo, registro formal actualizado
- 70-84:  >80% cumplidos, incumplimientos menores con fecha reprogramada
- 50-69:  50-80% cumplidos, algunos vencidos sin resolución
- 30-49:  <50% cumplidos, quejas por incumplimiento documentadas
- 0-29:   Compromisos incumplidos reiteradamente, pérdida de credibilidad

### Calidad del diálogo (25% del LSO)
Qué mide: frecuencia, representatividad y calidad de instancias de participación.
- 85-100: Instancias regulares (mensual o más), representación diversa, acuerdos documentados
- 70-84:  Reuniones frecuentes pero con brechas, algún grupo subrepresentado
- 50-69:  Reuniones esporádicas, participación limitada a interlocutores habituales
- 30-49:  Diálogo reactivo (solo ante conflictos), sin agenda proactiva
- 0-29:   Ausencia de diálogo, rechazo a reunirse, comunicación unilateral

### Conflictividad activa (20% del LSO — score inverso: más conflicto = score más bajo)
Qué mide: nivel de conflictos activos que afectan la operación.
- 85-100: Sin conflictos activos, relación fluida, eventuales tensiones resueltas
- 70-84:  Tensiones menores (ruidos, acceso) contenidas y en proceso de resolución
- 50-69:  Conflicto activo pero localizado, no escala, hay mesa de trabajo
- 30-49:  Conflicto grave o múltiples frentes, afecta imagen o cronograma
- 0-29:   Crisis: paralización, judicialización, intervención de autoridades

## DOCUMENTOS A ANALIZAR
${filesText}

## INSTRUCCIONES DE RESPUESTA

Para cada dimensión debes:
1. Citar textualmente (entre comillas) la evidencia del documento que la sustenta
2. Identificar el rango de la rúbrica que corresponde a esa evidencia
3. Proponer un número dentro de ese rango
4. Si el documento NO contiene información suficiente para una dimensión, proponer null (no inventar)

Responde ÚNICAMENTE con JSON válido, sin texto antes ni después, sin bloques markdown:
{
  "summary": "Síntesis de 2-3 oraciones sobre el contenido analizado y su relevancia para el LSO",
  "insights": [
    "Hallazgo 1 con cita textual: 'texto del documento'",
    "Hallazgo 2 con cita textual o paráfrasis directa",
    "Hallazgo 3 si aplica"
  ],
  "proposed_scores": {
    "percepcion":     { "current": ${scores.percepcion ?? null},     "proposed": <número 0-100 o null>, "reason": "Evidencia: '...' → rango X-Y de la rúbrica" },
    "compromisos":    { "current": ${scores.compromisos ?? null},    "proposed": <número 0-100 o null>, "reason": "Evidencia: '...' → rango X-Y de la rúbrica" },
    "dialogo":        { "current": ${scores.dialogo ?? null},        "proposed": <número 0-100 o null>, "reason": "Evidencia: '...' → rango X-Y de la rúbrica" },
    "conflictividad": { "current": ${scores.conflictividad ?? null}, "proposed": <número 0-100 o null>, "reason": "Evidencia: '...' → rango X-Y de la rúbrica" }
  }
}`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 1500,
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
