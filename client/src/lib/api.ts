/**
 * API client for PUARAI.
 *
 * - Enforces the spec's client-side token-bucket quota (40 req/min) using
 *   localStorage-persisted timestamps BEFORE any network call.
 * - Maps server envelopes (success / rate-limit / validation) to typed errors.
 * - On network failure, transparently answers via the local RAG fallback
 *   (src/lib/localRag.ts → src/lib/vectorStore.ts) so the UI never dead-ends.
 */

import type {
  ApiFailure,
  ApiSuccess,
  AskResponseData,
  ChatTurn,
  Lang,
  StudentProfile,
} from '../types';
import { localAsk } from './localRag';

const API_BASE =
  (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, '') ??
  '/api';

const CLIENT_LIMIT = 40;
const CLIENT_WINDOW_MS = 60_000;
const STORAGE_KEY = 'puarai.client-quota';
const REQUEST_TIMEOUT_MS = 30_000;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function readStamps(): number[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((n): n is number => typeof n === 'number');
  } catch {
    return [];
  }
}

function writeStamps(stamps: number[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stamps));
  } catch {
    // Private mode — quota simply resets per page load.
  }
}

function activeStamps(now: number): number[] {
  return readStamps().filter((ts) => now - ts < CLIENT_WINDOW_MS);
}

export interface ClientQuota {
  remaining: number;
  retryAfterSeconds: number;
}

/** Inspects the local token bucket without consuming a token. */
export function peekClientQuota(): ClientQuota {
  const now = Date.now();
  const stamps = activeStamps(now);
  if (stamps.length >= CLIENT_LIMIT) {
    const oldest = Math.min(...stamps);
    return {
      remaining: 0,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((oldest + CLIENT_WINDOW_MS - now) / 1000),
      ),
    };
  }
  return { remaining: CLIENT_LIMIT - stamps.length, retryAfterSeconds: 0 };
}

function consumeClientToken(): void {
  const now = Date.now();
  const stamps = activeStamps(now);
  stamps.push(now);
  writeStamps(stamps);
}

export interface AskOptions {
  signal?: AbortSignal;
  /**
   * FIX: when true and the request fails offline, the local fallback returns
   * the exact off-topic refusal instead of a grounded answer.
   */
  localRefusal?: boolean;
}

/** Phase 2 — session state sent with every question. */
export interface AskExtras {
  sessionId?: string;
  profile?: StudentProfile;
  history?: ChatTurn[];
}

/**
 * Posts a question to /api/ask (with session/profile/history context). Falls
 * back to the in-browser RAG engine when the backend is unreachable; throws
 * ApiError for quota/validation failures.
 */
export async function askQuestion(
  query: string,
  language: Lang,
  extras: AskExtras = {},
  options: AskOptions = {},
): Promise<ApiSuccess<AskResponseData>> {
  const quota = peekClientQuota();
  if (quota.remaining <= 0) {
    throw new ApiError(
      `Client rate limit reached (${CLIENT_LIMIT}/min). Retry in ${quota.retryAfterSeconds}s.`,
      429,
      'CLIENT_RATE_LIMITED',
      quota.retryAfterSeconds,
    );
  }
  consumeClientToken();

  const controller = new AbortController();
  const timer = window.setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT_MS,
  );
  const onAbort = () => controller.abort();
  options.signal?.addEventListener('abort', onAbort);

  try {
    const response = await fetch(`${API_BASE}/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, language, ...extras }),
      signal: controller.signal,
    });

    let payload: ApiSuccess<AskResponseData> | ApiFailure | null = null;
    try {
      payload = (await response.json()) as
        | ApiSuccess<AskResponseData>
        | ApiFailure;
    } catch {
      payload = null;
    }

    if (response.status === 429) {
      const retry =
        payload && payload.success === false
          ? (payload.error.retryAfter ?? 60)
          : 60;
      throw new ApiError(
        payload && payload.success === false
          ? payload.error.message
          : 'Rate limit exceeded.',
        429,
        'RATE_LIMITED',
        retry,
      );
    }

    if (!payload) {
      throw new ApiError(
        `Request failed with status ${response.status}.`,
        response.status,
        'INVALID_RESPONSE',
      );
    }

    if (payload.success === false) {
      throw new ApiError(
        payload.error.message,
        payload.error.status,
        payload.error.code,
        payload.error.retryAfter,
      );
    }

    if (!response.ok) {
      throw new ApiError(
        `Request failed with status ${response.status}.`,
        response.status,
        'HTTP_ERROR',
      );
    }

    return payload;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    // Network error / timeout / offline → local engine (or exact refusal
    // parity when the ask originated from an off-scope path).
    return localAsk(query, language, extras.profile, options.localRefusal);
  } finally {
    window.clearTimeout(timer);
    options.signal?.removeEventListener('abort', onAbort);
  }
}

/** Lightweight health probe used by the footer status pill. */
export async function fetchHealth(): Promise<{
  ok: boolean;
  geminiConfigured?: boolean;
}> {
  try {
    const response = await fetch(`${API_BASE}/health`, {
      signal: AbortSignal.timeout(4_000),
    });
    if (!response.ok) return { ok: false };
    const json = (await response.json()) as {
      success: boolean;
      data?: { geminiConfigured?: boolean };
    };
    return {
      ok: json.success === true,
      geminiConfigured: json.data?.geminiConfigured,
    };
  } catch {
    return { ok: false };
  }
}
