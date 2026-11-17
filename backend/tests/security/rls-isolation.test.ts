import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { as, appPool, expectDbError, newWorld, urls, type World } from '../support/world.ts';

/**
 * Proves tenant isolation through the REAL runtime role (saudaro_app, NOBYPASSRLS, FORCE RLS).
 * Fixtures are created by the test superuser; every assertion runs as the app role.
 */
let w: World;
let pool: pg.Pool;

// buyers A, B; suppliers S1, S2
let uA: string, uB: string, uS1: string, uS2: string;
let A: string, B: string, S1: string, S2: string;
let rfqA: { id: string; itemId: string }, rfqBDraft: { id: string; itemId: string };

beforeAll(async () => {
  w = await newWorld();
  pool = appPool();
  [uA, uB, uS1, uS2] = [await w.user('a'), await w.user('b'), await w.user('s1'), await w.user('s2')];
  [A, B, S1, S2] = [await w.company(uA), await w.company(uB), await w.company(uS1), await w.company(uS2)];
  rfqA = await w.rfq(A, uA, { title: 'Company A rice RFQ' });
  rfqBDraft = await w.rfq(B, uB, { status: 'draft', visibility: 'private', title: 'Company B secret draft' });
});

afterAll(async () => {
  await pool.end();
  await w.close();
});

describe('1. Company A cannot read Company B RFQs', () => {
  it('each buyer only sees its own RFQs in the base table', async () => {
    const a = await as(pool, { userId: uA, companyId: A }, (tx) => tx.client.query('select id from rfqs'));
    const b = await as(pool, { userId: uB, companyId: B }, (tx) => tx.client.query('select id from rfqs'));
    expect(a.rows.map((r) => r.id)).toEqual([rfqA.id]);
    expect(b.rows.map((r) => r.id)).toEqual([rfqBDraft.id]);
  });

  it('forging another company id in the context grants nothing (membership is re-verified)', async () => {
    const forged = await as(pool, { userId: uA, companyId: B }, (tx) =>
      tx.client.query('select id from rfqs'),
    );
    expect(forged.rowCount).toBe(0);
  });

  it('cannot update or delete another company RFQ, nor read its child rows', async () => {
    const upd = await as(pool, { userId: uA, companyId: A }, (tx) =>
      tx.client.query("update rfqs set title = 'hijacked' where id = $1", [rfqBDraft.id]),
    );
    const del = await expectDbError(pool, { userId: uA, companyId: A }, 'delete from rfqs where id = $1', [
      rfqBDraft.id,
    ]);
    const items = await as(pool, { userId: uA, companyId: A }, (tx) =>
      tx.client.query('select id from rfq_items where rfq_id = $1', [rfqBDraft.id]),
    );
    expect([upd.rowCount, del.code, items.rowCount]).toEqual([0, '42501', 0]);
    expect(
      (await w.one<{ title: string }>('select title from rfqs where id = $1', [rfqBDraft.id])).title,
    ).toBe('Company B secret draft');
  });

  it('cannot insert an RFQ into another company tenant', async () => {
    const err = await expectDbError(
      pool,
      { userId: uA, companyId: A },
      `insert into rfqs (company_id, created_by_user_id, title, primary_category_id) values ($1, $2, 'x', (select id from product_categories limit 1))`,
      [B, uA],
    );
    expect(err.code).toBe('42501');
  });
});

