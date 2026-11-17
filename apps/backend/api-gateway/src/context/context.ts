import type { Request } from 'express';
import type { Logger } from '@saudaro/logger';
import { AuthenticationError, normalizeError } from '@saudaro/error-handling';
import type { AccessClaims, TokenService } from '@saudaro/authentication';
import type { ServiceClient } from '../clients/services.ts';

/** Everything a resolver may use. Built per request: nothing here is shared between callers. */
export interface GatewayContext {
  requestId: string;
  correlationId: string;
  logger: Logger;
  /** Verified token claims, or null for anonymous callers. Tenant ids ONLY ever come from here. */
  claims: AccessClaims | null;
  /** Why authentication failed (surfaced only when a protected field is requested). */
  authError: AuthenticationError | null;
  /** The caller's raw access token, set only when it verified; forwarded to services as x-user-token. */
  accessToken: string | undefined;
  services: ServiceClient;
}

export interface ContextDeps {
  tokens: TokenService;
  logger: Logger;
  services: ServiceClient;
}

/**
 * Verifies the bearer token once per request. An invalid/expired token never blocks PUBLIC fields; protected
 * fields call requireAuth(), which throws the precise (safe) authentication error.
 */
export async function buildContext(req: Request, deps: ContextDeps): Promise<GatewayContext> {
  const header = req.header('authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
  let claims: AccessClaims | null = null;
  let authError: AuthenticationError | null = null;
  if (token) {
    try {
      claims = await deps.tokens.verifyAccess(token);
    } catch (err) {
      const normalized = normalizeError(err);
      authError = normalized instanceof AuthenticationError ? normalized : new AuthenticationError();
    }
  }
  return {
    requestId: req.id,
    correlationId: req.correlationId,
    logger: deps.logger.child({ requestId: req.id, correlationId: req.correlationId }),
    claims,
    authError,
    accessToken: claims ? token : undefined,
    services: deps.services,
  };
}

/** Field-level guard: returns the claims or throws AUTHENTICATION_ERROR / TOKEN_EXPIRED. */
export function requireAuth(ctx: GatewayContext): AccessClaims {
  if (ctx.claims) return ctx.claims;
  throw ctx.authError ?? new AuthenticationError('Authentication is required.', { code: 'AUTHENTICATION_REQUIRED' });
}

