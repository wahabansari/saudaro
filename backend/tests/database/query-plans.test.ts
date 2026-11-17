import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { newWorld, type World } from '../support/world.ts';

/**
 * Loads synthetic volume (≈30k RFQs, 20k products, 30k messages, 30k HS codes, 3k companies), runs ANALYZE
 * and asserts that the representative production queries use the intended indexes. Plans are taken as the
 * superuser (index choice does not depend on RLS); RLS-aware timing must be measured as saudaro_app.
 */
let w: World;
let companyId: string;
let conversationId: string;

const plan = async (sql: string, params: unknown[] = []): Promise<string> => {
  const r = await w.admin.query(`explain (format json) ${sql}`, params);
  return JSON.stringify(r.rows[0]['QUERY PLAN']);
};

beforeAll(async () => {
  w = await newWorld();
  const pk = await w.country('PK');
  const rice = await w.category('rice');
  const kgm = await w.uom('KGM');
  await w.admin.query(
    `insert into users (email, display_name, status) select 'bulk'||g||'@example.test', 'u'||g, 'active' from generate_series(1, 20) g`,
  );
  await w.admin.query(
    `insert into companies (legal_name, display_name, slug, country_id, created_by_user_id, status)
     select 'Textile Corp ' || g || (case when g = 1500 then ' zqxfindme' else '' end), 'Textile ' || g, 'bulk-co-' || g, $1,
            (select id from users where email = 'bulk1@example.test'), 'active'
     from generate_series(1, 3000) g`,
    [pk],
  );
  await w.admin.query(
    `insert into rfqs (company_id, created_by_user_id, title, primary_category_id, status, visibility, published_at, expires_at)
     select c.id, c.created_by_user_id, 'Bulk RFQ ' || g || ' ' || c.rn, $1,
            case when g % 5 = 0 then 'draft' else 'published' end, 'public',
            case when g % 5 = 0 then null else now() - (g || ' minutes')::interval end,
            case when g % 5 = 0 then null else now() + interval '30 days' end
     from (select id, created_by_user_id, row_number() over () rn from companies where slug like 'bulk-co-%') c,
          generate_series(1, 10) g`,
    [rice],
  );
  await w.admin.query(
    `insert into products (company_id, name, slug, primary_category_id, base_uom_id, status, published_at)
     select c.id, 'Product ' || g || ' ' || c.rn || (case when c.rn = 700 and g = 3 then ' zq7kxrare' else '' end), 'p' || g || '-' || c.rn, $1, $2, 'active', now()
     from (select id, row_number() over () rn from companies where slug like 'bulk-co-%' limit 2000) c, generate_series(1, 10) g`,
    [rice, kgm],
  );
  const owner = (await w.one<{ id: string }>("select id from users where email = 'bulk1@example.test'")).id;
  const ids = await w.admin.query(
    "select id from companies where slug in ('bulk-co-1','bulk-co-2') order by slug",
  );
  companyId = ids.rows[0].id;
  conversationId = (
    await w.one<{ id: string }>(
      `insert into conversations (conversation_type, initiator_company_id, counterparty_company_id, created_by_user_id) values ('direct', $1, $2, $3) returning id`,
      [ids.rows[0].id, ids.rows[1].id, owner],
    )
  ).id;
  await w.admin.query(
    `insert into messages (conversation_id, sender_user_id, sender_company_id, body, created_at)
     select $1, $2, $3, 'm' || g, now() - (g || ' seconds')::interval from generate_series(1, 30000) g`,
    [conversationId, owner, companyId],
  );
  await w.admin.query(
    `insert into hs_codes (code, level, description) select g::text, 6, 'Synthetic subheading ' || g from generate_series(110000, 140000) g on conflict do nothing`,
  );
  await w.admin.query('analyze companies, rfqs, products, messages, hs_codes, users');
}, 180_000);

afterAll(async () => {
  await w.close();
});

describe('representative query plans use the intended indexes', () => {
  it('tenant list: RFQs of a company by status, newest first', async () => {
    const p = await plan(
      `select id from rfqs where company_id = $1 and status = 'published' order by created_at desc limit 20`,
      [companyId],
    );
    // ~8 rows per company: a bitmap scan + tiny sort is the correct, cheapest plan at this cardinality.
    expect(p).toContain('ix_rfqs_company_status_created');
  });

  it('public feed: newest published public RFQs', async () => {
    const p = await plan(
      `select id, title from rfqs where status = 'published' and visibility = 'public' order by published_at desc, id limit 20`,
    );
    expect(p).toContain('ix_rfqs_public_feed');
  });

  it('full-text search over company names', async () => {
    const p = await plan(
      `select id from companies where status = 'active' and search_vector @@ plainto_tsquery('simple', 'zqxfindme')`,
    );
    expect(p).toContain('ix_companies_search');
  });

  it('fuzzy product name search (pg_trgm)', async () => {
    // At 20k rows a sequential scan is legitimately cheaper than a GIN probe, so prove the index is USABLE
    // (and correct) by forbidding seq scans for this one statement. It becomes the chosen plan as data grows.
    await w.admin.query('begin');
    await w.admin.query('set local enable_seqscan = off');
    const p = JSON.stringify(
      (
        await w.admin.query(
          `explain (format json) select id from products where status = 'active' and name ilike '%zq7kxrare%'`,
        )
      ).rows[0]['QUERY PLAN'],
    );
    await w.admin.query('commit');
    expect(p).toContain('ix_products_name_trgm');
    const hit = await w.admin.query(
      `select count(*)::int n from products where status = 'active' and name ilike '%zq7kxrare%'`,
    );
    expect(hit.rows[0].n).toBe(1);
  });

  it('keyset pagination of a conversation', async () => {
    const p = await plan(
      `select id, body from messages where conversation_id = $1 and (created_at, id) < (now() - interval '1 hour', 'ffffffff-ffff-ffff-ffff-ffffffffffff') order by created_at desc, id desc limit 50`,
      [conversationId],
    );
    expect(p).toContain('ix_messages_conversation_feed');
    expect(p).not.toContain('"Sort"');
  });

  it('HS code prefix navigation', async () => {
    const p = await plan(`select id from hs_codes where code like '1250%'`);
    expect(p).toMatch(/ix_hs_codes_code_prefix|ux_hs_codes_code_version/);
    expect(p).not.toContain('"Seq Scan"');
  });
});
