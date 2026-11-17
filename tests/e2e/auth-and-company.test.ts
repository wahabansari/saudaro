import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { Writable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import type { Express } from 'express';
import pg from 'pg';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, inject } from 'vitest';
import { TokenService, generateSigningKey } from '@saudaro/authentication';
import { bootstrapServiceRoles, createPool, runServiceMigrations } from '@saudaro/database-utils';
import { OPERATIONS, sha256Hash, type OperationName } from '@saudaro/graphql-contracts';
import { createLogger } from '@saudaro/logger';
import { createTestDatabase, type TestDatabase } from '@saudaro/testing-utils';
import { buildGateway, type Gateway } from '../../apps/backend/api-gateway/src/app.ts';
import { loadGatewayConfig } from '../../apps/backend/api-gateway/src/config/env.ts';
import { buildApp as buildCompany } from '../../apps/backend/services/company-service/src/app.ts';
import { loadConfig as loadCompanyConfig } from '../../apps/backend/services/company-service/src/config/env.ts';
import { buildApp as buildIdentity } from '../../apps/backend/services/identity-service/src/app.ts';
import { loadConfig as loadIdentityConfig } from '../../apps/backend/services/identity-service/src/config/env.ts';

const svcDir = (name: string, rel: string) =>
  fileURLToPath(new URL(`../../apps/backend/services/${name}/${rel}`, import.meta.url));
const ISSUER = 'saudaro-identity';
const AUDIENCE = 'saudaro-api';
const PASSWORD = 'correct horse battery staple';

const silent = (service: string) =>
  createLogger({ service, level: 'silent' }, new Writable({ write: (_c, _e, cb) => cb() }));
const listen = (app: Express) =>
  new Promise<Server>((resolve) => {
    const server = app.listen(0, '127.0.0.1', () => resolve(server));
  });
