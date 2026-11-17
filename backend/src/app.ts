import { randomUUID } from 'node:crypto';
import helmet from '@fastify/helmet';
import Fastify, { type FastifyInstance } from 'fastify';
import type pg from 'pg';
import { AppError, mapDatabaseError } from './common/errors.ts';
import type { Env } from './config/env.ts';
import { createPool } from './database/client.ts';
import { healthRoutes } from './modules/health/health.routes.ts';

declare module 'fastify' {
  interface FastifyInstance {
    /** Runtime (least-privilege, RLS-enforced) pool. Use withTenantContext() for every business query. */
    pool: pg.Pool;
  }
}

export interface BuildOptions {
  env: Env;
  /** Inject a pool (tests); otherwise one is created from env.DATABASE_URL. */
  pool?: pg.Pool;
}

export async function buildApp({ env, pool }: BuildOptions): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL,
      // Structured JSON logs; secrets and credentials are redacted at the logger.
      redact: {
        paths: [
          'req.headers.authorization',
          'req.headers.cookie',
          'res.headers["set-cookie"]',
          '*.password',
          '*.token',
          '*.secret',
        ],
        censor: '[redacted]',
      },
      ...(env.NODE_ENV === 'development' ? { transport: { target: 'pino-pretty' } } : {}),
    },
    genReqId: (req) => {
      const supplied = req.headers['x-request-id'];
      return typeof supplied === 'string' && /^[A-Za-z0-9-]{8,64}$/.test(supplied) ? supplied : randomUUID();
    },
    bodyLimit: 1_048_576,
    trustProxy: false,
  });

  await app.register(helmet);

  const ownsPool = !pool;
  app.decorate(
    'pool',
    pool ??
      createPool(env.DATABASE_URL, {
        max: env.DB_POOL_MAX,
        ssl: env.DATABASE_SSL,
        ...(env.DATABASE_SSL_CA ? { sslCa: env.DATABASE_SSL_CA } : {}),
        statementTimeoutMs: env.DB_STATEMENT_TIMEOUT_MS,
        idleInTransactionTimeoutMs: env.DB_IDLE_IN_TRANSACTION_TIMEOUT_MS,
        lockTimeoutMs: env.DB_LOCK_TIMEOUT_MS,
      }),
  );
  app.addHook('onClose', async () => {
    if (ownsPool) await app.pool.end();
  });

  app.addHook('onSend', async (req, reply) => {
    reply.header('x-request-id', req.id);
  });

  app.setNotFoundHandler((_req, reply) =>
    reply.code(404).send({ error: { code: 'not_found', message: 'Not found' } }),
  );

  // Centralized error handling: one response shape, no internals leaked, full detail only in logs.
  app.setErrorHandler((err, req, reply) => {
    const mapped = err instanceof AppError ? err : mapDatabaseError(err);
    const validation = (err as { validation?: unknown }).validation;
    const status =
      mapped?.statusCode ?? (validation ? 400 : ((err as { statusCode?: number }).statusCode ?? 500));
    // Driver errors carry `detail`/`where`/`table` (e.g. "Key (email)=(x@y) already exists"): never log those.
    const safeErr = {
      name: (err as Error).name,
      message: (err as Error).message,
      code: (err as { code?: string }).code,
      stack: (err as Error).stack,
    };
    if (status >= 500) req.log.error({ err: safeErr }, 'request failed');
    else
      req.log.warn(
        { err: { message: (err as Error).message, code: (err as { code?: string }).code } },
        'request rejected',
      );
    const body =
      mapped !== null
        ? { code: mapped.code, message: mapped.message }
        : status >= 500
          ? { code: 'internal_error', message: 'Internal server error' }
          : { code: validation ? 'invalid_request' : 'bad_request', message: 'The request is invalid' };
    return reply.code(status).send({ error: { ...body, requestId: req.id } });
  });

  await app.register(healthRoutes);
  return app;
}
