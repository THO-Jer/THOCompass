-- ============================================================
-- THO Compass · RLS para tablas de proyectos
-- Ejecutar en: Supabase → SQL Editor → New query
-- Requisito: schema.sql y migration-v3-to-v4.sql ya ejecutados
-- ============================================================

-- ── 1. Habilitar RLS en todas las tablas de proyectos ─────────
alter table public.projects              enable row level security;
alter table public.project_zones         enable row level security;
alter table public.project_actors        enable row level security;
alter table public.project_programs      enable row level security;
alter table public.project_activities    enable row level security;
alter table public.project_alerts        enable row level security;
alter table public.project_signals       enable row level security;
alter table public.project_scores        enable row level security;
alter table public.project_commitments   enable row level security;

-- ── 2. PROJECTS ───────────────────────────────────────────────
-- Consultores: acceso total a proyectos de sus clientes
drop policy if exists "consultants manage projects" on public.projects;
create policy "consultants manage projects"
  on public.projects for all
  using (public.is_consultant())
  with check (public.is_consultant());

-- Clientes: solo pueden ver proyectos marcados como visibles
-- de la empresa a la que tienen acceso
drop policy if exists "clients read visible projects" on public.projects;
create policy "clients read visible projects"
  on public.projects for select
  using (
    client_visible = true
    and public.has_client_access(client_id)
  );

-- ── 3. PROJECT_SCORES ─────────────────────────────────────────
drop policy if exists "consultants manage project scores" on public.project_scores;
create policy "consultants manage project scores"
  on public.project_scores for all
  using (public.is_consultant())
  with check (public.is_consultant());

drop policy if exists "clients read project scores" on public.project_scores;
create policy "clients read project scores"
  on public.project_scores for select
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_id
        and p.client_visible = true
        and public.has_client_access(p.client_id)
    )
  );

-- ── 4. PROJECT_ACTIVITIES ─────────────────────────────────────
drop policy if exists "consultants manage project activities" on public.project_activities;
create policy "consultants manage project activities"
  on public.project_activities for all
  using (public.is_consultant())
  with check (public.is_consultant());

drop policy if exists "clients read visible activities" on public.project_activities;
create policy "clients read visible activities"
  on public.project_activities for select
  using (
    visible_to_client = true
    and exists (
      select 1 from public.projects p
      where p.id = project_id
        and p.client_visible = true
        and public.has_client_access(p.client_id)
    )
  );

-- ── 5. PROJECT_ACTORS ─────────────────────────────────────────
drop policy if exists "consultants manage project actors" on public.project_actors;
create policy "consultants manage project actors"
  on public.project_actors for all
  using (public.is_consultant())
  with check (public.is_consultant());

drop policy if exists "clients read visible actors" on public.project_actors;
create policy "clients read visible actors"
  on public.project_actors for select
  using (
    visible_to_client = true
    and exists (
      select 1 from public.projects p
      where p.id = project_id
        and p.client_visible = true
        and public.has_client_access(p.client_id)
    )
  );

-- ── 6. PROJECT_ZONES / PROGRAMS / ALERTS / SIGNALS / COMMITMENTS ─
-- Solo consultores (no visible al cliente directamente)
drop policy if exists "consultants manage project zones" on public.project_zones;
create policy "consultants manage project zones"
  on public.project_zones for all
  using (public.is_consultant()) with check (public.is_consultant());

drop policy if exists "consultants manage project programs" on public.project_programs;
create policy "consultants manage project programs"
  on public.project_programs for all
  using (public.is_consultant()) with check (public.is_consultant());

drop policy if exists "consultants manage project alerts" on public.project_alerts;
create policy "consultants manage project alerts"
  on public.project_alerts for all
  using (public.is_consultant()) with check (public.is_consultant());

drop policy if exists "consultants manage project signals" on public.project_signals;
create policy "consultants manage project signals"
  on public.project_signals for all
  using (public.is_consultant()) with check (public.is_consultant());

drop policy if exists "consultants manage project commitments" on public.project_commitments;
create policy "consultants manage project commitments"
  on public.project_commitments for all
  using (public.is_consultant()) with check (public.is_consultant());

-- ── 7. CLIENT_MODULES — lectura para cliente asignado ─────────
-- (el schema original solo tenía acceso para consultores)
drop policy if exists "clients read own modules" on public.client_modules;
create policy "clients read own modules"
  on public.client_modules for select
  using (public.has_client_access(client_id) or public.is_consultant());

