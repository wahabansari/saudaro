import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it, inject } from 'vitest';
import { createTestDatabase, type TestDatabase } from '@saudaro/testing-utils';
import {
  assertSafeRuntimeRole,
  backoffMs,
  bootstrapServiceRoles,
  commonTablesSql,
  consumeOnce,
  createPool,
  enqueueEvent,
  relayOutbox,
  withSystemContext,
  withTenantContext,
} from '../src/index.ts';

let db: TestDatabase;
const pw = (n: string) => `${n}-test-pw`;
const url = (role: string) => db.urlFor(role, pw(role));

async function exec(connection: string, sql: string, params: unknown[] = []): Promise<pg.QueryResult> {
  const c = new pg.Client({ connectionString: connection });
  await c.connect();
  try {
    return await c.query(sql, params);
  } finally {
    await c.end();
  }
}
const expectCode = async (connection: string, sql: string, code: string) => {
  await expect(exec(connection, sql)).rejects.toMatchObject({ code });
};

beforeAll(async () => {
  db = await createTestDatabase(inject('pgAdminUrl'));
  const admin = new pg.Client({ connectionString: db.adminUrl });
  await admin.connect();
  try {
    await bootstrapServiceRoles(
      admin,
      db.name,
      ['identity', 'company'].map((name) => ({
        name,
        schema: name,
        appPassword: pw(`${name}_svc`),
        migratorPassword: pw(`${name}_migrator`),
        ...(name === 'company' ? { connectionLimit: 120 } : {}),
      })),
    );
  } finally {
    await admin.end();
  }
  for (const s of ['identity', 'company']) {
    // The service's OWN migrator creates its tables (common messaging tables + one domain table).
    for (const stmt of commonTablesSql(s).split('--> statement-breakpoint'))
      await exec(url(`${s}_migrator`), stmt);
    await exec(
      url(`${s}_migrator`),
      `CREATE TABLE ${s}.things (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL, label text)`,
    );
  }
  await exec(
    url('identity_migrator'),
    `ALTER TABLE identity.things ENABLE ROW LEVEL SECURITY; ALTER TABLE identity.things FORCE ROW LEVEL SECURITY;
     CREATE POLICY things_tenant ON identity.things USING (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid)
       WITH CHECK (company_id = nullif(current_setting('app.current_company_id', true), '')::uuid);`,
  );
});
afterAll(async () => {
  await db.drop();
});

describe('per-service role isolation', () => {
  it('each service role has no dangerous attributes', async () => {
    const r = await exec(
      db.adminUrl,
      "select rolname, rolsuper, rolbypassrls, rolcreaterole, rolcreatedb from pg_roles where rolname like '%\\_svc' or rolname like '%\\_migrator'",
    );
    expect(r.rowCount).toBe(4);
    for (const row of r.rows)
      expect([row.rolsuper, row.rolbypassrls, row.rolcreaterole, row.rolcreatedb]).toEqual([
        false,
        false,
        false,
        false,
      ]);
  });

  it('applies the optional connection limit to the runtime role (default unlimited)', async () => {
    const r = await exec(
      db.adminUrl,
      "select rolname, rolconnlimit from pg_roles where rolname in ('identity_svc', 'company_svc', 'company_migrator')",
    );
    const limits = Object.fromEntries(r.rows.map((row) => [row.rolname, row.rolconnlimit]));
    expect(limits).toEqual({ identity_svc: -1, company_svc: 120, company_migrator: 5 });
  });

  it('a service can use its own schema', async () => {
    await exec(
      url('identity_svc'),
      "insert into identity.audit_log (actor_type, action, resource_type) values ('system','test','x')",
    );
    expect(
      (await exec(url('identity_svc'), 'select count(*)::int n from identity.audit_log')).rows[0].n,
    ).toBeGreaterThan(0);
  });

  it('a service cannot see or touch another service schema (42501)', async () => {
    await expectCode(url('identity_svc'), 'select * from company.things', '42501');
    await expectCode(
      url('identity_svc'),
      'insert into company.things (company_id) values (gen_random_uuid())',
      '42501',
    );
    await expectCode(url('company_svc'), 'select * from identity.audit_log', '42501');
    await expectCode(url('company_migrator'), 'create table identity.pwn (id int)', '42501');
  });

  it('runtime roles cannot run DDL, TRUNCATE, SET ROLE, or use the public schema', async () => {
    await expectCode(url('identity_svc'), 'create table identity.pwn (id int)', '42501');
    await expectCode(url('identity_svc'), 'truncate identity.things', '42501');
    await expectCode(url('identity_svc'), 'set role identity_migrator', '42501');
    await expectCode(url('identity_svc'), 'create table public.pwn (id int)', '42501');
    await expectCode(url('identity_svc'), 'drop table identity.things', '42501');
  });

  it('assertSafeRuntimeRole accepts the service role and rejects owners and superusers', async () => {
    const app = createPool(url('identity_svc'), { max: 1 });
    const mig = createPool(url('identity_migrator'), { max: 1 });
    const sup = createPool(db.adminUrl, { max: 1 });
    try {
      await expect(assertSafeRuntimeRole(app)).resolves.toBe('identity_svc');
      await expect(assertSafeRuntimeRole(mig)).rejects.toThrow(/owns relations/);
      await expect(assertSafeRuntimeRole(sup)).rejects.toThrow(/superuser/);
    } finally {
      await Promise.all([app.end(), mig.end(), sup.end()]);
    }
  });

  it('rejects unsafe identifiers during bootstrap', async () => {
    const admin = new pg.Client({ connectionString: db.adminUrl });
    await admin.connect();
    try {
      await expect(
        bootstrapServiceRoles(admin, db.name, [
          { name: 'x; drop', schema: 'x', appPassword: 'p', migratorPassword: 'p' },
        ]),
      ).rejects.toThrow(/invalid identifier/);
    } finally {
      await admin.end();
    }
  });
});

