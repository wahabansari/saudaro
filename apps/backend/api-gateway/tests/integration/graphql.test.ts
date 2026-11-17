import { Writable } from 'node:stream';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { TokenService, generateSigningKey, type SigningKeyPair } from '@saudaro/authentication';
import { OPERATIONS, sha256Hash } from '@saudaro/graphql-contracts';
import { createLogger } from '@saudaro/logger';
import { MetricsRegistry } from '@saudaro/observability';
import { buildGateway } from '../../src/app.ts';
import { loadGatewayConfig } from '../../src/config/env.ts';

const USER = '11111111-1111-4111-8111-111111111111';
const COMPANY = '22222222-2222-4222-8222-222222222222';
const SESSION = '33333333-3333-4333-8333-333333333333';

let key: SigningKeyPair;
beforeAll(async () => {
  key = await generateSigningKey('k1');
});

const silent = () => createLogger({ service: 'gw-test', level: 'silent' }, new Writable({ write: (_c, _e, cb) => cb() }));
const tokens = (now?: () => Date) =>
  new TokenService({ issuer: 'saudaro-identity', audience: 'saudaro-api', signingKey: key, verificationKeys: [key.publicJwk], ...(now ? { now } : {}) });

async function gateway(env: Record<string, string> = {}, now?: () => Date) {
  const config = loadGatewayConfig({ NODE_ENV: 'test', LOG_LEVEL: 'silent', ...env });
  const metrics = new MetricsRegistry();
  const gw = await buildGateway({ config, logger: silent(), tokens: tokens(now), metrics });
  return { ...gw, metrics };
}
const gql = (app: Parameters<typeof request>[0], query: string, headers: Record<string, string> = {}) =>
  request(app).post('/graphql').set(headers).send({ query });

describe('queries and field selection', () => {
  it('returns ONLY the requested fields', async () => {
    const { app, stop } = await gateway();
    const res = await gql(app, '{ health { status } }');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ health: { status: 'ok' } });
    expect(Object.keys(res.body.data.health)).toEqual(['status']); // no service/version/time
    await stop();
  });

  it('serves health fields and the REST health endpoints', async () => {
    const { app, stop } = await gateway();
    const full = await gql(app, '{ health { status service version time } }');
    expect(full.body.data.health).toMatchObject({ status: 'ok', service: 'api-gateway', version: '0.2.0' });
    expect((await request(app).get('/health/live')).body.status).toBe('ok');
    expect((await request(app).get('/health/ready')).body.status).toBe('ready');
    await stop();
  });
});

describe('authentication and field-level authorization', () => {
  it('viewer requires a token; anonymous gets AUTHENTICATION_REQUIRED with a request id', async () => {
    const { app, stop } = await gateway();
    const res = await gql(app, '{ viewer { userId } }', { 'x-request-id': 'req-abcdef12' });
    expect(res.body.errors[0].extensions).toMatchObject({ code: 'AUTHENTICATION_REQUIRED', requestId: 'req-abcdef12', retryable: false });
    expect(res.body.data.viewer).toBeNull();
    await stop();
  });

  it('a valid token yields the viewer derived only from token claims', async () => {
    const { app, stop } = await gateway();
    const token = await tokens().signAccess({ sub: USER, cid: COMPANY, sid: SESSION, ver: 0, perms: ['rfq.create'] });
    const res = await gql(app, '{ viewer { userId companyId permissions } }', { authorization: `Bearer ${token}` });
    expect(res.body.data.viewer).toEqual({ userId: USER, companyId: COMPANY, permissions: ['rfq.create'] });
    await stop();
  });

  it('an expired token produces TOKEN_EXPIRED while public fields keep working', async () => {
    const issued = new Date('2026-01-01T00:00:00Z');
    const old = await tokens(() => issued).signAccess({ sub: USER, sid: SESSION, ver: 0 });
    const { app, stop } = await gateway();
    const viewer = await gql(app, '{ viewer { userId } }', { authorization: `Bearer ${old}` });
    expect(viewer.body.errors[0].extensions.code).toBe('TOKEN_EXPIRED');
    expect((await gql(app, '{ health { status } }', { authorization: `Bearer ${old}` })).body.data.health.status).toBe('ok');
    await stop();
  });

  it('a tampered token is rejected without revealing why', async () => {
    const { app, stop } = await gateway();
    const token = await tokens().signAccess({ sub: USER, sid: SESSION, ver: 0 });
    const bad = `${token.slice(0, -4)}AAAA`;
    const res = await gql(app, '{ viewer { userId } }', { authorization: `Bearer ${bad}` });
    expect(res.body.errors[0].extensions.code).toBe('TOKEN_INVALID');
    expect(res.body.errors[0].message).toBe('Your session is invalid. Please sign in again.');
    await stop();
  });
});

