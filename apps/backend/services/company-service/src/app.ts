import type { Express } from 'express';
import type pg from 'pg';
import { TokenService, type TokenServiceOptions } from '@saudaro/authentication';
import { assertSafeRuntimeRole } from '@saudaro/database-utils';
import type { Logger } from '@saudaro/logger';
import type { MetricsRegistry } from '@saudaro/observability';
import { createServiceApp } from '@saudaro/service-kit';
import type { CompanyConfig } from './config/env.ts';
import { mountRoutes } from './http/routes.ts';

export const SERVICE_NAME = 'company-service';
export const SERVICE_VERSION = '0.2.0';
const SCHEMA = 'company';

/**
 * Readiness = database reachable AND the role is least-privilege AND this service's migrations have been
 * applied. Anything else takes the instance out of rotation (HTTP 503 from /health/ready).
 */
export async function checkReadiness(pool: pg.Pool): Promise<void> {
  await pool.query('select 1');
  await assertSafeRuntimeRole(pool);
  const r = await pool.query<{ t: string | null }>(
    `select to_regclass('${SCHEMA}.outbox_events')::text as t`,
  );
  if (!r.rows[0]?.t) throw new Error('database migrations have not been applied');
}

export function buildApp(deps: {
  config: CompanyConfig;
  logger: Logger;
  pool: pg.Pool;
  metrics?: MetricsRegistry;
}): Express {
  // Verification only: this service holds no signing key.
  const tokens = new TokenService({
    issuer: deps.config.AUTH_ISSUER,
    audience: deps.config.AUTH_AUDIENCE,
    verificationKeys: deps.config.AUTH_PUBLIC_JWKS as TokenServiceOptions['verificationKeys'],
  });
  return createServiceApp({
    serviceName: SERVICE_NAME,
    version: SERVICE_VERSION,
    logger: deps.logger,
    isDevelopment: deps.config.NODE_ENV !== 'production',
    readiness: () => checkReadiness(deps.pool),
    ...(deps.metrics ? { metrics: deps.metrics } : {}),
    routes: (app) => mountRoutes(app, { pool: deps.pool, tokens, serviceName: SERVICE_NAME }),
  });
}
