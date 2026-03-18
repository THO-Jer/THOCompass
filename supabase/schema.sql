-- THO Compass initial schema
create extension if not exists pgcrypto;

create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  full_name text,
  role text not null check (role in ('consultant','client')),
  approval_status text not null default 'pending' check (approval_status in ('pending','approved','disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  industry text,
  contact text,
  email text,
  period text,
  logo text,
  published boolean not null default false,
  internal_notes text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.client_user_access (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  access_status text not null default 'pending' check (access_status in ('pending','approved','disabled')),
  created_at timestamptz not null default now(),
  unique (client_id, user_id)
);

create table if not exists public.client_modules (
  client_id uuid primary key references public.clients(id) on delete cascade,
  rc boolean not null default true,
  do boolean not null default true,
  esg boolean not null default true,
  weight_rc integer not null default 40,
  weight_do integer not null default 35,
  weight_esg integer not null default 25,
  updated_at timestamptz not null default now()
);

create table if not exists public.client_scores (
  client_id uuid primary key references public.clients(id) on delete cascade,
  ircs integer,
  rc integer,
  do integer,
  esg integer,
  rc_percepcion integer,
  rc_compromisos integer,
  rc_dialogo integer,
  rc_conflictividad integer,
  do_cultura integer,
  do_engagement integer,
  do_liderazgo integer,
  esg_ambiental integer,
  esg_social integer,
  esg_gobernanza integer,
  updated_at timestamptz not null default now()
);

create table if not exists public.client_stakeholders (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  name text not null,
  type text,
  influence text,
  relation text,
  last_interaction text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.client_files (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  module_key text not null check (module_key in ('rc','do','esg')),
  storage_bucket text not null,
  storage_path text not null,
  original_name text not null,
  mime_type text,
  size_bytes bigint,
  ai_score integer,
  status text default 'uploaded',
  uploaded_by uuid references public.user_profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.client_messages (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  sender_user_id uuid references public.user_profiles(id),
  sender_role text not null check (sender_role in ('consultant','client')),
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.user_profiles enable row level security;
alter table public.clients enable row level security;
alter table public.client_user_access enable row level security;
alter table public.client_modules enable row level security;
alter table public.client_scores enable row level security;
alter table public.client_stakeholders enable row level security;
alter table public.client_files enable row level security;
alter table public.client_messages enable row level security;

create policy "consultants manage profiles" on public.user_profiles
for all using (
  exists (
    select 1 from public.user_profiles up
    where up.id = auth.uid() and up.role = 'consultant' and up.approval_status = 'approved'
  )
) with check (
  exists (
    select 1 from public.user_profiles up
    where up.id = auth.uid() and up.role = 'consultant' and up.approval_status = 'approved'
  )
);

create policy "users read own profile" on public.user_profiles
for select using (id = auth.uid());

create policy "consultants manage clients" on public.clients
for all using (
  exists (
    select 1 from public.user_profiles up
    where up.id = auth.uid() and up.role = 'consultant' and up.approval_status = 'approved'
  )
) with check (
  exists (
    select 1 from public.user_profiles up
    where up.id = auth.uid() and up.role = 'consultant' and up.approval_status = 'approved'
  )
);

create policy "approved client users read assigned clients" on public.clients
for select using (
  exists (
    select 1 from public.client_user_access cua
    join public.user_profiles up on up.id = cua.user_id
    where cua.client_id = clients.id
      and cua.user_id = auth.uid()
      and cua.access_status = 'approved'
      and up.approval_status = 'approved'
  )
);

create policy "consultants manage client_user_access" on public.client_user_access
for all using (
  exists (
    select 1 from public.user_profiles up
    where up.id = auth.uid() and up.role = 'consultant' and up.approval_status = 'approved'
  )
) with check (
  exists (
    select 1 from public.user_profiles up
    where up.id = auth.uid() and up.role = 'consultant' and up.approval_status = 'approved'
  )
);

create policy "users read their client access" on public.client_user_access
for select using (user_id = auth.uid());

create policy "consultants manage module data" on public.client_modules for all using (
  exists (select 1 from public.user_profiles up where up.id = auth.uid() and up.role = 'consultant' and up.approval_status = 'approved')
) with check (
  exists (select 1 from public.user_profiles up where up.id = auth.uid() and up.role = 'consultant' and up.approval_status = 'approved')
);
create policy "approved clients read module data" on public.client_modules for select using (
  exists (select 1 from public.client_user_access cua where cua.client_id = client_modules.client_id and cua.user_id = auth.uid() and cua.access_status = 'approved')
);

create policy "consultants manage score data" on public.client_scores for all using (
  exists (select 1 from public.user_profiles up where up.id = auth.uid() and up.role = 'consultant' and up.approval_status = 'approved')
) with check (
  exists (select 1 from public.user_profiles up where up.id = auth.uid() and up.role = 'consultant' and up.approval_status = 'approved')
);
create policy "approved clients read score data" on public.client_scores for select using (
  exists (select 1 from public.client_user_access cua where cua.client_id = client_scores.client_id and cua.user_id = auth.uid() and cua.access_status = 'approved')
);

create policy "consultants manage stakeholders" on public.client_stakeholders for all using (
  exists (select 1 from public.user_profiles up where up.id = auth.uid() and up.role = 'consultant' and up.approval_status = 'approved')
) with check (
  exists (select 1 from public.user_profiles up where up.id = auth.uid() and up.role = 'consultant' and up.approval_status = 'approved')
);
create policy "approved clients read stakeholders" on public.client_stakeholders for select using (
  exists (select 1 from public.client_user_access cua where cua.client_id = client_stakeholders.client_id and cua.user_id = auth.uid() and cua.access_status = 'approved')
);

create policy "consultants manage files" on public.client_files for all using (
  exists (select 1 from public.user_profiles up where up.id = auth.uid() and up.role = 'consultant' and up.approval_status = 'approved')
) with check (
  exists (select 1 from public.user_profiles up where up.id = auth.uid() and up.role = 'consultant' and up.approval_status = 'approved')
);
create policy "approved clients read files" on public.client_files for select using (
  exists (select 1 from public.client_user_access cua where cua.client_id = client_files.client_id and cua.user_id = auth.uid() and cua.access_status = 'approved')
);

create policy "consultants manage messages" on public.client_messages for all using (
  exists (select 1 from public.user_profiles up where up.id = auth.uid() and up.role = 'consultant' and up.approval_status = 'approved')
) with check (
  exists (select 1 from public.user_profiles up where up.id = auth.uid() and up.role = 'consultant' and up.approval_status = 'approved')
);
create policy "approved clients read and post own messages" on public.client_messages for all using (
  exists (select 1 from public.client_user_access cua where cua.client_id = client_messages.client_id and cua.user_id = auth.uid() and cua.access_status = 'approved')
) with check (
  exists (select 1 from public.client_user_access cua where cua.client_id = client_messages.client_id and cua.user_id = auth.uid() and cua.access_status = 'approved')
);

insert into storage.buckets (id, name, public)
values
  ('rc-documents', 'rc-documents', false),
  ('do-documents', 'do-documents', false),
  ('esg-documents', 'esg-documents', false)
on conflict (id) do nothing;

-- Storage policies are easier to finalize after OAuth is enabled; keep buckets private.
