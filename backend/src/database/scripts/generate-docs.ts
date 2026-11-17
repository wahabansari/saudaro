import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { is } from 'drizzle-orm';
import { PgTable, getTableConfig } from 'drizzle-orm/pg-core';
import { REFERENCE_TABLES, SPEC, type TablePolicy } from '../policies/spec.ts';
import * as admin from '../schema/admin.ts';
import * as catalog from '../schema/catalog.ts';
import * as companies from '../schema/companies.ts';
import * as deals from '../schema/deals.ts';
import * as documents from '../schema/documents.ts';
import * as identity from '../schema/identity.ts';
import * as matching from '../schema/matching.ts';
import * as messaging from '../schema/messaging.ts';
import * as notifications from '../schema/notifications.ts';
import * as quotations from '../schema/quotations.ts';
import * as reference from '../schema/reference.ts';
import * as reviews from '../schema/reviews.ts';
import * as rfq from '../schema/rfq.ts';
import * as tradeProfiles from '../schema/trade-profiles.ts';
import * as verification from '../schema/verification.ts';

/**
 * Generates docs/DATABASE_REFERENCE.md and docs/ERD.md from the Drizzle schema and the RLS spec,
 * so the documentation cannot drift from the code. `npm run docs:generate`.
 */
const MODULES: ReadonlyArray<readonly [string, string, Record<string, unknown>]> = [
  ['A', 'Global reference data', reference],
  ['B', 'Identity and authentication', identity],
  ['C', 'Companies, membership and RBAC', companies],
  ['D', 'Files and documents', documents],
  ['E', 'Verification and compliance', verification],
  ['F', 'Product catalog', catalog],
  ['G', 'Seller trade profile and buyer profile', tradeProfiles],
  ['H', 'RFQ management', rfq],
  ['I', 'Supplier matching', matching],
  ['J', 'Quotations and negotiation', quotations],
  ['K', 'Deals and deal room', deals],
  ['L', 'Conversations and messaging', messaging],
  ['M', 'Reviews and reputation', reviews],
  ['N', 'Notifications', notifications],
  ['O', 'Administration, audit, outbox', admin],
];

const snake = (s: string): string => s.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();

const tablesOf = (mod: Record<string, unknown>): PgTable[] =>
  (Object.values(mod) as unknown[]).filter((v): v is PgTable => is(v, PgTable));

const short = (s: string | undefined): string =>
  (s ?? '—')
    .replace(/\(select app\.active_company\(\)\)/g, 'ACTIVE_CO')
    .replace(/\(select app\.writable_company\(\)\)/g, 'WRITABLE_CO')
    .replace(/\(select app\.uid\(\)\)/g, 'ME')
    .replace(/\(select app\.can_write\('([^']+)'\)\)/g, 'can($1)')
    .replace(/\(select app\.is_platform_admin\('([^']+)'\)\)/g, 'admin($1)')
    .replace(/\(select app\.is_platform_admin\(\)\)/g, 'admin()')
    .replace(/\(select app\.is_conversation_participant\(([^)]+)\)\)/g, 'participant($1)')
    .replace(/\(select app\.is_deal_party\(([^)]+)\)\)/g, 'deal_party($1)')
    .replace(/\|/g, '\\|');

function access(table: string): string {
  const p: TablePolicy | undefined = SPEC[table];
  if (!p) return '_no policy_';
  if (p.reference) return '**reference data**: read-only for all roles; writes by the migration owner only.';
  const parts = [
    ['read', p.select],
    ['insert', p.insert],
    ['update', typeof p.update === 'string' ? p.update : p.update?.using],
    ['delete', p.delete],
  ] as const;
  const app = parts.map(([k, v]) => `- app ${k}: ${v ? `\`${short(v)}\`` : '**none**'}`).join('\n');
  const extra = [
    p.worker ? `worker \`${p.worker}\`` : '',
    p.authz ? `definer \`${p.authz}\`` : '',
    p.pub ? `projection columns: ${p.pub.length}` : '',
  ]
    .filter(Boolean)
    .join(', ');
  return `${app}${p.updateCols ? `\n- updatable columns: ${p.updateCols.join(', ')}` : ''}${extra ? `\n- other roles: ${extra}` : ''}`;
}

function tableDoc(t: PgTable): string {
  const c = getTableConfig(t);
  const pkCols = new Set(c.columns.filter((x) => x.primary).map((x) => snake(x.name)));
  c.primaryKeys.forEach((k) => k.columns.forEach((x) => pkCols.add(snake(x.name))));
  const cols = c.columns
    .map((x) => {
      const def = x.hasDefault
        ? typeof x.default === 'string' || typeof x.default === 'number' || typeof x.default === 'boolean'
          ? String(x.default)
          : 'expr'
        : '';
      const flags = [pkCols.has(snake(x.name)) ? 'PK' : '', x.generated ? 'generated' : '']
        .filter(Boolean)
        .join(' ');
      return `| ${snake(x.name)} | ${x.getSQLType()} | ${x.notNull ? 'no' : 'yes'} | ${def.replace(/\|/g, '\\|')} | ${flags} |`;
    })
    .join('\n');
  const fks = c.foreignKeys.map((f) => {
    const r = f.reference();
    return `\`${r.columns.map((x) => snake(x.name)).join(', ')}\` → \`${getTableConfig(r.foreignTable).name}(${r.foreignColumns.map((x) => snake(x.name)).join(', ')})\` on delete ${f.onDelete ?? 'no action'}`;
  });
  const uniques = [
    ...c.uniqueConstraints.map(
      (u) =>
        `\`${u.columns.map((x) => snake(x.name)).join(', ')}\`${u.nullsNotDistinct ? ' (nulls not distinct)' : ''}`,
    ),
    ...c.indexes
      .filter((i) => i.config.unique)
      .map((i) => `\`${i.config.name}\`${i.config.where ? ' (partial)' : ''}`),
  ];
  const idx = c.indexes
    .filter((i) => !i.config.unique)
    .map((i) => `\`${i.config.name}\`${i.config.where ? ' (partial)' : ''}`);
  const checks = c.checks.map((k) => `\`${k.name}\``);
  const list = (label: string, items: string[]) =>
    items.length ? `\n**${label}:** ${items.join('; ')}\n` : '';
  return `#### \`${c.name}\`

| column | type | nullable | default | flags |
|---|---|---|---|---|
${cols}
${list('Foreign keys', fks)}${list('Unique', uniques)}${list('Checks', checks)}${list('Indexes', idx)}
**Access (RLS):**
${access(c.name)}
`;
}

