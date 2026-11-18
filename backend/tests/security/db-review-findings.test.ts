import type pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { appPool, as, expectDbError, newWorld, type World } from '../support/world.ts';

/** Regression tests for the confirmed findings of the database design review. */
let w: World;
let pool: pg.Pool;
beforeAll(async () => {
  w = await newWorld();
  pool = appPool(6);
});
afterAll(async () => {
  await pool.end();
  await w.close();
});

describe('last-owner protection holds under concurrency', () => {
  it('two owners leaving in parallel transactions cannot leave the company ownerless', async () => {
    const [o1, o2] = [await w.user(), await w.user()];
    const X = await w.company(o1);
    await w.member(X, o2, 'owner');
    const open = async (user: string): Promise<pg.PoolClient> => {
      const c = await pool.connect();
      await c.query('BEGIN');
      await c.query(
        "select set_config('app.current_user_id', $1, true), set_config('app.current_company_id', $2, true)",
        [user, X],
      );
      await c.query(
        "update company_memberships set status = 'removed' where user_id = $1 and company_id = $2",
        [user, X],
      );
      return c;
    };
    const c1 = await open(o1);
    const c2 = await open(o2);
    await c1.query('SET CONSTRAINTS ALL IMMEDIATE'); // sees the other owner still active; holds the company lock
    const second = c2.query('SET CONSTRAINTS ALL IMMEDIATE'); // must wait for c1
    await new Promise((r) => setTimeout(r, 300));
    await c1.query('COMMIT');
    await expect(second).rejects.toMatchObject({
      message: expect.stringMatching(/at least one active owner/),
    });
    await c2.query('ROLLBACK');
    c1.release();
    c2.release();
    const owners = await w.one<{ n: string }>(
      `select count(*)::text n from company_memberships m join company_roles r on r.id = m.role_id where m.company_id = $1 and m.status = 'active' and r.key = 'owner'`,
      [X],
    );
    expect(owners.n).toBe('1');
  });
});

describe('quotation headline figures are derived from the revision', () => {
  it('a supplier cannot submit a quotation whose total differs from its revision', async () => {
    const [uB, uS] = [await w.user(), await w.user()];
    const [B, S] = [await w.company(uB), await w.company(uS)];
    const rfq = await w.rfq(B, uB);
    const usd = await w.currency('USD');
    const q = await w.one<{ id: string }>(
      `insert into quotations (company_id, rfq_id, buyer_company_id, created_by_user_id, currency_id, total_amount, valid_until)
       values ($1,$2,$3,$4,$5, 1, now() + interval '5 days') returning id`,
      [S, rfq.id, B, uS, usd],
    );
    const rev = await w.one<{ id: string }>(
      `insert into quotation_revisions (quotation_id, company_id, revision_no, currency_id, created_by_user_id) values ($1,$2,1,$3,$4) returning id`,
      [q.id, S, usd, uS],
    );
    await w.admin.query(
      `insert into quotation_items (revision_id, company_id, rfq_item_id, unit_price, quantity, uom_id) values ($1,$2,$3,800,500000,$4)`,
      [rev.id, S, rfq.itemId, await w.uom('KGM')],
    );
    await w.admin.query("update quotation_revisions set status = 'submitted' where id = $1", [rev.id]);
    await as(pool, { userId: uS, companyId: S }, (tx) =>
      tx.client.query("update quotations set status = 'submitted', total_amount = 1 where id = $1", [q.id]),
    );
    const row = await w.one<{ total_amount: string }>(
      'select total_amount::text from quotations where id = $1',
      [q.id],
    );
    expect(Number(row.total_amount)).toBe(400_000_000);
  });
});

describe('status history cannot be forged', () => {
  it('no application role can INSERT into any *_status_history table', async () => {
    const owner = await w.user();
    const X = await w.company(owner);
    for (const t of [
      'rfq_status_history',
      'quotation_status_history',
      'deal_status_history',
      'verification_status_history',
    ]) {
      const err = await expectDbError(
        pool,
        { userId: owner, companyId: X },
        `insert into ${t} select * from ${t} where false`,
      );
      expect(err.code, t).toBe('42501');
    }
    // ...while genuine transitions are still recorded by the definer trigger.
    const rfq = await w.rfq(X, owner, { status: 'draft' });
    const rows = await w.admin.query('select to_status from rfq_status_history where rfq_id = $1', [rfq.id]);
    expect(rows.rowCount).toBe(1);
  });
});

