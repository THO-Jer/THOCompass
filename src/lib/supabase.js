import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export const STORAGE_BUCKETS = {
  rc: 'rc-documents',
  do: 'do-documents',
  esg: 'esg-documents',
};

export function moduleKeyToBucket(moduleKey) {
  return STORAGE_BUCKETS[moduleKey?.toLowerCase()] || STORAGE_BUCKETS.rc;
}


function isLocalhostUrl(value) {
  if (!value) return false;
  return /localhost|127\.0\.0\.1/.test(value);
}

export function getOAuthRedirectUrl() {
  const explicitAppUrl = import.meta.env.VITE_APP_URL?.replace(/\/$/, "");
  const origin = typeof window !== "undefined" ? window.location.origin.replace(/\/$/, "") : "";

  // In production, prefer the live origin if VITE_APP_URL still points to localhost.
  const base = origin && !isLocalhostUrl(origin)
    ? (isLocalhostUrl(explicitAppUrl) ? origin : (explicitAppUrl || origin))
    : (explicitAppUrl || origin);

  return base ? `${base}/auth/callback` : undefined;
}

export function getAuthDebugInfo() {
  const explicitAppUrl = import.meta.env.VITE_APP_URL?.replace(/\/$/, "") || "(no definida)";
  const origin = typeof window !== "undefined" ? window.location.origin.replace(/\/$/, "") : "(sin window)";
  return {
    explicitAppUrl,
    origin,
    redirectUrl: getOAuthRedirectUrl() || "(sin redirect)",
  };
}

const PROJECT_TABLES = {
  zones: "project_zones",
  actors: "project_actors",
  programs: "project_programs",
  activities: "project_activities",
  alerts: "project_alerts",
  signals: "project_signals",
  commitments: "project_commitments",
  scores: "project_scores",
};

function singleResult(data) {
  return Array.isArray(data) ? (data[0] || null) : (data || null);
}

function isUuid(value) {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function fetchProjectWorkspace(projectId) {
  if (!supabase || !projectId) return null;

  const [
    projectRes,
    zonesRes,
    actorsRes,
    programsRes,
    activitiesRes,
    alertsRes,
    signalsRes,
    commitmentsRes,
    scoresRes,
  ] = await Promise.all([
    supabase.from("projects").select("*").eq("id", projectId).limit(1),
    supabase.from(PROJECT_TABLES.zones).select("*").eq("project_id", projectId).order("created_at", { ascending: true }),
    supabase.from(PROJECT_TABLES.actors).select("*").eq("project_id", projectId).order("created_at", { ascending: true }),
    supabase.from(PROJECT_TABLES.programs).select("*").eq("project_id", projectId).order("created_at", { ascending: true }),
    supabase.from(PROJECT_TABLES.activities).select("*").eq("project_id", projectId).order("activity_date", { ascending: false }),
    supabase.from(PROJECT_TABLES.alerts).select("*").eq("project_id", projectId).order("created_at", { ascending: false }),
    supabase.from(PROJECT_TABLES.signals).select("*").eq("project_id", projectId).order("created_at", { ascending: false }),
    supabase.from(PROJECT_TABLES.commitments).select("*").eq("project_id", projectId).order("created_at", { ascending: false }),
    supabase.from(PROJECT_TABLES.scores).select("*").eq("project_id", projectId).order("updated_at", { ascending: false }).limit(1),
  ]);

  const responses = [projectRes, zonesRes, actorsRes, programsRes, activitiesRes, alertsRes, signalsRes, commitmentsRes, scoresRes];
  const firstError = responses.find((response) => response.error)?.error;
  if (firstError) throw firstError;

  const project = singleResult(projectRes.data);
  if (!project) return null;

  return {
    ...project,
    zones: zonesRes.data || [],
    actors: actorsRes.data || [],
    programs: programsRes.data || [],
    activities: activitiesRes.data || [],
    alerts: alertsRes.data || [],
    signals: signalsRes.data || [],
    commitments: commitmentsRes.data || [],
    scores: singleResult(scoresRes.data),
  };
}

export async function insertProjectRecord(table, payload) {
  if (!supabase) return null;
  const sanitizedPayload = { ...payload };
  if (!isUuid(sanitizedPayload.id)) delete sanitizedPayload.id;
  const { data, error } = await supabase.from(table).insert(sanitizedPayload).select().limit(1);
  if (error) throw error;
  return singleResult(data);
}

export async function upsertProjectScore(projectId, scorePayload) {
  if (!supabase || !projectId) return null;

  const { data: existingRows, error: existingError } = await supabase
    .from(PROJECT_TABLES.scores)
    .select("id")
    .eq("project_id", projectId)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (existingError) throw existingError;

  const existing = singleResult(existingRows);
  if (existing?.id) {
    const { data, error } = await supabase
      .from(PROJECT_TABLES.scores)
      .update(scorePayload)
      .eq("id", existing.id)
      .select()
      .limit(1);
    if (error) throw error;
    return singleResult(data);
  }

  const { data, error } = await supabase
    .from(PROJECT_TABLES.scores)
    .insert({ project_id: projectId, ...scorePayload })
    .select()
    .limit(1);

  if (error) throw error;
  return singleResult(data);
}
