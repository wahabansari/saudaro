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
