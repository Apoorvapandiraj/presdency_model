/**
 * Vercel serverless entrypoint (repo root `/api`, auto-routed by Vercel).
 *
 * The canonical Express application lives in the `server` workspace and is
 * exported from `server/api/index.ts`. This thin shim exists because Vercel
 * only auto-discovers serverless functions inside a root `api/` directory —
 * keeping the handler here preserves the proven `/api/(.*)` → `/api/index`
 * rewrite in `vercel.json` while all real logic stays in `server/`.
 *
 * Local development never uses this file: the Vite dev server proxies `/api`
 * to the Express server on http://localhost:8787 (`npm run dev:server`).
 */

export { default } from '../server/api/index.js';