import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { inject } from 'vitest';
import { createPool, withTenantContext, type Tx } from '../../src/database/client.ts';

/**
 * Test fixtures are written as the test-only SUPERUSER (they bypass guards/RLS on purpose so we can
 * arrange arbitrary states). Every ASSERTION runs through `as()` / `appPool`, i.e. the real
 * least-privilege saudaro_app role with RLS forced.
 */
export function urls() {
  return inject('dbUrls');
}

export async function adminClient(): Promise<pg.Client> {
  const c = new pg.Client({ connectionString: urls().admin });
  await c.connect();
  return c;
}

export function appPool(max = 5): pg.Pool {
  return createPool(urls().app, { max, applicationName: 'saudaro-test-app' });
}

export interface Ctx {
  userId: string;
  companyId?: string | null;
}

export async function as<T>(pool: pg.Pool, ctx: Ctx, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return withTenantContext(pool, ctx, fn);
}

/** Runs a statement expecting it to FAIL; returns the PostgreSQL error (SQLSTATE + message). */
export async function expectDbError(
  pool: pg.Pool,
  ctx: Ctx,
  sql: string,
  params: unknown[] = [],
): Promise<{ code?: string; message: string }> {
  try {
    await withTenantContext(pool, ctx, (tx) => tx.client.query(sql, params));
  } catch (err) {
    const e = err as { code?: string; message: string };
    return { code: e.code, message: e.message };
  }
  throw new Error(`expected statement to fail but it succeeded: ${sql}`);
}

const slug = () => `c-${randomUUID().slice(0, 8)}`;

export class World {
  constructor(public readonly admin: pg.Client) {}

  async one<T = Record<string, string>>(sql: string, params: unknown[] = []): Promise<T> {
    const r = await this.admin.query(sql, params);
    return r.rows[0] as T;
  }

  id = async (table: string, col: string, value: string): Promise<string> =>
    (await this.one<{ id: string }>(`select id from ${table} where ${col} = $1`, [value])).id;

  country = (iso2: string) => this.id('countries', 'iso2', iso2);
  currency = (code: string) => this.id('currencies', 'code', code);
  uom = (code: string) => this.id('units_of_measure', 'code', code);
  category = (s: string) => this.id('product_categories', 'slug', s);
  incoterm = (code: string) => this.id('incoterms', 'code', code);
  role = async (key: string) =>
    (
      await this.one<{ id: string }>('select id from company_roles where company_id is null and key = $1', [
        key,
      ])
    ).id;

  async user(label = 'user'): Promise<string> {
    const email = `${label}-${randomUUID().slice(0, 8)}@example.test`;
    return (
      await this.one<{ id: string }>(
        `insert into users (email, display_name, status, email_verified_at) values ($1, $2, 'active', now()) returning id`,
        [email, label],
      )
    ).id;
  }

  async company(ownerId: string, opts: { iso2?: string; status?: 'draft' | 'active' } = {}): Promise<string> {
    const country = await this.country(opts.iso2 ?? 'PK');
    const s = slug();
    const c = await this.one<{ id: string }>(
      `insert into companies (legal_name, display_name, slug, country_id, created_by_user_id, status)
       values ($1, $1, $2, $3, $4, 'draft') returning id`,
      [`Company ${s}`, s, country, ownerId],
    );
    await this.admin.query(
      `insert into company_memberships (company_id, user_id, role_id) values ($1, $2, $3)`,
      [c.id, ownerId, await this.role('owner')],
    );
    await this.admin.query('insert into company_settings (company_id) values ($1)', [c.id]);
    await this.admin.query('insert into company_profiles (company_id) values ($1)', [c.id]);
    if ((opts.status ?? 'active') === 'active')
      await this.admin.query("update companies set status = 'active' where id = $1", [c.id]);
    return c.id;
  }

  async member(companyId: string, userId: string, roleKey: string): Promise<string> {
    return (
      await this.one<{ id: string }>(
        'insert into company_memberships (company_id, user_id, role_id) values ($1, $2, $3) returning id',
        [companyId, userId, await this.role(roleKey)],
      )
    ).id;
  }

  /** Published public RFQ with one item and one destination, expiring in 30 days. */
  async rfq(
    companyId: string,
    userId: string,
    o: { visibility?: 'public' | 'private' | 'invited'; status?: string; title?: string } = {},
  ): Promise<{ id: string; itemId: string }> {
    const status = o.status ?? 'published';
    const r = await this.one<{ id: string }>(
      `insert into rfqs (company_id, created_by_user_id, title, description, primary_category_id, status, visibility, currency_id, published_at, expires_at)
       values ($1, $2, $3, 'secret description', $4, $5, $6, $7, $8, $9) returning id`,
      [
        companyId,
        userId,
        o.title ?? 'Basmati rice 500 t',
        await this.category('rice'),
        status,
        o.visibility ?? 'public',
        await this.currency('USD'),
        status === 'draft' ? null : new Date(),
        status === 'draft' ? null : new Date(Date.now() + 30 * 86_400_000),
      ],
    );
    const item = await this.one<{ id: string }>(
      `insert into rfq_items (rfq_id, company_id, line_no, product_name, quantity, uom_id, target_unit_price)
       values ($1, $2, 1, 'Basmati rice', 500000, $3, 812.5) returning id`,
      [r.id, companyId, await this.uom('KGM')],
    );
    await this.admin.query(
      `insert into rfq_destinations (rfq_id, company_id, country_id, place_name) values ($1, $2, $3, 'Dubai')`,
      [r.id, companyId, await this.country('AE')],
    );
    return { id: r.id, itemId: item.id };
  }

  /** Submitted quotation (one submitted revision with one item) from `supplierId` on an RFQ. */
  async quotation(
    rfqId: string,
    itemId: string,
    buyerCompanyId: string,
    supplierCompanyId: string,
    userId: string,
    unitPrice = 800,
  ): Promise<{ id: string; revisionId: string }> {
    const usd = await this.currency('USD');
    const q = await this.one<{ id: string }>(
      `insert into quotations (company_id, rfq_id, buyer_company_id, created_by_user_id, currency_id, status, submitted_at, valid_until)
       values ($1, $2, $3, $4, $5, 'draft', null, now() + interval '10 days') returning id`,
      [supplierCompanyId, rfqId, buyerCompanyId, userId, usd],
    );
    const rev = await this.one<{ id: string }>(
      `insert into quotation_revisions (quotation_id, company_id, revision_no, currency_id, created_by_user_id) values ($1, $2, 1, $3, $4) returning id`,
      [q.id, supplierCompanyId, usd, userId],
    );
    await this.admin.query(
      `insert into quotation_items (revision_id, company_id, rfq_item_id, unit_price, quantity, uom_id) values ($1, $2, $3, $4, 500000, $5)`,
      [rev.id, supplierCompanyId, itemId, unitPrice, await this.uom('KGM')],
    );
    await this.admin.query("update quotation_revisions set status = 'submitted' where id = $1", [rev.id]);
    await this.admin.query(
      `update quotations set status = 'submitted', submitted_at = now(),
         total_amount = (select total_amount from quotation_revisions where id = $2) where id = $1`,
      [q.id, rev.id],
    );
    return { id: q.id, revisionId: rev.id };
  }

  async makeAdmin(userId: string, adminRole: string): Promise<void> {
    await this.admin.query('insert into admin_role_assignments (user_id, admin_role) values ($1, $2)', [
      userId,
      adminRole,
    ]);
  }

  async close(): Promise<void> {
    await this.admin.end();
  }
}

export async function newWorld(): Promise<World> {
  return new World(await adminClient());
}
