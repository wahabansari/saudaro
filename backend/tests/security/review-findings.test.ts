import { randomUUID } from 'node:crypto';
import type pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createPool } from '../../src/database/client.ts';
import { appPool, as, expectDbError, newWorld, urls, type World } from '../support/world.ts';

/** Regression tests for the findings of the independent security review. */
let w: World;
let pool: pg.Pool;
beforeAll(async () => {
  w = await newWorld();
  pool = appPool(4);
});
afterAll(async () => {
  await pool.end();
  await w.close();
});

async function dealFixture() {
  const [uB, uS, uX] = [await w.user('buyer'), await w.user('supplier'), await w.user('third')];
  const [B, S, X] = [await w.company(uB), await w.company(uS), await w.company(uX)];
  const rfq = await w.rfq(B, uB);
  const q = await w.quotation(rfq.id, rfq.itemId, B, S, uS);
  await w.admin.query(
    "update quotations set status = 'accepted', accepted_revision_id = $2, accepted_at = now() where id = $1",
    [q.id, q.revisionId],
  );
  const quo = await w.one<{ currency_id: string; total_amount: string }>(
    'select currency_id, total_amount from quotations where id = $1',
    [q.id],
  );
  const deal = await w.one<{ id: string }>(
    `insert into deals (quotation_id, accepted_revision_id, rfq_id, buyer_company_id, supplier_company_id, currency_id, total_amount, agreed_at)
     values ($1,$2,$3,$4,$5,$6,$7, now() - interval '1 day') returning id`,
    [q.id, q.revisionId, rfq.id, B, S, quo.currency_id, quo.total_amount],
  );
  await w.admin.query(
    `insert into deal_parties (deal_id, company_id, party_role) values ($1,$2,'buyer'), ($1,$3,'seller')`,
    [deal.id, B, S],
  );
  return { uB, uS, uX, B, S, X, dealId: deal.id };
}

describe('F1: a deal cannot be cancelled unilaterally', () => {
  it('requester cannot self-accept; only the counterparty can; then cancellation works', async () => {
    const f = await dealFixture();
    const buyer = { userId: f.uB, companyId: f.B };
    const supplier = { userId: f.uS, companyId: f.S };
    // Forged "accepted" status on insert is normalised to "requested".
    await as(pool, buyer, (tx) =>
      tx.client.query(
        `insert into deal_cancellations (deal_id, requested_by_company_id, requested_by_user_id, reason, status) values ($1,$2,$3,'changed my mind','accepted')`,
        [f.dealId, f.B, f.uB],
      ),
    );
    expect(
      (
        await w.one<{ status: string }>('select status from deal_cancellations where deal_id = $1', [
          f.dealId,
        ])
      ).status,
    ).toBe('requested');
    const direct = await expectDbError(pool, buyer, "update deals set status = 'cancelled' where id = $1", [
      f.dealId,
    ]);
    expect(direct.message).toMatch(/acceptance by the counterparty/);
    const selfAccept = await expectDbError(
      pool,
      buyer,
      "update deal_cancellations set status = 'accepted', responded_by_company_id = $2 where deal_id = $1",
      [f.dealId, f.B],
    );
    expect(selfAccept.code).toBe('42501');
    await as(pool, supplier, (tx) =>
      tx.client.query("update deal_cancellations set status = 'accepted' where deal_id = $1", [f.dealId]),
    );
    await as(pool, buyer, (tx) =>
      tx.client.query("update deals set status = 'cancelled' where id = $1", [f.dealId]),
    );
    expect(
      (await w.one<{ status: string }>('select status from deals where id = $1', [f.dealId])).status,
    ).toBe('cancelled');
  });

  it('a third company cannot file or answer cancellations', async () => {
    const f = await dealFixture();
    const err = await expectDbError(
      pool,
      { userId: f.uX, companyId: f.X },
      `insert into deal_cancellations (deal_id, requested_by_company_id, requested_by_user_id, reason) values ($1,$2,$3,'x')`,
      [f.dealId, f.X, f.uX],
    );
    expect(err.code).toBe('42501');
  });
});

