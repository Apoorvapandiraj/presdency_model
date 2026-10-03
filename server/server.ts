/**
 * PUARAI Express server (ESM, TypeScript).
 *
 * - POST /api/ask      : Stage-1 analysis + Stage-2 RAG answer (rate-limited 40/min/IP)
 * - GET  /api/health   : diagnostics (Gemini, vector store, corpus stats)
 * - Serves the built frontend from dist/public in production.
 *
 * The module exports `app` (used by the Vercel function api/index.ts) and
 * only listens when executed directly (`npm start` / `npm run dev:server`).
 */

import { ENV_FILE } from './env.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';

import { isGeminiConfigured } from './geminiClient.js';
import { getCorpusStats } from './corpus.js';
import { MAX_QUERY_LENGTH, analyzeQuery } from './queryAnalyzer.js';
import { apiRateLimiter } from './rateLimiter.js';
import { answerQuery } from './ragEngine.js';
import {
  appendTurns,
  extractProfileDelta,
  fillProfile,
  getSessionHistory,
  sanitizeHistory,
  sanitizeProfile,
  sanitizeSessionId,
  saveSessionProfile,
  touchSession,
} from './sessionStore.js';
import type {
  ApiFailure,
  ApiSuccess,
  AskRequest,
  AskResponseData,
  AskResult,
  Lang,
} from './types.js';
import { vectorStoreStatus } from './vectorStore.js';

const PORT = Number(process.env.PORT) || 8787;
const SUPPORTED_LANGS: Lang[] = ['en', 'hi', 'kn'];

export const app = express();
app.disable('x-powered-by');

// Behind Vercel / container proxies, trust the first hop for req.ip + limiter.
if (process.env.VERCEL || process.env.TRUST_PROXY) {
  app.set('trust proxy', 1);
}

const configuredOrigins = (process.env.CORS_ORIGIN ?? '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors(
    configuredOrigins.length > 0
      ? { origin: configuredOrigins, methods: ['GET', 'POST', 'OPTIONS'] }
      : { origin: true, methods: ['GET', 'POST', 'OPTIONS'] },
  ),
);
app.use(express.json({ limit: '16kb' }));

// Token-bucket rate limiting: 40 requests / minute / IP on the API surface.
app.use('/api', apiRateLimiter);

function failure(code: string, message: string, status: number): ApiFailure {
  return { success: false, error: { code, message, status } };
}

/** Liveness + configuration diagnostics. */
app.get('/api/health', (_req: Request, res: Response) => {
  const payload: ApiSuccess<Record<string, unknown>> = {
    success: true,
    data: {
      status: 'ok',
      service: 'puarai',
      version: '1.0.0',
      uptimeSeconds: Math.round(process.uptime()),
      geminiConfigured: isGeminiConfigured(),
      vectorStore: vectorStoreStatus(),
      corpus: getCorpusStats(),
      rateLimit: { maxRequests: 40, windowSeconds: 60, scope: 'per-IP' },
    },
  };
  res.json(payload);
});

/**
 * STAGE 1 + STAGE 2 pipeline endpoint.
 * Body: { query: string, language?: 'en' | 'hi' | 'kn' }
 */
