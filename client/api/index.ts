/**
 * Local /api handler stub for the client workspace.
 *
 * Vercel routes requests through the root `api/index.ts` shim to the canonical
 * handler in `server/api/index.ts`. In local development the Vite dev server
 * proxies `/api` straight to Express on port 8787, so this stub is intentionally
 * never reached — it prevents a client-workspace API request from falling
 * through to the SPA's index.html and returning HTML where JSON is expected.
 *
 * Run the backend with:  npm run dev:server   (from the repo root)
 */

import type { IncomingMessage, ServerResponse } from 'node:http';

export default function handler(
  _req: IncomingMessage,
  res: ServerResponse,
): void {
  res.statusCode = 503;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(
    JSON.stringify({
      success: false,
      error: {
        code: 'API_NOT_LOCAL',
        status: 503,
        message:
          'This serverless function runs on Vercel only. Start the Express backend with `npm run dev:server` (port 8787) — the Vite dev server proxies /api to it.',
      },
    }),
  );
}