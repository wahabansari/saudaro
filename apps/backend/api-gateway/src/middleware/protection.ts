import cors from 'cors';
import { rateLimit, ipKeyGenerator } from 'express-rate-limit';
import type { RequestHandler } from 'express';
import { RateLimitError } from '@saudaro/error-handling';

/** CORS: exact-origin allowlist (no wildcard), no cookies, short preflight cache. */
export function corsMiddleware(origins: string[]): RequestHandler {
  const allowed = new Set(origins);
  return cors({
    origin: (origin, cb) => cb(null, !origin || allowed.has(origin)),
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['authorization', 'content-type', 'x-request-id', 'x-correlation-id'],
    exposedHeaders: ['x-request-id', 'x-correlation-id', 'retry-after'],
    credentials: false,
    maxAge: 600,
  });
}

/**
 * Per-caller rate limit (memory store: correct for ONE gateway instance; limits hold across replicas only
 * with a shared Redis store). Keyed by client IP — authenticated limits per
 * user/company are layered on top once identity is wired.
 */
export function rateLimiter(opts: { windowMs: number; max: number }): RequestHandler {
  return rateLimit({
    windowMs: opts.windowMs,
    limit: opts.max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: (req) => ipKeyGenerator(req.ip ?? 'unknown'),
    handler: (_req, _res, next, options) => {
      next(new RateLimitError(undefined, { retryAfterSeconds: Math.ceil(options.windowMs / 1000) }));
    },
  });
}
