import { Writable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, inject } from 'vitest';
import { bootstrapServiceRoles, createPool, runServiceMigrations } from '@saudaro/database-utils';
import { createLogger } from '@saudaro/logger';
import { createTestDatabase, type TestDatabase } from '@saudaro/testing-utils';
import { buildApp } from '../../src/app.ts';
import { loadConfig } from '../../src/config/env.ts';

const MIGRATIONS = fileURLToPath(new URL('../../migrations', import.meta.url));
const silent = () =>
  createLogger(
    { service: 'company-service', level: 'silent' },
    new Writable({ write: (_c, _e, cb) => cb() }),
  );
let db: TestDatabase;
let appPool: pg.Pool;

beforeAll(async () => {
  db = await createTestDatabase(inject('pgAdminUrl'));
  const admin = new pg.Client({ connectionString: db.adminUrl });
  await admin.connect();
  try {
    // Both service schemas exist in the same database, as in production.
    await bootstrapServiceRoles(admin, db.name, [
      { name: 'company', schema: 'company', appPassword: 'app-pw', migratorPassword: 'mig-pw' },
      { name: 'identity', schema: 'identity', appPassword: 'id-pw', migratorPassword: 'idm-pw' },
    ]);
  } finally {
    await admin.end();
  }
  await runServiceMigrations({
    connectionString: db.urlFor('company_migrator', 'mig-pw'),
    schema: 'company',
    migrationsFolder: MIGRATIONS,
  });
  appPool = createPool(db.urlFor('company_svc', 'app-pw'), { max: 3 });
});
afterAll(async () => {
  await appPool.end();
  await db.drop();
});

const config = () => loadConfig({ NODE_ENV: 'test', DATABASE_URL: 'postgres://unused', LOG_LEVEL: 'silent' });

describe('company-service readiness', () => {
  it('is ready with applied migrations and a least-privilege role', async () => {
    const app = buildApp({ config: config(), logger: silent(), pool: appPool });
    expect((await request(app).get('/health/live')).body).toMatchObject({
      status: 'ok',
      service: 'company-service',
    });
    const ready = await request(app).get('/health/ready');
    expect([ready.status, ready.body.status]).toEqual([200, 'ready']);
  });

  it('is NOT ready as a superuser', async () => {
    const pool = createPool(db.adminUrl, { max: 1 });
    expect(
      (await request(buildApp({ config: config(), logger: silent(), pool })).get('/health/ready')).status,
    ).toBe(503);
    await pool.end();
  });
});

describe('database ownership boundary', () => {
  it('the company role cannot read or write the identity schema', async () => {
    await expect(appPool.query('select 1 from identity.outbox_events')).rejects.toMatchObject({
      code: '42501',
    });
    await expect(
      appPool.query(
        "insert into identity.audit_log (actor_type, action, resource_type) values ('system','x','y')",
      ),
    ).rejects.toMatchObject({ code: '42501' });
  });

  it('the company role has its own append-only audit log and cannot run DDL', async () => {
    await appPool.query(
      "insert into company.audit_log (actor_type, action, resource_type) values ('system','created','company')",
    );
    await expect(appPool.query("update company.audit_log set action = 'x'")).rejects.toMatchObject({
      code: '42501',
    });
    await expect(appPool.query('create table company.pwn (id int)')).rejects.toMatchObject({ code: '42501' });
  });
});

describe('company configuration', () => {
  it('defaults to port 4002 and fails fast without a database URL', () => {
    expect(loadConfig({ DATABASE_URL: 'postgres://x' }).PORT).toBe(4002);
    expect(() => loadConfig({})).toThrow(/DATABASE_URL/);
  });

  it('parses AUTH_PUBLIC_JWKS into keys and rejects an invalid value without echoing it', () => {
    const keys = [{ kty: 'OKP', kid: 'k1' }];
    const ok = loadConfig({ DATABASE_URL: 'postgres://x', AUTH_PUBLIC_JWKS: JSON.stringify({ keys }) });
    expect(ok.AUTH_PUBLIC_JWKS).toEqual(keys);
    const bad = () => loadConfig({ DATABASE_URL: 'postgres://x', AUTH_PUBLIC_JWKS: 'super-secret-not-json' });
    expect(bad).toThrow(/AUTH_PUBLIC_JWKS/);
    expect(bad).not.toThrow(/super-secret/);
  });

  it('requires at least one verification key in production', () => {
    const prod = { NODE_ENV: 'production', DATABASE_URL: 'postgres://x', DATABASE_SSL: 'require' } as const;
    expect(() => loadConfig(prod)).toThrow(/AUTH_PUBLIC_JWKS/);
    expect(
      loadConfig({ ...prod, AUTH_PUBLIC_JWKS: '{"keys":[{"kty":"OKP","kid":"k1"}]}' }).AUTH_PUBLIC_JWKS,
    ).toHaveLength(1);
  });
});