describe('2. Company A cannot modify Company B quotations', () => {
  it('suppliers only see and change their own quotations', async () => {
    const q1 = await w.quotation(rfqA.id, rfqA.itemId, A, S1, uS1, 800);
    const q2 = await w.quotation(rfqA.id, rfqA.itemId, A, S2, uS2, 790);

    const s2sees = await as(pool, { userId: uS2, companyId: S2 }, (tx) =>
      tx.client.query('select id from quotations'),
    );
    expect(s2sees.rows.map((r) => r.id)).toEqual([q2.id]);

    const upd = await as(pool, { userId: uS2, companyId: S2 }, (tx) =>
      tx.client.query('update quotations set total_amount = 1 where id = $1', [q1.id]),
    );
    expect(upd.rowCount).toBe(0);
    const unrelatedBuyer = await as(pool, { userId: uB, companyId: B }, (tx) =>
      tx.client.query('select id from quotations'),
    );
    expect(unrelatedBuyer.rowCount).toBe(0);
    // The owning buyer sees both submitted quotations.
    const buyer = await as(pool, { userId: uA, companyId: A }, (tx) =>
      tx.client.query('select id from quotations order by id'),
    );
    expect(buyer.rowCount).toBe(2);
  });

  it('cannot create a quotation on behalf of another supplier', async () => {
    const err = await expectDbError(
      pool,
      { userId: uS2, companyId: S2 },
      `insert into quotations (company_id, rfq_id, buyer_company_id, created_by_user_id, currency_id)
       values ($1, $2, $3, $4, (select id from currencies where code = 'USD'))`,
      [S1, rfqA.id, A, uS2],
    );
    expect(err.code).toBe('42501');
  });

  it('a submitted revision is immutable even for its own supplier', async () => {
    const rfq = await w.rfq(A, uA);
    const q = await w.quotation(rfq.id, rfq.itemId, A, S1, uS1);
    const err = await expectDbError(
      pool,
      { userId: uS1, companyId: S1 },
      "update quotation_revisions set supplier_notes = 'rewrite history' where id = $1",
      [q.revisionId],
    );
    expect(err.message).toMatch(/immutable/);
    const items = await expectDbError(
      pool,
      { userId: uS1, companyId: S1 },
      'update quotation_items set unit_price = 1 where revision_id = $1',
      [q.revisionId],
    );
    expect(items.message).toMatch(/immutable/);
  });
});

describe('3. A user cannot access another company private documents', () => {
  it('private files and company documents are invisible; an explicit grant opens exactly one file', async () => {
    const file = await w.one<{ id: string }>(
      `insert into files (company_id, uploaded_by_user_id, storage_provider, bucket, storage_key, original_filename, mime_type, size_bytes, sha256, status, scan_status)
       values ($1, $2, 's3', 'private-bucket', $3, 'licence.pdf', 'application/pdf', 1024, $4, 'available', 'clean') returning id`,
      [B, uB, `b/${randomUUID()}`, 'a'.repeat(64)],
    );
    await w.admin.query(
      `insert into company_documents (company_id, file_id, document_type, title, created_by_user_id) values ($1, $2, 'business_license', 'Licence', $3)`,
      [B, file.id, uB],
    );

    const own = await as(pool, { userId: uB, companyId: B }, (tx) => tx.client.query('select id from files'));
    expect(own.rowCount).toBe(1);
    for (const table of ['files', 'company_documents', 'file_access_grants', 'file_versions']) {
      const r = await as(pool, { userId: uA, companyId: A }, (tx) =>
        tx.client.query(`select 1 from ${table}`),
      );
      expect(r.rowCount, table).toBe(0);
    }

    await w.admin.query(
      `insert into file_access_grants (file_id, company_id, grantee_company_id, granted_by_user_id, expires_at) values ($1, $2, $3, $4, now() + interval '1 hour')`,
      [file.id, B, A, uB],
    );
    const granted = await as(pool, { userId: uA, companyId: A }, (tx) =>
      tx.client.query('select id from files'),
    );
    expect(granted.rows.map((r) => r.id)).toEqual([file.id]);
    // Revoked grants stop working immediately.
    await w.admin.query('update file_access_grants set revoked_at = now() where file_id = $1', [file.id]);
    const revoked = await as(pool, { userId: uA, companyId: A }, (tx) =>
      tx.client.query('select id from files'),
    );
    expect(revoked.rowCount).toBe(0);
  });

  it('files cannot be shared or made public before a clean malware scan (database constraint)', async () => {
    await expect(
      w.admin.query(
        `insert into files (company_id, uploaded_by_user_id, storage_provider, bucket, storage_key, original_filename, mime_type, size_bytes, sha256, access_level, scan_status)
         values ($1, $2, 's3', 'b', $3, 'x.png', 'image/png', 10, $4, 'public', 'pending')`,
        [B, uB, `b/${randomUUID()}`, 'b'.repeat(64)],
      ),
    ).rejects.toMatchObject({ code: '23514' });
  });
});

