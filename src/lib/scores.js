// src/lib/scores.js
// Utilidades compartidas para persistencia de scores
// Usadas por ModuleRC, ModuleDO, ModuleESG y BaselineInstrument

/**
 * Escribe una entrada en el log de cambios de score.
 */
async function writeScoreLog(sb, projectId, method, dimScores, prevScores, overall, notes, sourceFile) {
  if (!sb || !projectId) return;
  const { data: { user } } = await sb.auth.getUser().catch(()=>({ data:{} }));
  const entries = [];

  // Log overall
  if (overall != null) {
    entries.push({
      project_id:   projectId,
      changed_by:   user?.id || null,
      method,
      dimension:    "overall",
      value_before: prevScores?.overall ?? null,
      value_after:  Math.round(overall),
      notes,
      source_file:  sourceFile || null,
    });
  }

  // Log each dimension
  Object.entries(dimScores || {}).forEach(([dim, val]) => {
    if (val == null || dim === "overall") return;
    entries.push({
      project_id:   projectId,
      changed_by:   user?.id || null,
      method,
      dimension:    dim,
      value_before: prevScores?.[dim] ?? null,
      value_after:  Math.round(val),
      notes:        null,
      source_file:  sourceFile || null,
    });
  });

  if (entries.length) {
    const { error } = await sb.from("project_score_log").insert(entries);
    if (error) console.warn("score_log insert:", error.message);
  }
}

/**
 * Guarda o actualiza el score de un proyecto.
 * Registra automáticamente en project_score_log.
 */
export async function saveProjectScore(sb, projectId, scorePayload, opts = {}) {
  if (!sb || !projectId) return;

  const { data: existing } = await sb
    .from("project_scores").select("id, overall_score, dimension_scores_json")
    .eq("project_id", projectId)
    .order("updated_at", { ascending: false }).limit(1);

  const prev = existing?.[0];
  const prevScores = { overall: prev?.overall_score, ...(prev?.dimension_scores_json || {}) };

  if (prev?.id) {
    const { error } = await sb.from("project_scores")
      .update({ ...scorePayload, updated_at: new Date().toISOString() })
      .eq("id", prev.id);
    if (error) console.error("project_scores update error:", error);
  } else {
    const { error } = await sb.from("project_scores")
      .insert({ project_id: projectId, ...scorePayload });
    if (error) console.error("project_scores insert error:", error);
  }

  // Write changelog
  const dimScores = scorePayload.dimension_scores_json || {};
  await writeScoreLog(
    sb, projectId,
    opts.method || "manual",
    dimScores,
    prevScores,
    scorePayload.overall_score,
    opts.notes || scorePayload.method_notes || null,
    opts.sourceFile || null
  );
}

async function getOrCreateCurrentPeriod(sb) {
  const now     = new Date();
  const year    = now.getFullYear();
  const quarter = Math.ceil((now.getMonth() + 1) / 3);
  const { data: existing } = await sb
    .from("reporting_periods").select("id")
    .eq("year", year).eq("quarter", quarter).maybeSingle();
  if (existing?.id) return existing.id;
  const starts = new Date(year, (quarter - 1) * 3, 1);
  const ends   = new Date(year, quarter * 3, 0);
  const { data: created, error } = await sb
    .from("reporting_periods")
    .insert({ year, quarter,
      starts_on: starts.toISOString().split("T")[0],
      ends_on:   ends.toISOString().split("T")[0] })
    .select("id").single();
  if (error) { console.warn("reporting_periods insert:", error.message); return null; }
  return created?.id;
}

export async function syncClientScore(sb, clientId, moduleKey, dimScores, overall) {
  if (!sb || !clientId) {
    console.warn("syncClientScore: missing sb or clientId", { clientId, moduleKey });
    return;
  }

  const fieldMap = {
    rc:  { total:"rc", percepcion:"rc_percepcion", compromisos:"rc_compromisos",
           dialogo:"rc_dialogo", conflictividad:"rc_conflictividad" },
    do:  { total:"do", cultura:"do_cultura", engagement:"do_engagement", liderazgo:"do_liderazgo" },
    esg: { total:"esg", ambiental:"esg_ambiental", social:"esg_social", gobernanza:"esg_gobernanza" },
  };

  const map = fieldMap[moduleKey];
  if (!map) return;

  const payload = {};
  if (overall != null) payload[map.total] = Math.round(overall);
  Object.entries(dimScores || {}).forEach(([dim, val]) => {
    if (map[dim] && val != null) payload[map[dim]] = Math.round(val);
  });
  if (Object.keys(payload).length === 0) return;

  console.log("syncClientScore payload:", { clientId, moduleKey, payload });

  const { data: existingScore } = await sb
    .from("client_scores").select("client_id")
    .eq("client_id", clientId).maybeSingle();
  if (existingScore) {
    const { error } = await sb.from("client_scores")
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq("client_id", clientId);
    if (error) console.error("client_scores update error:", error);
  } else {
    const { error } = await sb.from("client_scores")
      .insert({ client_id: clientId, ...payload });
    if (error) console.error("client_scores insert error:", error);
  }

  try {
    const periodId = await getOrCreateCurrentPeriod(sb);
    if (!periodId) return;
    const { error } = await sb.from("client_score_history")
      .upsert({ client_id: clientId, reporting_period_id: periodId, ...payload },
               { onConflict: "client_id,reporting_period_id" });
    if (error) console.warn("client_score_history:", error.message);
  } catch (e) {
    console.warn("history recording failed:", e.message);
  }
}
