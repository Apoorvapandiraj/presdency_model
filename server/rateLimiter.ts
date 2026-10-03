/**
 * In-memory token-bucket rate limiting — 40 requests per minute per IP
 * (applied to the /api surface by server.ts). Buckets refill continuously;
 * a periodic sweep bounds memory usage under IP churn.
 *
 * A mirror of this quota is enforced client-side in src/lib/api.ts so the UI
 * can pre-warn users before a round-trip, but the authoritative guard lives
 * here on the server.
 */

import type { NextFunction, Request, Response } from 'express';

export interface RateLimitConfig {
  /** Maximum burst = number of requests allowed in one window. */
  capacity: number;
  /** Refill window in milliseconds (full capacity is restored per window). */
  windowMs: number;
  label?: string;
}

export class TokenBucket {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private readonly capacity: number,
    private readonly windowMs: number,
  ) {
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  consume(cost = 1): { allowed: boolean; remaining: number; retryAfterSec: number } {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    if (elapsed > 0) {
      const refill = (elapsed / this.windowMs) * this.capacity;
      this.tokens = Math.min(this.capacity, this.tokens + refill);
      this.lastRefill = now;
    }

    if (this.tokens >= cost) {
      this.tokens -= cost;
      return { allowed: true, remaining: Math.floor(this.tokens), retryAfterSec: 0 };
    }

    const deficit = cost - this.tokens;
    const msNeeded = (deficit / this.capacity) * this.windowMs;
    return {
      allowed: false,
      remaining: 0,
      retryAfterSec: Math.max(1, Math.ceil(msNeeded / 1000)),
    };
  }
}

function clientKey(req: Request): string {
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

/** Express middleware factory backed by per-IP token buckets. */
export function rateLimit(config: RateLimitConfig): (
  req: Request,
  res: Response,
  next: NextFunction,
) => void {
  const buckets = new Map<string, TokenBucket>();
  let lastSweep = Date.now();
  const SWEEP_EVERY_MS = 10 * 60_000;

  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now();
    if (now - lastSweep > SWEEP_EVERY_MS) {
      buckets.clear();
      lastSweep = now;
    }

    const key = clientKey(req);
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = new TokenBucket(config.capacity, config.windowMs);
      buckets.set(key, bucket);
    }

    const result = bucket.consume();
    res.setHeader('X-RateLimit-Limit', String(config.capacity));
    res.setHeader('X-RateLimit-Remaining', String(result.remaining));

    if (!result.allowed) {
      res.setHeader('Retry-After', String(result.retryAfterSec));
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMITED',
          status: 429,
          message:
            `Rate limit exceeded: max ${config.capacity} requests per ` +
            `${Math.round(config.windowMs / 1000)}s per IP. ` +
            `Retry in ${result.retryAfterSec}s.`,
          retryAfter: result.retryAfterSec,
        },
      });
      return;
    }

    next();
  };
}

/** Production quota required by the spec: 40 requests / minute / IP. */
export const apiRateLimiter = rateLimit({
  capacity: 40,
  windowMs: 60_000,
  label: 'api-40-per-min',
});
