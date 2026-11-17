import { createServer, type Server } from 'node:http';
import type { IncomingHttpHeaders } from 'node:http';
import type { AddressInfo } from 'node:net';
import { Writable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, inject } from 'vitest';
import { authPayloadSchema } from '@saudaro/api-contracts';
import { TokenService, generateSigningKey, hashToken, type SigningKeyPair } from '@saudaro/authentication';
import { bootstrapServiceRoles, createPool, runServiceMigrations } from '@saudaro/database-utils';
import { createLogger } from '@saudaro/logger';
import { createTestDatabase, type TestDatabase } from '@saudaro/testing-utils';
import { buildApp } from '../../src/app.ts';
import { purgeExpiredSessions } from '../../src/application/purge.ts';
import { loadConfig } from '../../src/config/env.ts';

const MIGRATIONS = fileURLToPath(new URL('../../migrations', import.meta.url));
const silent = () => createLogger({ service: 'identity-service', level: 'silent' }, new Writable({ write: (_c, _e, cb) => cb() }));
const PASSWORD = 'correct horse battery staple';
const ISSUER = 'saudaro-identity';
const AUDIENCE = 'saudaro-api';

let db: TestDatabase;
let appPool: pg.Pool;
let gateway: TokenService; // plays the api-gateway: signs service tokens
let verifier: TokenService; // verifies what identity signs
let app: ReturnType<typeof buildApp>;
let company: Server;
const memberships = new Map<string, { status: string; permissions: string[] }>();
const companyCalls: { path: string; authorization: string | undefined; headers: IncomingHttpHeaders }[] = [];
const BAD_JSON = '44444444-4444-4444-8444-444444444441';
const BAD_SHAPE = '44444444-4444-4444-8444-444444444442';
const REDIRECT = '44444444-4444-4444-8444-444444444443';
let config: ReturnType<typeof loadConfig>;
let n = 0;
const uniqueEmail = () => `user${++n}-${Date.now()}@Example.com`;

beforeAll(async () => {
  const identityKey: SigningKeyPair = await generateSigningKey('identity-k1');
  const gatewayKey = await generateSigningKey('gateway-k1', 'svc');
  const verificationKeys = [identityKey.publicJwk, gatewayKey.publicJwk];
  gateway = new TokenService({ issuer: ISSUER, audience: AUDIENCE, signingKey: gatewayKey, verificationKeys });
  verifier = new TokenService({ issuer: ISSUER, audience: AUDIENCE, verificationKeys });

  company = createServer((req, res) => {
    companyCalls.push({ path: req.url ?? '', authorization: req.headers.authorization, headers: req.headers });
    const [, , , companyId, userId] = (req.url ?? '').split('/');
    const m = memberships.get(`${companyId}/${userId}`);
    res.setHeader('content-type', 'application/json');
    if (companyId === BAD_JSON) return void res.end('not json');
    if (companyId === BAD_SHAPE) return void res.end('{"status":"unexpected"}');
    if (companyId === REDIRECT) return void res.writeHead(302, { location: '/elsewhere' }).end();
    if (!m) return void res.writeHead(404).end('{}');
    res.end(JSON.stringify({ userId, companyId, status: m.status, roleKey: 'owner', permissions: m.permissions }));
  });
  await new Promise<void>((r) => company.listen(0, '127.0.0.1', r));

  db = await createTestDatabase(inject('pgAdminUrl'));
  const admin = new pg.Client({ connectionString: db.adminUrl });
  await admin.connect();
  try {
    await bootstrapServiceRoles(admin, db.name, [{ name: 'identity', schema: 'identity', appPassword: 'app-pw', migratorPassword: 'mig-pw' }]);
  } finally {
    await admin.end();
  }
  await runServiceMigrations({ connectionString: db.urlFor('identity_migrator', 'mig-pw'), schema: 'identity', migrationsFolder: MIGRATIONS });
  appPool = createPool(db.urlFor('identity_svc', 'app-pw'), { max: 5 });
  config = loadConfig({
    NODE_ENV: 'test',
    DATABASE_URL: 'postgres://unused',
    LOG_LEVEL: 'silent',
    AUTH_ISSUER: ISSUER,
    AUTH_AUDIENCE: AUDIENCE,
    AUTH_SIGNING_JWK: JSON.stringify(identityKey.privateJwk),
    AUTH_PUBLIC_JWKS: JSON.stringify({ keys: verificationKeys }),
    COMPANY_SERVICE_URL: `http://127.0.0.1:${(company.address() as AddressInfo).port}`,
  });
  app = buildApp({ config, logger: silent(), pool: appPool });
});
afterAll(async () => {
  company.close();
  await appPool.end();
  await db.drop();
});