describe('F2: nobody can plant a third company as a deal party', () => {
  it('deal_parties can only be written when the deal is created', async () => {
    const f = await dealFixture();
    const err = await expectDbError(
      pool,
      { userId: f.uB, companyId: f.B },
      `insert into deal_parties (deal_id, company_id, party_role) values ($1,$2,'observer')`,
      [f.dealId, f.X],
    );
    expect(err.message).toMatch(/only be written when the deal is created/);
    const view = await as(pool, { userId: f.uX, companyId: f.X }, (tx) =>
      tx.client.query('select id from deals'),
    );
    expect(view.rowCount).toBe(0);
  });
});

describe('F3: a role manager cannot outrank their superiors via custom roles', () => {
  it('cannot define or raise a role to or above their own level', async () => {
    const [owner, admin] = [await w.user(), await w.user()];
    const X = await w.company(owner);
    await w.member(X, admin, 'admin'); // level 80
    const ctx = { userId: admin, companyId: X };
    const low = await as(pool, ctx, (tx) =>
      tx.client.query(
        `insert into company_roles (company_id, key, name, level, is_system) values ($1,'helper','Helper',10,false) returning id`,
        [X],
      ),
    );
    const roleId = low.rows[0].id;
    const raise = await expectDbError(pool, ctx, 'update company_roles set level = 99 where id = $1', [
      roleId,
    ]);
    expect(raise.message).toMatch(/at or above your own level/);
    const equal = await expectDbError(
      pool,
      ctx,
      `insert into company_roles (company_id, key, name, level, is_system) values ($1,'peer','Peer',80,false)`,
      [X],
    );
    expect(equal.code).toBe('42501');
    const ok = await as(pool, ctx, (tx) =>
      tx.client.query('update company_roles set level = 70 where id = $1', [roleId]),
    );
    expect(ok.rowCount).toBe(1);
  });
});

describe('F4: session-level settings cannot survive on a pooled connection', () => {
  it('a session set_config is wiped before the connection is reused', async () => {
    const one = appPool(1);
    try {
      const attacker = randomUUID();
      await as(one, { userId: await w.user() }, (tx) =>
        tx.client.query("select set_config('app.current_user_id', $1, false)", [attacker]),
      );
      const next = await one.query("select nullif(current_setting('app.current_user_id', true), '') as raw");
      expect(next.rows[0].raw).toBeNull();
    } finally {
      await one.end();
    }
  });
});

describe('F6: definer functions are not oracles for foreign tenants', () => {
  it('rfq_owner / can_view_rfq reveal nothing about other tenants; resolve_identity is closed to the app role', async () => {
    const [uA, uB] = [await w.user(), await w.user()];
    const [A, B] = [await w.company(uA), await w.company(uB)];
    const draft = await w.rfq(B, uB, { status: 'draft', visibility: 'private' });
    const owner = await as(pool, { userId: uA, companyId: A }, (tx) =>
      tx.client.query('select app.rfq_owner($1) as o', [draft.id]),
    );
    expect(owner.rows[0].o).toBeNull();
    const pub = await w.rfq(B, uB);
    const spoof = await as(pool, { userId: uA, companyId: A }, (tx) =>
      tx.client.query('select app.can_view_rfq($1, $2) as v', [pub.id, B]),
    );
    expect(spoof.rows[0].v).toBe(false); // cannot ask on behalf of another company
    const own = await as(pool, { userId: uA, companyId: A }, (tx) =>
      tx.client.query('select app.can_view_rfq($1, $2) as v', [pub.id, A]),
    );
    expect(own.rows[0].v).toBe(true);
    const identity = await expectDbError(pool, { userId: uA }, "select app.resolve_identity('google', 'x')");
    expect(identity.code).toBe('42501');
    const workerPool = createPool(urls().worker, { max: 1 });
    try {
      const r = await workerPool.query("select app.resolve_identity('google', 'nobody') as id");
      expect(r.rows[0].id).toBeNull();
    } finally {
      await workerPool.end();
    }
  });
});

