# Restorano — Frontend

React 19 + TypeScript SPA built with Vite and Tailwind CSS v4.

See the [root README](../README.md) for full project documentation.

## Dev

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build → dist/
```

The dev server proxies `/api` to `http://localhost:8080` (backend, not yet built).
Currently runs entirely on mock data in `src/store/layoutStore.ts`.
