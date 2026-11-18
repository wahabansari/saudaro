import { readFileSync } from 'node:fs';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { loadEnv } from '../../src/config/env.ts';
import { mapDatabaseError } from '../../src/common/errors.ts';
import { assertSafeRuntimeRole, createPool } from '../../src/database/client.ts';
import { buildMigrationSql, schemaTables } from '../../src/database/policies/generate-rls-migration.ts';
import { BASELINE_0005, REFERENCE_TABLES } from '../../src/database/policies/spec.ts';
import { seedReference } from '../../src/database/seeds/reference.ts';
import { appPool, expectDbError, newWorld, urls, type World } from '../support/world.ts';

let w: World;
beforeAll(async () => {
  w = await newWorld();
});
afterAll(async () => {
  await w.close();
});

describe('database connection & migrations', () => {
  it('connects with every runtime role and reports the expected identity', async () => {
    for (const [key, role] of [
      ['app', 'saudaro_app'],
      ['worker', 'saudaro_worker'],
      ['migrator', 'saudaro_migrator'],
      ['readonly', 'saudaro_readonly'],
    ] as const) {
      const c = new pg.Client({ connectionString: urls()[key] });
      await c.connect();
      expect((await c.query('select current_user as u')).rows[0].u).toBe(role);
      await c.end();
    }
  });

  it('applied every migration and created all schema tables', async () => {
    const applied = await w.one<{ n: string }>(
      'select count(*)::text as n from drizzle.__drizzle_migrations',
    );
    expect(Number(applied.n)).toBe(8);
    const tables = await w.admin.query(
      "select relname from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r'",
    );
    expect(new Set(tables.rows.map((r) => r.relname))).toEqual(new Set(schemaTables()));
    expect(tables.rowCount).toBe(155);
    const ext = await w.admin.query("select extname from pg_extension where extname in ('pg_trgm','citext')");
    expect(ext.rowCount).toBe(2);
  });

  it('keeps the applied 0005 RLS migration in sync with the policy spec plus the pre-0007 baseline (no drift)', () => {
    const file = new URL('../../src/database/migrations/0005_rls_policies_and_grants.sql', import.meta.url);
    expect(readFileSync(file, 'utf8')).toBe(buildMigrationSql(BASELINE_0005));
  });

  it('role hardening: no login role is superuser/bypassrls/createrole, helper roles cannot log in', async () => {
    const r = await w.admin.query(
      "select rolname, rolsuper, rolbypassrls, rolcreaterole, rolcanlogin from pg_roles where rolname like 'saudaro_%'",
    );
    expect(r.rowCount).toBe(6);
    for (const row of r.rows)
      expect([row.rolname, row.rolsuper, row.rolbypassrls, row.rolcreaterole]).toEqual([
        row.rolname,
        false,
        false,
        false,
      ]);
    const helpers = r.rows.filter((x) => ['saudaro_authz', 'saudaro_pub'].includes(x.rolname));
    expect(helpers.every((x) => x.rolcanlogin === false)).toBe(true);
    // Definer functions are owned by the helper role, never by the superuser or the migrator.
    const owners = await w.admin.query(
      "select distinct pg_get_userbyid(proowner) as owner from pg_proc where pronamespace = 'app'::regnamespace and prosecdef",
    );
    expect(owners.rows.map((x) => x.owner)).toEqual(['saudaro_authz']);
  });

  it('seeds are idempotent and never delete data', async () => {
    const m = new pg.Client({ connectionString: urls().migrator });
    await m.connect();
    const count = async () =>
      (
        await m.query(
          'select (select count(*) from countries)::int a, (select count(*) from permissions)::int b, (select count(*) from company_role_permissions)::int c',
        )
      ).rows[0];
    const before = await count();
    await seedReference(m);
    expect(await count()).toEqual(before);
    await m.end();
    expect(before.a).toBeGreaterThan(40);
  });

  it('every tenant/parent foreign key has an index leading with its first column', async () => {
    // FKs into never-deleted reference tables and users (soft-delete only) are intentionally unindexed.
    const exempt = [...REFERENCE_TABLES, 'users'];
    const r = await w.admin.query(
      `select c.conrelid::regclass::text as tbl, c.conname, c.confrelid::regclass::text as target
       from pg_constraint c
       where c.contype = 'f' and c.connamespace = 'public'::regnamespace
         and not exists (select 1 from pg_index i where i.indrelid = c.conrelid and i.indkey[0] = c.conkey[1])`,
    );
    const offenders = r.rows
      .filter((x) => !exempt.includes(x.target))
      .map((x) => `${x.tbl}.${x.conname} -> ${x.target}`);
    expect(offenders).toEqual([]);
  });
});

