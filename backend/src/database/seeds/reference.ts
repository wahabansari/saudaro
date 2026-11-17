import type { Client } from 'pg';
import {
  BUSINESS_TYPES, CATEGORIES, CERTIFICATIONS, CERTIFICATION_ISSUERS, COUNTRIES, CURRENCIES, HS_CODES, INCOTERMS_2020,
  LANGUAGES, PACKAGING, PAYMENT_TERMS, PERMISSIONS, PORTS, SHIPMENT_MODES, SYSTEM_ROLES, UNITS, UNIT_BASE,
} from './reference-data.ts';

/**
 * Idempotent reference + access-control seeding. Safe to re-run: every insert is
 * ON CONFLICT DO NOTHING / DO UPDATE on a natural key, nothing is ever deleted.
 * Runs as the MIGRATOR role (the only role allowed to write reference data).
 */
export async function seedReference(c: Client): Promise<void> {
  await c.query('BEGIN');
  try {
    for (const [code, num, name, symbol, minor] of CURRENCIES) {
      await c.query(
        'insert into currencies (code, numeric_code, name, symbol, minor_units) values ($1,$2,$3,$4,$5) on conflict (code) do nothing',
        [code, num, name, symbol, minor],
      );
    }
    for (const [iso2, iso3, name, cur] of COUNTRIES) {
      await c.query(
        `insert into countries (iso2, iso3, name, default_currency_id)
         values ($1,$2,$3,(select id from currencies where code = $4)) on conflict (iso2) do nothing`,
        [iso2, iso3, name, cur],
      );
    }
    for (const [code, symbol, name, dim] of UNITS) {
      await c.query(
        'insert into units_of_measure (code, symbol, name, dimension) values ($1,$2,$3,$4) on conflict (code) do nothing',
        [code, symbol, name, dim],
      );
    }
    for (const [code, [base, factor]] of Object.entries(UNIT_BASE)) {
      await c.query(
        `update units_of_measure set base_unit_id = (select id from units_of_measure where code = $2), to_base_factor = $3
         where code = $1 and base_unit_id is null`,
        [code, base, factor],
      );
    }
    for (const [code, name, scope, kind, seller] of INCOTERMS_2020) {
      await c.query(
        `insert into incoterms (code, version_year, name, mode_scope, named_place_kind, seller_arranges_main_carriage)
         values ($1, 2020, $2, $3, $4, $5) on conflict (code, version_year) do nothing`,
        [code, name, scope, kind, seller],
      );
    }
    for (const [code, name, cat] of PAYMENT_TERMS) {
      await c.query('insert into payment_terms (code, name, category) values ($1,$2,$3) on conflict (code) do nothing', [code, name, cat]);
    }
    for (const [code, name] of PACKAGING) {
      await c.query('insert into packaging_types (code, name) values ($1,$2) on conflict (code) do nothing', [code, name]);
    }
    for (const [code, name] of SHIPMENT_MODES) {
      await c.query('insert into shipment_modes (code, name) values ($1,$2) on conflict (code) do nothing', [code, name]);
    }
    for (const [code, name] of BUSINESS_TYPES) {
      await c.query('insert into business_types (code, name) values ($1,$2) on conflict (code) do nothing', [code, name]);
    }
    for (const [code, name, native, rtl] of LANGUAGES) {
      await c.query('insert into languages (code, name, native_name, is_rtl) values ($1,$2,$3,$4) on conflict (code) do nothing', [code, name, native, rtl]);
    }

    // Categories (+ transitive closure so subtree queries need no recursion).
    const paths = new Map<string, { path: string; depth: number; parent: string | null }>();
    CATEGORIES.forEach(([slug, parent]) => {
      const p = parent ? paths.get(parent) : undefined;
      if (parent && !p) throw new Error(`category parent ${parent} must be listed before ${slug}`);
      paths.set(slug, { path: p ? `${p.path}.${slug}` : slug, depth: p ? p.depth + 1 : 0, parent });
    });
    for (const [slug, parent, name] of CATEGORIES) {
      const meta = paths.get(slug)!;
      await c.query(
        `insert into product_categories (slug, name, parent_id, depth, path)
         values ($1,$2,(select id from product_categories where slug = $3),$4,$5) on conflict (slug) do nothing`,
        [slug, name, parent, meta.depth, meta.path],
      );
    }
    for (const [slug] of CATEGORIES) {
      let ancestor: string | null = slug;
      let depth = 0;
      while (ancestor) {
        await c.query(
          `insert into product_category_closure (ancestor_id, descendant_id, depth)
           values ((select id from product_categories where slug = $1),(select id from product_categories where slug = $2),$3)
           on conflict do nothing`,
          [ancestor, slug, depth],
        );
        ancestor = paths.get(ancestor)?.parent ?? null;
        depth += 1;
      }
    }

    for (const [code, description] of HS_CODES) {
      const parent = code.length > 2 ? code.slice(0, code.length - 2) : null;
      await c.query(
        `insert into hs_codes (code, level, parent_id, description)
         values ($1,$2,(select id from hs_codes where code = $3 and hs_version = 'HS2022'),$4) on conflict (code, hs_version) do nothing`,
        [code, code.length, parent, description],
      );
    }
    for (const [code, name] of CERTIFICATION_ISSUERS) {
      await c.query('insert into certification_issuers (code, name) values ($1,$2) on conflict (code) do nothing', [code, name]);
    }
    for (const [code, name, cat] of CERTIFICATIONS) {
      await c.query('insert into certifications (code, name, category) values ($1,$2,$3) on conflict (code) do nothing', [code, name, cat]);
    }
    for (const [locode, name, iso2, type] of PORTS) {
      await c.query(
        `insert into ports (un_locode, name, country_id, port_type)
         values ($1,$2,(select id from countries where iso2 = $3),$4) on conflict (un_locode) do nothing`,
        [locode, name, iso2, type],
      );
    }
    await c.query(
      `insert into verification_providers (key, name, provider_type) values ('manual_review', 'SAUDARO manual review', 'manual')
       on conflict (key) do nothing`,
    );

    // RBAC catalog + system roles (company_id NULL, is_system = true).
    for (const [key, category, description] of PERMISSIONS) {
      await c.query('insert into permissions (key, category, description) values ($1,$2,$3) on conflict (key) do nothing', [key, category, description]);
    }
    for (const role of SYSTEM_ROLES) {
      await c.query(
        `insert into company_roles (company_id, key, name, level, is_system) values (null, $1, $2, $3, true)
         on conflict (key) where company_id is null do update set name = excluded.name, level = excluded.level`,
        [role.key, role.name, role.level],
      );
      await c.query(
        `delete from company_role_permissions where role_id = (select id from company_roles where company_id is null and key = $1)
           and permission_id not in (select id from permissions where key = any($2))`,
        [role.key, [...role.perms]],
      );
      await c.query(
        `insert into company_role_permissions (role_id, permission_id)
         select r.id, p.id from company_roles r, permissions p
         where r.company_id is null and r.key = $1 and p.key = any($2) on conflict do nothing`,
        [role.key, [...role.perms]],
      );
    }
    await c.query('COMMIT');
  } catch (err) {
    await c.query('ROLLBACK');
    throw err;
  }
}
