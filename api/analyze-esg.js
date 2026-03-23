// api/analyze-esg.js
// Vercel Serverless Function — proxy a Anthropic API para módulo ESG

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "ANTHROPIC_API_KEY no configurada en Vercel" });

  const { fileContents, projectName, currentScores, currentMaturity, activePillars } = req.body;
  if (!fileContents?.length) return res.status(400).json({ error: "No se enviaron archivos" });

  const scores   = currentScores   || {};
  const maturity = currentMaturity || {};
  const pillars  = activePillars   || ["ambiental", "social", "gobernanza"];

  const filesText = fileContents
    .map(f => `### ${f.name}\n${f.content?.slice(0, 8000) || "[sin contenido]"}`)
    .join("\n\n");

  const prompt = `Eres un consultor experto en Sostenibilidad (ESG) y estándares GRI en Chile.

Analiza los siguientes archivos del proyecto "${projectName}" y propón actualizaciones BASADAS ÚNICAMENTE en el contenido real. No inventes datos.

PILARES ACTIVOS: ${pillars.join(", ")}

SCORES ACTUALES (0-100):
${pillars.map(k => `- ${k}: ${scores[k] ?? "sin dato"}`).join("\n")}

MADUREZ ACTUAL (1-5):
${pillars.map(k => `- ${k}: ${maturity[k] ?? 1}`).join("\n")}

ARCHIVOS:
${filesText}

Responde SOLO con JSON válido sin texto adicional ni markdown:
{
  "detected_pillar": "<pilar más relevante: ${pillars[0]}>",
  "summary": "Resumen 2-3 oraciones del contenido real",
  "insights": ["hallazgo 1 del archivo", "hallazgo 2", "hallazgo 3"],
  "gri_updates": [
    { "id": "<código GRI ej: GRI 205>", "current": "<cumple|parcial|pendiente|no_aplica>", "proposed": "<cumple|parcial|pendiente|no_aplica>", "reason": "evidencia del archivo" }
  ],
  "proposed_scores": {
    ${pillars.map(k => `"${k}": { "current": ${scores[k] ?? null}, "proposed": <0-100 o null>, "reason": "evidencia" }`).join(",\n    ")}
  },
  "proposed_maturity": {
    ${pillars.map(k => `"${k}": { "current": ${maturity[k] ?? 1}, "proposed": <1-5>, "reason": "evidencia" }`).join(",\n    ")}
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
        max_tokens: 1400,
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