describe('constraints & integrity', () => {
  it('tenant composite foreign keys make cross-company child rows impossible', async () => {
    const [u1, u2] = [await w.user(), await w.user()];
    const [c1, c2] = [await w.company(u1), await w.company(u2)];
    const rfq = await w.rfq(c1, u1);
    await expect(
      w.admin.query(
        `insert into rfq_items (rfq_id, company_id, line_no, product_name, quantity, uom_id) values ($1, $2, 2, 'x', 1, $3)`,
        [rfq.id, c2, await w.uom('KGM')],
      ),
    ).rejects.toMatchObject({ code: '23503' });
  });

  it('check constraints reject invalid business data', async () => {
    const u = await w.user();
    const c = await w.company(u);
    const rfq = await w.rfq(c, u);
    const kgm = await w.uom('KGM');
    const bad: Array<[string, string, unknown[]]> = [
      [
        'non-positive quantity',
        `insert into rfq_items (rfq_id, company_id, line_no, product_name, quantity, uom_id) values ($1,$2,9,'x',0,$3)`,
        [rfq.id, c, kgm],
      ],
      [
        'negative target price',
        `insert into rfq_items (rfq_id, company_id, line_no, product_name, quantity, uom_id, target_unit_price) values ($1,$2,9,'x',1,$3,-5)`,
        [rfq.id, c, kgm],
      ],
      ['published without expiry', `update rfqs set expires_at = null where id = $1`, [rfq.id]],
      ['bad slug', `update companies set slug = 'A B' where id = $1`, [c]],
      ['bad currency code', `insert into currencies (code, name) values ('usd1','x')`, []],
      ['bad HS code length', `insert into hs_codes (code, level, description) values ('1006', 6, 'x')`, []],
    ];
    for (const [label, sql, params] of bad) {
      await expect(w.admin.query(sql, params), label).rejects.toMatchObject({
        code: expect.stringMatching(/^(23514|22001)$/),
      });
    }
  });

  it('unique constraints block duplicates (company slug, verified registration identifier, reference numbers)', async () => {
    const u = await w.user();
    const c = await w.company(u);
    const slug = (await w.one<{ slug: string }>('select slug from companies where id = $1', [c])).slug;
    await expect(
      w.admin.query(
        `insert into companies (legal_name, display_name, slug, country_id, created_by_user_id) values ('d','d',$1,$2,$3)`,
        [slug.toUpperCase(), await w.country('PK'), u],
      ),
    ).rejects.toMatchObject({ code: '23505' });
    const pk = await w.country('PK');
    const ins = `insert into company_registration_identifiers (company_id, country_id, identifier_type, identifier_value, verified_at) values ($1,$2,'tax_id','NTN-123', now())`;
    await w.admin.query(ins, [c, pk]);
    const other = await w.company(await w.user());
    await expect(w.admin.query(ins, [other, pk])).rejects.toMatchObject({ code: '23505' });
    const refs = await w.admin.query('select reference_no from rfqs order by created_at limit 2');
    if (refs.rowCount) expect(refs.rows[0].reference_no).toMatch(/^RFQ-\d{4}-\d{8}$/);
  });

  it('append-only tables reject UPDATE and DELETE even for the superuser', async () => {
    const u = await w.user();
    const log = await w.one<{ id: string }>(
      "insert into audit_logs (actor_type, actor_user_id, action, resource_type) values ('user', $1, 'x', 'y') returning id",
      [u],
    );
    await expect(
      w.admin.query("update audit_logs set action = 'tampered' where id = $1", [log.id]),
    ).rejects.toMatchObject({ message: expect.stringMatching(/append-only/) });
    await expect(w.admin.query('delete from audit_logs where id = $1', [log.id])).rejects.toMatchObject({
      message: expect.stringMatching(/append-only/),
    });
    await expect(w.admin.query('truncate audit_logs')).rejects.toMatchObject({
      message: expect.stringMatching(/append-only/),
    });
  });

  it('optimistic concurrency: every UPDATE bumps the version', async () => {
    const u = await w.user();
    const c = await w.company(u);
    const v1 = (await w.one<{ version: number }>('select version from companies where id = $1', [c])).version;
    await w.admin.query("update companies set display_name = 'renamed' where id = $1", [c]);
    const v2 = (await w.one<{ version: number }>('select version from companies where id = $1', [c])).version;
    expect(v2).toBe(v1 + 1);
  });

  it('specification values are validated against their definition', async () => {
    const u = await w.user();
    const c = await w.company(u);
    const def = await w.one<{ id: string }>(
      `insert into product_specification_definitions (key, name, data_type, min_value, max_value) values ('moisture_pct', 'Moisture %', 'number', 0, 100) returning id`,
    );
    const rfq = await w.rfq(c, u, { status: 'draft' });
    const ins = (v: number) =>
      w.admin.query(
        'insert into rfq_specifications (rfq_item_id, company_id, definition_id, value_number) values ($1,$2,$3,$4)',
        [rfq.itemId, c, def.id, v],
      );
    await expect(ins(150)).rejects.toMatchObject({ code: '23514' });
    await expect(ins(12.5)).resolves.toBeTruthy();
  });

  it('only one accepted quotation per RFQ is representable (final race guard)', async () => {
    const [uB, u1, u2] = [await w.user(), await w.user(), await w.user()];
    const [B, S1, S2] = [await w.company(uB), await w.company(u1), await w.company(u2)];
    const rfq = await w.rfq(B, uB);
    const q1 = await w.quotation(rfq.id, rfq.itemId, B, S1, u1);
    const q2 = await w.quotation(rfq.id, rfq.itemId, B, S2, u2);
    const accept = (q: { id: string; revisionId: string }) =>
      w.admin.query(
        "update quotations set status = 'accepted', accepted_revision_id = $2, accepted_at = now() where id = $1",
        [q.id, q.revisionId],
      );
    await accept(q1);
    await expect(accept(q2)).rejects.toMatchObject({ code: '23505' });
  });
});

