# THO Compass v0.2

Plataforma SaaS de THO Consultora para gestión de reputación corporativa.
Módulos: Relacionamiento Comunitario (RC) · Desarrollo Organizacional (DO) · Sostenibilidad (ESG).

## Stack

- React 18 + Vite 5
- Supabase (PostgreSQL + Auth + Storage)
- Recharts
- Vercel (deploy)

## Setup local

```bash
# 1. Instalar dependencias
npm install

# 2. Variables de entorno
cp .env.example .env
# Editar .env con las credenciales de tu proyecto Supabase

# 3. Base de datos
# Ejecutar en Supabase → SQL Editor en este orden:
#   supabase/schema.sql           ← schema completo
#   supabase/bootstrap.sql        ← trigger + usuario inicial
#   supabase/migration-v3-to-v4.sql  ← columnas nuevas (si ya tenías schema anterior)

# 4. Dev server
npm run dev
```

## Estructura

```
src/
├── App.jsx                    Shell principal: auth, routing, sidebar
├── main.jsx                   Entry point
├── components/
│   ├── AdminPage.jsx          Usuarios, permisos, empresas, equipo consultor
│   ├── ApprovalPanel.jsx      Panel de aprobación de usuarios
│   ├── ClientDashboard.jsx    Dashboard del cliente con detalle por módulo
│   ├── ClientsPage.jsx        Gestión de clientes y proyectos
│   ├── ModuleDO.jsx           Módulo Desarrollo Organizacional
│   ├── ModuleESG.jsx          Módulo Sostenibilidad + framework GRI
│   ├── ModuleRC.jsx           Módulo Relacionamiento Comunitario
│   └── PendingAccess.jsx      Pantalla acceso pendiente de aprobación
├── hooks/
│   └── useAuthGuard.js        Auth hook + helpers CRUD de usuarios
└── lib/
    └── supabase.js            Cliente Supabase + helpers de datos
supabase/
├── schema.sql                 Schema completo v3.1
├── bootstrap.sql              Trigger handle_new_user + bootstrap jeremias@tho.cl
└── migration-v3-to-v4.sql    Columnas nuevas (seguro re-ejecutar)
```

## Autenticación

OAuth Google y Microsoft (Azure AD). Todos los usuarios nuevos entran como `client/pending`.
El super_consultant los aprueba desde Administración y los asigna a una empresa.

`jeremias@tho.cl` es promovido automáticamente a `super_consultant` por el bootstrap.
Este comportamiento está en `useAuthGuard.js → applyBootstrap()` y se puede eliminar
una vez que el registro en Supabase esté confirmado.

## Datos mock

Todos los componentes funcionan con datos hardcodeados mientras no se conecten a Supabase.
Las constantes `MOCK_*` en cada componente documentan el query Supabase equivalente.
La conexión real se hace reemplazando esas constantes por llamadas a las funciones de
`src/lib/supabase.js` y `src/hooks/useAuthGuard.js`.

## Buckets de Storage

Crear en Supabase → Storage (se crean automáticamente al ejecutar schema.sql):
- `rc-documents`  — archivos del módulo RC
- `do-documents`  — archivos del módulo DO
- `esg-documents` — archivos del módulo ESG

Ruta de archivos: `{client_id}/{module_key}/{project_id}/{timestamp}_{filename}`

## Deploy en Vercel

1. Conectar el repo de GitHub a Vercel
2. Agregar las variables de entorno (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_APP_URL`)
3. Vercel detecta automáticamente Vite y hace el build
4. En Supabase → Authentication → URL Configuration: agregar `https://tu-dominio.vercel.app/auth/callback`
