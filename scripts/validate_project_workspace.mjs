import crypto from "node:crypto";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const TARGET_CLIENT_ID = process.env.THO_CLIENT_ID || "";

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or compatible key).");
  process.exit(2);
}

const baseHeaders = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

async function rest(path, options = {}) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      ...baseHeaders,
      ...(options.headers || {}),
    },
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${response.status} ${response.statusText}: ${body}`);
  }
  if (response.status === 204) return null;
  return response.json();
}

async function pickClientId() {
  if (TARGET_CLIENT_ID) return TARGET_CLIENT_ID;
  const clients = await rest("clients?select=id,name&limit=1");
  if (!clients.length) throw new Error("No clients available to attach the validation project.");
  return clients[0].id;
}

async function main() {
  const clientId = await pickClientId();
  const stamp = new Date().toISOString().slice(0, 19);

  const [project] = await rest("projects", {
    method: "POST",
    body: JSON.stringify({
      client_id: clientId,
      name: `E2E RC Validation ${stamp}`,
      module_key: "rc",
      project_type: "territorial",
      description: "Proyecto de validación end-to-end del workspace project-centric.",
      status: "active",
    }),
  });

  const [zone] = await rest("project_zones", {
    method: "POST",
    body: JSON.stringify({
      project_id: project.id,
      name: "Zona E2E",
      zone_type: "direct",
      notes: "Zona creada por script de validación.",
    }),
  });

  const [actor] = await rest("project_actors", {
    method: "POST",
    body: JSON.stringify({
      project_id: project.id,
      zone_id: zone.id,
      name: "Actor E2E",
      actor_type: "Comunidad",
      influence_level: "Alta",
      engagement_level: "Media",
      relationship_status: "fragil",
      visible_to_client: true,
    }),
  });

  const [activity] = await rest("project_activities", {
    method: "POST",
    body: JSON.stringify({
      project_id: project.id,
      zone_id: zone.id,
      actor_id: actor.id,
      record_type: "meeting",
      title: "Actividad E2E",
      activity_date: new Date().toISOString().slice(0, 10),
      participants_count: 8,
      evaluation_score: 68,
      qualitative_summary: "Actividad creada desde validación end-to-end.",
      tensions_text: "Tensión moderada de seguimiento.",
      opportunities_text: "Oportunidad de quick win visible.",
      consultant_notes: "Registro técnico automático.",
      visible_to_client: true,
    }),
  });

  const [signal] = await rest("project_signals", {
    method: "POST",
    body: JSON.stringify({
      project_id: project.id,
      source_record_id: activity.id,
      dimension: "confianza",
      signal_type: "tension",
      severity: "amber",
      confidence_score: 0.77,
      summary: "Señal E2E ligada a actividad.",
      visible_to_client: true,
    }),
  });

  const [alert] = await rest("project_alerts", {
    method: "POST",
    body: JSON.stringify({
      project_id: project.id,
      zone_id: zone.id,
      actor_id: actor.id,
      source_record_id: activity.id,
      severity: "amber",
      category: "seguimiento",
      title: "Alerta E2E ligada a actividad",
      description: "Alerta de validación técnica.",
      visible_to_client: true,
      resolved: false,
    }),
  });

  const [commitment] = await rest("project_commitments", {
    method: "POST",
    body: JSON.stringify({
      project_id: project.id,
      zone_id: zone.id,
      actor_id: actor.id,
      source_record_id: activity.id,
      title: "Compromiso E2E ligado a actividad",
      description: "Compromiso de validación técnica.",
      commitment_type: "followup",
      status: "open",
      due_date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      visible_to_client: true,
    }),
  });

  const [score] = await rest("project_scores", {
    method: "POST",
    body: JSON.stringify({
      project_id: project.id,
      overall_score: 63,
      status_label: "En atención",
      dimension_scores_json: {
        participacion: 67,
        confianza: 58,
        articulacion: 61,
        riesgos: 55,
        oportunidades: 72,
      },
      score_drivers_json: [
        { label: "Alertas activas", impact: -6 },
        { label: "Compromisos abiertos", impact: -7 },
        { label: "Evaluaciones", impact: 8 },
        { label: "Señales", impact: -2 },
      ],
      method_notes: "Score persistido por script E2E.",
    }),
  });

  const [workspaceProject] = await rest(`projects?select=*&id=eq.${project.id}&limit=1`);
  const [workspaceActivity] = await rest(`project_activities?select=*&project_id=eq.${project.id}&id=eq.${activity.id}&limit=1`);
  const [workspaceSignal] = await rest(`project_signals?select=*&project_id=eq.${project.id}&source_record_id=eq.${activity.id}&id=eq.${signal.id}&limit=1`);
  const [workspaceAlert] = await rest(`project_alerts?select=*&project_id=eq.${project.id}&source_record_id=eq.${activity.id}&id=eq.${alert.id}&limit=1`);
  const [workspaceCommitment] = await rest(`project_commitments?select=*&project_id=eq.${project.id}&source_record_id=eq.${activity.id}&id=eq.${commitment.id}&limit=1`);
  const [workspaceScore] = await rest(`project_scores?select=*&project_id=eq.${project.id}&id=eq.${score.id}&limit=1`);

  if (!workspaceProject || !workspaceActivity || !workspaceSignal || !workspaceAlert || !workspaceCommitment || !workspaceScore) {
    throw new Error("Workspace reload validation failed: missing persisted records.");
  }

  console.log(JSON.stringify({
    ok: true,
    project_id: project.id,
    zone_id: zone.id,
    actor_id: actor.id,
    activity_id: activity.id,
    signal_id: signal.id,
    alert_id: alert.id,
    commitment_id: commitment.id,
    score_id: score.id,
    reloaded: {
      project: workspaceProject.id,
      activity: workspaceActivity.id,
      signal: workspaceSignal.id,
      alert: workspaceAlert.id,
      commitment: workspaceCommitment.id,
      score: workspaceScore.id,
    },
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
