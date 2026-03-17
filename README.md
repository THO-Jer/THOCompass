# THO Compass

Preparé el proyecto para que se pueda ejecutar como una app React (Vite) y arreglé un error de sintaxis que impedía renderizar el menú lateral.

## Ejecutar en local

```bash
npm install
npm run dev
```

Luego abre la URL que muestra Vite (por defecto `http://localhost:5173`).

## Qué se corrigió

- Se creó el bootstrap de aplicación (`index.html`, `src/main.jsx`, `package.json`).
- Se incorporó el componente principal en `src/App.jsx`.
- Se corrigió `opacity:item.locked?.35:1` por `opacity:item.locked ? .35 : 1`.