const serviceToken = (audience = 'identity-service') => gateway.signServiceToken('api-gateway', audience);
async function post(path: string, body: unknown) {
  return request(app).post(path).set('Authorization', `Bearer ${await serviceToken()}`).send(body as object);
}
async function registerAndLogin() {
  const email = uniqueEmail();
  await post('/v1/auth/register', { email, password: PASSWORD });
  const res = await post('/v1/auth/login', { email, password: PASSWORD });
  return { email, res, tokens: authPayloadSchema.parse(res.body) };
}
const ageUsedAt = (token: string) =>
  appPool.query("update identity.refresh_tokens set used_at = now() - interval '1 minute' where token_hash = $1", [hashToken(token)]);
const count = async (sql: string, params: unknown[] = []) => Number((await appPool.query(sql, params)).rows[0].c);

describe('register', () => {
  it('creates the user and its user.registered.v1 outbox event in one transaction', async () => {
    const email = uniqueEmail();
    const res = await post('/v1/auth/register', { email, password: PASSWORD, locale: 'ar' });
    expect([res.status, res.body]).toEqual([202, {}]);
    const user = (await appPool.query('select * from identity.users where email = $1', [email.toLowerCase()])).rows[0];
    expect(user).toMatchObject({ status: 'active', session_version: 1, locale: 'ar' });
    expect(user.password_hash).toMatch(/^scrypt\$/);
    expect(user.password_hash).not.toContain(PASSWORD);
    const events = (await appPool.query('select * from identity.outbox_events where aggregate_id = $1', [user.id])).rows;
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ event_type: 'user.registered.v1', aggregate_type: 'user', payload: { userId: user.id, locale: 'ar' } });
  });

  it('answers an existing email (any case) with the same 202 and creates nothing', async () => {
    const email = uniqueEmail();
    const first = await post('/v1/auth/register', { email, password: PASSWORD });
    const again = await post('/v1/auth/register', { email: email.toUpperCase(), password: 'another long password' });
    expect([again.status, again.body]).toEqual([first.status, first.body]);
    expect(await count('select count(*) c from identity.users where email = $1', [email.toLowerCase()])).toBe(1);
    expect(
      await count("select count(*) c from identity.outbox_events where payload->>'userId' in (select id::text from identity.users where email = $1)", [email.toLowerCase()]),
    ).toBe(1);
  });

  it('rejects invalid input with 400', async () => {
    expect((await post('/v1/auth/register', { email: 'nope', password: 'short' })).status).toBe(400);
  });
});

describe('login', () => {
  it('returns tokens that verifyAccess accepts and stores only the refresh token hash', async () => {
    const { res, tokens } = await registerAndLogin();
    expect(res.status).toBe(200);
    const claims = await verifier.verifyAccess(tokens.accessToken);
    expect(claims).toMatchObject({ ver: 1, amr: ['pwd'], perms: [] });
    expect(claims.cid).toBeUndefined();
    const stored = await appPool.query('select session_id from identity.refresh_tokens where token_hash = $1', [hashToken(tokens.refreshToken)]);
    expect(stored.rows[0].session_id).toBe(claims.sid);
    expect(await count('select count(*) c from identity.refresh_tokens where token_hash = $1', [tokens.refreshToken])).toBe(0);
  });

  it('gives wrong password, unknown email and disabled account the identical generic error', async () => {
    const { email } = await registerAndLogin();
    const disabled = uniqueEmail();
    await post('/v1/auth/register', { email: disabled, password: PASSWORD });
    await appPool.query("update identity.users set status = 'disabled' where email = $1", [disabled.toLowerCase()]);
    const failures = await Promise.all([
      post('/v1/auth/login', { email, password: 'wrong password entirely' }),
      post('/v1/auth/login', { email: uniqueEmail(), password: PASSWORD }),
      post('/v1/auth/login', { email: disabled, password: PASSWORD }),
    ]);
    for (const f of failures) {
      expect([f.status, f.body.error.code, f.body.error.message]).toEqual([401, 'INVALID_CREDENTIALS', failures[0]!.body.error.message]);
    }
  });
});