-- ── 8. VERIFICACIÓN ───────────────────────────────────────────
-- Ejecutar después para confirmar:
select
  schemaname,
  tablename,
  rowsecurity as rls_enabled
from pg_tables
where schemaname = 'public'
  and tablename like 'project%'
order by tablename;

-- ── 9. CLIENT_MESSAGES — INSERT para clientes y consultores ───
-- El schema original solo tenía SELECT para clientes
-- Aquí agregamos INSERT para ambos roles

drop policy if exists "clients insert own messages" on public.client_messages;
create policy "clients insert own messages"
  on public.client_messages for insert
  with check (
    sender_role = 'client'
    and public.has_client_access(client_id)
  );

drop policy if exists "consultants insert client messages" on public.client_messages;
create policy "consultants insert client messages"
  on public.client_messages for insert
  with check (public.is_consultant());

drop policy if exists "consultants read client messages" on public.client_messages;
create policy "consultants read client messages"
  on public.client_messages for select
  using (public.is_consultant());

-- Verificar políticas de mensajes
select policyname, cmd from pg_policies
where tablename = 'client_messages';

-- ── 10. UNIQUE constraint en project_scores ───────────────────
-- Sin esto, upsert con onConflict:"project_id" hace INSERT siempre.
-- Primero eliminar duplicados dejando solo el más reciente por proyecto,
-- luego agregar la constraint.

-- Eliminar filas duplicadas (mantener la más reciente por project_id)
DELETE FROM public.project_scores
WHERE id NOT IN (
  SELECT DISTINCT ON (project_id) id
  FROM public.project_scores
  ORDER BY project_id, updated_at DESC
);

-- Agregar constraint unique
ALTER TABLE public.project_scores
  ADD CONSTRAINT project_scores_project_id_unique
  UNIQUE (project_id);

-- Verificar
SELECT COUNT(*) as total_scores,
       COUNT(DISTINCT project_id) as unique_projects
FROM public.project_scores;

-- ── 11. COMMITMENTS & ALERTS ─────────────────────────────────