const urlOf = (server: Server) => `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

let db: TestDatabase;
const pools: pg.Pool[] = [];
const servers: Server[] = [];
const gateways: Gateway[] = [];
let identityUrl: string;
let devGateway: Gateway;
let prodGateway: Gateway;

async function startGateway(
  env: Record<string, string>,
  tokens: TokenService,
  serviceTokens: TokenService,
): Promise<Gateway> {
  const config = loadGatewayConfig({
    LOG_LEVEL: 'silent',
    IDENTITY_SERVICE_URL: identityUrl,
    COMPANY_SERVICE_URL: companyUrl,
    ...env,
  });
  const gateway = await buildGateway({ config, logger: silent('api-gateway'), tokens, serviceTokens });
  gateways.push(gateway);
  return gateway;
}
let companyUrl: string;

beforeAll(async () => {
  const identityKey = await generateSigningKey('identity-e2e');
  const gatewayKey = await generateSigningKey('gateway-e2e');
  const verificationKeys = [identityKey.publicJwk, gatewayKey.publicJwk];
  const AUTH_PUBLIC_JWKS = JSON.stringify({ keys: verificationKeys });
  const tokenService = (signingKey?: typeof gatewayKey) =>
    new TokenService({
      issuer: ISSUER,
      audience: AUDIENCE,
      verificationKeys,
      ...(signingKey ? { signingKey } : {}),
    });

  db = await createTestDatabase(inject('pgAdminUrl'));
  const admin = new pg.Client({ connectionString: db.adminUrl });
  await admin.connect();
  try {
    await bootstrapServiceRoles(admin, db.name, [
      { name: 'identity', schema: 'identity', appPassword: 'app-pw', migratorPassword: 'mig-pw' },
      { name: 'company', schema: 'company', appPassword: 'app-pw', migratorPassword: 'mig-pw' },
    ]);
  } finally {
    await admin.end();
  }
  for (const name of ['identity', 'company']) {
    await runServiceMigrations({
      connectionString: db.urlFor(`${name}_migrator`, 'mig-pw'),
      schema: name,
      migrationsFolder: svcDir(`${name}-service`, 'migrations'),
    });
    pools.push(createPool(db.urlFor(`${name}_svc`, 'app-pw'), { max: 5 }));
  }
  const [identityPool, companyPool] = pools as [pg.Pool, pg.Pool];
  const base = {
    NODE_ENV: 'test',
    DATABASE_URL: 'postgres://unused',
    LOG_LEVEL: 'silent',
    AUTH_ISSUER: ISSUER,
    AUTH_AUDIENCE: AUDIENCE,
    AUTH_PUBLIC_JWKS,
  };

  const company = await listen(
    buildCompany({ config: loadCompanyConfig(base), logger: silent('company-service'), pool: companyPool }),
  );
  servers.push(company);
  companyUrl = urlOf(company);
  const identityConfig = loadIdentityConfig({
    ...base,
    AUTH_SIGNING_JWK: JSON.stringify(identityKey.privateJwk),
    COMPANY_SERVICE_URL: companyUrl,
  });
  const identity = await listen(
    buildIdentity({ config: identityConfig, logger: silent('identity-service'), pool: identityPool }),
  );
  servers.push(identity);
  identityUrl = urlOf(identity);

  devGateway = await startGateway(
    { NODE_ENV: 'test', AUTH_PUBLIC_JWKS },
    tokenService(),
    tokenService(gatewayKey),
  );
  prodGateway = await startGateway(
    { NODE_ENV: 'production', AUTH_PUBLIC_JWKS },
    tokenService(),
    tokenService(gatewayKey),
  );
});

afterAll(async () => {
  await Promise.all(gateways.map((g) => g.stop()));
  servers.forEach((s) => {
    s.close();
    s.closeAllConnections();
  });
  await Promise.all(pools.map((p) => p.end()));
  await db.drop();
});

// GraphQL response shape differs per operation; the assertions below check the fields they need.
type Gql = (
  op: OperationName,
  variables?: object,
  accessToken?: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
) => Promise<{ data?: any; errors?: { extensions: { code: string } }[] }>;

const rawGql =
  (gateway: Gateway): Gql =>
  async (op, variables, accessToken) => {
    const req = request(gateway.app).post('/graphql');
    if (accessToken) req.set('Authorization', `Bearer ${accessToken}`);
    return (await req.send({ query: OPERATIONS[op], variables })).body;
  };
const persistedGql =
  (gateway: Gateway): Gql =>
  async (op, variables, accessToken) => {
    const req = request(gateway.app).post('/graphql');
    if (accessToken) req.set('Authorization', `Bearer ${accessToken}`);
    return (
      await req.send({
        variables,
        extensions: { persistedQuery: { version: 1, sha256Hash: sha256Hash(OPERATIONS[op]) } },
      })
    ).body;
  };

async function registerAndLogin(gql: Gql, email: string) {
  expect((await gql('Register', { input: { email, password: PASSWORD } })).data.register).toBe(true);
  const { data } = await gql('Login', { input: { email, password: PASSWORD } });
  expect(data.login.accessToken).toEqual(expect.any(String));
  expect(data.login.refreshToken).toEqual(expect.any(String));
  return data.login as { accessToken: string; refreshToken: string };
}

describe.each([
  ['development policy (raw documents)', 'dev', () => rawGql(devGateway)],
  ['production policy (persisted hashes only)', 'prod', () => persistedGql(prodGateway)],
])('authentication and company flow through the gateway: %s', (_name, tag, makeGql) => {
  it('register, login, company, membership-scoped refresh, theft detection and logout', async () => {
    const gql = makeGql();
    const email = `owner-${tag}-${Date.now()}@example.com`;
    const first = await registerAndLogin(gql, email);

    const anonymous = await gql('Viewer', undefined, first.accessToken);
    expect(anonymous.data.viewer.companyId).toBeNull();
    const userId = anonymous.data.viewer.userId as string;
    expect(userId).toEqual(expect.any(String));

    const created = await gql(
      'CreateCompany',
      { input: { id: crypto.randomUUID(), legalName: `Acme ${tag}`, countryCode: 'SA' } },
      first.accessToken,
    );
    const company = created.data.createCompany;
    expect(company).toMatchObject({ legalName: `Acme ${tag}`, countryCode: 'SA', roleKey: 'owner' });
    expect((await gql('MyCompanies', undefined, first.accessToken)).data.myCompanies).toEqual([company]);

    const scoped = (await gql('Refresh', { refreshToken: first.refreshToken, companyId: company.id })).data
      .refresh;
    const viewer = (await gql('Viewer', undefined, scoped.accessToken)).data.viewer;
    expect(viewer).toMatchObject({ userId, companyId: company.id });
    expect(viewer.permissions).toHaveLength(23);
    expect(viewer.permissions).toEqual(expect.arrayContaining(['company.manage', 'rfq.create']));

    const second = await registerAndLogin(gql, `other-${tag}-${Date.now()}@example.com`);
    expect((await gql('MyCompanies', undefined, second.accessToken)).data.myCompanies).toEqual([]);
    const denied = await gql('Refresh', { refreshToken: second.refreshToken, companyId: company.id });
    expect(denied.errors?.[0]?.extensions.code).toBe('NOT_A_MEMBER');

    const rotated = (await gql('Refresh', { refreshToken: scoped.refreshToken })).data.refresh;
    // Age the rotation past the reuse grace window so the replay counts as theft, not a race.
    await pools[0]!.query(
      "update identity.refresh_tokens set used_at = now() - interval '1 minute' where used_at is not null",
    );
    const replay = await gql('Refresh', { refreshToken: scoped.refreshToken });
    expect(replay.errors?.[0]?.extensions.code).toBe('INVALID_REFRESH_TOKEN');
    expect((await gql('Refresh', { refreshToken: rotated.refreshToken })).errors?.[0]?.extensions.code).toBe(
      'INVALID_REFRESH_TOKEN',
    );

    expect((await gql('Logout', { refreshToken: second.refreshToken })).data.logout).toBe(true);
    expect((await gql('Refresh', { refreshToken: second.refreshToken })).errors?.[0]?.extensions.code).toBe(
      'INVALID_REFRESH_TOKEN',
    );
  });
});

describe('boundaries and persistence', () => {
  it('identity rejects a direct login without a service token', async () => {
    const res = await request(identityUrl)
      .post('/v1/auth/login')
      .send({ email: 'a@example.com', password: PASSWORD });
    expect(res.status).toBe(401);
  });

  it('the outbox tables hold user.registered.v1 and company.created.v1 rows', async () => {
    const admin = new pg.Client({ connectionString: db.adminUrl });
    await admin.connect();
    try {
      const count = async (table: string, type: string) =>
        Number(
          (await admin.query(`select count(*) c from ${table} where event_type = $1`, [type])).rows[0].c,
        );
      expect(await count('identity.outbox_events', 'user.registered.v1')).toBeGreaterThanOrEqual(4);
      expect(await count('company.outbox_events', 'company.created.v1')).toBeGreaterThanOrEqual(2);
    } finally {
      await admin.end();
    }
  });
});
