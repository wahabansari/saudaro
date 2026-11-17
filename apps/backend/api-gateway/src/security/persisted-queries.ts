import type { RequestHandler } from 'express';
import { ValidationError } from '@saudaro/error-handling';

/**
 * Persisted-query ALLOWLIST. In `enforce` mode (production) the server executes ONLY operations whose
 * SHA-256 is in the build-time allowlist; the client-supplied `query` text is discarded, so arbitrary
 * queries (including expensive ones) cannot be run even by an authenticated user. Unknown hashes are
 * rejected — the server never "registers" queries from clients.
 * In development (`enforce=false`) arbitrary queries remain allowed for GraphiQL and exploration.
 */
export function persistedQueries(opts: { allowlist: Map<string, string>; enforce: boolean }): RequestHandler {
  return (req, _res, next) => {
    if (req.method !== 'POST' || typeof req.body !== 'object' || req.body === null) {
      next();
      return;
    }
    const body = req.body as { query?: unknown; extensions?: { persistedQuery?: { sha256Hash?: unknown } } };
    const hash = body.extensions?.persistedQuery?.sha256Hash;
    if (typeof hash === 'string') {
      const text = opts.allowlist.get(hash.toLowerCase());
      if (!text) {
        next(new ValidationError('The requested operation is not allowed.', { code: 'PERSISTED_QUERY_NOT_FOUND' }));
        return;
      }
      body.query = text; // always the allowlisted text, never what the client sent
      next();
      return;
    }
    if (opts.enforce) {
      next(new ValidationError('Only registered operations may be executed.', { code: 'PERSISTED_QUERY_REQUIRED' }));
      return;
    }
    next();
  };
}
