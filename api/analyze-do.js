// api/analyze-do.js
// Vercel Serverless Function — proxy a Anthropic API para módulo DO

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "ANTHROPIC_API_KEY no configurada en Vercel" });

  const { fileContents, projectName, currentScores } = req.body;
  if (!fileContents?.length) return res.status(400).json({ error: "No se enviaron archivos" });

  const scores = currentScores || {};
  const filesText = fileContents
    .map(f => `### ${f.name}\n${f.content?.slice(0, 8000) || "[sin contenido]"}`)
    .join("\n\n");

  const prompt = `Eres un consultor experto en Desarrollo Organizacional (DO) en Chile.

Analiza los siguientes archivos del proyecto "${projectName}" y propón scores basados ÚNICAMENTE en el contenido real. No inventes datos.

SCORES ACTUALES (0-100):
- Cultura organizacional: ${scores.cultura ?? "sin dato"}
- Engagement y clima: ${scores.engagement ?? "sin dato"}
- Liderazgo: ${scores.liderazgo ?? "sin dato"}

ARCHIVOS:
${filesText}

Responde SOLO con JSON válido sin texto adicional ni markdown:
{
  "summary": "Resumen de 2-3 oraciones del contenido analizado",
  "insights": ["hallazgo 1 del archivo", "hallazgo 2", "hallazgo 3"],
  "proposed": {
    "cultura":    { "current": ${scores.cultura ?? null},    "proposed": <0-100 o null>, "reason": "evidencia del archivo" },
    "engagement": { "current": ${scores.engagement ?? null}, "proposed": <0-100 o null>, "reason": "evidencia del archivo" },
    "liderazgo":  { "current": ${scores.liderazgo ?? null},  "proposed": <0-100 o null>, "reason": "evidencia del archivo" }
  }
}`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) return res.status(response.status).json({ error: await response.text() });

    const data = await response.json();
    const clean = (data.content?.[0]?.text || "{}").replace(/```json|```/g, "").trim();
    try {
      return res.status(200).json(JSON.parse(clean));
    } catch {
      return res.status(500).json({ error: "JSON inválido", raw: clean });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
