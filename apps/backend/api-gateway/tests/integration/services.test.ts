import { createServer, type IncomingHttpHeaders, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { Writable } from 'node:stream';
import request from 'supertest';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { TokenService, generateSigningKey, type SigningKeyPair } from '@saudaro/authentication';
import { OPERATIONS, sha256Hash } from '@saudaro/graphql-contracts';
import { createLogger } from '@saudaro/logger';
import { buildGateway } from '../../src/app.ts';
import { loadGatewayConfig } from '../../src/config/env.ts';

const USER = '11111111-1111-4111-8111-111111111111';
const COMPANY = '22222222-2222-4222-8222-222222222222';
const SESSION = '33333333-3333-4333-8333-333333333333';
const PASSWORD = 'correct-horse-battery-staple';
const REFRESH = 'r'.repeat(40);

interface Seen {
  url: string;
  method: string;
  headers: IncomingHttpHeaders;
  body: unknown;
}
type Reply = { status: number; body?: unknown };
type Handler = (seen: Seen) => Reply | 'hang';

let userKey: SigningKeyPair;
let gatewayKey: SigningKeyPair;
beforeAll(async () => {
  userKey = await generateSigningKey('user1');
  gatewayKey = await generateSigningKey('gw1');
});

const servers: Server[] = [];
afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (s) =>
        new Promise((done) => {
          s.close(done);
          s.closeAllConnections();
        }),
    ),
  );
});

async function stub(handler: Handler): Promise<{ url: string; seen: Seen[] }> {
  const seen: Seen[] = [];
  const server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      const entry = { url: req.url ?? '', method: req.method ?? '', headers: req.headers, body: raw ? JSON.parse(raw) : undefined };
      seen.push(entry);
      const reply = handler(entry);
      if (reply === 'hang') return;
      res.writeHead(reply.status, { 'content-type': 'application/json' });
      res.end(reply.status === 204 ? undefined : JSON.stringify(reply.body ?? {}));
    });
  });
  servers.push(server);
  await new Promise<void>((ok) => server.listen(0, '127.0.0.1', ok));
  return { url: `http://127.0.0.1:${(server.address() as AddressInfo).port}`, seen };
}

/** A URL nothing listens on: the port was just released. */
async function deadUrl(): Promise<string> {
  const { url } = await stub(() => ({ status: 200 }));
  await new Promise((done) => servers.pop()?.close(done));
  return url;
}

const envelope = (code: string, message: string, retryable = false) => ({
  success: false,
  error: { code, message, details: [], retryable, requestId: 'svc-req', timestamp: new Date().toISOString() },
});

const userTokens = () =>
  new TokenService({ issuer: 'saudaro-identity', audience: 'saudaro-api', signingKey: userKey, verificationKeys: [userKey.publicJwk] });
const accessToken = () => userTokens().signAccess({ sub: USER, cid: COMPANY, sid: SESSION, ver: 0, perms: [] });

const gatewayTokens = () =>
  new TokenService({ issuer: 'saudaro-identity', audience: 'saudaro-api', signingKey: gatewayKey, verificationKeys: [gatewayKey.publicJwk] });

async function gateway(env: Record<string, string> = {}, opts: { signer?: boolean; logs?: string[] } = {}) {
  const config = loadGatewayConfig({ NODE_ENV: 'test', LOG_LEVEL: opts.logs ? 'trace' : 'silent', ...env });
  const sink = new Writable({
    write: (c, _e, cb) => {
      opts.logs?.push(String(c));
      cb();
    },
  });
  return buildGateway({
    config,
    logger: createLogger({ service: 'gw-test', level: config.LOG_LEVEL }, sink),
    tokens: userTokens(),
    ...(opts.signer === false ? {} : { serviceTokens: gatewayTokens() }),
  });
}

const send = (app: Parameters<typeof request>[0], query: string, variables?: unknown, headers: Record<string, string> = {}) =>
  request(app).post('/graphql').set(headers).send({ query, variables });