describe('4. A user removed from a company loses access', () => {
  it('access stops as soon as the membership is no longer active', async () => {
    const uM = await w.user('member');
    const membership = await w.member(A, uM, 'member');
    const before = await as(pool, { userId: uM, companyId: A }, (tx) =>
      tx.client.query('select id from rfqs'),
    );
    expect(before.rowCount).toBeGreaterThan(0);

    await w.admin.query(
      "update company_memberships set status = 'removed', removed_at = now() where id = $1",
      [membership],
    );
    const after = await as(pool, { userId: uM, companyId: A }, (tx) =>
      tx.client.query('select id from rfqs'),
    );
    const ctx = await as(pool, { userId: uM, companyId: A }, (tx) =>
      tx.client.query('select app.active_company() as c'),
    );
    expect(after.rowCount).toBe(0);
    expect(ctx.rows[0].c).toBeNull();
    const write = await as(pool, { userId: uM, companyId: A }, (tx) =>
      tx.client.query("update rfqs set description = 'still here' where id = $1", [rfqA.id]),
    );
    expect(write.rowCount).toBe(0);
  });

  it('a suspended user loses access too', async () => {
    const uX = await w.user('x');
    const X = await w.company(uX);
    await w.rfq(X, uX);
    await w.admin.query("update users set status = 'suspended', suspended_at = now() where id = $1", [uX]);
    const suspendedUser = await as(pool, { userId: uX, companyId: X }, (tx) =>
      tx.client.query('select id from rfqs'),
    );
    expect(suspendedUser.rowCount).toBe(0);
  });
});

describe('5. Private conversations are participant-only', () => {
  it('another buyer, and a non-participant colleague, cannot read them', async () => {
    const colleague = await w.user('colleague');
    await w.member(A, colleague, 'manager');
    const conv = await w.one<{ id: string }>(
      `insert into conversations (conversation_type, initiator_company_id, counterparty_company_id, created_by_user_id, subject)
       values ('direct', $1, $2, $3, 'price talk') returning id`,
      [A, S1, uA],
    );
    await w.admin.query(
      `insert into conversation_participants (conversation_id, company_id, user_id, participant_role) values ($1,$2,$3,'buyer'), ($1,$4,$5,'supplier')`,
      [conv.id, A, uA, S1, uS1],
    );
    await w.admin.query(
      `insert into messages (conversation_id, sender_user_id, sender_company_id, body) values ($1, $2, $3, 'our best price is 780')`,
      [conv.id, uA, A],
    );

    for (const ctx of [
      { userId: uB, companyId: B },
      { userId: colleague, companyId: A },
      { userId: uS2, companyId: S2 },
    ]) {
      const c = await as(pool, ctx, (tx) => tx.client.query('select id from conversations'));
      const m = await as(pool, ctx, (tx) => tx.client.query('select body from messages'));
      expect([c.rowCount, m.rowCount]).toEqual([0, 0]);
    }
    const sendErr = await expectDbError(
      pool,
      { userId: uB, companyId: B },
      `insert into messages (conversation_id, sender_user_id, sender_company_id, body) values ($1, $2, $3, 'intrusion')`,
      [conv.id, uB, B],
    );
    expect(sendErr.code).toBe('42501');
    const participant = await as(pool, { userId: uS1, companyId: S1 }, (tx) =>
      tx.client.query('select body from messages'),
    );
    expect(participant.rows[0].body).toBe('our best price is 780');
  });
});

