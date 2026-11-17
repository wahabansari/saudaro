import type { ErrorRequestHandler, NextFunction, Request, RequestHandler, Response } from 'express';
import { safeError, type Logger } from '@saudaro/logger';
import { NotFoundError } from './errors.ts';
import { normalizeError } from './normalize.ts';
import { toErrorBody } from './rest.ts';

declare module 'express-serve-static-core' {
  interface Request {
    id: string;
    correlationId: string;
  }
}

/** Express 5 forwards rejected promises already; this wrapper keeps handlers explicit and typed. */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new NotFoundError(`Route ${req.method} ${req.path} was not found.`, { code: 'ROUTE_NOT_FOUND' }));
};

/**
 * Centralised error middleware: normalise → log (server-side detail only) → respond with the standard
 * envelope. Stack traces are exposed only when `isDevelopment`.
 */
export function createErrorMiddleware(opts: {
  logger: Logger;
  isDevelopment?: boolean;
}): ErrorRequestHandler {
  return (err, req, res, next) => {
    if (res.headersSent) {
      next(err);
      return;
    }
    const app = normalizeError(err);
    const requestId = req.id ?? 'unknown';
    const meta = {
      requestId,
      correlationId: req.correlationId,
      code: app.code,
      status: app.httpStatus,
      path: req.path,
    };
    if (app.httpStatus >= 500)
      opts.logger.error({ ...meta, err: safeError(app.cause ?? err) }, 'request failed');
    else opts.logger.warn(meta, 'request rejected');
    if (app.retryAfterSeconds !== undefined) res.setHeader('Retry-After', String(app.retryAfterSeconds));
    res
      .status(app.httpStatus)
      .json(toErrorBody(app, { requestId, includeStack: opts.isDevelopment === true }));
  };
}