describe('query protection', () => {
  it('rejects queries nested deeper than the limit', async () => {
    const { app, stop } = await gateway({ GRAPHQL_MAX_DEPTH: '1' });
    const res = await gql(app, '{ viewer { userId } }');
    expect(res.status).toBe(400);
    expect(res.body.errors[0].extensions.code).toBe('QUERY_TOO_DEEP');
    expect((await gql(app, '{ health { status } }')).status).toBe(400); // depth 2 > 1
    await stop();
  });

  it('rejects queries whose estimated cost exceeds the limit before executing them', async () => {
    const { app, stop } = await gateway({ GRAPHQL_MAX_COMPLEXITY: '2' });
    const res = await gql(app, '{ health { status service version time } }');
    expect(res.status).toBe(400);
    expect(res.body.errors[0].extensions.code).toBe('QUERY_TOO_COMPLEX');
    await stop();
  });

  it('rejects oversized request bodies with the standard envelope', async () => {
    const { app, stop } = await gateway({ MAX_BODY: '1kb' });
    const res = await request(app).post('/graphql').send({ query: `{ health { status } } # ${'x'.repeat(5000)}` });
    expect([res.status, res.body.error.code]).toEqual([413, 'PAYLOAD_TOO_LARGE']);
    await stop();
  });

  it('rate limits callers with 429, Retry-After and the standard envelope', async () => {
    const { app, stop } = await gateway({ RATE_LIMIT_MAX: '3', RATE_LIMIT_WINDOW_MS: '60000' });
    for (let i = 0; i < 3; i++) expect((await gql(app, '{ health { status } }')).status).toBe(200);
    const limited = await gql(app, '{ health { status } }');
    expect(limited.status).toBe(429);
    expect(limited.body.error).toMatchObject({ code: 'RATE_LIMITED', retryable: true });
    expect(limited.headers['retry-after']).toBe('60');
    await stop();
  });

  it('disables GraphQL batching (one operation per request)', async () => {
    const { app, stop } = await gateway();
    const res = await request(app).post('/graphql').send([{ query: '{ health { status } }' }, { query: '{ health { status } }' }]);
    expect(res.status).toBeGreaterThanOrEqual(400);
    await stop();
  });
});

describe('error consistency', () => {
  it('maps GraphQL validation errors to VALIDATION_ERROR with a request id', async () => {
    const { app, stop } = await gateway();
    const res = await gql(app, '{ nope }');
    expect(res.status).toBe(400);
    expect(res.body.errors[0].extensions).toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(res.body.errors[0].extensions.requestId).toBe(res.headers['x-request-id']);
    await stop();
  });

  it('records operation and error metrics without high-cardinality labels', async () => {
    const { app, stop, metrics } = await gateway();
    await request(app).post('/graphql').send({ operationName: 'Health', query: 'query Health { health { status } }' });
    await gql(app, '{ viewer { userId } }');
    const text = metrics.render();
    expect(text).toContain('graphql_operation_duration_seconds_count{operation="Health"} 1');
    expect(text).toContain('graphql_errors_total{code="AUTHENTICATION_REQUIRED"} 1');
    await stop();
  });
});

describe('persisted-query allowlist (production behaviour)', () => {
  it('executes only allowlisted operations and ignores client-supplied query text', async () => {
    const { app, stop } = await gateway({ GRAPHQL_PERSISTED_ONLY: 'true' });
    const arbitrary = await gql(app, '{ health { status } }');
    expect([arbitrary.status, arbitrary.body.error.code]).toEqual([400, 'PERSISTED_QUERY_REQUIRED']);

    const ok = await request(app).post('/graphql').send({ extensions: { persistedQuery: { version: 1, sha256Hash: sha256Hash(OPERATIONS.Health) } } });
    expect(ok.body.data.health).toMatchObject({ status: 'ok', service: 'api-gateway' });

    // A client cannot smuggle a different query under an allowlisted hash.
    const smuggle = await request(app)
      .post('/graphql')
      .send({ query: '{ viewer { userId } }', extensions: { persistedQuery: { version: 1, sha256Hash: sha256Hash(OPERATIONS.Health) } } });
    expect(smuggle.body.data.viewer).toBeUndefined();
    expect(smuggle.body.data.health.status).toBe('ok');

    const unknown = await request(app).post('/graphql').send({ extensions: { persistedQuery: { version: 1, sha256Hash: 'f'.repeat(64) } } });
    expect([unknown.status, unknown.body.error.code]).toEqual([400, 'PERSISTED_QUERY_NOT_FOUND']);
    await stop();
  });
});

describe('rate limiting behind a load balancer', () => {
  const twoClients = async (env: Record<string, string>) => {
    const { app, stop } = await gateway({ RATE_LIMIT_MAX: '1', ...env });
    const first = await gql(app, '{ health { status } }', { 'x-forwarded-for': '203.0.113.1' });
    const second = await gql(app, '{ health { status } }', { 'x-forwarded-for': '203.0.113.2' });
    await stop();
    return [first.status, second.status];
  };

  it('TRUST_PROXY=1 keys the limit on the forwarded client address', async () => {
    expect(await twoClients({ TRUST_PROXY: '1' })).toEqual([200, 200]);
  });

  it('TRUST_PROXY=0 ignores X-Forwarded-For (one shared key)', async () => {
    expect(await twoClients({ TRUST_PROXY: '0' })).toEqual([200, 429]);
  });
});