-- project_commitments table
create table if not exists public.project_commitments (
  id           uuid        primary key default gen_random_uuid(),
  project_id   uuid        not null references public.projects(id) on delete cascade,
  title        text        not null,
  description  text,
  due_date     date,
  responsible  text,
  status       text        not null default 'pending'
                           check (status in ('pending','in_progress','completed','overdue')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.project_commitments enable row level security;

drop policy if exists "consultants manage commitments" on public.project_commitments;
create policy "consultants manage commitments"
  on public.project_commitments for all
  using (
    exists (
      select 1 from public.projects p
      join public.clients c on c.id = p.client_id
      where p.id = project_id and is_consultant()
    )
  );

drop policy if exists "clients read commitments" on public.project_commitments;
create policy "clients read commitments"
  on public.project_commitments for select
  using (
    exists (
      select 1 from public.projects p
      join public.client_user_access ua on ua.client_id = p.client_id
      where p.id = project_id
        and ua.user_id = auth.uid()
        and ua.access_status = 'approved'
        and p.client_visible = true
    )
  );

-- client_alerts table (for overdue commitment notifications)
create table if not exists public.client_alerts (
  id                 uuid        primary key default gen_random_uuid(),
  client_id          uuid        not null references public.clients(id) on delete cascade,
  type               text        not null default 'amber' check (type in ('red','amber','green')),
  text               text        not null,
  module             text,
  visible_to_client  boolean     not null default false,
  resolved           boolean     not null default false,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (client_id, text)
);

alter table public.client_alerts enable row level security;

drop policy if exists "consultants manage alerts" on public.client_alerts;
create policy "consultants manage alerts"
  on public.client_alerts for all
  using (is_consultant());

drop policy if exists "clients read own alerts" on public.client_alerts;
create policy "clients read own alerts"
  on public.client_alerts for select
  using (
    visible_to_client = true
    and exists (
      select 1 from public.client_user_access ua
      where ua.client_id = client_id
        and ua.user_id = auth.uid()
        and ua.access_status = 'approved'
    )
  );

-- ── 12. SCORE CHANGELOG ──────────────────────────────────────────
-- Registra cada cambio de score: quién lo hizo, por qué método,
-- cuál fue el valor anterior y el nuevo.

create table if not exists public.project_score_log (
  id             uuid        primary key default gen_random_uuid(),
  project_id     uuid        not null references public.projects(id) on delete cascade,
  changed_by     uuid        references public.user_profiles(id),
  method         text        not null,  -- "baseline_instrument" | "ai_analysis" | "manual"
  dimension      text,                  -- null = overall, o "percepcion", "cultura", etc.
  value_before   integer,
  value_after    integer,
  notes          text,                  -- resumen del análisis o descripción del cambio
  source_file    text,                  -- nombre del archivo si fue por IA
  created_at     timestamptz not null default now()
);

alter table public.project_score_log enable row level security;

drop policy if exists "consultants manage score log" on public.project_score_log;
create policy "consultants manage score log"
  on public.project_score_log for all
  using (is_consultant());

drop policy if exists "clients read score log" on public.project_score_log;
create policy "clients read score log"
  on public.project_score_log for select
  using (
    exists (
      select 1 from public.projects p
      join public.client_user_access ua on ua.client_id = p.client_id
      where p.id = project_id
        and ua.user_id = auth.uid()
        and ua.access_status = 'approved'
        and p.client_visible = true
    )
  );

-- ── 13. CLIENT_FILES — columnas faltantes ────────────────────
-- project_id y visible_to_client pueden no existir si se usó el schema original

alter table public.client_files
  add column if not exists project_id       uuid references public.projects(id) on delete cascade,
  add column if not exists visible_to_client boolean not null default false;

-- Política para que clientes lean archivos visibles
drop policy if exists "clients read visible files" on public.client_files;
create policy "clients read visible files"
  on public.client_files for select
  using (
    visible_to_client = true
    and exists (
      select 1 from public.client_user_access ua
      where ua.client_id = client_files.client_id
        and ua.user_id = auth.uid()
        and ua.access_status = 'approved'
    )
  );

-- ── 14. SURVEY LINKS & RESPONSES ─────────────────────────────
-- Permite generar links externos para que stakeholders respondan
-- el instrumento de línea base sin necesitar cuenta.

create table if not exists public.survey_links (
  id           uuid        primary key default gen_random_uuid(),
  token        text        not null unique default encode(gen_random_bytes(24), 'base64url'),
  project_id   uuid        not null references public.projects(id) on delete cascade,
  module_key   text        not null check (module_key in ('rc','do','esg')),
  label        text,                    -- ej. "Encuesta comunidad sector norte"
  role_hint    text,                    -- ej. "Líder comunitario", "Trabajador", "Encargado sostenibilidad"
  expires_at   timestamptz,
  max_responses integer default 100,
  active       boolean not null default true,
  created_by   uuid    references public.user_profiles(id),
  created_at   timestamptz not null default now()
);

create table if not exists public.survey_responses (
  id           uuid        primary key default gen_random_uuid(),
  link_id      uuid        not null references public.survey_links(id) on delete cascade,
  project_id   uuid        not null references public.projects(id) on delete cascade,
  module_key   text        not null,
  respondent_label text,               -- nombre opcional (anónimo por defecto)
  answers_json jsonb       not null,   -- { "p1": 4, "p2": 3, ... }
  scores_json  jsonb,                  -- scores calculados de las respuestas
  overall_score integer,
  ip_hash      text,                   -- hash del IP para deduplicación (no PII)
  created_at   timestamptz not null default now()
);

-- RLS: consultores gestionan sus links y ven respuestas
alter table public.survey_links     enable row level security;
alter table public.survey_responses enable row level security;

drop policy if exists "consultants manage survey links" on public.survey_links;
create policy "consultants manage survey links"
  on public.survey_links for all using (is_consultant());

drop policy if exists "public read active survey links" on public.survey_links;
create policy "public read active survey links"
  on public.survey_links for select
  using (active = true and (expires_at is null or expires_at > now()));

drop policy if exists "consultants read survey responses" on public.survey_responses;
create policy "consultants read survey responses"
  on public.survey_responses for all using (is_consultant());

drop policy if exists "public insert survey responses" on public.survey_responses;
create policy "public insert survey responses"
  on public.survey_responses for insert
  with check (
    exists (
      select 1 from public.survey_links sl
      where sl.id = link_id
        and sl.active = true
        and (sl.expires_at is null or sl.expires_at > now())
    )
  );

-- ── 14. SURVEY LINKS & RESPONSES ─────────────────────────────
-- Permite generar links públicos para que stakeholders respondan
-- el instrumento de línea base sin necesidad de login.

create table if not exists public.survey_links (
  id           uuid        primary key default gen_random_uuid(),
  token        text        unique not null default gen_random_uuid()::text,
  project_id   uuid        not null references public.projects(id) on delete cascade,
  module_key   text        not null check (module_key in ('rc','do','esg')),
  title        text,                    -- ej. "Encuesta comunidad Villa El Bosque"
  description  text,                    -- instrucciones para el encuestado
  target_group text,                    -- ej. "Comunidad", "Trabajadores", "Líderes"
  active       boolean     not null default true,
  expires_at   timestamptz,
  created_by   uuid        references public.user_profiles(id),
  created_at   timestamptz not null default now()
);

create table if not exists public.survey_responses (
  id           uuid        primary key default gen_random_uuid(),
  survey_link_id uuid      not null references public.survey_links(id) on delete cascade,
  answers_json jsonb       not null,    -- { "p1": 4, "p2": 3, ... }
  respondent_name  text,               -- opcional, puede ser anónimo
  respondent_role  text,               -- ej. "Dirigente vecinal"
  ip_hash      text,                   -- para evitar duplicados
  created_at   timestamptz not null default now()
);

alter table public.survey_links     enable row level security;
alter table public.survey_responses enable row level security;

-- Consultores gestionan sus links
drop policy if exists "consultants manage survey links" on public.survey_links;
create policy "consultants manage survey links"
  on public.survey_links for all using (is_consultant());

-- Cualquiera puede leer un link activo (para la página pública /survey/:token)
drop policy if exists "public read active survey links" on public.survey_links;
create policy "public read active survey links"
  on public.survey_links for select
  using (active = true and (expires_at is null or expires_at > now()));

-- Cualquiera puede insertar una respuesta (sin login)
drop policy if exists "public insert survey responses" on public.survey_responses;
create policy "public insert survey responses"
  on public.survey_responses for insert
  with check (true);

-- Solo consultores leen respuestas
drop policy if exists "consultants read survey responses" on public.survey_responses;
create policy "consultants read survey responses"
  on public.survey_responses for select
  using (is_consultant());

-- ── 15. RECOMMENDATIONS CACHE ────────────────────────────────
-- Guarda las recomendaciones generadas para no regenerar en cada carga.

alter table public.client_recommendations
  add column if not exists generated_at  timestamptz,
  add column if not exists source        text default 'manual',
  add column if not exists expires_at    timestamptz;

-- ── 16. FORM BUILDER SYSTEM ──────────────────────────────────
-- Sistema de gestión de datos: constructor de formularios,
-- recolección de respuestas y análisis.

create table if not exists public.form_templates (
  id           uuid        primary key default gen_random_uuid(),
  project_id   uuid        not null references public.projects(id) on delete cascade,
  module_key   text        not null check (module_key in ('rc','do','esg')),
  title        text        not null,
  description  text,
  target_group text,
  status       text        not null default 'draft'
               check (status in ('draft','active','closed')),
  token        text        unique not null default gen_random_uuid()::text,
  expires_at   timestamptz,
  created_by   uuid        references public.user_profiles(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.form_questions (
  id           uuid        primary key default gen_random_uuid(),
  form_id      uuid        not null references public.form_templates(id) on delete cascade,
  order_index  integer     not null default 0,
  type         text        not null
               check (type in ('likert','nps','multiple_single','multiple_multi','text','matrix','ranking')),
  text         text        not null,
  required     boolean     not null default true,
  config_json  jsonb       not null default '{}'::jsonb,
  -- config_json examples:
  -- likert:    { "scale_min": 1, "scale_max": 5, "min_label": "Muy en desacuerdo", "max_label": "Muy de acuerdo" }
  -- nps:       { "label": "¿Recomendarías...?" }
  -- multiple:  { "options": ["Opción A", "Opción B", "Opción C"] }
  -- matrix:    { "rows": ["Ítem 1", "Ítem 2"], "cols": ["Malo", "Regular", "Bueno"] }
  -- ranking:   { "items": ["Prioridad A", "Prioridad B", "Prioridad C"] }
  -- text:      { "placeholder": "Escribe aquí...", "max_length": 500 }
  created_at   timestamptz not null default now()
);

create table if not exists public.form_responses (
  id                uuid        primary key default gen_random_uuid(),
  form_id           uuid        not null references public.form_templates(id) on delete cascade,
  respondent_name   text,
  respondent_role   text,
  respondent_segment text,
  started_at        timestamptz not null default now(),
  submitted_at      timestamptz,
  ip_hash           text,
  is_complete       boolean     not null default false
);

create table if not exists public.form_answers (
  id              uuid    primary key default gen_random_uuid(),
  response_id     uuid    not null references public.form_responses(id) on delete cascade,
  question_id     uuid    not null references public.form_questions(id) on delete cascade,
  value_integer   integer,
  value_text      text,
  value_json      jsonb,   -- for matrix, ranking, multiple_multi
  created_at      timestamptz not null default now(),
  unique (response_id, question_id)
);

create table if not exists public.form_analysis_cache (
  id                      uuid        primary key default gen_random_uuid(),
  form_id                 uuid        not null references public.form_templates(id) on delete cascade,
  generated_at            timestamptz not null default now(),
  expires_at              timestamptz,
  response_count          integer,
  stats_json              jsonb,
  ai_summary              text,
  ai_insights             jsonb,
  proposed_scores_json    jsonb,
  proposed_commitments_json jsonb,
  unique (form_id)
);

-- RLS
alter table public.form_templates    enable row level security;
alter table public.form_questions    enable row level security;
alter table public.form_responses    enable row level security;
alter table public.form_answers      enable row level security;
alter table public.form_analysis_cache enable row level security;

-- Consultores gestionan todo
drop policy if exists "consultants manage form_templates"    on public.form_templates;
drop policy if exists "consultants manage form_questions"    on public.form_questions;
drop policy if exists "consultants manage form_responses"    on public.form_responses;
drop policy if exists "consultants manage form_answers"      on public.form_answers;
drop policy if exists "consultants manage form_analysis"     on public.form_analysis_cache;

create policy "consultants manage form_templates"
  on public.form_templates for all
  using (exists (select 1 from public.user_profiles where id = auth.uid() and role in ('super_consultant','consultant') and approval_status = 'approved'))
  with check (exists (select 1 from public.user_profiles where id = auth.uid() and role in ('super_consultant','consultant') and approval_status = 'approved'));

create policy "consultants manage form_questions"
  on public.form_questions for all
  using (exists (select 1 from public.user_profiles where id = auth.uid() and role in ('super_consultant','consultant') and approval_status = 'approved'))
  with check (exists (select 1 from public.user_profiles where id = auth.uid() and role in ('super_consultant','consultant') and approval_status = 'approved'));

create policy "consultants manage form_responses"
  on public.form_responses for all
  using (exists (select 1 from public.user_profiles where id = auth.uid() and role in ('super_consultant','consultant') and approval_status = 'approved'))
  with check (exists (select 1 from public.user_profiles where id = auth.uid() and role in ('super_consultant','consultant') and approval_status = 'approved'));

create policy "consultants manage form_answers"
  on public.form_answers for all
  using (exists (select 1 from public.user_profiles where id = auth.uid() and role in ('super_consultant','consultant') and approval_status = 'approved'))
  with check (exists (select 1 from public.user_profiles where id = auth.uid() and role in ('super_consultant','consultant') and approval_status = 'approved'));

create policy "consultants manage form_analysis"
  on public.form_analysis_cache for all
  using (exists (select 1 from public.user_profiles where id = auth.uid() and role in ('super_consultant','consultant') and approval_status = 'approved'))
  with check (exists (select 1 from public.user_profiles where id = auth.uid() and role in ('super_consultant','consultant') and approval_status = 'approved'));

-- Público puede leer templates activos (para la página de respuesta)
drop policy if exists "public read active forms" on public.form_templates;
create policy "public read active forms"
  on public.form_templates for select
  using (status = 'active' and (expires_at is null or expires_at > now()));

-- Público puede leer preguntas de forms activos
drop policy if exists "public read form questions" on public.form_questions;
create policy "public read form questions"
  on public.form_questions for select
  using (exists (
    select 1 from public.form_templates ft
    where ft.id = form_id and ft.status = 'active'
    and (ft.expires_at is null or ft.expires_at > now())
  ));

-- Público puede insertar respuestas en forms activos
drop policy if exists "public insert form responses" on public.form_responses;
create policy "public insert form responses"
  on public.form_responses for insert
  with check (exists (
    select 1 from public.form_templates ft
    where ft.id = form_id and ft.status = 'active'
    and (ft.expires_at is null or ft.expires_at > now())
  ));

-- Público puede insertar answers de sus propias respuestas
drop policy if exists "public insert form answers" on public.form_answers;
create policy "public insert form answers"
  on public.form_answers for insert
  with check (true);

-- Público puede actualizar su propia respuesta (para completar)
drop policy if exists "public update own response" on public.form_responses;
create policy "public update own response"
  on public.form_responses for update
  using (submitted_at is null);
