import { Writable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, inject } from 'vitest';
import { bootstrapServiceRoles, createPool, enqueueEvent, relayOutbox, runServiceMigrations, withSystemContext } from '@saudaro/database-utils';
import { generateSigningKey } from '@saudaro/authentication';
import { createLogger } from '@saudaro/logger';
import { createTestDatabase, type TestDatabase } from '@saudaro/testing-utils';
import { buildApp } from '../../src/app.ts';
import { loadConfig } from '../../src/config/env.ts';

const MIGRATIONS = fileURLToPath(new URL('../../migrations', import.meta.url));
const silent = () => createLogger({ service: 'identity-service', level: 'silent' }, new Writable({ write: (_c, _e, cb) => cb() }));
let db: TestDatabase;
let appPool: pg.Pool;
let authEnv: Record<string, string>;

async function bootstrap(database: TestDatabase) {
  const admin = new pg.Client({ connectionString: database.adminUrl });
  await admin.connect();
  try {
    await bootstrapServiceRoles(admin, database.name, [{ name: 'identity', schema: 'identity', appPassword: 'app-pw', migratorPassword: 'mig-pw' }]);
  } finally {
    await admin.end();
  }
}

beforeAll(async () => {
  const key = await generateSigningKey('test-k1');
  authEnv = {
    AUTH_SIGNING_JWK: JSON.stringify(key.privateJwk),
    AUTH_PUBLIC_JWKS: JSON.stringify({ keys: [key.publicJwk] }),
    COMPANY_SERVICE_URL: 'http://127.0.0.1:4002',
  };
  db = await createTestDatabase(inject('pgAdminUrl'));
  await bootstrap(db);
  await runServiceMigrations({ connectionString: db.urlFor('identity_migrator', 'mig-pw'), schema: 'identity', migrationsFolder: MIGRATIONS });
  appPool = createPool(db.urlFor('identity_svc', 'app-pw'), { max: 3 });
});
afterAll(async () => {
  await appPool.end();
  await db.drop();
});

const config = () => loadConfig({ ...authEnv, NODE_ENV: 'test', DATABASE_URL: 'postgres://unused', LOG_LEVEL: 'silent' });

describe('identity-service readiness', () => {
  it('is ready when migrations are applied and the role is least-privilege', async () => {
    const app = buildApp({ config: config(), logger: silent(), pool: appPool });
    expect((await request(app).get('/health/live')).body).toMatchObject({ status: 'ok', service: 'identity-service' });
    const ready = await request(app).get('/health/ready');
    expect([ready.status, ready.body.status]).toEqual([200, 'ready']);
  });

  it('is NOT ready before migrations run (fails closed with 503)', async () => {
    const fresh = await createTestDatabase(inject('pgAdminUrl'));
    try {
      await bootstrap(fresh);
      const pool = createPool(fresh.urlFor('identity_svc', 'app-pw'), { max: 1 });
      const res = await request(buildApp({ config: config(), logger: silent(), pool })).get('/health/ready');
      expect([res.status, res.body.status]).toEqual([503, 'unavailable']);
      await pool.end();
    } finally {
      await fresh.drop();
    }
  });

  it('is NOT ready when the process runs as a superuser (RLS bypass risk)', async () => {
    const pool = createPool(db.adminUrl, { max: 1 });
    const res = await request(buildApp({ config: config(), logger: silent(), pool })).get('/health/ready');
    expect(res.status).toBe(503);
    await pool.end();
  });

  it('exposes Prometheus metrics', async () => {
    const app = buildApp({ config: config(), logger: silent(), pool: appPool });
    await request(app).get('/health/live');
    expect((await request(app).get('/metrics')).text).toContain('http_requests_total{method="GET",route="/health/live",status="2xx"}');
  });
});

