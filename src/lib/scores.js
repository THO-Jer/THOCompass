// src/lib/scores.js
// Utilidades compartidas para persistencia de scores
// Usadas por ModuleRC, ModuleDO y ModuleESG

/**
 * Guarda o actualiza el score de un proyecto.
 * Busca si ya existe una fila y hace UPDATE, si no hace INSERT.
 */
export async function saveProjectScore(sb, projectId, scorePayload) {
  if (!sb || !projectId) return;

  const { data: existing } = await sb
    .from("project_scores")
    .select("id")
    .eq("project_id", projectId)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (existing?.[0]?.id) {
    const { error } = await sb.from("project_scores")
      .update({ ...scorePayload, updated_at: new Date().toISOString() })
      .eq("id", existing[0].id);
    if (error) console.error("project_scores update error:", error);
  } else {
    const { error } = await sb.from("project_scores")
      .insert({ project_id: projectId, ...scorePayload });
    if (error) console.error("project_scores insert error:", error);
  }
}

/**
 * Sincroniza client_scores con el promedio de todos los project_scores activos
 * del cliente para un módulo dado.
 *
 * Esto hace que el Panel General y la Vista Cliente reflejen
 * los scores actualizados sin necesidad de un paso manual.
 *
 * @param {object} sb       - cliente Supabase
 * @param {string} clientId - UUID del cliente
 * @param {string} moduleKey - "rc" | "do" | "esg"
 * @param {object} dimScores - { percepcion:70, compromisos:65, ... } (las dimensiones del módulo)
 * @param {number} overall   - score total calculado
 */
export async function syncClientScore(sb, clientId, moduleKey, dimScores, overall) {
  if (!sb || !clientId) return;

  // Mapeo de campos por módulo → columnas de client_scores
  const fieldMap = {
    rc: {
      total:        "rc",
      percepcion:   "rc_percepcion",
      compromisos:  "rc_compromisos",
      dialogo:      "rc_dialogo",
      conflictividad:"rc_conflictividad",
    },
    do: {
      total:      "do",          // columna real en client_scores es "do" (palabra reservada)
      cultura:    "do_cultura",
      engagement: "do_engagement",
      liderazgo:  "do_liderazgo",
    },
    esg: {
      total:      "esg",
      ambiental:  "esg_ambiental",
      social:     "esg_social",
      gobernanza: "esg_gobernanza",
    },
  };

  const map = fieldMap[moduleKey];
  if (!map) return;

  // Construir el objeto de actualización
  const update = { updated_at: new Date().toISOString() };
  if (overall != null) update[map.total] = Math.round(overall);

  Object.entries(dimScores || {}).forEach(([dim, val]) => {
    if (map[dim] && val != null) update[map[dim]] = Math.round(val);
  });

  // Nota: "do" es palabra reservada en PostgreSQL.
  // client_scores tiene la columna como "do" (con comillas) pero
  // Supabase JS acepta do_score como alias definido en el schema.
  // Si el módulo es "do", la columna total es "do_score" (definido arriba).

  // Verificar si ya existe una fila para este cliente
  const { data: existing } = await sb
    .from("client_scores")
    .select("client_id")
    .eq("client_id", clientId)
    .maybeSingle();

  if (existing) {
    const { error } = await sb.from("client_scores")
      .update(update)
      .eq("client_id", clientId);
    if (error) console.error("client_scores update error:", error);
  } else {
    const { error } = await sb.from("client_scores")
      .insert({ client_id: clientId, ...update });
    if (error) console.error("client_scores insert error:", error);
  }
}
