-- ============================================================
-- THO Compass · Demo persistido RC project-centric
-- Ejecutar sobre una base que ya tenga un cliente existente.
-- Si existe "Minera Los Andes" lo usa; si no, toma el primer cliente.
-- ============================================================

with target_client as (
  select id, name
  from public.clients
  where name = 'Minera Los Andes'
  union all
  select id, name
  from public.clients
  where not exists (select 1 from public.clients where name = 'Minera Los Andes')
  limit 1
),
new_project as (
  insert into public.projects (
    client_id,
    name,
    module_key,
    project_type,
    description,
    status
  )
  select
    target_client.id,
    'Demo RC persistido · Los Vilos',
    'rc',
    'territorial',
    'Caso demo persistido para validar workspace project-centric.',
    'active'
  from target_client
  returning id, client_id
),
zone_norte as (
  insert into public.project_zones (project_id, name, zone_type, notes)
  select id, 'Zona Norte', 'direct', 'Zona con tensión comunitaria por tránsito.'
  from new_project
  returning id, project_id
),
zone_puerto as (
  insert into public.project_zones (project_id, name, zone_type, notes)
  select id, 'Entorno Puerto', 'operational', 'Zona con seguimiento logístico.'
  from new_project
  returning id, project_id
),
actor_greda as (
  insert into public.project_actors (
    project_id, zone_id, name, actor_type, influence_level, engagement_level, relationship_status, visible_to_client, notes
  )
  select project_id, id, 'Junta de Vecinos La Greda', 'Comunidad', 'Alta', 'Media', 'fragil', true, 'Actor sensible a tránsito y ruido.'
  from zone_norte
  returning id, project_id, zone_id
),
program_dialogue as (
  insert into public.project_programs (
    project_id, zone_id, name, program_type, status, objective, visible_to_client
  )
  select project_id, id, 'Mesa de diálogo sector norte', 'dialogue', 'active', 'Bajar tensión con quick wins visibles.', true
  from zone_norte
  returning id, project_id, zone_id
),
activity_meeting as (
  insert into public.project_activities (
    project_id, zone_id, program_id, actor_id, record_type, title, activity_date,
    participants_count, evaluation_score, qualitative_summary, tensions_text,
    opportunities_text, consultant_notes, visible_to_client
  )
  select
    zone_norte.project_id,
    zone_norte.id,
    program_dialogue.id,
    actor_greda.id,
    'meeting',
    'Mesa demo persistida con vecinos',
    current_date,
    14,
    62,
    'Actividad persistida para validar recarga del workspace.',
    'Persisten dudas sobre tránsito y visibilidad de medidas.',
    'Hay espacio para quick wins de coordinación semanal.',
    'Registro de demo persistida.',
    true
  from zone_norte
  join actor_greda on actor_greda.zone_id = zone_norte.id
  join program_dialogue on program_dialogue.zone_id = zone_norte.id
  returning id, project_id, zone_id, actor_id
),
signal_demo as (
  insert into public.project_signals (
    project_id, source_record_id, dimension, signal_type, severity, confidence_score, summary, visible_to_client
  )
  select
    project_id,
    id,
    'confianza',
    'tension',
    'amber',
    0.79,
    'La confianza sigue frágil pese a disposición al diálogo.',
    true
  from activity_meeting
  returning id, project_id
),
alert_demo as (
  insert into public.project_alerts (
    project_id, zone_id, actor_id, source_record_id, severity, category, title, description, visible_to_client, resolved
  )
  select
    project_id,
    zone_id,
    actor_id,
    id,
    'amber',
    'seguimiento',
    'Alerta demo de tensión territorial',
    'La actividad revela necesidad de respuesta visible de corto plazo.',
    true,
    false
  from activity_meeting
  returning id, project_id
),
commitment_demo as (
  insert into public.project_commitments (
    project_id, zone_id, actor_id, source_record_id, title, description,
    commitment_type, status, due_date, visible_to_client
  )
  select
    project_id,
    zone_id,
    actor_id,
    id,
    'Compromiso demo · quick win visible',
    'Definir y comunicar una acción visible antes de la próxima mesa.',
    'followup',
    'open',
    current_date + interval '10 days',
    true
  from activity_meeting
  returning id, project_id
)
insert into public.project_scores (
  project_id,
  overall_score,
  status_label,
  dimension_scores_json,
  score_drivers_json,
  method_notes
)
select
  new_project.id,
  64,
  'En atención',
  jsonb_build_object(
    'participacion', 69,
    'confianza', 57,
    'articulacion', 63,
    'riesgos', 55,
    'oportunidades', 71
  ),
  jsonb_build_array(
    jsonb_build_object('label','Alertas activas','impact',-6),
    jsonb_build_object('label','Compromisos abiertos','impact',-7),
    jsonb_build_object('label','Evaluaciones','impact',2),
    jsonb_build_object('label','Señales','impact',-1)
  ),
  'Seed demo persistido para revisar workspace RC con score explicable.'
from new_project;