describe('6. A supplier cannot modify another supplier profile', () => {
  it('updates and inserts against another company are rejected', async () => {
    await w.admin.query(
      `insert into seller_trade_profiles (company_id, seller_type, summary) values ($1,'manufacturer','S1 profile'), ($2,'exporter','S2 profile')`,
      [S1, S2],
    );
    const upd = await as(pool, { userId: uS1, companyId: S1 }, (tx) =>
      tx.client.query("update seller_trade_profiles set summary = 'pwned' where company_id = $1", [S2]),
    );
    expect(upd.rowCount).toBe(0);
    const ins = await expectDbError(
      pool,
      { userId: uS1, companyId: S1 },
      `insert into seller_capabilities (company_id, capability_type) values ($1, 'oem')`,
      [S2],
    );
    expect(ins.code).toBe('42501');
    const own = await as(pool, { userId: uS1, companyId: S1 }, (tx) =>
      tx.client.query("update seller_trade_profiles set summary = 'updated' where company_id = $1", [S1]),
    );
    expect(own.rowCount).toBe(1);
    expect(
      (
        await w.one<{ summary: string }>('select summary from seller_trade_profiles where company_id = $1', [
          S2,
        ])
      ).summary,
    ).toBe('S2 profile');
  });
});

describe('7. Public RFQs expose only intentionally public fields', () => {
  it('suppliers read published RFQs through the restricted view only', async () => {
    const view = await as(pool, { userId: uS1, companyId: S1 }, (tx) =>
      tx.client.query('select * from app.public_rfqs'),
    );
    const ids = view.rows.map((r) => r.id);
    expect(ids).toContain(rfqA.id);
    expect(ids).not.toContain(rfqBDraft.id); // drafts / private RFQs never appear
    const cols = Object.keys(view.rows[0]);
    for (const forbidden of [
      'created_by_user_id',
      'company_id',
      'visibility',
      'closed_at',
      'close_reason',
      'version',
    ])
      expect(cols).not.toContain(forbidden);

    const base = await as(pool, { userId: uS1, companyId: S1 }, (tx) =>
      tx.client.query('select id from rfqs'),
    );
    expect(base.rowCount).toBe(0); // base table stays owner-only
  });

  it('target prices never leak: the item projection has no price column and the base table is closed', async () => {
    const err = await expectDbError(
      pool,
      { userId: uS1, companyId: S1 },
      'select target_unit_price from app.public_rfq_items',
    );
    expect(err.code).toBe('42703');
    const items = await as(pool, { userId: uS1, companyId: S1 }, (tx) =>
      tx.client.query('select * from app.public_rfq_items'),
    );
    expect(items.rowCount).toBeGreaterThan(0);
    expect(Object.keys(items.rows[0])).not.toContain('target_unit_price');
    // The base table is RLS-closed to non-owners: the column is selectable but yields no rows.
    const direct = await as(pool, { userId: uS1, companyId: S1 }, (tx) =>
      tx.client.query('select target_unit_price from rfq_items'),
    );
    expect(direct.rowCount).toBe(0);
  });

  it('public RFQ requirements (documents, certifications, trade terms) are visible to suppliers; preferences stay private', async () => {
    const r = await w.rfq(A, uA, { title: 'Requirements RFQ' });
    const draft = await w.rfq(A, uA, { status: 'draft', title: 'Requirements draft' });
    const cert = await w.one<{ id: string }>('select id from certifications limit 1');
    for (const id of [r.id, draft.id]) {
      await w.admin.query(
        `insert into rfq_required_documents (rfq_id, company_id, document_type) values ($1,$2,'commercial_invoice')`,
        [id, A],
      );
      await w.admin.query(
        `insert into rfq_certification_requirements (rfq_id, company_id, certification_id) values ($1,$2,$3)`,
        [id, A, cert.id],
      );
      await w.admin.query(`insert into rfq_trade_requirements (rfq_id, company_id) values ($1,$2)`, [id, A]);
    }
    await w.admin.query(
      `insert into rfq_visibility_rules (rfq_id, company_id, rule_type, country_id) values ($1,$2,'block_country',$3)`,
      [r.id, A, await w.country('US')],
    );
    const ctx = { userId: uS1, companyId: S1 };
    for (const t of ['rfq_required_documents', 'rfq_certification_requirements', 'rfq_trade_requirements']) {
      const rows = await as(pool, ctx, (tx) => tx.client.query(`select rfq_id from ${t}`));
      expect(
        rows.rows.map((x) => x.rfq_id),
        t,
      ).toEqual([r.id]); // published public RFQ only, never the draft
    }
    for (const t of ['rfq_visibility_rules', 'rfq_payment_preferences', 'rfq_origin_preferences']) {
      expect((await as(pool, ctx, (tx) => tx.client.query(`select 1 from ${t}`))).rowCount, t).toBe(0);
    }
  });

  it('invited-only RFQs are visible only to invited suppliers; blocked countries are excluded', async () => {
    const inv = await w.rfq(A, uA, { visibility: 'invited', title: 'Invite only' });
    const names = async (ctx: { userId: string; companyId: string }) =>
      (await as(pool, ctx, (tx) => tx.client.query('select title from app.public_rfqs'))).rows.map(
        (r) => r.title,
      );
    expect(await names({ userId: uS1, companyId: S1 })).not.toContain('Invite only');
    await w.admin.query(
      `insert into rfq_invitations (rfq_id, company_id, invited_company_id, invited_by_user_id) values ($1,$2,$3,$4)`,
      [inv.id, A, S1, uA],
    );
    expect(await names({ userId: uS1, companyId: S1 })).toContain('Invite only');
    expect(await names({ userId: uS2, companyId: S2 })).not.toContain('Invite only');

    // Match rows follow the RFQ's visibility: a supplier never learns of an RFQ it cannot see.
    const run = await w.one<{ id: string }>(
      `insert into rfq_match_runs (rfq_id, company_id, algorithm_version) values ($1,$2,'t1') returning id`,
      [inv.id, A],
    );
    const matchIds: Record<string, string> = {};
    for (const [key, sup, eligible] of [
      ['s1', S1, true],
      ['s2', S2, false],
    ] as const) {
      matchIds[key] = (
        await w.one<{ id: string }>(
          `insert into rfq_supplier_matches (match_run_id, rfq_id, buyer_company_id, supplier_company_id, score, rank, is_eligible)
           values ($1,$2,$3,$4,50,1,$5) returning id`,
          [run.id, inv.id, A, sup, eligible],
        )
      ).id;
      await w.admin.query(
        `insert into rfq_match_reasons (match_id, supplier_company_id, reason_code, passed, weight) values ($1,$2,'category_match',true,1)`,
        [matchIds[key], sup],
      );
    }
    const seen = async (ctx: { userId: string; companyId: string }, table: string) =>
      (await as(pool, ctx, (tx) => tx.client.query(`select id from ${table}`))).rowCount;
    for (const table of ['rfq_supplier_matches', 'rfq_match_reasons']) {
      expect(await seen({ userId: uS2, companyId: S2 }, table), table).toBe(0); // not invited, not eligible
      expect(await seen({ userId: uS1, companyId: S1 }, table), table).toBe(1); // invited
    }
    expect(await seen({ userId: uA, companyId: A }, 'rfq_supplier_matches')).toBe(2); // buyer sees all
    await w.admin.query('delete from rfq_invitations where rfq_id = $1', [inv.id]);
    expect(await seen({ userId: uS1, companyId: S1 }, 'rfq_supplier_matches')).toBe(0); // invitation revoked

    const geo = await w.rfq(A, uA, { title: 'No Pakistan' });
    await w.admin.query(
      `insert into rfq_visibility_rules (rfq_id, company_id, rule_type, country_id) values ($1,$2,'block_country',$3)`,
      [geo.id, A, await w.country('PK')],
    );
    expect(await names({ userId: uS1, companyId: S1 })).not.toContain('No Pakistan');
  });
});

