import { createClient } from '@supabase/supabase-js';

const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession:    true,
        autoRefreshToken:  true,
        detectSessionInUrl: true,
      },
    })
  : null;

export const STORAGE_BUCKETS = {
  rc:  'rc-documents',
  do:  'do-documents',
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
  const explicitAppUrl = import.meta.env.VITE_APP_URL?.replace(/\/$/, '');
  const origin = typeof window !== 'undefined' ? window.location.origin.replace(/\/$/, '') : '';
  const base = origin && !isLocalhostUrl(origin)
    ? (isLocalhostUrl(explicitAppUrl) ? origin : (explicitAppUrl || origin))
    : (explicitAppUrl || origin);
  return base ? `${base}/auth/callback` : undefined;
}

// ── Project helpers ────────────────────────────────────────────

function singleResult(data) {
  return Array.isArray(data) ? (data[0] || null) : (data || null);
}

export function isUuid(value) {
  return typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function normalizeClientFile(row) {
  if (!row) return row;
  return {
    ...row,
    name:  row.original_name || row.name,
    type:  row.mime_type?.includes('pdf')   ? 'pdf'
         : row.mime_type?.includes('sheet') ? 'excel'
         : row.mime_type?.includes('word')  ? 'doc'
         : row.type || 'file',
    module: (row.module_key || row.module || 'rc').toUpperCase(),
    date:   row.created_at || row.date,
  };
}

/**
 * Carga el workspace completo de un proyecto (zonas, actores, actividades, scores, etc.)
 * Usado por ProjectWorkspace en proyectos RC/DO/ESG.
 */
export async function fetchProjectWorkspace(projectId) {
  if (!supabase || !projectId) return null;

  const projectRes = await supabase.from('projects').select('*').eq('id', projectId).limit(1);
  if (projectRes.error) throw projectRes.error;
  const project = singleResult(projectRes.data);
  if (!project) return null;

  const [
    zonesRes, actorsRes, programsRes, activitiesRes,
    alertsRes, signalsRes, commitmentsRes, scoresRes, filesRes,
  ] = await Promise.all([
    supabase.from('project_zones').select('*').eq('project_id', projectId).order('created_at'),
    supabase.from('project_actors').select('*').eq('project_id', projectId).order('created_at'),
    supabase.from('project_programs').select('*').eq('project_id', projectId).order('created_at'),
    supabase.from('project_activities').select('*').eq('project_id', projectId).order('activity_date', { ascending: false }),
    supabase.from('project_alerts').select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
    supabase.from('project_signals').select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
    supabase.from('project_commitments').select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
    supabase.from('project_scores').select('*').eq('project_id', projectId).order('updated_at', { ascending: false }).limit(1),
    supabase.from('client_files').select('*').eq('client_id', project.client_id)
      .or(`project_id.eq.${projectId},project_id.is.null`).order('created_at', { ascending: false }),
  ]);

  const firstError = [zonesRes, actorsRes, programsRes, activitiesRes, alertsRes, signalsRes, commitmentsRes, scoresRes, filesRes]
    .find(r => r.error)?.error;
  if (firstError) throw firstError;

  return {
    ...project,
    zones:       zonesRes.data       || [],
    actors:      actorsRes.data      || [],
    programs:    programsRes.data    || [],
    activities:  activitiesRes.data  || [],
    alerts:      alertsRes.data      || [],
    signals:     signalsRes.data     || [],
    commitments: commitmentsRes.data || [],
    scores:      singleResult(scoresRes.data),
    files:       (filesRes.data || []).map(normalizeClientFile),
  };
}

/**
 * Carga todos los clientes con sus proyectos.
 * Usado por ClientsPage.
 */
export async function fetchWorkspaceClients() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('clients')
    .select(`
      id, name, industry, contact, email, logo, published, internal_notes,
      contact_consultant,
      projects ( id, client_id, name, module_key, project_type,
                 description, status, starts_on, ends_on, client_visible, scope )
    `)
    .order('name');

  if (error) throw error;

  return (data || []).map(client => ({
    ...client,
    logo: client.logo || '🧭',
    modules: {
      rc:  (client.projects || []).some(p => p.module_key === 'rc'),
      do:  (client.projects || []).some(p => p.module_key === 'do'),
      esg: (client.projects || []).some(p => p.module_key === 'esg'),
    },
    projects: client.projects || [],
    weights:  { rc: 40, do: 35, esg: 25 },
  }));
}

/**
 * Carga los proyectos de un cliente filtrados por módulo, incluyendo su score actual.
 * Usado por ModuleRC, ModuleDO, ModuleESG.
 */
export async function fetchProjectsByModule(clientId, moduleKey) {
  if (!supabase || !clientId || !moduleKey) return [];

  const { data: projects, error: pErr } = await supabase
    .from('projects')
    .select('*')
    .eq('client_id', clientId)
    .eq('module_key', moduleKey)
    .order('starts_on', { ascending: false });

  if (pErr) throw pErr;
  if (!projects?.length) return [];

  const projectIds = projects.map(p => p.id);
  const { data: scores, error: sErr } = await supabase
    .from('project_scores')
    .select('*')
    .in('project_id', projectIds)
    .order('updated_at', { ascending: false });

  if (sErr) throw sErr;

  return projects.map(p => ({
    ...p,
    scores: scores?.find(s => s.project_id === p.id) || null,
  }));
}

/**
 * Carga todos los datos del cliente para el ClientDashboard.
 * Solo retorna datos publicados y marcados como visibles al cliente.
 */