describe('closed quotations cannot receive a late revision', () => {
  it('a draft revision cannot be submitted after the quotation was withdrawn', async () => {
    const [uB, uS] = [await w.user(), await w.user()];
    const [B, S] = [await w.company(uB), await w.company(uS)];
    const rfq = await w.rfq(B, uB);
    const q = await w.quotation(rfq.id, rfq.itemId, B, S, uS);
    await w.admin.query("update quotations set status = 'withdrawn', closed_at = now() where id = $1", [
      q.id,
    ]);
    await w.admin.query(
      `insert into quotation_revisions (quotation_id, company_id, revision_no, currency_id, created_by_user_id) values ($1,$2,2,(select currency_id from quotations where id = $1),$3)`,
      [q.id, S, uS],
    );
    const err = await expectDbError(
      pool,
      { userId: uS, companyId: S },
      "update quotation_revisions set status = 'submitted' where quotation_id = $1 and revision_no = 2",
      [q.id],
    );
    expect(err.message).toMatch(/quotation is closed/);
  });
});

async function newProduct(companyId: string, status = 'draft'): Promise<string> {
  const s = Math.random().toString(36).slice(2, 10);
  return (
    await w.one<{ id: string }>(
      `insert into products (company_id, name, slug, primary_category_id, base_uom_id, status, published_at)
       values ($1, $2, $2, $3, $4, $5, case when $5 = 'active' then now() end) returning id`,
      [companyId, `P ${s}`, await w.category('rice'), await w.uom('KGM'), status],
    )
  ).id;
}

async function newListing(productId: string): Promise<string> {
  return (
    await w.one<{ id: string }>(
      `insert into seller_product_listings (company_id, product_id) select company_id, id from products where id = $1 returning id`,
      [productId],
    )
  ).id;
}

describe('business records are never hard-deleted by the application role', () => {
  it('products and seller_product_listings reject DELETE with insufficient_privilege', async () => {
    const u = await w.user();
    const X = await w.company(u);
    const product = await newProduct(X);
    await newListing(product);
    for (const table of ['products', 'seller_product_listings']) {
      const err = await expectDbError(pool, { userId: u, companyId: X }, `delete from ${table}`);
      expect(err.code, table).toBe('42501');
    }
    const n = await w.one<{ n: string }>('select count(*)::text n from products where id = $1', [product]);
    expect(n.n).toBe('1');
  });
});

describe('product and listing status governance', () => {
  const setStatus = (table: string, id: string, status: string) =>
    `update ${table} set status = '${status}' where id = '${id}'`;

  it('products: draft -> active sets published_at; only the allowed transitions pass', async () => {
    const u = await w.user();
    const X = await w.company(u);
    const ctx = { userId: u, companyId: X };
    const id = await newProduct(X);
    await as(pool, ctx, (tx) => tx.client.query(setStatus('products', id, 'active')));
    const row = await w.one<{ status: string; published_at: string | null }>(
      'select status, published_at from products where id = $1',
      [id],
    );
    expect(row.status).toBe('active');
    expect(row.published_at).not.toBeNull();
    for (const bad of ['draft', 'suspended']) {
      const err = await expectDbError(pool, ctx, setStatus('products', id, bad));
      expect(err.code, bad).toBe('42501');
    }
    await as(pool, ctx, (tx) => tx.client.query(setStatus('products', id, 'archived')));
    const err = await expectDbError(pool, ctx, setStatus('products', id, 'active'));
    expect(err.code).toBe('42501');
    await as(pool, ctx, (tx) => tx.client.query(setStatus('products', id, 'draft'))); // archived -> draft
  });

  it('products: suspension is moderation-only (cannot be set or left by the app role)', async () => {
    const u = await w.user();
    const X = await w.company(u);
    const ctx = { userId: u, companyId: X };
    const id = await newProduct(X, 'active');
    expect((await expectDbError(pool, ctx, setStatus('products', id, 'suspended'))).code).toBe('42501');
    await w.admin.query("update products set status = 'suspended' where id = $1", [id]); // trusted caller
    for (const to of ['active', 'draft', 'archived']) {
      expect((await expectDbError(pool, ctx, setStatus('products', id, to))).code, to).toBe('42501');
    }
    await w.admin.query("update products set status = 'active' where id = $1", [id]);
  });

  it('listings: draft/active/paused/archived follow the same lifecycle', async () => {
    const u = await w.user();
    const X = await w.company(u);
    const ctx = { userId: u, companyId: X };
    const l = await newListing(await newProduct(X));
    const t = 'seller_product_listings';
    expect((await expectDbError(pool, ctx, setStatus(t, l, 'paused'))).code).toBe('42501'); // draft -> paused
    for (const to of ['active', 'paused', 'active', 'archived', 'draft']) {
      await as(pool, ctx, (tx) => tx.client.query(setStatus(t, l, to)));
    }
    await as(pool, ctx, (tx) => tx.client.query(setStatus(t, l, 'archived')));
    expect((await expectDbError(pool, ctx, setStatus(t, l, 'active'))).code).toBe('42501');
  });
});

