# THO Compass

Prototipo React + Vite del panel THO Compass, ahora preparado para integrar autenticación OAuth con Supabase, persistencia de clientes y storage de documentos por módulo.

## Variables de entorno

Crea un `.env.local` basado en `.env.example`:

```bash
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

## Ejecutar en local

```bash
npm install
npm run dev
```

## Auth y Supabase

- Cliente Supabase: `src/lib/supabase.js`
- Esquema inicial SQL + RLS + buckets: `supabase/schema.sql`
- Providers esperados: Google OAuth y Microsoft/Azure OAuth.

## Flujo previsto

- Usuarios cliente: se autentican con Google/Microsoft y luego quedan pendientes de aprobación/asignación a cliente.
- Usuarios consultora: se autentican con Google/Microsoft y ven todos los clientes una vez aprobados.
- Buckets de storage separados por módulo:
  - `rc-documents`
  - `do-documents`
  - `esg-documents`

## Estado actual

- OAuth ya está preparado en la UI con fallback demo si Supabase no está configurado.
- La carga de archivos ya considera bucket por módulo y conserva el nombre original dentro del path de storage.
- El selector visual de archivos existentes en Storage quedó anunciado en UI como siguiente iteración.