export async function fetchClientDashboardData(clientId) {
  if (!supabase || !clientId) return null;

  const [
    clientRes, modulesRes, scoresRes, historyRes,
    alertsRes, recsRes, projectsRes, messagesRes,
  ] = await Promise.all([
    supabase.from('clients').select('*').eq('id', clientId).single(),
    supabase.from('client_modules').select('*').eq('client_id', clientId).single(),
    supabase.from('client_scores').select('*').eq('client_id', clientId).single(),
    supabase.from('client_score_history').select('*, reporting_periods(label)')
      .eq('client_id', clientId).order('created_at', { ascending: true }),
    supabase.from('client_alerts').select('*')
      .eq('client_id', clientId).eq('visible_to_client', true).order('created_at', { ascending: false }),
    supabase.from('client_recommendations').select('*')
      .eq('client_id', clientId).eq('visible_to_client', true).order('sort_order'),
    supabase.from('projects').select('*')
      .eq('client_id', clientId).eq('client_visible', true).eq('status', 'active'),
    supabase.from('client_messages').select('*')
      .eq('client_id', clientId).order('created_at', { ascending: true }),
  ]);

  const firstErr = [clientRes, modulesRes, scoresRes, historyRes, alertsRes, recsRes, projectsRes, messagesRes]
    .find(r => r.error)?.error;
  if (firstErr) throw firstErr;

  const client  = clientRes.data;
  const modules = modulesRes.data;
  const scores  = scoresRes.data;

  return {
    ...client,
    modules: {
      rc:  modules?.rc         ?? false,
      do:  modules?.do ?? false,
      esg: modules?.esg        ?? false,
    },
    scores: {
      rc: {
        total:         scores?.rc,
        percepcion:    scores?.rc_percepcion,
        compromisos:   scores?.rc_compromisos,
        dialogo:       scores?.rc_dialogo,
        conflictividad:scores?.rc_conflictividad,
      },
      do: {
        total:      scores?.do_score,
        cultura:    scores?.do_cultura,
        engagement: scores?.do_engagement,
        liderazgo:  scores?.do_liderazgo,
      },
      esg: {
        total:      scores?.esg,
        ambiental:  scores?.esg_ambiental,
        social:     scores?.esg_social,
        gobernanza: scores?.esg_gobernanza,
        maturity:   scores?.score_drivers_json?.maturity || { ambiental:1, social:1, gobernanza:1 },
      },
    },
    history: (historyRes.data || []).map(h => ({
      period: h.reporting_periods?.label || h.reporting_period_id,
      rc:     h.rc,
      do:     h.do,
      esg:    h.esg,
    })),
    alerts:          alertsRes.data   || [],
    recommendations: recsRes.data     || [],
    projects:        projectsRes.data || [],
    messages: (messagesRes.data || []).map(m => ({
      ...m,
      from: m.sender_role,
    })),
    gri_summary: scores?.score_drivers_json?.gri_summary || {},
    contact_consultant: client.contact_consultant || 'THO Consultora',
  };
}

/**
 * Inserta un registro en cualquier tabla de proyecto.
 * Usado por ModuleRC (actores, actividades), ModuleDO (instrumentos), ModuleESG (reportes).
 */
export async function insertProjectRecord(table, payload) {
  if (!supabase) return null;
  const sanitized = { ...payload };
  if (!isUuid(sanitized.id)) delete sanitized.id;
  const { data, error } = await supabase.from(table).insert(sanitized).select().limit(1);
  if (error) throw error;
  return singleResult(data);
}

/**
 * Upsert del score de un proyecto.
 * Usado por ModuleRC, ModuleDO, ModuleESG al guardar scores.
 */
export async function upsertProjectScore(projectId, scorePayload) {
  if (!supabase || !projectId) return null;

  const { data: existing, error: existErr } = await supabase
    .from('project_scores')
    .select('id')
    .eq('project_id', projectId)
    .order('updated_at', { ascending: false })
    .limit(1);

  if (existErr) throw existErr;

  const row = singleResult(existing);
  if (row?.id) {
    const { data, error } = await supabase
      .from('project_scores').update(scorePayload).eq('id', row.id).select().limit(1);
    if (error) throw error;
    return singleResult(data);
  }

  const { data, error } = await supabase
    .from('project_scores').insert({ project_id: projectId, ...scorePayload }).select().limit(1);
  if (error) throw error;
  return singleResult(data);
}

/**
 * Sube un archivo a Storage y registra el metadata en client_files.
 * path recomendado: {client_id}/{module_key}/{project_id}/{timestamp}_{filename}
 */
export async function uploadAndRegisterFile({ file, clientId, projectId, moduleKey }) {
  if (!supabase) return null;
  const bucket = moduleKeyToBucket(moduleKey);
  const ts     = Date.now();
  const path   = `${clientId}/${moduleKey}/${projectId || 'general'}/${ts}_${file.name}`;

  const { error: uploadErr } = await supabase.storage.from(bucket).upload(path, file);
  if (uploadErr) throw uploadErr;

  const { data, error: insertErr } = await supabase.from('client_files').insert({
    client_id:      clientId,
    project_id:     projectId || null,
    module_key:     moduleKey,
    storage_bucket: bucket,
    storage_path:   path,
    original_name:  file.name,
    mime_type:      file.type,
    size_bytes:     file.size,
    status:         'uploaded',
  }).select().limit(1);

  if (insertErr) throw insertErr;
  return singleResult(data);
}

/**
 * Obtiene los archivos de un cliente, opcionalmente filtrados por proyecto.
 */
export async function fetchClientFiles(clientId, projectId = null) {
  if (!supabase || !clientId) return [];
  let q = supabase.from('client_files').select('*').eq('client_id', clientId);
  if (projectId) q = q.or(`project_id.eq.${projectId},project_id.is.null`);
  const { data, error } = await q.order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(normalizeClientFile);
}
