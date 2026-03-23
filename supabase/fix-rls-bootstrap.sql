-- ============================================================
-- THO Compass · Fix RLS + Bootstrap
-- Ejecutar si: al crear empresas aparece error 42501
-- o si jeremias@tho.cl no puede operar como super_consultant
-- ============================================================

-- 1. Promover jeremias@tho.cl a super_consultant/approved
--    (seguro re-ejecutar)
INSERT INTO public.user_profiles (id, email, full_name, role, approval_status)
SELECT
  au.id,
  au.email,
  coalesce(au.raw_user_meta_data->>'full_name',
           au.raw_user_meta_data->>'name',
           split_part(au.email,'@',1)),
  'super_consultant',
  'approved'
FROM auth.users au
WHERE au.email = 'jeremias@tho.cl'
ON CONFLICT (id) DO UPDATE
  SET role            = 'super_consultant',
      approval_status = 'approved',
      updated_at      = now();

-- 2. Verificar que el usuario puede insertar en clients
--    (debería retornar true después del paso 1)
SELECT public.is_consultant() AS puede_insertar_clientes;

-- 3. Si sigue fallando, revisar que el usuario esté logueado
--    con el email correcto en Supabase → Authentication → Users