app.post('/api/ask', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = (req.body ?? {}) as AskRequest & { query?: unknown };

    if (typeof body.query !== 'string' || body.query.trim().length === 0) {
      res
        .status(400)
        .json(failure('INVALID_QUERY', 'Field "query" must be a non-empty string.', 400));
      return;
    }
    if (body.query.length > MAX_QUERY_LENGTH) {
      res
        .status(400)
        .json(
          failure(
            'QUERY_TOO_LONG',
            `Field "query" must be at most ${MAX_QUERY_LENGTH} characters.`,
            400,
          ),
        );
      return;
    }

    const language: Lang = SUPPORTED_LANGS.includes(body.language as Lang)
      ? (body.language as Lang)
      : 'en';

    // Phase 2 — session state: merge profile, load persisted history.
    const sessionId = sanitizeSessionId(body.sessionId);
    const incomingProfile = sanitizeProfile(body.profile);
    let profile = incomingProfile;
    if (sessionId) profile = touchSession(sessionId, incomingProfile);

    // Phase 2 — free-text profile extraction ("I'm Aarav, 3rd Year B.Tech").
    profile = fillProfile(profile, extractProfileDelta(body.query));
    if (sessionId) saveSessionProfile(sessionId, profile);

    const clientHistory = sanitizeHistory(body.history);
    const sessionHistory = sessionId ? getSessionHistory(sessionId) : [];
    const history = clientHistory.length > 0 ? clientHistory : sessionHistory;

    // Stage 1: intent + terminology normalization (slang -> canonical terms).
    // Greetings/starters short-circuit to onboarding when profile is missing.
    const analyzed = analyzeQuery(body.query, language, profile);
    // Stage 2: hybrid retrieval + grounded generation (temp 0.0 + fallback).
    const result: AskResult = await answerQuery(analyzed, {
      profile,
      history,
    });

    // Phase 2 — persist both turns for server-side continuity.
    if (sessionId) {
      appendTurns(sessionId, [
        { role: 'user', text: body.query },
        { role: 'assistant', text: result.directAnswer },
      ]);
    }

    const payload: ApiSuccess<AskResponseData> = {
      success: true,
      data: {
        ...result,
        sessionId: sessionId ?? undefined,
        profile:
          profile && Object.keys(profile).length > 0 ? profile : undefined,
      },
    };
    res.json(payload);
  } catch (error) {
    next(error);
  }
});
/* ── Unknown API routes → structured JSON 404 ─────────────────────────────── */
app.use('/api', (_req: Request, res: Response) => {
  res.status(404).json(failure('NOT_FOUND', 'API route not found.', 404));
});

/* ── Static frontend (production) ───────────────────────────────────────────
 * Monorepo layout: the Express server serves the client workspace's Vite
 * output sitting one directory up from `server/`.
 *   client/dist/public  ← production build (`npm run build` at the root)
 *   client/public       ← raw assets (dev fallback, e.g. favicon)          */
const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(moduleDir, '..'); // …/server
const workspaceRoot = path.resolve(serverRoot, '..'); // repo root
const candidateDirs = [
  path.resolve(serverRoot, '../client/dist/public'), // server/src → client/dist/public
  path.resolve(workspaceRoot, 'client/dist/public'), // tsx server/server.ts
  path.resolve(workspaceRoot, 'client/dist/public'),
  path.resolve(workspaceRoot, 'dist/public'), // legacy single-package layout
  path.resolve(moduleDir, 'public'),
];
const staticDir = candidateDirs.find((dir) =>
  fs.existsSync(path.join(dir, 'index.html')),
);

if (staticDir) {
  app.use(express.static(staticDir, { index: 'index.html', maxAge: '1h' }));
  // SPA history fallback — never shadows /api (handled above).
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET' || req.path.startsWith('/api')) {
      next();
      return;
    }
    res.sendFile(path.join(staticDir, 'index.html'));
  });
}

/* ── Structured error handler (always JSON) ───────────────────────────────── */
app.use(
  (error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const err = error as {
      status?: number;
      statusCode?: number;
      type?: string;
      message?: string;
    };
    const status = err.status ?? err.statusCode ?? 500;

    if (status >= 400 && status < 500) {
      const code =
        err.type === 'entity.parse.failed'
          ? 'INVALID_JSON'
          : 'BAD_REQUEST';
      res
        .status(status)
        .json(failure(code, err.message ?? 'Bad request.', status));
      return;
    }

    console.error('[server] unhandled error:', error);
    res
      .status(500)
      .json(
        failure(
          'INTERNAL_ERROR',
          '500 Internal Server Error — the request could not be completed.',
          500,
        ),
      );
  },
);

/* ── Boot when executed directly (never on Vercel import) ─────────────────── */
const entryArg = process.argv[1] ? path.resolve(process.argv[1]) : '';
const isDirectRun = entryArg !== '' && pathToFileURL(entryArg).href === import.meta.url;

if (isDirectRun) {
  app.listen(PORT, () => {
    const stats = getCorpusStats();
    console.log(`\n  PUARAI backend listening on http://localhost:${PORT}`);
    console.log(`  • corpus      : ${stats.chunks} chunks, ${stats.clauses.length} clauses`);
    console.log(`  • gemini      : ${isGeminiConfigured() ? 'configured' : 'NOT configured (local fallback)'}`);
    console.log(`  • vector store: ${vectorStoreStatus().mongodbConfigured ? 'MongoDB Atlas + TF-IDF' : 'local TF-IDF'}`);
    console.log(`  • rate limit  : 40 requests/minute/IP`);
    console.log(
      `  • .env        : ${ENV_FILE ?? 'none found (using process env)'}\n`,
    );
  });
}

export default app;

