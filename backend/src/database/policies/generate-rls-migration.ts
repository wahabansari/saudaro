import { readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { getTableName, is } from 'drizzle-orm';
import { PgTable } from 'drizzle-orm/pg-core';
import * as schema from '../schema/index.ts';
import { SPEC, type TablePolicy } from './spec.ts';

/**
 * Generates migrations/0005_rls_policies_and_grants.sql from SPEC. Deterministic output: the
 * generated file is committed and reviewed like any migration; CI regenerates and diffs it.
 */

export function schemaTables(): string[] {
  return (Object.values(schema) as unknown[])
    .filter((v) => is(v, PgTable))
    .map((t) => getTableName(t as PgTable))
    .sort();
}

const APP = 'saudaro_app';
const ALL_READERS = 'saudaro_app, saudaro_worker, saudaro_readonly, saudaro_authz, saudaro_pub';
const BREAK = '\n--> statement-breakpoint\n';

function letters(
  ops: string | undefined,
  onlyCols?: string[],
): { op: 'select' | 'insert' | 'update' | 'delete'; cols?: string[] }[] {
  const map = { s: 'select', i: 'insert', u: 'update', d: 'delete' } as const;
  return [...(ops ?? '')].map((c) => ({
    op: map[c as keyof typeof map],
    ...(c === 'u' && onlyCols ? { cols: onlyCols } : {}),
  }));
}

function tableStatements(table: string, p: TablePolicy): string[] {
  const t = `public.${table}`;
  const out: string[] = [];
  out.push(`ALTER TABLE ${t} ENABLE ROW LEVEL SECURITY`);
  if (!p.reference) out.push(`ALTER TABLE ${t} FORCE ROW LEVEL SECURITY`);
  out.push(
    `REVOKE ALL ON ${t} FROM PUBLIC, saudaro_app, saudaro_worker, saudaro_readonly, saudaro_authz, saudaro_pub`,
  );

  if (p.reference) {
    out.push(`CREATE POLICY ${table}_read ON ${t} FOR SELECT TO ${ALL_READERS} USING (true)`);
    out.push(`GRANT SELECT ON ${t} TO ${ALL_READERS}`);
    return out;
  }

  // ---- application runtime role
  const grants = new Set<string>();
  if (p.select) {
    out.push(`CREATE POLICY ${table}_app_select ON ${t} FOR SELECT TO ${APP} USING (${p.select})`);
    grants.add('SELECT');
  }
  if (p.insert) {
    out.push(`CREATE POLICY ${table}_app_insert ON ${t} FOR INSERT TO ${APP} WITH CHECK (${p.insert})`);
    grants.add('INSERT');
  }
  if (p.update) {
    const { using, check } = typeof p.update === 'string' ? { using: p.update, check: p.update } : p.update;
    out.push(
      `CREATE POLICY ${table}_app_update ON ${t} FOR UPDATE TO ${APP} USING (${using}) WITH CHECK (${check})`,
    );
    out.push(`GRANT UPDATE${p.updateCols ? ` (${p.updateCols.join(', ')})` : ''} ON ${t} TO ${APP}`);
  }
  if (p.delete) {
    out.push(`CREATE POLICY ${table}_app_delete ON ${t} FOR DELETE TO ${APP} USING (${p.delete})`);
    grants.add('DELETE');
  }
  if (grants.size) out.push(`GRANT ${[...grants].join(', ')} ON ${t} TO ${APP}`);

  // ---- worker + definer helper roles (permissive policies, minimal grants)
  for (const [role, ops, cols] of [
    ['saudaro_worker', p.worker, undefined],
    ['saudaro_authz', p.authz, p.authzUpdateCols],
  ] as const) {
    const short = role === 'saudaro_worker' ? 'worker' : 'authz';
    for (const { op, cols: c } of letters(ops, cols as string[] | undefined)) {
      const name = `${table}_${short}_${op}`;
      if (op === 'select') out.push(`CREATE POLICY ${name} ON ${t} FOR SELECT TO ${role} USING (true)`);
      if (op === 'insert') out.push(`CREATE POLICY ${name} ON ${t} FOR INSERT TO ${role} WITH CHECK (true)`);
      if (op === 'update')
        out.push(`CREATE POLICY ${name} ON ${t} FOR UPDATE TO ${role} USING (true) WITH CHECK (true)`);
      if (op === 'delete') out.push(`CREATE POLICY ${name} ON ${t} FOR DELETE TO ${role} USING (true)`);
      out.push(`GRANT ${op.toUpperCase()}${c ? ` (${c.join(', ')})` : ''} ON ${t} TO ${role}`);
    }
  }

  // ---- projection-view owner: column-level SELECT only
  if (p.pub) {
    out.push(`CREATE POLICY ${table}_pub_select ON ${t} FOR SELECT TO saudaro_pub USING (true)`);
    out.push(`GRANT SELECT (${p.pub.join(', ')}) ON ${t} TO saudaro_pub`);
  }
  // ---- seed data written by the migration owner despite FORCE RLS
  if (p.migrator) {
    out.push(
      `CREATE POLICY ${table}_migrator_all ON ${t} FOR ALL TO saudaro_migrator USING (true) WITH CHECK (true)`,
    );
  }
  return out;
}

const VIEWS = [
  {
    name: 'public_rfqs',
    sql: `SELECT r.id, r.reference_no, r.company_id AS buyer_company_id, r.title, r.description, r.primary_category_id,
       r.status, r.currency_id, r.allow_partial_quotes, r.quote_deadline_at, r.published_at, r.expires_at
FROM public.rfqs r
WHERE (r.status = 'published' AND r.expires_at > now() AND app.can_view_rfq(r.id, (select app.active_company())))
   OR EXISTS (SELECT 1 FROM public.quotations q WHERE q.rfq_id = r.id AND q.company_id = (select app.active_company()))`,
  },
  {
    name: 'public_rfq_items',
    sql: `SELECT i.id, i.rfq_id, i.line_no, i.product_name, i.description, i.category_id, i.hs_code_id, i.quantity, i.uom_id,
       i.required_delivery_date
FROM public.rfq_items i JOIN app.public_rfqs p ON p.id = i.rfq_id`,
  },
  {
    name: 'public_rfq_specifications',
    sql: `SELECT s.id, s.rfq_item_id, s.definition_id, s.custom_name, s.value_text, s.value_number, s.value_boolean,
       s.value_min, s.value_max, s.uom_id, s.is_mandatory
FROM public.rfq_specifications s
JOIN public.rfq_items i ON i.id = s.rfq_item_id
JOIN app.public_rfqs p ON p.id = i.rfq_id`,
  },
  {
    name: 'public_rfq_destinations',
    sql: `SELECT d.id, d.rfq_id, d.country_id, d.port_id, d.place_name, d.incoterm_id, d.incoterm_named_place, d.required_by_date
FROM public.rfq_destinations d JOIN app.public_rfqs p ON p.id = d.rfq_id`,
  },
  {
    name: 'public_companies',
    sql: `SELECT c.id, c.display_name, c.slug, c.country_id, c.is_business_verified, c.created_at,
       p.tagline, p.description, p.year_established, p.employee_count_range, p.website
FROM public.companies c
LEFT JOIN public.company_profiles p ON p.company_id = c.id AND p.is_public
WHERE c.status = 'active'`,
  },
] as const;

export function buildMigrationSql(overrides: Record<string, TablePolicy> = {}): string {
  const spec = { ...SPEC, ...overrides };
  const tables = schemaTables();
  const missing = tables.filter((t) => !(t in SPEC));
  const unknown = Object.keys(SPEC).filter((t) => !tables.includes(t));
  if (missing.length || unknown.length) {
    throw new Error(`RLS spec mismatch. Missing: [${missing.join(', ')}] Unknown: [${unknown.join(', ')}]`);
  }

  const statements: string[] = [];
  // Function privileges are settled BEFORE ownership of the definer functions moves to saudaro_authz
  // (afterwards the migrator can no longer grant/revoke on them). PUBLIC gets nothing.
  statements.push('REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA app FROM PUBLIC');
  statements.push(
    'GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA app TO saudaro_app, saudaro_worker, saudaro_pub, saudaro_authz',
  );
  // Pre-authentication identity lookup is an oracle for arbitrary (provider, subject) pairs: the runtime
  // role must not call it; the auth service uses the worker pool.
  statements.push('REVOKE EXECUTE ON FUNCTION app.resolve_identity(text, text) FROM saudaro_app');
  statements.push('GRANT CREATE ON SCHEMA app TO saudaro_authz, saudaro_pub');
  // Every SECURITY DEFINER function becomes owned by the dedicated, non-bypassing helper role.
  statements.push(`DO $do$
DECLARE r record;
BEGIN
  FOR r IN SELECT p.oid::regprocedure AS sig FROM pg_proc p WHERE p.pronamespace = 'app'::regnamespace AND p.prosecdef LOOP
    EXECUTE format('ALTER FUNCTION %s OWNER TO saudaro_authz', r.sig);
  END LOOP;
END
$do$`);
  // Views first: some policies (e.g. rfq_attachments) reference them.
  for (const v of VIEWS) {
    statements.push(`CREATE VIEW app.${v.name} WITH (security_barrier = true) AS\n${v.sql}`);
    statements.push(`GRANT SELECT ON app.${v.name} TO saudaro_app, saudaro_worker, saudaro_pub`);
  }
  // Ownership moves last: afterwards the migrator can no longer read/grant them.
  for (const v of VIEWS) statements.push(`ALTER VIEW app.${v.name} OWNER TO saudaro_pub`);
  for (const t of tables) statements.push(...tableStatements(t, spec[t]!));
  statements.push('REVOKE CREATE ON SCHEMA app FROM saudaro_authz, saudaro_pub');

  const header = `-- 0005: row-level security policies, privileges, projection views.
-- GENERATED by src/database/policies/generate-rls-migration.ts from src/database/policies/spec.ts.
-- Do not edit by hand: change the spec and regenerate (CI diffs the output).
--
-- Model: every table has RLS enabled; every table except pure reference data has FORCE RLS (the
-- owner role is subject to it too). The runtime role (saudaro_app) has only the privileges listed.
`;
  return header + statements.map((s) => s + ';').join(BREAK) + '\n';
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const dir = new URL('../migrations/', import.meta.url);
  const file = readdirSync(dir).find((f) => /^0005_.*\.sql$/.test(f));
  if (!file) throw new Error('0005 migration file not found; run drizzle-kit generate --custom first');
  const sql = buildMigrationSql(BASELINE_0005); // 0005 is applied history; 0007 carries the later changes
  writeFileSync(new URL(file, dir), sql);
  console.log(`wrote ${file} (${sql.split('\n').length} lines, ${schemaTables().length} tables)`);
}
