import { z } from 'zod';

const dbUrl = z.string().refine((v) => /^postgres(ql)?:\/\//.test(v), 'must be a postgres:// URL');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('127.0.0.1'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  DATABASE_URL: dbUrl,
  DATABASE_WORKER_URL: dbUrl.optional(),
  DATABASE_SSL: z.enum(['disable', 'require', 'verify-full']).default('disable'),
  /** PEM of the CA for the database server certificate (needed for managed databases with private CAs). */
  DATABASE_SSL_CA: z.string().optional(),
  DB_POOL_MAX: z.coerce.number().int().min(1).max(100).default(10),
  DB_STATEMENT_TIMEOUT_MS: z.coerce.number().int().min(100).default(15_000),
  DB_IDLE_IN_TRANSACTION_TIMEOUT_MS: z.coerce.number().int().min(100).default(10_000),
  DB_LOCK_TIMEOUT_MS: z.coerce.number().int().min(100).default(5_000),
});

export type Env = z.infer<typeof schema>;

/** Fails fast at startup with a readable list of problems (values are never echoed). */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = schema.safeParse(source);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid environment configuration: ${problems}`);
  }
  const env = parsed.data;
  if (env.NODE_ENV === 'production' && env.DATABASE_SSL === 'disable') {
    throw new Error('Invalid environment configuration: DATABASE_SSL must not be "disable" in production');
  }
  return env;
}