describe('tenant context + RLS', () => {
  const A = '11111111-1111-4111-8111-111111111111';
  const B = '22222222-2222-4222-8222-222222222222';
  const user = '33333333-3333-4333-8333-333333333333';
  let pool: pg.Pool;
  beforeAll(() => {
    pool = createPool(url('identity_svc'), { max: 1 });
  });
  afterAll(() => pool.end());

  it('isolates rows by the transaction-local company and rejects cross-tenant writes', async () => {
    await withTenantContext(pool, { userId: user, companyId: A }, (tx) =>
      tx.query("insert into identity.things (company_id, label) values ($1, 'a-row')", [A]),
    );
    await withTenantContext(pool, { userId: user, companyId: B }, (tx) =>
      tx.query("insert into identity.things (company_id, label) values ($1, 'b-row')", [B]),
    );
    const seenByA = await withTenantContext(pool, { userId: user, companyId: A }, (tx) =>
      tx.query('select label from identity.things'),
    );
    expect(seenByA.rows.map((r) => r.label)).toEqual(['a-row']);
    await expect(
      withTenantContext(pool, { userId: user, companyId: A }, (tx) =>
        tx.query('insert into identity.things (company_id) values ($1)', [B]),
      ),
    ).rejects.toMatchObject({ code: '42501' });
  });

  it('shows nothing without a context, and nothing leaks across a single reused connection', async () => {
    expect((await pool.query('select * from identity.things')).rowCount).toBe(0);
    await withTenantContext(pool, { userId: user, companyId: A }, (tx) => tx.query('select 1'));
    const after = await pool.query("select nullif(current_setting('app.current_company_id', true), '') as c");
    expect(after.rows[0].c).toBeNull();
  });

  it('wipes SESSION-level settings before a connection is reused', async () => {
    await withTenantContext(pool, { userId: user }, (tx) =>
      tx.query("select set_config('app.current_company_id', $1, false)", [A]),
    );
    expect(
      (await pool.query("select nullif(current_setting('app.current_company_id', true), '') as c")).rows[0].c,
    ).toBeNull();
    expect((await pool.query('select * from identity.things')).rowCount).toBe(0);
  });

  it('rejects non-uuid context values before touching the database', async () => {
    await expect(
      withTenantContext(pool, { userId: "x'; drop table things;--" }, (tx) => tx.query('select 1')),
    ).rejects.toThrow();
  });
});