const verifyAgainstGateway = () => new TokenService({ issuer: 'saudaro-identity', audience: 'saudaro-api', verificationKeys: [gatewayKey.publicJwk] });
const loginVars = { input: { email: 'a@b.co', password: PASSWORD } };

describe('identity operations', () => {
  it('login returns tokens; the stub saw a service token for identity-service signed by the gateway key', async () => {
    const identity = await stub(() => ({ status: 200, body: { accessToken: 'at', refreshToken: REFRESH } }));
    const gw = await gateway({ IDENTITY_SERVICE_URL: identity.url });
    const res = await send(gw.app, OPERATIONS.Login, loginVars, { 'x-request-id': 'req-login-01' });
    expect(res.body.data.login).toEqual({ accessToken: 'at', refreshToken: REFRESH });
    const call = identity.seen[0]!;
    expect([call.method, call.url, call.body]).toEqual(['POST', '/v1/auth/login', loginVars.input]);
    expect(call.headers['x-request-id']).toBe('req-login-01');
    expect(call.headers['x-correlation-id']).toBeTruthy();
    const bearer = String(call.headers.authorization).replace('Bearer ', '');
    await expect(verifyAgainstGateway().verifyServiceToken(bearer, 'identity-service')).resolves.toMatchObject({ svc: 'api-gateway' });
    await expect(verifyAgainstGateway().verifyServiceToken(bearer, 'company-service')).rejects.toThrow();
    await gw.stop();
  });

  it('surfaces a downstream 401 envelope as the same code, with a requestId', async () => {
    const identity = await stub(() => ({ status: 401, body: envelope('INVALID_CREDENTIALS', 'Email or password is incorrect.') }));
    const gw = await gateway({ IDENTITY_SERVICE_URL: identity.url });
    const res = await send(gw.app, OPERATIONS.Login, loginVars);
    expect(res.body.errors[0].extensions).toMatchObject({ code: 'INVALID_CREDENTIALS', retryable: false });
    expect(res.body.errors[0].extensions.requestId).toBe(res.headers['x-request-id']);
    expect(res.body.errors[0].message).toBe('Email or password is incorrect.');
    await gw.stop();
  });

  it('maps a downstream 403 to its own error code', async () => {
    const identity = await stub(() => ({ status: 403, body: envelope('NOT_A_MEMBER', 'You are not a member of this company.') }));
    const gw = await gateway({ IDENTITY_SERVICE_URL: identity.url });
    const res = await send(gw.app, OPERATIONS.Refresh, { refreshToken: REFRESH, companyId: COMPANY });
    expect(res.body.errors[0].extensions.code).toBe('NOT_A_MEMBER');
    await gw.stop();
  });

  it('refresh passes companyId; register and logout follow the 202/204 contract', async () => {
    const identity = await stub((s) =>
      s.url.endsWith('refresh') ? { status: 200, body: { accessToken: 'at2', refreshToken: REFRESH } } : { status: s.url.endsWith('register') ? 202 : 204 },
    );
    const gw = await gateway({ IDENTITY_SERVICE_URL: identity.url });
    const refreshed = await send(gw.app, OPERATIONS.Refresh, { refreshToken: REFRESH, companyId: COMPANY });
    expect(refreshed.body.data.refresh.accessToken).toBe('at2');
    expect(identity.seen[0]?.body).toEqual({ refreshToken: REFRESH, companyId: COMPANY });
    const reg = await send(gw.app, OPERATIONS.Register, loginVars);
    expect(reg.body.data.register).toBe(true);
    expect(identity.seen[1]?.body).toEqual({ ...loginVars.input, locale: 'en' });
    const out = await send(gw.app, OPERATIONS.Logout, { refreshToken: REFRESH });
    expect(out.body.data.logout).toBe(true);
    await gw.stop();
  });

  it('rejects input that violates the shared contract without calling the service', async () => {
    const identity = await stub(() => ({ status: 200 }));
    const gw = await gateway({ IDENTITY_SERVICE_URL: identity.url });
    const res = await send(gw.app, OPERATIONS.Login, { input: { email: 'not-an-email', password: 'short' } });
    expect(res.body.errors[0].extensions.code).toBe('VALIDATION_ERROR');
    expect(identity.seen).toHaveLength(0);
    await gw.stop();
  });

  it('rejects a downstream response that violates the schema (no passthrough)', async () => {
    const identity = await stub(() => ({ status: 200, body: { accessToken: 1, refreshToken: REFRESH, extra: 'leak' } }));
    const gw = await gateway({ IDENTITY_SERVICE_URL: identity.url });
    const res = await send(gw.app, OPERATIONS.Login, loginVars);
    expect(res.body.errors[0].extensions.code).toBe('DEPENDENCY_ERROR');
    expect(JSON.stringify(res.body)).not.toContain('leak');
    await gw.stop();
  });

  it('an unreachable service gives a retryable DependencyError', async () => {
    const gw = await gateway({ IDENTITY_SERVICE_URL: await deadUrl() });
    const res = await send(gw.app, OPERATIONS.Login, loginVars);
    expect(res.body.errors[0].extensions).toMatchObject({ code: 'DEPENDENCY_ERROR', retryable: true });
    await gw.stop();
  });

  it('a service that does not answer within REQUEST_TIMEOUT_MS gives a retryable DependencyError', async () => {
    const identity = await stub(() => 'hang');
    const gw = await gateway({ IDENTITY_SERVICE_URL: identity.url, REQUEST_TIMEOUT_MS: '300' });
    const res = await send(gw.app, OPERATIONS.Login, loginVars);
    expect(res.body.errors[0].extensions).toMatchObject({ code: 'DEPENDENCY_ERROR', retryable: true, http: { status: 504 } });
    await gw.stop();
  });

  it('without a gateway signing key downstream operations fail with DependencyError and make no call', async () => {
    const identity = await stub(() => ({ status: 200 }));
    const gw = await gateway({ IDENTITY_SERVICE_URL: identity.url }, { signer: false });
    const res = await send(gw.app, OPERATIONS.Login, loginVars);
    expect(res.body.errors[0].extensions).toMatchObject({ code: 'DEPENDENCY_ERROR', retryable: true });
    expect(identity.seen).toHaveLength(0);
    expect((await send(gw.app, '{ health { status } }')).body.data.health.status).toBe('ok');
    await gw.stop();
  });
});

