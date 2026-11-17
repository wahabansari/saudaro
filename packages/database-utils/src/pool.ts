import pg from 'pg';
import { z } from 'zod';

export interface PoolOptions {
  max?: number;
  ssl?: 'disable' | 'require' | 'verify-full';
  sslCa?: string;
  statementTimeoutMs?: number;
  idleInTransactionTimeoutMs?: number;
  lockTimeoutMs?: number;
  applicationName?: string;
}

export function createPool(connectionString: string, o: PoolOptions = {}): pg.Pool {
  const pool = new pg.Pool({
    connectionString,
    max: o.max ?? 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    application_name: o.applicationName ?? 'saudaro',
    // Encrypted connections always verify the server certificate.
    ssl:
      o.ssl === 'require' || o.ssl === 'verify-full'
        ? { rejectUnauthorized: true, ...(o.sslCa ? { ca: o.sslCa } : {}) }
        : undefined,
    ...(o.statementTimeoutMs ? { statement_timeout: o.statementTimeoutMs } : {}),
    ...(o.idleInTransactionTimeoutMs
      ? { idle_in_transaction_session_timeout: o.idleInTransactionTimeoutMs }
      : {}),
    ...(o.lockTimeoutMs ? { lock_timeout: o.lockTimeoutMs } : {}),
  });
  pool.on('error', () => undefined); // an idle-client error must never crash the process
  return pool;
}

export interface TenantContext {
  /** From the VERIFIED access token — never from client input. */
  userId: string;
  /** Active company from the verified token claim (`cid`). */
  companyId?: string | null;
}

export type Tx = pg.PoolClient;

const uuid = z.uuid();

async function run<T>(
  pool: pg.Pool,
  setup: (c: pg.PoolClient) => Promise<void>,
  fn: (tx: Tx) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  let broken = false;
  try {
    await client.query('BEGIN');
    await setup(client);
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {
      broken = true; // never return a connection in an unknown state to the pool
    }
    throw err;
  } finally {
    if (!broken) {
      // Defense in depth: wipe SESSION-level settings so nothing can outlive a request on a pooled connection.
      try {
        await client.query('DISCARD ALL');
      } catch {
        broken = true;
      }
    }
    client.release(broken ? true : undefined);
  }
}

/**
 * One transaction with TRANSACTION-LOCAL tenant context (`set_config(..., true)` = parameterised SET LOCAL).
 * The settings vanish at COMMIT/ROLLBACK, so a pooled connection cannot leak a tenant to the next request.
 * RLS policies read `app.current_user_id` / `app.current_company_id`.
 */
export async function withTenantContext<T>(
  pool: pg.Pool,
  ctx: TenantContext,
  fn: (tx: Tx) => Promise<T>,
): Promise<T> {
  const userId = uuid.parse(ctx.userId);
  const companyId = ctx.companyId ? uuid.parse(ctx.companyId) : '';
  return run(
    pool,
    async (c) => {
      await c.query(
        "select set_config('app.current_user_id', $1, true), set_config('app.current_company_id', $2, true)",
        [userId, companyId],
      );
    },
    fn,
  );
}

/** Transaction without tenant context (outbox relay, health, migrations bookkeeping). */
export function withSystemContext<T>(pool: pg.Pool, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return run(pool, async () => undefined, fn);
}

/**
 * Defense in depth: a runtime role must not be a superuser, must not BYPASSRLS, and must own no tables
 * (an owner could alter its own policies). Call at startup and from readiness probes.
 */
export async function assertSafeRuntimeRole(pool: pg.Pool): Promise<string> {
  const r = await pool.query<{ rolname: string; rolsuper: boolean; rolbypassrls: boolean; owns: number }>(
    `select r.rolname, r.rolsuper, r.rolbypassrls,
            (select count(*)::int from pg_class c where c.relowner = r.oid and c.relkind in ('r','p','v','m')) as owns
     from pg_roles r where r.rolname = current_user`,
  );
  const row = r.rows[0];
  if (!row) throw new Error('cannot determine current database role');
  if (row.rolsuper || row.rolbypassrls) {
    throw new Error(
      `database role "${row.rolname}" is superuser/BYPASSRLS; use the least-privilege service role`,
    );
  }
  if (row.owns > 0)
    throw new Error(`database role "${row.rolname}" owns relations; the runtime role must not be an owner`);
  return row.rolname;
}
