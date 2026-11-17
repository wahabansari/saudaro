import { createHash, randomUUID } from 'node:crypto';
import type pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../src/app.ts';
import { loadEnv } from '../../src/config/env.ts';
import { createPool } from '../../src/database/client.ts';
import { as, appPool, expectDbError, newWorld, urls, type World } from '../support/world.ts';

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

const sha = (s: string) => createHash('sha256').update(s).digest('hex');

describe('RBAC enforced by the database', () => {
  it('viewer cannot create RFQs; member can draft; RFQs are cancelled, never deleted', async () => {
    const [owner, viewer, member, manager] = [await w.user(), await w.user(), await w.user(), await w.user()];
    const X = await w.company(owner);
    await w.member(X, viewer, 'viewer');
    await w.member(X, member, 'member');
    await w.member(X, manager, 'manager');
    const insert = (u: string) =>
      as(pool, { userId: u, companyId: X }, async (tx) =>
        tx.client.query(
          `insert into rfqs (company_id, created_by_user_id, title, primary_category_id) values ($1, $2, 'Draft', $3) returning id`,
          [X, u, await w.category('rice')],
        ),
      );
    await expect(insert(viewer)).rejects.toMatchObject({ code: '42501' });
    const draft = await insert(member);
    expect(draft.rowCount).toBe(1);
    const hardDelete = await expectDbError(
      pool,
      { userId: manager, companyId: X },
      'delete from rfqs where id = $1',
      [draft.rows[0].id],
    );
    expect(hardDelete.code).toBe('42501'); // no DELETE privilege at all
    const cancel = await as(pool, { userId: manager, companyId: X }, (tx) =>
      tx.client.query("update rfqs set status = 'cancelled' where id = $1", [draft.rows[0].id]),
    );
    expect(cancel.rowCount).toBe(1);
    const history = await w.admin.query(
      'select to_status from rfq_status_history where rfq_id = $1 order by created_at',
      [draft.rows[0].id],
    );
    expect(history.rows.map((r) => r.to_status)).toEqual(['draft', 'cancelled']);
  });

  it('RFQ lifecycle is a guarded state machine (no publish without items, no editing once live)', async () => {
    const owner = await w.user();
    const X = await w.company(owner);
    const ctx = { userId: owner, companyId: X };
    const draft = await as(pool, ctx, async (tx) =>
      tx.client.query(
        `insert into rfqs (company_id, created_by_user_id, title, primary_category_id, expires_at) values ($1,$2,'Lifecycle',$3, now() + interval '5 days') returning id`,
        [X, owner, await w.category('rice')],
      ),
    );
    const id = draft.rows[0].id;
    const noItems = await expectDbError(pool, ctx, "update rfqs set status = 'published' where id = $1", [
      id,
    ]);
    expect(noItems.message).toMatch(/at least one item/);
    const jump = await expectDbError(pool, ctx, "update rfqs set status = 'awarded' where id = $1", [id]);
    expect(jump.message).toMatch(/illegal RFQ status transition/);
    await w.admin.query(
      `insert into rfq_items (rfq_id, company_id, line_no, product_name, quantity, uom_id) values ($1,$2,1,'Rice',10,$3)`,
      [id, X, await w.uom('KGM')],
    );
    await w.admin.query(`insert into rfq_destinations (rfq_id, company_id, country_id) values ($1,$2,$3)`, [
      id,
      X,
      await w.country('AE'),
    ]);
    await as(pool, ctx, (tx) => tx.client.query("update rfqs set status = 'published' where id = $1", [id]));
    const published = await w.one<{ published_at: string | null }>(
      'select published_at from rfqs where id = $1',
      [id],
    );
    expect(published.published_at).not.toBeNull();
    const edit = await expectDbError(
      pool,
      ctx,
      `insert into rfq_items (rfq_id, company_id, line_no, product_name, quantity, uom_id) values ($1,$2,2,'x',1,$3)`,
      [id, X, await w.uom('KGM')],
    );
    expect(edit.message).toMatch(/locked/);
    const history = await w.admin.query(
      'select to_status from rfq_status_history where rfq_id = $1 order by created_at',
      [id],
    );
    expect(history.rows.map((r) => r.to_status)).toEqual(['draft', 'published']);
  });
});