describe('company operations', () => {
  const company = { id: COMPANY, legalName: 'Acme Trading', countryCode: 'SA', roleKey: 'owner' };
  const createVars = { input: { legalName: 'Acme Trading', countryCode: 'SA' } };

  it('createCompany and myCompanies without a bearer token fail and make NO downstream call', async () => {
    const svc = await stub(() => ({ status: 200, body: [] }));
    const gw = await gateway({ COMPANY_SERVICE_URL: svc.url });
    const mine = await send(gw.app, OPERATIONS.MyCompanies);
    const created = await send(gw.app, OPERATIONS.CreateCompany, createVars);
    expect(mine.body.errors[0].extensions.code).toBe('AUTHENTICATION_REQUIRED');
    expect(created.body.errors[0].extensions.code).toBe('AUTHENTICATION_REQUIRED');
    expect(svc.seen).toHaveLength(0);
    await gw.stop();
  });

  it('with a valid access token they forward x-user-token and a company-service token', async () => {
    const svc = await stub((s) => (s.method === 'POST' ? { status: 201, body: company } : { status: 200, body: [company] }));
    const gw = await gateway({ COMPANY_SERVICE_URL: svc.url });
    const token = await accessToken();
    const auth = { authorization: `Bearer ${token}` };
    const created = await send(gw.app, OPERATIONS.CreateCompany, createVars, auth);
    const mine = await send(gw.app, OPERATIONS.MyCompanies, undefined, auth);
    expect(created.body.data.createCompany).toEqual(company);
    expect(mine.body.data.myCompanies).toEqual([company]);
    expect(svc.seen.map((s) => [s.method, s.url])).toEqual([
      ['POST', '/v1/companies'],
      ['GET', '/v1/companies/mine'],
    ]);
    expect(svc.seen[0]?.body).toEqual(createVars.input);
    for (const s of svc.seen) {
      expect(s.headers['x-user-token']).toBe(token);
      const bearer = String(s.headers.authorization).replace('Bearer ', '');
      await expect(verifyAgainstGateway().verifyServiceToken(bearer, 'company-service')).resolves.toBeDefined();
    }
    await gw.stop();
  });

  it('passes a client-generated id through so a retried createCompany is idempotent', async () => {
    const svc = await stub(() => ({ status: 201, body: company }));
    const gw = await gateway({ COMPANY_SERVICE_URL: svc.url });
    const auth = { authorization: `Bearer ${await accessToken()}` };
    const input = { ...createVars.input, id: COMPANY };
    const ok = await send(gw.app, OPERATIONS.CreateCompany, { input }, auth);
    expect(ok.body.data.createCompany.id).toBe(COMPANY);
    expect(svc.seen[0]?.body).toEqual(input);
    const bad = await send(gw.app, OPERATIONS.CreateCompany, { input: { ...input, id: 'not-a-uuid' } }, auth);
    expect(bad.body.errors[0].extensions.code).toBe('VALIDATION_ERROR');
    expect(svc.seen).toHaveLength(1);
    await gw.stop();
  });

  it('rejects a malformed company list from the service', async () => {
    const svc = await stub(() => ({ status: 200, body: [{ id: 'nope' }] }));
    const gw = await gateway({ COMPANY_SERVICE_URL: svc.url });
    const res = await send(gw.app, OPERATIONS.MyCompanies, undefined, { authorization: `Bearer ${await accessToken()}` });
    expect(res.body.errors[0].extensions.code).toBe('DEPENDENCY_ERROR');
    await gw.stop();
  });
});