describe('8. Tenant context cannot leak between pooled connections', () => {
  it('a single reused connection carries no context after commit or after an error', async () => {
    const one = appPool(1);
    try {
      await as(one, { userId: uA, companyId: A }, (tx) => tx.client.query('select 1'));
      const afterCommit = await one.query(
        "select app.uid() as u, app.active_company() as c, nullif(current_setting('app.current_user_id', true), '') as raw",
      );
      expect(afterCommit.rows[0]).toEqual({ u: null, c: null, raw: null });

      await expect(
        as(one, { userId: uA, companyId: A }, async (tx) => {
          await tx.client.query('select 1');
          throw new Error('boom');
        }),
      ).rejects.toThrow('boom');
      const afterError = await one.query('select app.uid() as u, app.active_company() as c');
      expect(afterError.rows[0]).toEqual({ u: null, c: null });
      const sees = await one.query('select id from rfqs');
      expect(sees.rowCount).toBe(0);
    } finally {
      await one.end();
    }
  });

  it('parallel requests of different tenants on a tiny pool never see each other', async () => {
    const small = appPool(2);
    try {
      const jobs = Array.from({ length: 40 }, (_, i) => {
        const [user, company] = i % 2 ? [uA, A] : [uB, B];
        return as(small, { userId: user, companyId: company }, async (tx) => {
          await tx.client.query('select pg_sleep(0.005)');
          const r = await tx.client.query('select distinct company_id from rfqs');
          return r.rowCount === 1 && r.rows[0].company_id === company;
        });
      });
      expect((await Promise.all(jobs)).every(Boolean)).toBe(true);
    } finally {
      await small.end();
    }
  });

  it('rejects non-uuid context values before touching the database', async () => {
    await expect(
      as(pool, { userId: "x'; drop table users;--", companyId: A }, (tx) => tx.client.query('select 1')),
    ).rejects.toThrow();
  });
});