describe('transactional outbox', () => {
  let pool: pg.Pool;
  const aggregate = '44444444-4444-4444-8444-444444444444';
  beforeAll(() => {
    pool = createPool(url('identity_svc'), { max: 4 });
  });
  afterAll(() => pool.end());
  const pending = async () =>
    Number(
      (await pool.query("select count(*) n from identity.outbox_events where status = 'pending'")).rows[0].n,
    );

  it('is atomic with the business transaction (rollback drops the event)', async () => {
    const before = await pending();
    await expect(
      withSystemContext(pool, async (tx) => {
        await enqueueEvent(tx, 'identity', {
          aggregateType: 'user',
          aggregateId: aggregate,
          eventType: 'user.registered.v1',
          payload: { a: 1 },
        });
        throw new Error('business failure');
      }),
    ).rejects.toThrow('business failure');
    expect(await pending()).toBe(before);
    await withSystemContext(pool, (tx) =>
      enqueueEvent(tx, 'identity', {
        aggregateType: 'user',
        aggregateId: aggregate,
        eventType: 'user.registered.v1',
        payload: { a: 1 },
        headers: { correlationId: 'c1' },
      }),
    );
    expect(await pending()).toBe(before + 1);
  });

  it('publishes pending events once and marks them published', async () => {
    const seen: string[] = [];
    const counts = await relayOutbox(pool, 'identity', async (e) => {
      seen.push(e.eventType);
    });
    expect(counts.published).toBeGreaterThanOrEqual(1);
    expect(seen).toContain('user.registered.v1');
    expect(await pending()).toBe(0);
  });

  it('retries with backoff then dead-letters after maxAttempts', async () => {
    await withSystemContext(pool, (tx) =>
      enqueueEvent(tx, 'identity', {
        aggregateType: 'user',
        aggregateId: aggregate,
        eventType: 'will.fail.v1',
        payload: {},
      }),
    );
    const failing = async () => {
      throw new Error('broker down');
    };
    const opts = { maxAttempts: 3, random: () => 0 }; // zero jitter → immediately due again
    expect(await relayOutbox(pool, 'identity', failing, opts)).toMatchObject({ retried: 1, dead: 0 });
    expect(await relayOutbox(pool, 'identity', failing, opts)).toMatchObject({ retried: 1, dead: 0 });
    expect(await relayOutbox(pool, 'identity', failing, opts)).toMatchObject({ retried: 0, dead: 1 });
    const dead = await pool.query(
      "select status, attempts, last_error from identity.outbox_events where event_type = 'will.fail.v1'",
    );
    expect(dead.rows[0]).toMatchObject({ status: 'dead', attempts: 3, last_error: 'broker down' });
  });

  it('with concurrent relays each event is published exactly once (SKIP LOCKED)', async () => {
    for (let i = 0; i < 20; i++) {
      await withSystemContext(pool, (tx) =>
        enqueueEvent(tx, 'identity', {
          aggregateType: 'user',
          aggregateId: aggregate,
          eventType: 'bulk.v1',
          payload: { i },
        }),
      );
    }
    const seen: number[] = [];
    const publish = async (e: { payload: unknown }) => {
      await new Promise((r) => setTimeout(r, 5));
      seen.push((e.payload as { i: number }).i);
    };
    await Promise.all([1, 2, 3].map(() => relayOutbox(pool, 'identity', publish, { batchSize: 10 })));
    await relayOutbox(pool, 'identity', publish, { batchSize: 50 });
    expect([...seen].sort((a, b) => a - b)).toEqual(Array.from({ length: 20 }, (_, i) => i));
  });

  it('backoff is bounded exponential with full jitter', () => {
    expect(backoffMs(0, { baseMs: 100 }, () => 0.999)).toBeLessThan(100);
    expect(backoffMs(3, { baseMs: 100 }, () => 0.999)).toBeLessThan(800);
    expect(backoffMs(30, { baseMs: 100, maxMs: 5000 }, () => 0.999)).toBeLessThan(5000);
    expect(backoffMs(5, {}, () => 0)).toBe(0);
  });
});

describe('idempotent consumer and audit log', () => {
  let pool: pg.Pool;
  beforeAll(() => {
    pool = createPool(url('company_svc'), { max: 2 });
  });
  afterAll(() => pool.end());
  const event = { id: '55555555-5555-4555-8555-555555555555', type: 'user.registered.v1' };

  it('processes an event once and treats redelivery as a no-op', async () => {
    let runs = 0;
    const handler = async (tx: pg.PoolClient) => {
      runs += 1;
      await tx.query(
        "insert into company.things (company_id, label) values (gen_random_uuid(), 'from-event')",
      );
    };
    // company.things has no RLS, so the handler can write.
    expect(await consumeOnce(pool, 'company', 'verification', event, handler)).toBe('processed');
    expect(await consumeOnce(pool, 'company', 'verification', event, handler)).toBe('duplicate');
    expect(runs).toBe(1);
    expect(await consumeOnce(pool, 'company', 'search', event, async () => undefined)).toBe('processed'); // per-consumer
  });

  it('a failing handler rolls back the inbox row so the redelivery is processed', async () => {
    const e = { id: '66666666-6666-4666-8666-666666666666', type: 'x.v1' };
    await expect(
      consumeOnce(pool, 'company', 'c', e, async () => {
        throw new Error('handler failed');
      }),
    ).rejects.toThrow('handler failed');
    expect(await consumeOnce(pool, 'company', 'c', e, async () => undefined)).toBe('processed');
  });

  it('audit_log is append-only for the runtime role', async () => {
    await exec(
      url('company_svc'),
      "insert into company.audit_log (actor_type, action, resource_type) values ('system','created','company')",
    );
    await expectCode(url('company_svc'), "update company.audit_log set action = 'tampered'", '42501');
    await expectCode(url('company_svc'), 'delete from company.audit_log', '42501');
    await expectCode(url('company_migrator'), "update company.audit_log set action = 'tampered'", '42501'); // even the owner
    await expectCode(url('company_migrator'), 'truncate company.audit_log', '42501');
  });
});
