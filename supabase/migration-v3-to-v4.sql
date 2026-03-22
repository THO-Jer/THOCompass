-- ============================================================
-- THO Compass · Migración v3 → v4
-- Columnas adicionales requeridas por los nuevos componentes.
-- Ejecutar en: Supabase → SQL Editor → New query
-- Es seguro re-ejecutar (usa ADD COLUMN IF NOT EXISTS).
-- ============================================================

-- ============================================================
-- 1. PROJECTS — columnas que usa ModuleRC, ModuleDO, ModuleESG
-- ============================================================

-- Controla si el proyecto aparece en el dashboard del cliente.
-- Usado en: ModuleRC, ModuleDO, ModuleESG (toggle visible/oculto),
--           ClientDashboard (solo proyectos con client_visible = true).
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS client_visible boolean NOT NULL DEFAULT false;

-- Alcance del proyecto (ej. "Empresa completa", "Gerencia de Operaciones").
-- Visible en el selector de proyecto del módulo DO.
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS scope text;

-- Índice para queries frecuentes en ClientDashboard
CREATE INDEX IF NOT EXISTS idx_projects_client_visible
  ON public.projects (client_id, client_visible);

-- ============================================================
-- 2. PROJECT_SCORES — columnas para ESG maturity y GRI
-- ============================================================

-- score_drivers_json ya existe en el schema actual.
-- Lo usamos para guardar:
--   { maturity: { ambiental: 3, social: 4, gobernanza: 3 },
--     gri_compliance: { ambiental: {...}, social: {...}, gobernanza: {...} },
--     indicators: { ambiental: {...}, social: {...}, gobernanza: {...} },
--     active_pillars: { ambiental: true, social: true, gobernanza: true } }
-- No requiere columna nueva, se almacena en score_drivers_json (jsonb).

-- ============================================================
-- 3. PROJECT_ACTIVITIES — columna pillar para ModuleESG
-- ============================================================

-- En ModuleESG, los reportes tienen un pilar (ambiental/social/gobernanza).
-- Se guarda en una columna separada para facilitar el filtro por pilar.
ALTER TABLE public.project_activities
  ADD COLUMN IF NOT EXISTS pillar text
    CHECK (pillar IS NULL OR pillar IN ('ambiental', 'social', 'gobernanza'));

-- ============================================================
-- 4. CLIENT_MODULES — columna para pilares ESG activos
-- ============================================================

-- active_pillars_json guarda qué pilares ESG están activos para este cliente.
-- Ejemplo: { "ambiental": true, "social": true, "gobernanza": true }
-- Cuando el cliente no tiene especialista ambiental, se pone ambiental: false.
ALTER TABLE public.client_modules
  ADD COLUMN IF NOT EXISTS active_pillars_json jsonb
    DEFAULT '{"ambiental": true, "social": true, "gobernanza": true}'::jsonb;

-- ============================================================
-- 5. CLIENTS — columna para contacto del consultor asignado
-- ============================================================

-- Visible en el dashboard del cliente como "Asesoría a cargo".
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS contact_consultant text;

-- ============================================================
-- 6. PROJECT_ACTIVITIES — columna participants_count ya existe.
--    Verificar que organizations_count también (existe en schema actual).
-- ============================================================
-- No requiere cambio. Ambas columnas ya están en el schema v3.

-- ============================================================
-- 7. RLS — políticas para las nuevas columnas
-- ============================================================
-- Las políticas existentes ya cubren las tablas afectadas.
-- Las nuevas columnas heredan las políticas de sus tablas.
-- No se requieren nuevas políticas.

-- ============================================================
-- VERIFICACIÓN
-- Ejecutar después de la migración para confirmar:
-- ============================================================
SELECT
  table_name,
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('projects','project_activities','client_modules','clients')
  AND column_name IN (
    'client_visible','scope','pillar',
    'active_pillars_json','contact_consultant'
  )
ORDER BY table_name, column_name;