describe('application foundation', () => {
  it('loadEnv validates configuration and never echoes values', () => {
    expect(() => loadEnv({})).toThrow(/DATABASE_URL/);
    expect(() => loadEnv({ DATABASE_URL: 'mysql://secret-user:secret-pass@h/db' })).toThrow(/postgres/);
    try {
      loadEnv({ DATABASE_URL: 'mysql://secret-user:secret-pass@h/db' });
    } catch (e) {
      expect(String(e)).not.toMatch(/secret-pass/);
    }
    expect(() =>
      loadEnv({ DATABASE_URL: 'postgres://a@h/db', NODE_ENV: 'production', DATABASE_SSL: 'disable' }),
    ).toThrow(/SSL/);
    expect(loadEnv({ DATABASE_URL: 'postgres://a@h/db' }).PORT).toBe(3001);
  });

  it('assertSafeRuntimeRole accepts the app role and rejects superuser / owner roles', async () => {
    const app = appPool(1);
    await expect(assertSafeRuntimeRole(app)).resolves.toBe('saudaro_app');
    await app.end();
    for (const key of ['admin', 'migrator'] as const) {
      const p = createPool(urls()[key], { max: 1 });
      await expect(assertSafeRuntimeRole(p)).rejects.toThrow();
      await p.end();
    }
  });

  it('maps PostgreSQL errors to safe HTTP errors without leaking details', async () => {
    const pool = appPool(1);
    const err = await expectDbError(
      pool,
      { userId: await w.user(), companyId: null },
      "insert into countries (iso2, iso3, name) values ('ZZ','ZZZ','x')",
    );
    await pool.end();
    expect(err.code).toBe('42501');
    expect(
      mapDatabaseError({ code: '42501', message: 'permission denied for table countries' })?.message,
    ).not.toMatch(/countries/);
    expect(mapDatabaseError({ code: '23505' })?.statusCode).toBe(409);
    expect(mapDatabaseError(new Error('plain'))).toBeNull();
  });
});