describe('production persisted-only mode', () => {
  it('accepts the new operations by hash and rejects the same operation as raw text', async () => {
    const identity = await stub(() => ({ status: 200, body: { accessToken: 'at', refreshToken: REFRESH } }));
    const gw = await gateway({ NODE_ENV: 'production', IDENTITY_SERVICE_URL: identity.url, AUTH_PUBLIC_JWKS: JSON.stringify({ keys: [userKey.publicJwk] }) });
    const byHash = await request(gw.app)
      .post('/graphql')
      .send({ variables: loginVars, extensions: { persistedQuery: { version: 1, sha256Hash: sha256Hash(OPERATIONS.Login) } } });
    expect(byHash.body.data.login.accessToken).toBe('at');
    const raw = await send(gw.app, OPERATIONS.Login, loginVars);
    expect([raw.status, raw.body.error.code]).toEqual([400, 'PERSISTED_QUERY_REQUIRED']);
    await gw.stop();
  });
});

describe('secret hygiene', () => {
  it('passwords and refresh tokens never appear in log output', async () => {
    const logs: string[] = [];
    const ok = await stub(() => ({ status: 200, body: { accessToken: 'at-secret-value', refreshToken: REFRESH } }));
    const gw = await gateway({ IDENTITY_SERVICE_URL: ok.url, SLOW_OPERATION_MS: '1' }, { logs });
    await send(gw.app, OPERATIONS.Login, loginVars);
    await send(gw.app, OPERATIONS.Refresh, { refreshToken: REFRESH });
    await gw.stop();
    const down = await gateway({ IDENTITY_SERVICE_URL: await deadUrl() }, { logs });
    await send(down.app, OPERATIONS.Login, loginVars);
    await down.stop();
    expect(logs.length).toBeGreaterThan(0);
    const all = logs.join('');
    for (const secret of [PASSWORD, REFRESH, 'at-secret-value']) expect(all).not.toContain(secret);
  });
});
