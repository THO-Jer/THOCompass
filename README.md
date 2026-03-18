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
- Existe el rol `super_consultant` para el administrador principal. El bootstrap previsto deja a `jeremias@tho.cl` como superadmin/super consultant inicial.
- Un usuario cliente puede quedar asignado a una o varias organizaciones, pero nunca recibe acceso por defecto: depende de `client_user_access` y `access_status`.
- Buckets de storage separados por módulo:
  - `rc-documents`
  - `do-documents`
  - `esg-documents`


> Nota técnica: en el schema SQL evitamos usar una columna llamada `do` porque `DO` es palabra reservada en PostgreSQL. Por eso en base de datos verás `do_enabled` y `do_score`, aunque en la UI el módulo siga llamándose DO.

## Estado actual

- OAuth ya está preparado en la UI con fallback demo si Supabase no está configurado localmente.
- La carga de archivos ya considera bucket por módulo y conserva el nombre original dentro del path de storage.
- El schema incluye períodos estructurados (`reporting_periods`), historial, agenda, alertas, recomendaciones y storage policies por bucket/carpeta.


## Cómo aplicar cambios al schema en Supabase

No necesitas “borrar todo” ni reemplazar manualmente el contenido anterior de la base. Lo correcto es:

1. Abrir **Supabase → SQL Editor → New query**.
2. Pegar la versión nueva de `supabase/schema.sql`.
3. Ejecutarla completa.

El archivo está escrito mayormente con `create table if not exists`, `create or replace function`, `drop trigger if exists`, `drop policy if exists` e `insert ... on conflict`, así que está pensado para re-ejecutarse sin romper la base en cada iteración.

## Cómo diferenciar solicitudes de consultores vs clientes

La recomendación por ahora es manejarlo desde dos capas:

1. **`user_profiles.role` + `approval_status`**
   - Todo usuario nuevo entra por trigger como `client` + `pending`.
   - Si una persona realmente será consultora, la promueves manualmente a `consultant` o `super_consultant`.
   - Esto te permite usar el centro de control como puerta de aprobación.

2. **`client_user_access`**
   - Incluso si un usuario está aprobado como `client`, no ve nada por defecto.
   - Solo ve organizaciones donde exista una fila aprobada en `client_user_access`.
   - Así distingues entre “usuario autenticado” y “usuario autorizado para un cliente concreto”.

En otras palabras:

- **Solicitud de consultor**: la resuelves cambiando `role` a `consultant` (o `super_consultant`) y `approval_status` a `approved`.
- **Solicitud de cliente**: mantienes `role='client'`, apruebas `approval_status`, y luego le otorgas acceso a una o más organizaciones vía `client_user_access`.

Más adelante, si quieres un inbox más explícito, podemos agregar una tabla `access_requests`, pero con el modelo actual ya puedes manejarlo desde el control de accesos.


## Control de accesos (consultores vs clientes)

Sí: por ahora la diferenciación entre solicitudes de consultores y clientes se maneja desde el **control de accesos**.

- Todo usuario nuevo entra por OAuth como `client` + `pending`.
- Si realmente será consultor, lo promueves a `consultant` o `super_consultant`.
- Si será cliente, mantienes `role='client'`, lo apruebas y luego le asignas una o más organizaciones vía `client_user_access`.

Esto permite que ningún usuario vea información sensible por defecto, incluso después de autenticarse correctamente.