describe('company creation, invitations and identity', () => {
  it('create_company makes the creator the sole owner; direct inserts into companies are impossible', async () => {
    const u = await w.user();
    const slug = `acme-${randomUUID().slice(0, 6)}`;
    const pk = await w.country('PK');
    const res = await as(pool, { userId: u }, (tx) =>
      tx.client.query('select app.create_company($1, $2, $3, $4) as id', [
        'Acme Exports Pvt Ltd',
        'Acme',
        slug,
        pk,
      ]),
    );
    const companyId = res.rows[0].id as string;
    const roles = await as(pool, { userId: u, companyId }, (tx) =>
      tx.client.query(
        'select r.key from company_memberships m join company_roles r on r.id = m.role_id where m.company_id = $1',
        [companyId],
      ),
    );
    expect(roles.rows.map((r) => r.key)).toEqual(['owner']);
    const direct = await expectDbError(
      pool,
      { userId: u, companyId },
      `insert into companies (legal_name, display_name, slug, country_id, created_by_user_id) values ('x','x','x-corp',$1,$2)`,
      [pk, u],
    );
    expect(direct.code).toBe('42501');
    const dupe = await expectDbError(pool, { userId: u }, 'select app.create_company($1,$2,$3,$4)', [
      'Other',
      'Other',
      slug,
      pk,
    ]);
    expect(dupe.code).toBe('23505');
    const pending = (
      await w.one<{ id: string }>("insert into users (email, display_name) values ($1, 'p') returning id", [
        `p-${randomUUID()}@example.test`,
      ])
    ).id;
    expect(
      (
        await expectDbError(pool, { userId: pending }, 'select app.create_company($1,$2,$3,$4)', [
          'P',
          'P',
          `p-${randomUUID().slice(0, 6)}`,
          pk,
        ])
      ).code,
    ).toBe('42501');
    expect(
      (
        await expectDbError(pool, { userId: randomUUID() }, 'select app.create_company($1,$2,$3,$4)', [
          'Z',
          'Z',
          `z-${randomUUID().slice(0, 6)}`,
          pk,
        ])
      ).code,
    ).toBe('42501');
  });

  it('invitations: verified matching user accepts once; nobody can invite at or above their own level', async () => {
    const [owner, admin] = [await w.user(), await w.user()];
    const X = await w.company(owner);
    await w.member(X, admin, 'admin');
    const invitee = await w.one<{ id: string; email: string }>(
      "insert into users (email, display_name, status, email_verified_at) values ($1,'inv','active', now()) returning id, email",
      [`inv-${randomUUID()}@example.test`],
    );
    const stranger = await w.user();
    const token = randomUUID();
    const invite = (u: string, role: string, tokenValue: string) =>
      as(pool, { userId: u, companyId: X }, async (tx) =>
        tx.client.query(
          "insert into company_invitations (company_id, email, role_id, token_hash, invited_by_user_id, expires_at) values ($1,$2,$3,$4,$5, now() + interval '3 days')",
          [X, invitee.email, await w.role(role), sha(tokenValue), u],
        ),
      );
    await expect(invite(admin, 'owner', randomUUID())).rejects.toMatchObject({ code: '42501' }); // escalation blocked
    await expect(invite(admin, 'admin', randomUUID())).rejects.toMatchObject({ code: '42501' });
    await invite(admin, 'manager', token);

    expect(
      (await expectDbError(pool, { userId: stranger }, 'select app.accept_invitation($1)', [sha(token)]))
        .code,
    ).toBe('42501');
    const ok = await as(pool, { userId: invitee.id }, (tx) =>
      tx.client.query('select app.accept_invitation($1) as id', [sha(token)]),
    );
    expect(ok.rows[0].id).toBeTruthy();
    const role = await as(pool, { userId: invitee.id, companyId: X }, (tx) =>
      tx.client.query(
        'select r.key from company_memberships m join company_roles r on r.id = m.role_id where m.user_id = $1 and m.company_id = $2',
        [invitee.id, X],
      ),
    );
    expect(role.rows[0].key).toBe('manager');
    expect(
      (await expectDbError(pool, { userId: invitee.id }, 'select app.accept_invitation($1)', [sha(token)]))
        .code,
    ).toBe('42501'); // single use
  });

  it('resolve_identity maps an external subject to a user id and nothing else', async () => {
    const u = await w.user();
    await w.admin.query(
      "insert into user_auth_identities (user_id, provider, provider_subject) values ($1, 'google', $2)",
      [u, `sub-${u}`],
    );
    // Pre-authentication lookup runs on the worker/auth pool, not the tenant-facing app role.
    const auth = createPool(urls().worker, { max: 1 });
    try {
      const hit = await auth.query("select app.resolve_identity('google', $1) as id", [`sub-${u}`]);
      expect(hit.rows[0].id).toBe(u);
      const miss = await auth.query("select app.resolve_identity('google', 'nope') as id");
      expect(miss.rows[0].id).toBeNull();
    } finally {
      await auth.end();
    }
  });
});