describe('9. Unauthorized users cannot escalate company roles', () => {
  let X: string, owner: string, admin: string, manager: string, member: string, outsider: string;
  let memberMembership: string, ownerMembership: string;
  beforeAll(async () => {
    [owner, admin, manager, member, outsider] = [
      await w.user('own'),
      await w.user('adm'),
      await w.user('mgr'),
      await w.user('mem'),
      await w.user('out'),
    ];
    X = await w.company(owner);
    await w.member(X, admin, 'admin');
    await w.member(X, manager, 'manager');
    memberMembership = await w.member(X, member, 'member');
    ownerMembership = (
      await w.one<{ id: string }>(
        'select id from company_memberships where company_id = $1 and user_id = $2',
        [X, owner],
      )
    ).id;
  });
  const ctx = (userId: string) => ({ userId, companyId: X });

  it('a member cannot promote themselves', async () => {
    const e = await expectDbError(
      pool,
      ctx(member),
      'update company_memberships set role_id = $1 where id = $2',
      [await w.role('owner'), memberMembership],
    );
    expect(e.code).toBe('42501');
  });
  it('an admin cannot mint an owner, nor modify or demote an owner', async () => {
    const grant = await expectDbError(
      pool,
      ctx(admin),
      'update company_memberships set role_id = $1 where id = $2',
      [await w.role('owner'), memberMembership],
    );
    const demote = await expectDbError(
      pool,
      ctx(admin),
      'update company_memberships set role_id = $1 where id = $2',
      [await w.role('member'), ownerMembership],
    );
    expect([grant.code, demote.code]).toEqual(['42501', '42501']);
  });
  it('a manager (no members.manage) cannot add members; outsiders cannot add themselves', async () => {
    const m = await expectDbError(
      pool,
      ctx(manager),
      'insert into company_memberships (company_id, user_id, role_id) values ($1, $2, $3)',
      [X, outsider, await w.role('viewer')],
    );
    const o = await expectDbError(
      pool,
      { userId: outsider, companyId: X },
      'insert into company_memberships (company_id, user_id, role_id) values ($1, $2, $3)',
      [X, outsider, await w.role('owner')],
    );
    expect([m.code, o.code]).toEqual(['42501', '42501']);
  });
  it('an admin may add people only below their own level', async () => {
    const tooHigh = await expectDbError(
      pool,
      ctx(admin),
      'insert into company_memberships (company_id, user_id, role_id) values ($1, $2, $3)',
      [X, outsider, await w.role('admin')],
    );
    expect(tooHigh.code).toBe('42501');
    const ok = await as(pool, ctx(admin), async (tx) =>
      tx.client.query('insert into company_memberships (company_id, user_id, role_id) values ($1, $2, $3)', [
        X,
        outsider,
        await w.role('manager'),
      ]),
    );
    expect(ok.rowCount).toBe(1);
  });
  it('custom roles cannot reach owner level, and system roles cannot be edited', async () => {
    const lvl = await expectDbError(
      pool,
      ctx(owner),
      `insert into company_roles (company_id, key, name, level, is_system) values ($1, 'shadow_owner', 'Shadow', 100, false)`,
      [X],
    );
    expect(lvl.code).toBe('42501'); // hierarchy trigger (and the level CHECK as a second line of defence)
    const role = await as(pool, ctx(owner), (tx) =>
      tx.client.query(
        `insert into company_roles (company_id, key, name, level, is_system) values ($1, 'ops', 'Ops', 50, false) returning id`,
        [X],
      ),
    );
    expect(role.rowCount).toBe(1);
    const sys = await as(pool, ctx(owner), (tx) =>
      tx.client.query(`update company_roles set level = 1 where key = 'owner' and company_id is null`),
    );
    expect(sys.rowCount).toBe(0); // RLS makes system roles invisible to UPDATE
  });
  it('the last owner cannot leave', async () => {
    const e = await expectDbError(
      pool,
      ctx(owner),
      "update company_memberships set status = 'removed' where id = $1",
      [ownerMembership],
    );
    expect(e.message).toMatch(/at least one active owner/);
  });
});