describe('refresh', () => {
  const refresh = (refreshToken: string, companyId?: string) => post('/v1/auth/refresh', { refreshToken, ...(companyId ? { companyId } : {}) });

  it('rotates the refresh token and issues a verifiable access token', async () => {
    const { tokens } = await registerAndLogin();
    const res = await refresh(tokens.refreshToken);
    expect(res.status).toBe(200);
    const next = authPayloadSchema.parse(res.body);
    expect(next.refreshToken).not.toBe(tokens.refreshToken);
    await expect(verifier.verifyAccess(next.accessToken)).resolves.toMatchObject({ amr: ['pwd'] });
    const old = await appPool.query('select used_at from identity.refresh_tokens where token_hash = $1', [hashToken(tokens.refreshToken)]);
    expect(old.rows[0].used_at).not.toBeNull();
  });

  it('treats a reused token as theft: revokes the session, audits it, and kills the newest token', async () => {
    const { tokens } = await registerAndLogin();
    const second = authPayloadSchema.parse((await refresh(tokens.refreshToken)).body);
    await ageUsedAt(tokens.refreshToken);
    const replay = await refresh(tokens.refreshToken);
    expect([replay.status, replay.body.error.code]).toEqual([401, 'INVALID_REFRESH_TOKEN']);
    expect((await refresh(second.refreshToken)).status).toBe(401);
    const { sid } = await verifier.verifyAccess(second.accessToken);
    expect((await appPool.query('select revoked_at from identity.sessions where id = $1', [sid])).rows[0].revoked_at).not.toBeNull();
    expect(await count("select count(*) c from identity.audit_log where resource_id = $1 and action = 'session.refresh_token_reused'", [sid])).toBe(1);
  });

  it('refuses a replay inside the grace window without revoking: the newest token keeps working', async () => {
    const { tokens } = await registerAndLogin();
    const second = authPayloadSchema.parse((await refresh(tokens.refreshToken)).body);
    const replay = await refresh(tokens.refreshToken);
    expect([replay.status, replay.body.error.code]).toEqual([401, 'INVALID_REFRESH_TOKEN']);
    expect((await refresh(second.refreshToken)).status).toBe(200);
  });

  it('lets exactly one of two concurrent refreshes succeed, and the winner keeps a working session (20 runs)', async () => {
    for (let i = 0; i < 20; i++) {
      const { tokens } = await registerAndLogin();
      const results = await Promise.all([refresh(tokens.refreshToken), refresh(tokens.refreshToken)]);
      expect(results.map((r) => r.status).sort()).toEqual([200, 401]);
      const winner = authPayloadSchema.parse(results.find((r) => r.status === 200)!.body);
      expect((await refresh(winner.refreshToken)).status).toBe(200);
    }
  });

  it('rejects unknown tokens and expired sessions', async () => {
    expect((await refresh('x'.repeat(43))).status).toBe(401);
    const { tokens } = await registerAndLogin();
    await appPool.query("update identity.sessions set expires_at = now() - interval '1 second' where id = (select session_id from identity.refresh_tokens where token_hash = $1)", [hashToken(tokens.refreshToken)]);
    expect((await refresh(tokens.refreshToken)).status).toBe(401);
  });

  describe('with companyId', () => {
    const companyId = '22222222-2222-4222-8222-222222222222';
    it('issues cid and perms only for an active membership, using a service token for company-service', async () => {
      const { tokens } = await registerAndLogin();
      const { sub } = await verifier.verifyAccess(tokens.accessToken);
      memberships.set(`${companyId}/${sub}`, { status: 'active', permissions: ['rfq.create'] });
      const res = await refresh(tokens.refreshToken, companyId);
      expect(res.status).toBe(200);
      await expect(verifier.verifyAccess(res.body.accessToken)).resolves.toMatchObject({ cid: companyId, perms: ['rfq.create'] });
      const call = companyCalls.at(-1)!;
      expect(call.path).toBe(`/internal/memberships/${companyId}/${sub}`);
      await expect(verifier.verifyServiceToken(call.authorization!.slice(7), 'company-service')).resolves.toEqual({ svc: 'identity-service' });
    });

    it('forwards the request and correlation ids to company-service', async () => {
      const { tokens } = await registerAndLogin();
      const { sub } = await verifier.verifyAccess(tokens.accessToken);
      memberships.set(`${companyId}/${sub}`, { status: 'active', permissions: [] });
      await request(app)
        .post('/v1/auth/refresh')
        .set({ authorization: `Bearer ${await serviceToken()}`, 'x-request-id': 'req-12345678', 'x-correlation-id': 'corr-12345678' })
        .send({ refreshToken: tokens.refreshToken, companyId });
      expect(companyCalls.at(-1)!.headers).toMatchObject({ 'x-request-id': 'req-12345678', 'x-correlation-id': 'corr-12345678' });
    });

    it.each([BAD_JSON, BAD_SHAPE, REDIRECT])('answers 503 DEPENDENCY_ERROR when company-service replies badly (%s)', async (badCompany) => {
      const { tokens } = await registerAndLogin();
      const res = await refresh(tokens.refreshToken, badCompany);
      expect([res.status, res.body.error.code]).toEqual([503, 'DEPENDENCY_ERROR']);
    });

    it('answers 403 NOT_A_MEMBER for suspended or unknown membership and keeps the refresh token usable', async () => {
      const { tokens } = await registerAndLogin();
      const { sub } = await verifier.verifyAccess(tokens.accessToken);
      memberships.set(`${companyId}/${sub}`, { status: 'suspended', permissions: ['rfq.create'] });
      const suspended = await refresh(tokens.refreshToken, companyId);
      expect([suspended.status, suspended.body.error.code]).toEqual([403, 'NOT_A_MEMBER']);
      expect((await refresh(tokens.refreshToken, '33333333-3333-4333-8333-333333333333')).status).toBe(403);
      expect((await refresh(tokens.refreshToken)).status).toBe(200);
    });
  });
});