function erd(mod: Record<string, unknown>): string {
  const tables = tablesOf(mod);
  const names = new Set(tables.map((t) => getTableConfig(t).name));
  const rel = new Set<string>();
  const external = new Set<string>();
  for (const t of tables) {
    const c = getTableConfig(t);
    for (const f of c.foreignKeys) {
      const r = f.reference();
      const parent = getTableConfig(r.foreignTable).name;
      if (!names.has(parent)) external.add(parent);
      rel.add(`  ${parent} ||--o{ ${c.name} : "${r.columns.map((x) => snake(x.name)).join('+')}"`);
    }
  }
  const ents = [...names, ...external].map((n) => `  ${n} {\n  }`).join('\n');
  return `\`\`\`mermaid\nerDiagram\n${ents}\n${[...rel].join('\n')}\n\`\`\``;
}

const OVERVIEW = `\`\`\`mermaid
erDiagram
  users ||--o{ company_memberships : "belongs to"
  companies ||--o{ company_memberships : "has members"
  company_roles ||--o{ company_memberships : "grants"
  company_roles ||--o{ company_role_permissions : ""
  permissions ||--o{ company_role_permissions : ""
  companies ||--o| seller_trade_profiles : "may sell"
  companies ||--o| buyer_profiles : "may buy"
  companies ||--o{ products : "publishes"
  products ||--o{ seller_product_listings : "offered as"
  companies ||--o{ verification_cases : "verified via"
  companies ||--o{ company_verification_levels : "holds"
  companies ||--o{ rfqs : "buyer issues"
  rfqs ||--o{ rfq_items : "contains"
  rfqs ||--o{ rfq_invitations : "invites"
  rfqs ||--o{ rfq_match_runs : "matched by"
  rfq_match_runs ||--o{ rfq_supplier_matches : "yields"
  rfqs ||--o{ quotations : "receives"
  companies ||--o{ quotations : "supplier submits"
  quotations ||--o{ quotation_revisions : "immutable history"
  quotation_revisions ||--o{ quotation_items : "prices"
  quotations ||--o| deals : "accepted revision becomes"
  deals ||--o{ deal_parties : "between"
  deals ||--o{ deal_documents : "collaborates on"
  deals ||--o{ deal_milestones : "tracks"
  deals ||--o{ company_reviews : "enables"
  companies ||--o{ files : "owns"
  files ||--o{ file_access_grants : "shared by"
  conversations ||--o{ conversation_participants : "has"
  conversations ||--o{ messages : "contains"
  users ||--o{ notifications : "receives"
\`\`\``;

const GENERATED =
  '<!-- GENERATED by `npm run docs:generate` from src/database/schema/*.ts and policies/spec.ts. Do not edit by hand. -->';

export function buildDesignReference(): string {
  const total = MODULES.reduce((n, [, , m]) => n + tablesOf(m).length, 0);
  const body = MODULES.map(([letter, title, mod]) => {
    const ts = tablesOf(mod);
    return `## ${letter}. ${title} (${ts.length} tables)\n\n${ts.map(tableDoc).join('\n')}`;
  }).join('\n');
  const index = MODULES.map(
    ([letter, title, mod]) =>
      `- **${letter}. ${title}** (${tablesOf(mod).length}): ${tablesOf(mod)
        .map((t) => `\`${getTableConfig(t).name}\``)
        .join(', ')}`,
  ).join('\n');
  return `${GENERATED}\n\n# Table reference (${total} tables)\n\n## Table index\n\n${index}\n\nReference-data tables (RLS enabled, read-only to application roles): ${REFERENCE_TABLES.join(', ')}.\n\n${body}`;
}

export function buildErd(): string {
  const body = MODULES.map(([letter, title, mod]) => `## ${letter}. ${title}\n\n${erd(mod)}\n`).join('\n');
  return `${GENERATED}\n\n# Entity-relationship diagrams\n\n## Platform overview (hand-curated)\n\n${OVERVIEW}\n\nRelationship notation: \`parent ||--o{ child : "fk column(s)"\`. Composite tenant foreign keys appear as \`child_id+company_id\`.\n\n${body}`;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const dir = new URL('../../../docs/', import.meta.url);
  mkdirSync(dir, { recursive: true });
  writeFileSync(new URL('DATABASE_REFERENCE.md', dir), buildDesignReference());
  writeFileSync(new URL('ERD.md', dir), buildErd());
  console.log('docs/DATABASE_REFERENCE.md and docs/ERD.md written');
}