describe('rfq_invitations responses', () => {
  async function invitation() {
    const [uB, uS] = [await w.user(), await w.user()];
    const [B, S] = [await w.company(uB), await w.company(uS)];
    const rfq = await w.rfq(B, uB, { visibility: 'invited' });
    const inv = await w.one<{ id: string }>(
      'insert into rfq_invitations (rfq_id, company_id, invited_company_id, invited_by_user_id) values ($1,$2,$3,$4) returning id',
      [rfq.id, B, S, uB],
    );
    return { buyer: { userId: uB, companyId: B }, supplier: { userId: uS, companyId: S }, id: inv.id, S };
  }
  const set = (id: string, status: string) =>
    `update rfq_invitations set status = '${status}', responded_at = now() where id = '${id}'`;
  const state = async (id: string) =>
    (await w.one<{ status: string }>('select status from rfq_invitations where id = $1', [id])).status;

  it('only the invitee moves pending -> viewed -> quoted; the buyer cannot respond on its behalf', async () => {
    const i = await invitation();
    for (const to of ['viewed', 'declined', 'quoted']) {
      expect((await expectDbError(pool, i.buyer, set(i.id, to))).code, `buyer ${to}`).toBe('42501');
    }
    expect((await expectDbError(pool, i.supplier, set(i.id, 'quoted'))).code).toBe('42501'); // pending -> quoted
    await as(pool, i.supplier, (tx) => tx.client.query(set(i.id, 'viewed')));
    await as(pool, i.supplier, (tx) => tx.client.query(set(i.id, 'quoted')));
    expect(await state(i.id)).toBe('quoted');
    expect((await expectDbError(pool, i.supplier, set(i.id, 'declined'))).code).toBe('42501'); // quoted is final
  });

  it('declined is terminal: nobody can reset it to pending or revive it', async () => {
    const i = await invitation();
    await as(pool, i.supplier, (tx) => tx.client.query(set(i.id, 'declined')));
    for (const to of ['pending', 'viewed', 'quoted']) {
      expect((await expectDbError(pool, i.supplier, set(i.id, to))).code, `supplier ${to}`).toBe('42501');
      expect((await expectDbError(pool, i.buyer, set(i.id, to))).code, `buyer ${to}`).toBe('42501');
    }
    expect(await state(i.id)).toBe('declined');
  });

  it('an invitee member without quotation rights cannot respond; system callers can still operate', async () => {
    const i = await invitation();
    const viewer = await w.user();
    await w.member(i.S, viewer, 'viewer');
    const r = await as(pool, { userId: viewer, companyId: i.S }, (tx) =>
      tx.client.query(set(i.id, 'viewed')),
    );
    expect(r.rowCount).toBe(0); // RLS hides the row from the update
    await w.admin.query("update rfq_invitations set status = 'quoted' where id = $1", [i.id]);
    expect(await state(i.id)).toBe('quoted');
  });
});
