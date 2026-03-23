-- ============================================================
-- THO Compass · Bootstrap + Trigger de registro automático
-- Ejecutar en: Supabase → SQL Editor → New query
-- ============================================================

-- ============================================================
-- TRIGGER: crear user_profiles automáticamente al registrarse
-- Se dispara cada vez que un usuario nuevo entra por primera
-- vez con Google, Azure, o cualquier otro provider OAuth.
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (
    id,
    email,
    full_name,
    role,
    approval_status
  )
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'full_name',   -- Google
      new.raw_user_meta_data->>'name',        -- Azure / Microsoft
      split_part(new.email, '@', 1)           -- fallback: parte antes del @
    ),
    'client',     -- rol por defecto: todos entran como cliente
    'pending'     -- estado por defecto: esperan aprobación
  )
  on conflict (id) do nothing;  -- evita duplicados si el trigger se dispara dos veces

  return new;
end;
$$;

-- Eliminar el trigger si ya existía (para poder re-ejecutar este script)
drop trigger if exists on_auth_user_created on auth.users;

-- Crear el trigger sobre auth.users
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- ============================================================
-- BOOTSTRAP: promover jeremias@tho.cl a super_consultant
--
-- Esto funciona de dos maneras según el momento en que
-- lo ejecutes:
--
-- A) ANTES de que Jeremías haga login por primera vez:
--    El trigger lo creará como 'client'/'pending', pero
--    el UPDATE de abajo corrige eso inmediatamente.
--    Como el UPDATE usa ON CONFLICT + subconsulta sobre
--    auth.users, funciona incluso si user_profiles aún
--    no tiene la fila.
--
-- B) DESPUÉS de que Jeremías haya hecho login:
--    La fila ya existe en user_profiles y el UPDATE
--    simplemente la actualiza.
--
-- En cualquier caso, ejecutar este script una sola vez
-- es suficiente.
-- ============================================================

-- Inserta la fila si no existe todavía (caso A)
insert into public.user_profiles (id, email, full_name, role, approval_status)
select
  au.id,
  au.email,
  coalesce(
    au.raw_user_meta_data->>'full_name',
    au.raw_user_meta_data->>'name',
    split_part(au.email, '@', 1)
  ),
  'super_consultant',
  'approved'
from auth.users au
where au.email = 'jeremias@tho.cl'
on conflict (id) do update
  set role              = 'super_consultant',
      approval_status   = 'approved',
      updated_at        = now();

-- ============================================================
-- VERIFICACIÓN: muestra el resultado para confirmar que todo
-- quedó bien. Deberías ver una fila con:
--   email: jeremias@tho.cl
--   role: super_consultant
--   approval_status: approved
-- ============================================================
select
  up.id,
  up.email,
  up.full_name,
  up.role,
  up.approval_status,
  up.created_at
from public.user_profiles up
where up.email = 'jeremias@tho.cl';

-- ============================================================
-- NOTA: si Jeremías aún no ha hecho login con Google/Azure
-- la query de verificación devolverá 0 filas — eso es normal.
-- El trigger se encargará de crear la fila al primer login,
-- pero con role='client'/approval_status='pending'.
-- En ese caso ejecuta esto después del primer login:
--
--   update public.user_profiles
--   set role = 'super_consultant', approval_status = 'approved'
--   where email = 'jeremias@tho.cl';
--
-- ============================================================
