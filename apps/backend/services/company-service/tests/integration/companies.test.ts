import { randomUUID } from 'node:crypto';
import { Writable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, inject } from 'vitest';
import { permissionsFor } from '@saudaro/authorization';
import { generateSigningKey, TokenService } from '@saudaro/authentication';
import { companySchema, HEADERS, membershipLookupResponseSchema } from '@saudaro/api-contracts';
import {
  bootstrapServiceRoles,
  createPool,
  runServiceMigrations,
  withTenantContext,
} from '@saudaro/database-utils';
import { createLogger } from '@saudaro/logger';
import { createTestDatabase, type TestDatabase } from '@saudaro/testing-utils';
import { MAX_MY_COMPANIES } from '../../src/infrastructure/repositories/companies.ts';
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
let signer: TokenService;
let app: ReturnType<typeof buildApp>;
let serviceToken: string; // gateway -> company
let identityToken: string; // identity -> company

const userToken = (sub: string) => signer.signAccess({ sub, sid: randomUUID(), ver: 0 });
const as = async (sub: string) => ({
  [HEADERS.authorization]: `Bearer ${serviceToken}`,
  [HEADERS.userToken]: await userToken(sub),
});
const create = async (sub: string, body: unknown = { legalName: 'Acme Trading', countryCode: 'SA' }) =>
  request(app)
    .post('/v1/companies')
    .set(await as(sub))
    .send(body as object);