describe('quotation acceptance, deals and reviews', () => {
  async function scenario() {
    const [uB, u1, u2] = [await w.user(), await w.user(), await w.user()];
    const [B, S1, S2] = [await w.company(uB), await w.company(u1), await w.company(u2)];
    const rfq = await w.rfq(B, uB);
    const q1 = await w.quotation(rfq.id, rfq.itemId, B, S1, u1, 800);
    const q2 = await w.quotation(rfq.id, rfq.itemId, B, S2, u2, 780);
    return { uB, u1, u2, B, S1, S2, rfq, q1, q2 };
  }
  const accept = (s: { uB: string; B: string }, q: { id: string; revisionId: string }) =>
    as(pool, { userId: s.uB, companyId: s.B }, (tx) =>
      tx.client.query("update quotations set status = 'accepted', accepted_revision_id = $2 where id = $1", [
        q.id,
        q.revisionId,
      ]),
    );

  it('concurrent acceptance of two competing quotations: exactly one wins', async () => {
    const s = await scenario();
    const results = await Promise.allSettled([accept(s, s.q1), accept(s, s.q2)]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const loser = results.find((r) => r.status === 'rejected') as PromiseRejectedResult;
    expect(loser.reason.code).toBe('23505');
    const accepted = await w.one<{ n: string }>(
      "select count(*)::text n from quotations where rfq_id = $1 and status = 'accepted'",
      [s.rfq.id],
    );
    expect(accepted.n).toBe('1');
  });

  it('only the buyer can accept, only the latest submitted revision, and never after expiry', async () => {
    const s = await scenario();
    const bySupplier = await expectDbError(
      pool,
      { userId: s.u1, companyId: s.S1 },
      "update quotations set status = 'accepted', accepted_revision_id = $2 where id = $1",
      [s.q1.id, s.q1.revisionId],
    );
    expect(bySupplier.code).toBe('42501');
    const wrongRevision = await expectDbError(
      pool,
      { userId: s.uB, companyId: s.B },
      "update quotations set status = 'accepted', accepted_revision_id = $2 where id = $1",
      [s.q1.id, s.q2.revisionId],
    );
    expect(wrongRevision.code).toMatch(/^(23503|23514)$/); // revision belongs to another quotation
    await w.admin.query("update quotations set valid_until = now() - interval '1 minute' where id = $1", [
      s.q1.id,
    ]);
    const expired = await expectDbError(
      pool,
      { userId: s.uB, companyId: s.B },
      "update quotations set status = 'accepted', accepted_revision_id = $2 where id = $1",
      [s.q1.id, s.q1.revisionId],
    );
    expect(expired.message).toMatch(/validity has expired/);
  });

  it('deal is created atomically from the accepted revision; snapshot tampering and duplicates are rejected', async () => {
    const s = await scenario();
    await accept(s, s.q1);
    const createDeal = (unitPrice?: number) =>
      as(pool, { userId: s.uB, companyId: s.B }, async (tx) => {
        const q = (
          await tx.client.query(
            'select rfq_id, accepted_revision_id, currency_id, total_amount, company_id from quotations where id = $1',
            [s.q1.id],
          )
        ).rows[0];
        const d = await tx.client.query(
          `insert into deals (quotation_id, accepted_revision_id, rfq_id, buyer_company_id, supplier_company_id, currency_id, total_amount) values ($1,$2,$3,$4,$5,$6,$7) returning id`,
          [s.q1.id, q.accepted_revision_id, q.rfq_id, s.B, q.company_id, q.currency_id, q.total_amount],
        );
        const id = d.rows[0].id;
        await tx.client.query(
          `insert into deal_parties (deal_id, company_id, party_role) values ($1,$2,'buyer'), ($1,$3,'seller')`,
          [id, s.B, q.company_id],
        );
        await tx.client.query('insert into deal_terms (deal_id) values ($1)', [id]);
        await tx.client.query(
          `insert into deal_items (deal_id, line_no, rfq_item_id, description, quantity, uom_id, unit_price, total_price)
           select $1, 1, qi.rfq_item_id, 'Basmati rice', qi.quantity, qi.uom_id, coalesce($3::numeric, qi.unit_price), round(qi.quantity * coalesce($3::numeric, qi.unit_price), 4)
           from quotation_items qi where qi.revision_id = $2`,
          [id, q.accepted_revision_id, unitPrice ?? null],
        );
        return id as string;
      });

    const tampered = await createDeal(1).then(
      () => null,
      (e: { code: string; message: string }) => e,
    );
    expect(tampered?.message).toMatch(/do not match the accepted revision|do not add up/);
    const dealId = await createDeal();
    const supplierView = await as(pool, { userId: s.u1, companyId: s.S1 }, (tx) =>
      tx.client.query('select id, status from deals'),
    );
    expect(supplierView.rows).toEqual([{ id: dealId, status: 'active' }]);
    expect(
      (await as(pool, { userId: s.u2, companyId: s.S2 }, (tx) => tx.client.query('select id from deals')))
        .rowCount,
    ).toBe(0);
    await expect(createDeal()).rejects.toMatchObject({ code: '23505' }); // one deal per quotation
    const snapshotEdit = await expectDbError(
      pool,
      { userId: s.uB, companyId: s.B },
      'update deal_items set unit_price = 1 where deal_id = $1',
      [dealId],
    );
    expect(snapshotEdit.code).toBe('42501'); // no UPDATE privilege on the immutable snapshot

    // Reviews need a COMPLETED deal; completion needs both parties; one review per party per deal.
    const review = (u: string, from: string, to: string) =>
      as(pool, { userId: u, companyId: from }, (tx) =>
        tx.client.query(
          'insert into company_reviews (deal_id, reviewer_company_id, reviewed_company_id, reviewer_user_id, rating, body) values ($1,$2,$3,$4,5,$5)',
          [dealId, from, to, u, 'Good trade'],
        ),
      );
    await expect(review(s.u1, s.S1, s.B)).rejects.toMatchObject({
      message: expect.stringMatching(/completed platform deal/),
    });
    const setStatus = (user: string, company: string, status: string) =>
      as(pool, { userId: user, companyId: company }, (tx) =>
        tx.client.query('update deals set status = $2 where id = $1', [dealId, status]),
      );
    await setStatus(s.uB, s.B, 'in_production');
    await setStatus(s.uB, s.B, 'shipped');
    await setStatus(s.uB, s.B, 'delivered');
    await expect(setStatus(s.uB, s.B, 'completed')).rejects.toMatchObject({
      message: expect.stringMatching(/both parties/),
    });
    const confirm = (user: string, company: string) =>
      as(pool, { userId: user, companyId: company }, (tx) =>
        tx.client.query(
          `insert into deal_confirmations (deal_id, company_id, confirmation_type, confirmed_by_user_id) values ($1,$2,'completion',$3)`,
          [dealId, company, user],
        ),
      );
    await confirm(s.uB, s.B);
    await confirm(s.u1, s.S1);
    await setStatus(s.uB, s.B, 'completed');
    await review(s.u1, s.S1, s.B);
    await expect(review(s.u1, s.S1, s.B)).rejects.toMatchObject({ code: '23505' });
    const status = await w.one<{ status: string }>('select status from company_reviews where deal_id = $1', [
      dealId,
    ]);
    expect(status.status).toBe('pending'); // never self-published
    const history = await w.admin.query(
      'select to_status from deal_status_history where deal_id = $1 order by created_at',
      [dealId],
    );
    expect(history.rows.map((r) => r.to_status)).toEqual([
      'active',
      'in_production',
      'shipped',
      'delivered',
      'completed',
    ]);
  });
});

describe('HTTP foundation', () => {
  const env = (url: string) => loadEnv({ DATABASE_URL: url, NODE_ENV: 'test', LOG_LEVEL: 'silent' });

  it('liveness, readiness, request ids and the central error handler', async () => {
    const app = await buildApp({ env: env(urls().app), pool: createPool(urls().app, { max: 2 }) });
    try {
      expect((await app.inject('/health/live')).json()).toEqual({ status: 'ok' });
      expect((await app.inject('/health/ready')).statusCode).toBe(200);
      const missing = await app.inject({ url: '/nope', headers: { 'x-request-id': 'req-12345678' } });
      expect(missing.statusCode).toBe(404);
      expect(missing.headers['x-request-id']).toBe('req-12345678');
      expect(missing.json()).toEqual({ error: { code: 'not_found', message: 'Not found' } });
      const forged = await app.inject({
        url: '/health/live',
        headers: { 'x-request-id': 'bad id with spaces & <script>' },
      });
      expect(forged.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
      expect(forged.headers['x-content-type-options']).toBe('nosniff'); // helmet
    } finally {
      await app.close();
    }
  });

  it('readiness fails closed when the runtime role could bypass RLS', async () => {
    const superPool = createPool(urls().admin, { max: 1 });
    const app = await buildApp({ env: env(urls().admin), pool: superPool });
    try {
      expect((await app.inject('/health/ready')).statusCode).toBe(503);
    } finally {
      await app.close();
      await superPool.end();
    }
  });
});