describe('identity schema (as the runtime role)', () => {
  it('has the common messaging tables and an append-only audit log', async () => {
    const tables = await appPool.query("select table_name from information_schema.tables where table_schema = 'identity' order by 1");
    expect(tables.rows.map((r) => r.table_name)).toEqual(expect.arrayContaining(['audit_log', 'inbox_events', 'outbox_events']));
    await appPool.query("insert into identity.audit_log (actor_type, action, resource_type) values ('system','test','user')");
    await expect(appPool.query("update identity.audit_log set action = 'x'")).rejects.toMatchObject({ code: '42501' });
  });

  it('records an event atomically and relays it (outbox)', async () => {
    const aggregate = '77777777-7777-4777-8777-777777777777';
    await withSystemContext(appPool, (tx) =>
      enqueueEvent(tx, 'identity', { aggregateType: 'user', aggregateId: aggregate, eventType: 'user.registered.v1', payload: { userId: aggregate, locale: 'en' } }),
    );
    const seen: string[] = [];
    const counts = await relayOutbox(appPool, 'identity', async (e) => void seen.push(e.eventType));
    expect(counts.published).toBeGreaterThanOrEqual(1);
    expect(seen).toContain('user.registered.v1');
  });

  it('cannot run DDL (runtime role owns nothing)', async () => {
    await expect(appPool.query('create table identity.pwn (id int)')).rejects.toMatchObject({ code: '42501' });
  });
});

describe('identity configuration', () => {
  it('validates and applies safe defaults', () => {
    const c = loadConfig({ ...authEnv, DATABASE_URL: 'postgres://x' });
    expect([c.PORT, c.NODE_ENV, c.DATABASE_SSL, c.REFRESH_TTL_SECONDS]).toEqual([4001, 'development', 'disable', 1_209_600]);
    expect(c.AUTH_SIGNING_JWK.kid).toBe('test-k1');
    expect(c.AUTH_SIGNING_JWK.publicJwk).not.toHaveProperty('d');
  });
  it('requires a database URL, signing key and company service URL', () => {
    expect(() => loadConfig({})).toThrow(/DATABASE_URL.*AUTH_SIGNING_JWK.*COMPANY_SERVICE_URL/);
    expect(() => loadConfig({ ...authEnv, DATABASE_URL: 'x', COMPANY_SERVICE_URL: 'not a url' })).toThrow(/COMPANY_SERVICE_URL/);
  });
  it('rejects a signing key without a private part, or a malformed JWKS, without echoing values', () => {
    const { d: _d, ...publicOnly } = JSON.parse(authEnv.AUTH_SIGNING_JWK!);
    for (const bad of [{ AUTH_SIGNING_JWK: JSON.stringify(publicOnly) }, { AUTH_SIGNING_JWK: 'topsecretvalue' }, { AUTH_PUBLIC_JWKS: '{"nokeys":1}' }]) {
      expect(() => loadConfig({ ...authEnv, DATABASE_URL: 'postgres://x', ...bad })).toThrow(/AUTH_/);
    }
    expect(() => loadConfig({ ...authEnv, DATABASE_URL: 'x', AUTH_SIGNING_JWK: 'topsecretvalue' })).toThrow(/^(?!.*topsecretvalue)/s);
  });
  it('requires at least one public key in production', () => {
    const prod = { ...authEnv, NODE_ENV: 'production', DATABASE_URL: 'postgres://x', DATABASE_SSL: 'require' };
    expect(() => loadConfig({ ...prod, AUTH_PUBLIC_JWKS: '{"keys":[]}' })).toThrow(/AUTH_PUBLIC_JWKS/);
    expect(() => loadConfig({ ...prod, AUTH_PUBLIC_JWKS: undefined })).toThrow(/AUTH_PUBLIC_JWKS/);
    expect(() => loadConfig({ ...prod, AUTH_PUBLIC_JWKS: authEnv.AUTH_PUBLIC_JWKS })).not.toThrow();
  });
  it('requires TLS in production, without echoing values', () => {
    expect(() => loadConfig({ ...authEnv, NODE_ENV: 'production', DATABASE_URL: 'postgres://u:secretpw@h/d' })).toThrow(/DATABASE_SSL/);
    try {
      loadConfig({ ...authEnv, NODE_ENV: 'production', DATABASE_URL: 'postgres://u:secretpw@h/d' });
    } catch (e) {
      expect(String(e)).not.toContain('secretpw');
    }
  });
});