beforeAll(async () => {
  const key = await generateSigningKey('test-key');
  signer = new TokenService({
    issuer: 'saudaro-identity',
    audience: 'saudaro-api',
    signingKey: key,
    verificationKeys: [key.publicJwk],
  });
  serviceToken = await signer.signServiceToken('api-gateway', 'company-service');
  identityToken = await signer.signServiceToken('identity-service', 'company-service');

  db = await createTestDatabase(inject('pgAdminUrl'));
  const admin = new pg.Client({ connectionString: db.adminUrl });
  await admin.connect();
  try {
    await bootstrapServiceRoles(admin, db.name, [
      { name: 'company', schema: 'company', appPassword: 'app-pw', migratorPassword: 'mig-pw' },
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
  const config = loadConfig({
    NODE_ENV: 'test',
    DATABASE_URL: 'postgres://unused',
    LOG_LEVEL: 'silent',
    AUTH_PUBLIC_JWKS: JSON.stringify({ keys: [key.publicJwk] }),
  });
  app = buildApp({ config, logger: silent(), pool: appPool });
});
afterAll(async () => {
  await appPool.end();
  await db.drop();
});

describe('POST /v1/companies', () => {
  it('writes the company, the owner membership and the company.created.v1 outbox row atomically', async () => {
    const owner = randomUUID();
    const res = await create(owner);
    expect(res.status).toBe(201);
    const company = companySchema.parse(res.body);
    expect(company).toMatchObject({ legalName: 'Acme Trading', countryCode: 'SA', roleKey: 'owner' });

    const ctx = new pg.Client({ connectionString: db.urlFor('company_svc', 'app-pw') });
    await ctx.connect();
    try {
      await ctx.query('begin');
      await ctx.query("select set_config('app.current_user_id', $1, true)", [owner]);
      const m = await ctx.query(
        'select role_key, status from company.memberships where company_id = $1 and user_id = $2',
        [company.id, owner],
      );
      expect(m.rows).toEqual([{ role_key: 'owner', status: 'active' }]);
      await ctx.query('commit');
    } finally {
      await ctx.end();
    }
    const ob = await appPool.query(
      "select aggregate_id, payload from company.outbox_events where event_type = 'company.created.v1' and aggregate_id = $1",
      [company.id],
    );
    expect(ob.rows).toHaveLength(1);
    expect(ob.rows[0].payload.payload).toEqual({
      companyId: company.id,
      ownerUserId: owner,
      countryCode: 'SA',
    });
  });

  it('rolls back company, membership and outbox when a later step fails', async () => {
    const owner = randomUUID();
    const admin = new pg.Client({ connectionString: db.adminUrl });
    await admin.connect();
    try {
      // Force a failure on the LAST write of the transaction (the outbox insert).
      await admin.query(
        `create function company.fail_outbox() returns trigger language plpgsql as $$ begin raise exception 'forced'; end $$`,
      );
      await admin.query(
        'create trigger trg_fail before insert on company.outbox_events for each row execute function company.fail_outbox()',
      );
      expect((await create(owner)).status).toBe(500);
      await admin.query('drop trigger trg_fail on company.outbox_events');
      const left = await admin.query(
        'select (select count(*) from company.companies where created_by = $1) + (select count(*) from company.memberships where user_id = $1) as n',
        [owner],
      );
      expect(Number(left.rows[0].n)).toBe(0);
    } finally {
      await admin.query('drop trigger if exists trg_fail on company.outbox_events');
      await admin.query('drop function if exists company.fail_outbox()');
      await admin.end();
    }
  });

  it.each([
    ['bad country', { legalName: 'Acme Trading', countryCode: 'sa' }],
    ['short name', { legalName: 'A', countryCode: 'SA' }],
    ['missing body', {}],
  ])('rejects %s with the standard error envelope', async (_label, body) => {
    const res = await create(randomUUID(), body);
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      error: { code: expect.any(String), message: expect.any(String), requestId: expect.any(String) },
    });
  });
});

describe('POST /v1/companies with a client-supplied id (idempotent retry)', () => {
  const count = async (sql: string, args: unknown[]) => {
    const admin = new pg.Client({ connectionString: db.adminUrl });
    await admin.connect();
    try {
      return Number((await admin.query(sql, args)).rows[0].n);
    } finally {
      await admin.end();
    }
  };

  it('returns the same company on retry and creates no duplicate rows or events', async () => {
    const owner = randomUUID();
    const id = randomUUID();
    const first = await create(owner, { id, legalName: 'Retry Co', countryCode: 'SA' });
    const second = await create(owner, { id, legalName: 'Retry Co', countryCode: 'SA' });
    expect([first.status, second.status]).toEqual([201, 201]);
    expect(second.body).toEqual(first.body);
    expect(first.body.id).toBe(id);
    expect(await count('select count(*) as n from company.companies where id = $1', [id])).toBe(1);
    expect(await count('select count(*) as n from company.memberships where company_id = $1', [id])).toBe(1);
    expect(await count('select count(*) as n from company.outbox_events where aggregate_id = $1', [id])).toBe(
      1,
    );
  });

  it("answers 409 without leaking when the id belongs to another user's company", async () => {
    const id = randomUUID();
    await create(randomUUID(), { id, legalName: 'Taken Co', countryCode: 'SA' });
    const res = await create(randomUUID(), { id, legalName: 'Mine Now', countryCode: 'SA' });
    expect([res.status, res.body.error.code]).toEqual([409, 'CONFLICT']);
    expect(JSON.stringify(res.body)).not.toContain('Taken Co');
    expect(await count('select count(*) as n from company.outbox_events where aggregate_id = $1', [id])).toBe(
      1,
    );
  });
});

describe('GET /v1/companies/mine', () => {
  it('caps the list at MAX_MY_COMPANIES', async () => {
    const u = randomUUID();
    const admin = new pg.Client({ connectionString: db.adminUrl });
    await admin.connect();
    await admin.query(
      "insert into company.companies (id, legal_name, country_code, created_by) select gen_random_uuid(), 'Bulk ' || g, 'SA', $1 from generate_series(1, $2) g",
      [u, MAX_MY_COMPANIES + 1],
    );
    await admin.query(
      "insert into company.memberships (company_id, user_id, role_key, status) select id, created_by, 'owner', 'active' from company.companies where created_by = $1",
      [u],
    );
    await admin.end();
    const res = await request(app)
      .get('/v1/companies/mine')
      .set(await as(u));
    expect(res.body).toHaveLength(MAX_MY_COMPANIES);
  });

  it("returns only the caller's active companies (RLS exercised as company_svc)", async () => {
    const a = randomUUID();
    const b = randomUUID();
    const ca = companySchema.parse((await create(a, { legalName: 'Alpha Ltd', countryCode: 'AE' })).body);
    const cb = companySchema.parse((await create(b, { legalName: 'Beta Ltd', countryCode: 'TR' })).body);

    const mineA = await request(app)
      .get('/v1/companies/mine')
      .set(await as(a));
    const mineB = await request(app)
      .get('/v1/companies/mine')
      .set(await as(b));
    expect(mineA.status).toBe(200);
    expect(mineA.body.map((c: { id: string }) => c.id)).toEqual([ca.id]);
    expect(mineB.body.map((c: { id: string }) => c.id)).toEqual([cb.id]);
    expect(mineA.body[0]).toMatchObject({ roleKey: 'owner' });
  });

  it('omits companies where the membership is not active', async () => {
    const u = randomUUID();
    const c = companySchema.parse((await create(u)).body);
    // Membership status changes belong to a later feature; flip it as superuser (the owner is subject to FORCE RLS).
    const mig = new pg.Client({ connectionString: db.adminUrl });
    await mig.connect();
    await mig.query("update company.memberships set status = 'suspended' where company_id = $1", [c.id]);
    await mig.end();
    const res = await request(app)
      .get('/v1/companies/mine')
      .set(await as(u));
    expect(res.body).toEqual([]);
  });
});

describe('row-level security', () => {
  it('the runtime role sees zero rows without tenant context', async () => {
    await create(randomUUID());
    expect((await appPool.query('select 1 from company.companies')).rowCount).toBe(0);
    expect((await appPool.query('select 1 from company.memberships')).rowCount).toBe(0);
  });

  it('cannot insert a membership for another user', async () => {
    const owner = randomUUID();
    const c = companySchema.parse((await create(owner)).body);
    const intruder = randomUUID();
    const client = await appPool.connect();
    try {
      await client.query('begin');
      await client.query("select set_config('app.current_user_id', $1, true)", [intruder]);
      await expect(
        client.query(
          "insert into company.memberships (company_id, user_id, role_key, status) values ($1, $2, 'owner', 'active')",
          [c.id, randomUUID()],
        ),
      ).rejects.toMatchObject({ code: '42501' });
    } finally {
      await client.query('rollback');
      client.release();
    }
  });
});

describe('membership insert policy', () => {
  it("user B cannot insert themselves into user A's company", async () => {
    const c = companySchema.parse((await create(randomUUID())).body);
    const b = randomUUID();
    await expect(
      withTenantContext(appPool, { userId: b }, (tx) =>
        tx.query(
          "insert into company.memberships (company_id, user_id, role_key, status) values ($1, $2, 'owner', 'active')",
          [c.id, b],
        ),
      ),
    ).rejects.toMatchObject({ code: '42501' });
  });
});

describe('GET /internal/memberships/:companyId/:userId', () => {
  const internal = (companyId: string, userId: string, token = identityToken) =>
    request(app)
      .get(`/internal/memberships/${companyId}/${userId}`)
      .set(HEADERS.authorization, `Bearer ${token}`);

  it('returns the owner membership with its permissions', async () => {
    const owner = randomUUID();
    const c = companySchema.parse((await create(owner)).body);
    const res = await internal(c.id, owner);
    expect(res.status).toBe(200);
    const body = membershipLookupResponseSchema.parse(res.body);
    expect(body).toMatchObject({ userId: owner, companyId: c.id, status: 'active', roleKey: 'owner' });
    expect(body.permissions).toEqual(permissionsFor('owner'));
    expect(body.permissions).toHaveLength(23);
  });

  it.each(['member', 'viewer'])("returns the %s role's permission set", async (roleKey) => {
    const owner = randomUUID();
    const user = randomUUID();
    const c = companySchema.parse((await create(owner)).body);
    const admin = new pg.Client({ connectionString: db.adminUrl });
    await admin.connect();
    await admin.query(
      'insert into company.memberships (company_id, user_id, role_key, status) values ($1, $2, $3, $4)',
      [c.id, user, roleKey, 'active'],
    );
    await admin.end();
    const res = await internal(c.id, user);
    expect(membershipLookupResponseSchema.parse(res.body)).toMatchObject({
      roleKey,
      permissions: permissionsFor(roleKey),
    });
  });

  it('returns 404 for a non-member', async () => {
    const c = companySchema.parse((await create(randomUUID())).body);
    const res = await internal(c.id, randomUUID());
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBeDefined();
  });

  it('rejects a token minted for another caller (gateway) with 403', async () => {
    const id = randomUUID();
    const res = await internal(id, id, serviceToken);
    expect([res.status, res.body.error.code]).toEqual([403, 'CALLER_NOT_ALLOWED']);
  });

  it('rejects user access tokens, wrong audience, garbage and missing tokens with 401', async () => {
    const id = randomUUID();
    expect((await internal(id, id, await userToken(id))).status).toBe(401);
    expect(
      (await internal(id, id, await signer.signServiceToken('api-gateway', 'identity-service'))).status,
    ).toBe(401);
    expect((await internal(id, id, 'garbage')).status).toBe(401);
    expect((await request(app).get(`/internal/memberships/${id}/${id}`)).status).toBe(401);
  });
});

describe('authentication on /v1/*', () => {
  it('rejects a service token from the wrong caller (identity) with 403', async () => {
    const res = await request(app)
      .get('/v1/companies/mine')
      .set({ ...(await as(randomUUID())), authorization: `Bearer ${identityToken}` });
    expect([res.status, res.body.error.code]).toEqual([403, 'CALLER_NOT_ALLOWED']);
  });

  it('requires a valid service token', async () => {
    const h = { [HEADERS.userToken]: await userToken(randomUUID()) };
    expect((await request(app).get('/v1/companies/mine').set(h)).status).toBe(401);
    expect(
      (
        await request(app)
          .get('/v1/companies/mine')
          .set({ ...h, authorization: 'Bearer nope' })
      ).status,
    ).toBe(401);
    const wrongAud = await signer.signServiceToken('api-gateway', 'identity-service');
    expect(
      (
        await request(app)
          .get('/v1/companies/mine')
          .set({ ...h, authorization: `Bearer ${wrongAud}` })
      ).status,
    ).toBe(401);
  });

  it('requires a valid x-user-token', async () => {
    const svc = { authorization: `Bearer ${serviceToken}` };
    expect((await request(app).get('/v1/companies/mine').set(svc)).status).toBe(401);
    expect(
      (await request(app).post('/v1/companies').set(svc).send({ legalName: 'Acme', countryCode: 'SA' }))
        .status,
    ).toBe(401);
    expect(
      (
        await request(app)
          .get('/v1/companies/mine')
          .set({ ...svc, [HEADERS.userToken]: 'garbage' })
      ).status,
    ).toBe(401);
    expect(
      (
        await request(app)
          .get('/v1/companies/mine')
          .set({ ...svc, [HEADERS.userToken]: serviceToken })
      ).status,
    ).toBe(401);
  });
});