describe('F7: files cannot be attached across tenants by UUID', () => {
  it('message and deal-document attachments require the file to belong to the attaching company', async () => {
    const f = await dealFixture();
    const foreignFile = await w.one<{ id: string }>(
      `insert into files (company_id, uploaded_by_user_id, storage_provider, bucket, storage_key, original_filename, mime_type, size_bytes, sha256, status, scan_status)
       values ($1,$2,'s3','b',$3,'secret.pdf','application/pdf',10,$4,'available','clean') returning id`,
      [f.S, f.uS, `k/${randomUUID()}`, 'c'.repeat(64)],
    );
    const conv = await w.one<{ id: string }>(
      `insert into conversations (conversation_type, initiator_company_id, counterparty_company_id, created_by_user_id) values ('direct',$1,$2,$3) returning id`,
      [f.B, f.X, f.uB],
    );
    const msg = await w.one<{ id: string }>(
      `insert into messages (conversation_id, sender_user_id, sender_company_id, body) values ($1,$2,$3,'hi') returning id`,
      [conv.id, f.uB, f.B],
    );
    await expect(
      w.admin.query('insert into message_attachments (message_id, company_id, file_id) values ($1,$2,$3)', [
        msg.id,
        f.B,
        foreignFile.id,
      ]),
    ).rejects.toMatchObject({ code: '23503' });
    const doc = await w.one<{ id: string }>(
      `insert into deal_documents (deal_id, document_type, title, created_by_company_id, created_by_user_id) values ($1,'contract','c',$2,$3) returning id`,
      [f.dealId, f.B, f.uB],
    );
    await expect(
      w.admin.query(
        `insert into deal_document_versions (document_id, deal_id, version_no, file_id, uploaded_by_company_id, uploaded_by_user_id) values ($1,$2,1,$3,$4,$5)`,
        [doc.id, f.dealId, foreignFile.id, f.B, f.uB],
      ),
    ).rejects.toMatchObject({ code: '23503' });
    // The legitimate case (own file) works.
    await expect(
      w.admin.query(
        `insert into deal_document_versions (document_id, deal_id, version_no, file_id, uploaded_by_company_id, uploaded_by_user_id) values ($1,$2,1,$3,$4,$5)`,
        [doc.id, f.dealId, foreignFile.id, f.S, f.uS],
      ),
    ).resolves.toBeTruthy();
  });
});

describe('F8: sent messages cannot be rewritten after they were read or after a grace window', () => {
  it('edit allowed briefly, blocked after a read receipt or 15 minutes', async () => {
    const [uA, uB] = [await w.user(), await w.user()];
    const [A, B] = [await w.company(uA), await w.company(uB)];
    const conv = await w.one<{ id: string }>(
      `insert into conversations (conversation_type, initiator_company_id, counterparty_company_id, created_by_user_id) values ('direct',$1,$2,$3) returning id`,
      [A, B, uA],
    );
    await w.admin.query(
      `insert into conversation_participants (conversation_id, company_id, user_id, participant_role) values ($1,$2,$3,'buyer'), ($1,$4,$5,'supplier')`,
      [conv.id, A, uA, B, uB],
    );
    const mk = async () =>
      (
        await w.one<{ id: string }>(
          `insert into messages (conversation_id, sender_user_id, sender_company_id, body) values ($1,$2,$3,'price 100') returning id`,
          [conv.id, uA, A],
        )
      ).id;
    const edit = (id: string) =>
      as(pool, { userId: uA, companyId: A }, (tx) =>
        tx.client.query("update messages set body = 'price 1' where id = $1", [id]),
      );

    const fresh = await mk();
    expect((await edit(fresh)).rowCount).toBe(1);
    const read = await mk();
    await w.admin.query('insert into message_read_receipts (message_id, user_id) values ($1,$2)', [read, uB]);
    await expect(edit(read)).rejects.toMatchObject({ code: '42501' });
    const old = await mk();
    await w.admin.query("update messages set created_at = now() - interval '1 hour' where id = $1", [old]);
    await expect(edit(old)).rejects.toMatchObject({ code: '42501' });
  });
});
