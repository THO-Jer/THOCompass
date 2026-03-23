// api/analyze-do.js
// Vercel Serverless Function — análisis DO con rúbrica anclada

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "ANTHROPIC_API_KEY no configurada" });

  const { fileContents, projectName, currentScores } = req.body;
  if (!fileContents?.length) return res.status(400).json({ error: "No se enviaron archivos" });

  const scores = currentScores || {};
  const filesText = fileContents
    .map(f => `### ${f.name}\n${f.content?.slice(0, 10000) || "[sin contenido]"}`)
    .join("\n\n");

  const prompt = `Eres un consultor experto en Desarrollo Organizacional (DO) y salud organizacional en Chile.

Tu tarea es analizar documentos reales (encuestas de clima, resultados de evaluaciones, diagnósticos organizacionales) y proponer actualizaciones de scores basadas EXCLUSIVAMENTE en evidencia explícita del documento. No puedes inventar ni inferir más allá de lo que el texto dice.

## PROYECTO
Nombre: "${projectName}"

## SCORES ACTUALES (referencia de línea base)
- Cultura organizacional: ${scores.cultura ?? "sin medición previa"}
- Engagement y clima: ${scores.engagement ?? "sin medición previa"}
- Liderazgo: ${scores.liderazgo ?? "sin medición previa"}

## RÚBRICA DE CALIBRACIÓN

### Cultura organizacional (35% del índice)
Qué mide: coherencia entre valores declarados y comportamientos observados.
- 85-100: Cultura fuerte y consistente, valores vividos en práctica diaria, baja rotación, reconocimiento externo
- 70-84:  Cultura definida con brechas menores, mayoría adhiere a valores, algunas inconsistencias
- 50-69:  Cultura declarada pero débilmente practicada, brechas identificadas entre discurso y acción
- 30-49:  Cultura fragmentada, subculturas en conflicto, valores percibidos como superficiales
- 0-29:   Cultura tóxica, comportamientos contrarios a valores, alta disfunción interna

### Engagement y clima laboral (35% del índice)
Qué mide: motivación, satisfacción y sentido de pertenencia. Proxy principal: eNPS.
- 85-100: eNPS > 50, alta satisfacción, bajo ausentismo, colaboradores como embajadores
- 70-84:  eNPS 20-50, satisfacción general positiva, áreas de mejora identificadas
- 50-69:  eNPS 0-20, satisfacción mixta, desmotivación en algunos segmentos
- 30-49:  eNPS negativo (-1 a -30), quejas frecuentes, ausentismo elevado
- 0-29:   eNPS < -30, desvinculación activa, conflictos laborales, alta rotación

### Liderazgo (30% del índice)
Qué mide: percepción de jefaturas en comunicación, desarrollo de equipo y confianza.
- 85-100: Líderes evaluados positivamente en 360°, alta confianza, equipos autónomos
- 70-84:  Liderazgo efectivo con oportunidades de mejora en comunicación o desarrollo
- 50-69:  Liderazgo inconsistente, algunos jefes bien evaluados, otros con brechas importantes
- 30-49:  Liderazgo cuestionado, baja confianza, toma de decisiones centralizada y percibida como arbitraria
- 0-29:   Liderazgo disfuncional, abuso de poder documentado, equipos desmotivados sistemáticamente

## DOCUMENTOS
${filesText}

## INSTRUCCIONES

Para cada dimensión:
1. Cita textualmente la evidencia del documento (entre comillas)
2. Identifica el rango de la rúbrica que corresponde
3. Propón un número dentro de ese rango
4. Si no hay evidencia suficiente para una dimensión → null

Responde ÚNICAMENTE con JSON válido, sin texto extra ni markdown:
{
  "summary": "Síntesis de 2-3 oraciones sobre el contenido y su relevancia para la salud organizacional",
  "insights": [
    "Hallazgo 1 con cita o paráfrasis directa del documento",
    "Hallazgo 2",
    "Hallazgo 3 si aplica"
  ],
  "proposed": {
    "cultura":    { "current": ${scores.cultura ?? null},    "proposed": <0-100 o null>, "reason": "Evidencia: '...' → rango X-Y" },
    "engagement": { "current": ${scores.engagement ?? null}, "proposed": <0-100 o null>, "reason": "Evidencia: '...' → rango X-Y" },
    "liderazgo":  { "current": ${scores.liderazgo ?? null},  "proposed": <0-100 o null>, "reason": "Evidencia: '...' → rango X-Y" }
  }
}`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 1400,
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
