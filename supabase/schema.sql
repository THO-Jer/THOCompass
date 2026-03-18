-- ============================================================
-- THO Compass · Schema completo para Supabase
-- Versión 3.0 — OAuth Google/Azure + historial + agenda +
-- alertas + recomendaciones + políticas de storage.
-- Ejecutar en: Supabase → SQL Editor → New query
-- ============================================================

create extension if not exists pgcrypto;

-- ============================================================
-- 1. USER PROFILES
-- ============================================================
create table if not exists public.user_profiles (
  id                uuid        primary key references auth.users(id) on delete cascade,
  email             text        unique,
  full_name         text,
  role              text        not null check (role in ('super_consultant','consultant','client')),
  approval_status   text        not null default 'pending'
                                check (approval_status in ('pending','approved','disabled')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ============================================================
-- 2. REPORTING PERIODS
-- ============================================================
create table if not exists public.reporting_periods (
  id                uuid        primary key default gen_random_uuid(),
  year              integer     not null check (year between 2020 and 2100),
  quarter           integer     not null check (quarter between 1 and 4),
  label             text        generated always as ('Q' || quarter::text || ' ' || year::text) stored,
  starts_on         date,
  ends_on           date,
  created_at        timestamptz not null default now(),
  unique (year, quarter)
);

-- ============================================================
-- 3. CLIENTS
-- ============================================================
create table if not exists public.clients (
  id                uuid        primary key default gen_random_uuid(),
  name              text        not null,
  industry          text,
  contact           text,
  email             text,
  active_period_id  uuid        references public.reporting_periods(id),
  logo              text,
  published         boolean     not null default false,
  internal_notes    text        default '',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ============================================================
-- 4. CLIENT USER ACCESS
-- ============================================================
create table if not exists public.client_user_access (
  id              uuid        primary key default gen_random_uuid(),
  client_id       uuid        not null references public.clients(id) on delete cascade,
  user_id         uuid        not null references public.user_profiles(id) on delete cascade,
  access_status   text        not null default 'pending'
                              check (access_status in ('pending','approved','disabled')),
  created_at      timestamptz not null default now(),
  unique (client_id, user_id)
);

-- ============================================================
-- 5. CLIENT MODULES
-- ============================================================
create table if not exists public.client_modules (
  client_id   uuid primary key references public.clients(id) on delete cascade,
  rc          boolean not null default true,
  do          boolean not null default true,
  esg         boolean not null default true,
  weight_rc   integer not null default 40 check (weight_rc between 0 and 100),
  weight_do   integer not null default 35 check (weight_do between 0 and 100),
  weight_esg  integer not null default 25 check (weight_esg between 0 and 100),
  updated_at  timestamptz not null default now(),
  check (weight_rc + weight_do + weight_esg <= 100)
);

-- ============================================================
-- 6. CLIENT SCORES (snapshot del período activo)
-- ============================================================
create table if not exists public.client_scores (
  client_id           uuid     primary key references public.clients(id) on delete cascade,
  ircs                integer,
  rc                  integer,
  do                  integer,
  esg                 integer,
  rc_percepcion       integer,
  rc_compromisos      integer,
  rc_dialogo          integer,
  rc_conflictividad   integer,
  do_cultura          integer,
  do_engagement       integer,
  do_liderazgo        integer,
  esg_ambiental       integer,
  esg_social          integer,
  esg_gobernanza      integer,
  updated_at          timestamptz not null default now()
);

-- ============================================================
-- 7. CLIENT SCORE HISTORY
-- ============================================================
create table if not exists public.client_score_history (
  id                  uuid        primary key default gen_random_uuid(),
  client_id           uuid        not null references public.clients(id) on delete cascade,
  reporting_period_id uuid        not null references public.reporting_periods(id) on delete restrict,
  ircs                integer,
  rc                  integer,
  do                  integer,
  esg                 integer,
  rc_percepcion       integer,
  rc_compromisos      integer,
  rc_dialogo          integer,
  rc_conflictividad   integer,
  do_cultura          integer,
  do_engagement       integer,
  do_liderazgo        integer,
  esg_ambiental       integer,
  esg_social          integer,
  esg_gobernanza      integer,
  recorded_by         uuid        references public.user_profiles(id),
  created_at          timestamptz not null default now(),
  unique (client_id, reporting_period_id)
);

-- ============================================================
-- 8. CLIENT ALERTS
-- ============================================================
create table if not exists public.client_alerts (
  id                  uuid        primary key default gen_random_uuid(),
  client_id           uuid        not null references public.clients(id) on delete cascade,
  type                text        not null check (type in ('green','amber','red')),
  text                text        not null,
  visible_to_client   boolean     not null default true,
  resolved            boolean     not null default false,
  sort_order          integer     not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ============================================================
-- 9. CLIENT RECOMMENDATIONS
-- ============================================================
create table if not exists public.client_recommendations (
  id                  uuid        primary key default gen_random_uuid(),
  client_id           uuid        not null references public.clients(id) on delete cascade,
  text                text        not null,
  visible_to_client   boolean     not null default true,
  sort_order          integer     not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ============================================================
-- 10. CLIENT STAKEHOLDERS
-- ============================================================
create table if not exists public.client_stakeholders (
  id                   uuid        primary key default gen_random_uuid(),
  client_id            uuid        not null references public.clients(id) on delete cascade,
  name                 text        not null,
  type                 text,
  influence            text,
  relation             text,
  last_interaction_at  date,
  sort_order           integer     not null default 0,
  created_at           timestamptz not null default now()
);

-- ============================================================
-- 11. CLIENT EVENTS
-- ============================================================
create table if not exists public.client_events (
  id          uuid        primary key default gen_random_uuid(),
  client_id   uuid        not null references public.clients(id) on delete cascade,
  title       text        not null,
  event_date  date        not null,
  color       text,
  created_by  uuid        references public.user_profiles(id),
  created_at  timestamptz not null default now()
);

-- ============================================================
-- 12. CLIENT FILES
-- ============================================================
create table if not exists public.client_files (
  id              uuid        primary key default gen_random_uuid(),
  client_id       uuid        not null references public.clients(id) on delete cascade,
  module_key      text        not null check (module_key in ('rc','do','esg')),
  storage_bucket  text        not null,
  storage_path    text        not null,
  original_name   text        not null,
  mime_type       text,
  size_bytes      bigint,
  ai_score        integer,
  ai_summary      text,
  status          text        default 'uploaded'
                              check (status in ('uploaded','analyzed','applied','rejected')),
  uploaded_by     uuid        references public.user_profiles(id),
  created_at      timestamptz not null default now(),
  unique (storage_bucket, storage_path)
);

-- ============================================================
-- 13. CLIENT MESSAGES
-- ============================================================
create table if not exists public.client_messages (
  id              uuid        primary key default gen_random_uuid(),
  client_id       uuid        not null references public.clients(id) on delete cascade,
  sender_user_id  uuid        references public.user_profiles(id),
  sender_role     text        not null check (sender_role in ('consultant','client')),
  body            text        not null,
  created_at      timestamptz not null default now()
);

alter table public.user_profiles enable row level security;
alter table public.reporting_periods enable row level security;
alter table public.clients enable row level security;
alter table public.client_user_access enable row level security;
alter table public.client_modules enable row level security;
alter table public.client_scores enable row level security;
alter table public.client_score_history enable row level security;
alter table public.client_alerts enable row level security;
alter table public.client_recommendations enable row level security;
alter table public.client_stakeholders enable row level security;
alter table public.client_events enable row level security;
alter table public.client_files enable row level security;
alter table public.client_messages enable row level security;

-- ============================================================
-- HELPERS
-- ============================================================
create or replace function public.is_consultant()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_profiles
    where id = auth.uid()
      and role in ('super_consultant','consultant')
      and approval_status = 'approved'
  );
$$;

create or replace function public.is_super_consultant()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_profiles
    where id = auth.uid()
      and role = 'super_consultant'
      and approval_status = 'approved'
  );
$$;

create or replace function public.has_client_access(p_client_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.client_user_access cua
    join public.user_profiles up on up.id = cua.user_id
    where cua.client_id = p_client_id
      and cua.user_id = auth.uid()
      and cua.access_status = 'approved'
      and up.approval_status = 'approved'
  );
$$;

-- ============================================================
-- POLICIES
-- ============================================================
create policy "consultants manage all profiles"
  on public.user_profiles for all
  using (public.is_consultant())
  with check (public.is_consultant());

create policy "users read own profile"
  on public.user_profiles for select
  using (id = auth.uid());

create policy "consultants read reporting periods"
  on public.reporting_periods for all
  using (public.is_consultant())
  with check (public.is_consultant());

create policy "clients read reporting periods"
  on public.reporting_periods for select
  using (true);

create policy "consultants manage clients"
  on public.clients for all
  using (public.is_consultant())
  with check (public.is_consultant());

create policy "approved clients read assigned client"
  on public.clients for select
  using (public.has_client_access(id));

create policy "consultants manage access"
  on public.client_user_access for all
  using (public.is_consultant())
  with check (public.is_consultant());

create policy "users read own access"
  on public.client_user_access for select
  using (user_id = auth.uid());

create policy "consultants manage modules"
  on public.client_modules for all
  using (public.is_consultant()) with check (public.is_consultant());
create policy "clients read own modules"
  on public.client_modules for select
  using (public.has_client_access(client_id));

create policy "consultants manage scores"
  on public.client_scores for all
  using (public.is_consultant()) with check (public.is_consultant());
create policy "clients read own scores"
  on public.client_scores for select
  using (public.has_client_access(client_id));

create policy "consultants manage score history"
  on public.client_score_history for all
  using (public.is_consultant()) with check (public.is_consultant());
create policy "clients read own score history"
  on public.client_score_history for select
  using (public.has_client_access(client_id));

create policy "consultants manage alerts"
  on public.client_alerts for all
  using (public.is_consultant()) with check (public.is_consultant());
create policy "clients read visible alerts"
  on public.client_alerts for select
  using (public.has_client_access(client_id) and visible_to_client = true);

create policy "consultants manage recommendations"
  on public.client_recommendations for all
  using (public.is_consultant()) with check (public.is_consultant());
create policy "clients read visible recommendations"
  on public.client_recommendations for select
  using (public.has_client_access(client_id) and visible_to_client = true);

create policy "consultants manage stakeholders"
  on public.client_stakeholders for all
  using (public.is_consultant()) with check (public.is_consultant());
create policy "clients read own stakeholders"
  on public.client_stakeholders for select
  using (public.has_client_access(client_id));

create policy "consultants manage events"
  on public.client_events for all
  using (public.is_consultant()) with check (public.is_consultant());
create policy "clients read own events"
  on public.client_events for select
  using (public.has_client_access(client_id));

create policy "consultants manage files"
  on public.client_files for all
  using (public.is_consultant()) with check (public.is_consultant());
create policy "clients read own files"
  on public.client_files for select
  using (public.has_client_access(client_id));

create policy "consultants manage all messages"
  on public.client_messages for all
  using (public.is_consultant()) with check (public.is_consultant());
create policy "clients read messages of assigned client"
  on public.client_messages for select
  using (public.has_client_access(client_id));
create policy "clients insert own messages"
  on public.client_messages for insert
  with check (
    sender_user_id = auth.uid()
    and sender_role = 'client'
    and public.has_client_access(client_id)
  );

-- ============================================================
-- STORAGE
-- ============================================================
insert into storage.buckets (id, name, public)
values
  ('rc-documents',  'rc-documents',  false),
  ('do-documents',  'do-documents',  false),
  ('esg-documents', 'esg-documents', false)
on conflict (id) do nothing;

create policy "consultants manage rc storage"
  on storage.objects for all
  using (bucket_id = 'rc-documents' and public.is_consultant())
  with check (bucket_id = 'rc-documents' and public.is_consultant());
create policy "consultants manage do storage"
  on storage.objects for all
  using (bucket_id = 'do-documents' and public.is_consultant())
  with check (bucket_id = 'do-documents' and public.is_consultant());
create policy "consultants manage esg storage"
  on storage.objects for all
  using (bucket_id = 'esg-documents' and public.is_consultant())
  with check (bucket_id = 'esg-documents' and public.is_consultant());

create policy "clients read assigned rc storage"
  on storage.objects for select
  using (
    bucket_id = 'rc-documents'
    and public.has_client_access((storage.foldername(name))[1]::uuid)
  );
create policy "clients read assigned do storage"
  on storage.objects for select
  using (
    bucket_id = 'do-documents'
    and public.has_client_access((storage.foldername(name))[1]::uuid)
  );
create policy "clients read assigned esg storage"
  on storage.objects for select
  using (
    bucket_id = 'esg-documents'
    and public.has_client_access((storage.foldername(name))[1]::uuid)
  );

-- ============================================================
-- TRIGGERS / UPDATED_AT
-- ============================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_user_profiles_updated_at on public.user_profiles;
create trigger trg_user_profiles_updated_at
  before update on public.user_profiles
  for each row execute function public.set_updated_at();

drop trigger if exists trg_clients_updated_at on public.clients;
create trigger trg_clients_updated_at
  before update on public.clients
  for each row execute function public.set_updated_at();

drop trigger if exists trg_client_modules_updated_at on public.client_modules;
create trigger trg_client_modules_updated_at
  before update on public.client_modules
  for each row execute function public.set_updated_at();

drop trigger if exists trg_client_scores_updated_at on public.client_scores;
create trigger trg_client_scores_updated_at
  before update on public.client_scores
  for each row execute function public.set_updated_at();

drop trigger if exists trg_client_alerts_updated_at on public.client_alerts;
create trigger trg_client_alerts_updated_at
  before update on public.client_alerts
  for each row execute function public.set_updated_at();

drop trigger if exists trg_client_recommendations_updated_at on public.client_recommendations;
create trigger trg_client_recommendations_updated_at
  before update on public.client_recommendations
  for each row execute function public.set_updated_at();

-- ============================================================
-- INDICES
-- ============================================================
create index if not exists idx_cua_user on public.client_user_access (user_id);
create index if not exists idx_cua_client on public.client_user_access (client_id);
create index if not exists idx_clients_active_period on public.clients (active_period_id);
create index if not exists idx_csh_client on public.client_score_history (client_id);
create index if not exists idx_csh_period on public.client_score_history (reporting_period_id);
create index if not exists idx_alerts_client on public.client_alerts (client_id);
create index if not exists idx_recs_client on public.client_recommendations (client_id);
create index if not exists idx_events_client on public.client_events (client_id);
create index if not exists idx_events_date on public.client_events (event_date);
create index if not exists idx_files_client on public.client_files (client_id);
create index if not exists idx_msgs_client on public.client_messages (client_id);
create index if not exists idx_msgs_created on public.client_messages (created_at);
create index if not exists idx_period_year_quarter on public.reporting_periods (year, quarter);

-- ============================================================
-- BOOTSTRAP NOTES
-- ============================================================
-- 1. Ejecutar este archivo en Supabase → SQL Editor
-- 2. Habilitar SOLO Google y Microsoft Azure en Authentication → Providers
-- 3. Crear tu usuario en Authentication y luego promoverlo:
--    update public.user_profiles
--    set role='super_consultant', approval_status='approved'
--    where email='tu_mail@tho.cl';
-- 4. Usar rutas de storage como: {client_id}/{module_key}/{timestamp}_{original_name}
--    para que las storage policies por carpeta funcionen correctamente.
