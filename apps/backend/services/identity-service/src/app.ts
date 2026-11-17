import type { Express } from 'express';
import type pg from 'pg';
import { TokenService } from '@saudaro/authentication';
import { assertSafeRuntimeRole } from '@saudaro/database-utils';
import type { Logger } from '@saudaro/logger';
import type { MetricsRegistry } from '@saudaro/observability';
import { createServiceApp } from '@saudaro/service-kit';
import { createAuthService } from './application/auth-service.ts';
import type { IdentityConfig } from './config/env.ts';
import { mountRoutes } from './http/routes.ts';
import { createCompanyClient } from './infrastructure/clients/company-client.ts';

export const SERVICE_NAME = 'identity-service';
export const SERVICE_VERSION = '0.2.0';
export const SCHEMA = 'identity';

/**
 * Readiness = database reachable AND the role is least-privilege AND this service's migrations have been
 * applied. Anything else takes the instance out of rotation (HTTP 503 from /health/ready).
 */
export async function checkReadiness(pool: pg.Pool): Promise<void> {
  await pool.query('select 1');
  await assertSafeRuntimeRole(pool);
  const r = await pool.query<{ t: string | null }>(`select to_regclass('${SCHEMA}.outbox_events')::text as t`);
  if (!r.rows[0]?.t) throw new Error('database migrations have not been applied');
}

export function buildApp(deps: { config: IdentityConfig; logger: Logger; pool: pg.Pool; metrics?: MetricsRegistry }): Express {
  const signing = deps.config.AUTH_SIGNING_JWK;
  const tokens = new TokenService({
    issuer: deps.config.AUTH_ISSUER,
    audience: deps.config.AUTH_AUDIENCE,
    signingKey: signing,
    // Own signing key always published, so JWKS stays correct even if AUTH_PUBLIC_JWKS omits it.
    verificationKeys: [signing.publicJwk, ...deps.config.AUTH_PUBLIC_JWKS.filter((k) => k.kid !== signing.kid)],
  });
  const auth = createAuthService({
    pool: deps.pool,
    tokens,
    company: createCompanyClient(deps.config.COMPANY_SERVICE_URL, tokens, SERVICE_NAME),
    refreshTtlSeconds: deps.config.REFRESH_TTL_SECONDS,
  });
  return createServiceApp({
    serviceName: SERVICE_NAME,
    version: SERVICE_VERSION,
    logger: deps.logger,
    isDevelopment: deps.config.NODE_ENV !== 'production',
    readiness: () => checkReadiness(deps.pool),
    ...(deps.metrics ? { metrics: deps.metrics } : {}),
    routes: (app) => mountRoutes(app, { auth, tokens, serviceName: SERVICE_NAME }),
  });
}
