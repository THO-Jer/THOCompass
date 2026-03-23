// api/generate-recommendations.js
// Genera recomendaciones estratégicas automáticas basadas en el estado real del cliente.
// Se llama cuando el consultor abre el dashboard o cuando hay cambios de score.

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "ANTHROPIC_API_KEY no configurada" });

  const { clientName, modules, scores, projects, commitments, lastActivityDays } = req.body;

  // Build context for each active module
  const moduleContext = Object.entries(modules || {})
    .filter(([,v]) => v)
    .map(([key]) => {
      const s = scores?.[key] || {};
      const total = s.total ?? s.overall ?? null;
      const dims  = Object.entries(s)
        .filter(([k]) => k !== "total" && k !== "overall" && k !== "maturity")
        .map(([k,v]) => `${k}: ${v ?? "sin dato"}`)
        .join(", ");
      return `${key.toUpperCase()}: score total ${total ?? "sin medición"}${dims ? ` (${dims})` : ""}`;
    }).join("\n");

  const projectContext = (projects || []).map(p =>
    `- ${p.name} [${p.module_key}]: ${p.status}${p.client_visible ? "" : " (no visible al cliente)"}`
  ).join("\n") || "Sin proyectos activos";

  const commitmentContext = (commitments || []).length > 0
    ? `${commitments.filter(c=>c.status==="overdue").length} vencidos, ${commitments.filter(c=>c.status==="pending").length} pendientes, ${commitments.filter(c=>c.status==="in_progress").length} en curso`
    : "Sin compromisos registrados";

  const activityContext = lastActivityDays != null
    ? `Última actividad registrada hace ${lastActivityDays} días`
    : "Sin actividades registradas";

  const prompt = `Eres un consultor estratégico senior de THO Consultora, especializado en Relacionamiento Comunitario, Desarrollo Organizacional y Sostenibilidad en Chile.

Analiza el estado actual del cliente y genera recomendaciones estratégicas concretas y accionables. Las recomendaciones deben ser específicas para la situación real del cliente, no genéricas.

## CLIENTE: ${clientName}

## ESTADO ACTUAL
${moduleContext}

## PROYECTOS
${projectContext}

## COMPROMISOS
${commitmentContext}

## ACTIVIDAD
${activityContext}

## REGLAS PARA GENERAR RECOMENDACIONES
- Si no hay actividades registradas → recomendar visita a terreno
- Si hay compromisos vencidos → recomendar mesa de seguimiento urgente
- Si han pasado más de 30 días sin actividad en RC → recomendar contacto con actores clave
- Si el score de conflictividad RC es < 50 → recomendar protocolo de gestión de conflictos
- Si el score de engagement DO es < 50 → recomendar diagnóstico de clima con encuesta formal
- Si la madurez ESG es nivel 1-2 → recomendar definir política de sostenibilidad
- Si hay proyectos no visibles al cliente → recomendar revisar visibilidad para transparencia
- Si no hay score establecido en algún módulo activo → recomendar establecer línea base
- Siempre priorizar por urgencia e impacto
- Si todo está bien, reconocerlo y sugerir próximos pasos de mejora continua

Genera entre 1 y 3 recomendaciones (máximo 3), priorizando las más urgentes e impactantes. Responde ÚNICAMENTE con JSON válido sin texto adicional:
[
  {
    "type": "urgent|warning|opportunity|good",
    "module": "rc|do|esg|general",
    "title": "Título breve de la recomendación (máx 8 palabras)",
    "body": "Descripción en 2-3 oraciones con acción concreta a tomar, contexto y resultado esperado.",
    "action": "Acción específica: ej. 'Agendar visita a terreno esta semana' o 'Enviar encuesta eNPS antes de fin de mes'"
  }
]`;

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
        max_tokens: 1200,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) return res.status(response.status).json({ error: await response.text() });
    const data = await response.json();
    const clean = (data.content?.[0]?.text || "[]").replace(/```json|```/g, "").trim();
    try {
      return res.status(200).json(JSON.parse(clean));
    } catch {
      return res.status(500).json({ error: "JSON inválido", raw: clean });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