describe('logout', () => {
  it('revokes the session so refresh fails, and is idempotent', async () => {
    const { tokens } = await registerAndLogin();
    expect((await post('/v1/auth/logout', { refreshToken: tokens.refreshToken })).status).toBe(204);
    expect((await post('/v1/auth/logout', { refreshToken: tokens.refreshToken })).status).toBe(204);
    expect((await post('/v1/auth/logout', { refreshToken: 'x'.repeat(43) })).status).toBe(204);
    expect((await post('/v1/auth/refresh', { refreshToken: tokens.refreshToken })).status).toBe(401);
  });
});

describe('service authentication and JWKS', () => {
  it.each(['register', 'login', 'refresh', 'logout'])('POST /v1/auth/%s rejects missing, invalid and wrong-audience service tokens', async (route) => {
    const body = { email: 'a@example.com', password: PASSWORD, refreshToken: 'x'.repeat(43) };
    const wrongAudience = await serviceToken('company-service');
    const userToken = await gateway.signAccess({ sub: '11111111-1111-4111-8111-111111111111', sid: '11111111-1111-4111-8111-111111111111', ver: 1 });
    for (const authorization of [undefined, 'Bearer garbage', `Bearer ${wrongAudience}`, `Bearer ${userToken}`]) {
      const req = request(app).post(`/v1/auth/${route}`);
      const res = await (authorization ? req.set('Authorization', authorization) : req).send(body);
      expect(res.status).toBe(401);
    }
  });

  it('accepts only the api-gateway as caller', async () => {
    const other = await gateway.signServiceToken('company-service', 'identity-service');
    const res = await request(app).post('/v1/auth/logout').set('Authorization', `Bearer ${other}`).send({ refreshToken: 'x'.repeat(43) });
    expect(res.status).toBe(403);
  });

  it('serves public keys only at /.well-known/jwks.json without authentication', async () => {
    const res = await request(app).get('/.well-known/jwks.json');
    expect(res.status).toBe(200);
    expect(res.body.keys.map((k: { kid: string }) => k.kid)).toContain('identity-k1');
    expect(JSON.stringify(res.body)).not.toContain('"d"');
  });

  it('always publishes its own signing key, even when AUTH_PUBLIC_JWKS is empty', async () => {
    const bare = buildApp({ config: { ...config, AUTH_PUBLIC_JWKS: [] }, logger: silent(), pool: appPool });
    const res = await request(bare).get('/.well-known/jwks.json');
    expect(res.body.keys.map((k: { kid: string }) => k.kid)).toEqual(['identity-k1']);
  });
});

describe('purgeExpiredSessions', () => {
  const session = async (userId: string, expires: string, revoked: string | null) => {
    const id = (await appPool.query(`insert into identity.sessions (user_id, expires_at, revoked_at) values ($1, now() + $2::interval, now() + $3::interval) returning id`, [userId, expires, revoked])).rows[0].id;
    await appPool.query('insert into identity.refresh_tokens (token_hash, session_id) values ($1, $2)', [`purge-${id}`, id]);
    return id as string;
  };

  it('removes expired and long-revoked sessions with their tokens, and keeps the rest', async () => {
    const { tokens } = await registerAndLogin();
    const { sub } = await verifier.verifyAccess(tokens.accessToken);
    const expired = await session(sub, '-2 days', null);
    const longRevoked = await session(sub, '1 day', '-2 days');
    const active = await session(sub, '1 day', null);
    const recentlyRevoked = await session(sub, '1 day', '-1 hour');
    const deleted = await purgeExpiredSessions(appPool);
    expect(deleted).toEqual({ sessions: 2, refreshTokens: 2 });
    const left = (await appPool.query('select id from identity.sessions where id = any($1)', [[expired, longRevoked, active, recentlyRevoked]])).rows.map((r) => r.id);
    expect(left.sort()).toEqual([active, recentlyRevoked].sort());
    expect((await post('/v1/auth/refresh', { refreshToken: tokens.refreshToken })).status).toBe(200);
  });
});
