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
