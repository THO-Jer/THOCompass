// api/analyze-rc.js
// Vercel Serverless Function — proxy a Anthropic API para módulo RC
// La API key nunca sale del servidor.
//
// Requiere en Vercel → Settings → Environment Variables:
//   ANTHROPIC_API_KEY = sk-ant-...

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY no configurada en Vercel" });
  }

  const { fileContents, projectName, currentScores, storagePath } = req.body;

  if (!fileContents?.length) {
    return res.status(400).json({ error: "No se enviaron archivos" });
  }

  const scores = currentScores || {};
  const filesText = fileContents
    .map(f => `### Archivo: ${f.name}\n${f.content?.slice(0, 8000) || "[sin contenido]"}`)
    .join("\n\n");

  const prompt = `Eres un consultor experto en Relacionamiento Comunitario (RC) para proyectos en Chile.

Analiza los siguientes archivos cargados para el proyecto "${projectName}" y propón actualizaciones de scores basadas ÚNICAMENTE en el contenido real de los archivos. No inventes datos que no estén en los archivos.

SCORES ACTUALES (escala 0-100, null = sin dato previo):
- Percepción y confianza: ${scores.percepcion ?? "sin dato"}
- Gestión de compromisos: ${scores.compromisos ?? "sin dato"}
- Calidad del diálogo: ${scores.dialogo ?? "sin dato"}
- Conflictividad activa: ${scores.conflictividad ?? "sin dato"}

ARCHIVOS:
${filesText}

Responde SOLO con un objeto JSON válido. Sin texto antes ni después. Sin bloques markdown.
{
  "summary": "Resumen de 2-3 oraciones del contenido real analizado",
  "insights": [
    "hallazgo concreto extraído del archivo 1",
    "hallazgo concreto del archivo 2",
    "hallazgo adicional relevante"
  ],
  "proposed_scores": {
    "percepcion":     { "current": ${scores.percepcion ?? null},     "proposed": <número 0-100 o null si no hay datos suficientes>, "reason": "evidencia del archivo" },
    "compromisos":    { "current": ${scores.compromisos ?? null},    "proposed": <número 0-100 o null>, "reason": "evidencia del archivo" },
    "dialogo":        { "current": ${scores.dialogo ?? null},        "proposed": <número 0-100 o null>, "reason": "evidencia del archivo" },
    "conflictividad": { "current": ${scores.conflictividad ?? null}, "proposed": <número 0-100 o null>, "reason": "evidencia del archivo" }
  }
}`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type":       "application/json",
        "x-api-key":          apiKey,
        "anthropic-version":  "2023-06-01",
      },
      body: JSON.stringify({
        model:      "claude-haiku-4-5-20251001",
        max_tokens: 1200,
        messages:   [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: err });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || "{}";
    const clean = text.replace(/```json|```/g, "").trim();

    let result;
    try {
      result = JSON.parse(clean);
    } catch {
      return res.status(500).json({ error: "La IA no retornó JSON válido", raw: text });
    }

    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
