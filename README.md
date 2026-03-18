# THO Compass

Prototipo React + Vite del panel THO Compass, preparado para integrar autenticación OAuth con Supabase, persistencia de clientes y storage de documentos por módulo.

## Variables de entorno

Crea un `.env.local` basado en `.env.example`:

```bash
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
VITE_APP_URL=https://tu-dominio-vercel.vercel.app
```

## Ejecutar en local

```bash
npm install
npm run dev
```

## Auth y Supabase

- Cliente Supabase: `src/lib/supabase.js`
- Esquema SQL + RLS + storage policies: `supabase/schema.sql`
- Providers esperados: **solo** Google OAuth y Microsoft/Azure OAuth.
- No se considera Email Auth / magic link en este flujo.
- El callback del frontend ahora se resuelve en `VITE_APP_URL/auth/callback` (o `window.location.origin/auth/callback` como fallback).

## Checklist para evitar `ERR_CONNECTION_REFUSED`

### 1. En Vercel
Define:

```bash
VITE_APP_URL=https://TU-DOMINIO-REAL.vercel.app
```

No uses localhost en producción.

### 2. En Supabase → Authentication → URL Configuration
Debes dejar:

- **Site URL**: `https://TU-DOMINIO-REAL.vercel.app`
- **Redirect URLs**:
  - `https://TU-DOMINIO-REAL.vercel.app/auth/callback`
  - opcional para local: `http://localhost:5173/auth/callback`

### 3. En Google Cloud Console
En el cliente OAuth de Google, el redirect URI **no** debe ser tu dominio Vercel directo, sino el callback de Supabase:

```text
https://<PROJECT-REF>.supabase.co/auth/v1/callback
```

### 4. En Microsoft Entra / Azure
En la app registrada, el redirect URI también debe ser:

```text
https://<PROJECT-REF>.supabase.co/auth/v1/callback
```

### 5. En esta app
La app redirige a Supabase con `redirectTo = https://TU-DOMINIO-REAL.vercel.app/auth/callback`, y Vercel ahora reescribe esa ruta a `index.html` mediante `vercel.json`.

## Flujo previsto

- Usuarios cliente: se autentican con Google/Microsoft y luego quedan pendientes de aprobación/asignación a cliente.
- Usuarios consultora: se autentican con Google/Microsoft y ven todos los clientes una vez aprobados.
- Existe el rol `super_consultant` para el administrador principal.
- Un usuario cliente puede quedar asignado a una o varias organizaciones, pero nunca recibe acceso por defecto: depende de `client_user_access` y `access_status`.
- Buckets de storage separados por módulo:
  - `rc-documents`
  - `do-documents`
  - `esg-documents`

## Estado actual

- OAuth ya está preparado en la UI con fallback demo si Supabase no está configurado localmente.
- La carga de archivos ya considera bucket por módulo y conserva el nombre original dentro del path de storage.
- El schema incluye períodos estructurados (`reporting_periods`), historial, agenda, alertas, recomendaciones y storage policies por bucket/carpeta.
