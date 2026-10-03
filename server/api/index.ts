/**
 * Vercel Serverless entry (also served locally by the client workspace's
 * api stub via /api forwarding) — exports the Express app as the function
 * handler. vercel.json rewrites `/api/*` to this function; the Express router
 * then handles /api/ask, /api/health, etc. Only listen when run directly
 * under Node (`npm start`), never on import.
 */

import app from '../server.js';

export default app;