describe('10. Direct database access through the application role still respects RLS', () => {
  it('a raw connection as saudaro_app without tenant context sees nothing and cannot elevate', async () => {
    const c = new pg.Client({ connectionString: urls().app });
    await c.connect();
    try {
      const role = await c.query('select rolsuper, rolbypassrls from pg_roles where rolname = current_user');
      expect(role.rows[0]).toEqual({ rolsuper: false, rolbypassrls: false });
      for (const t of [
        'rfqs',
        'quotations',
        'users',
        'companies',
        'conversations',
        'messages',
        'files',
        'deals',
      ]) {
        const r = await c.query(`select count(*)::int as n from ${t}`);
        expect(r.rows[0].n, t).toBe(0);
      }
      expect((await c.query('select * from app.public_rfqs')).rowCount).toBe(0);
      await expect(c.query('set role saudaro_migrator')).rejects.toMatchObject({ code: '42501' });
      await expect(c.query('set role postgres')).rejects.toMatchObject({ code: '42501' });
      await expect(
        c.query("insert into countries (iso2, iso3, name) values ('ZZ','ZZZ','Nowhere')"),
      ).rejects.toMatchObject({ code: '42501' });
      await expect(c.query("update permissions set key = 'x'")).rejects.toMatchObject({ code: '42501' });
      await expect(c.query('delete from audit_logs')).rejects.toMatchObject({ code: '42501' });
      await expect(c.query('truncate rfqs')).rejects.toMatchObject({ code: '42501' });
      await expect(c.query('create table pwn (id int)')).rejects.toMatchObject({ code: '42501' });
    } finally {
      await c.end();
    }
  });

  it('every public table has RLS enabled; every non-reference table forces it', async () => {
    const r = await w.admin.query(
      `select c.relname, c.relrowsecurity, c.relforcerowsecurity from pg_class c
       where c.relnamespace = 'public'::regnamespace and c.relkind = 'r'`,
    );
    const { REFERENCE_TABLES } = await import('../../src/database/policies/spec.ts');
    const ref = new Set<string>(REFERENCE_TABLES);
    expect(r.rowCount).toBeGreaterThan(150);
    for (const row of r.rows) {
      expect(row.relrowsecurity, row.relname).toBe(true);
      if (!ref.has(row.relname)) expect(row.relforcerowsecurity, row.relname).toBe(true);
    }
  });
});
