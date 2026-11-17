import { sql, type SQL } from 'drizzle-orm';
import {
  customType,
  foreignKey,
  text,
  timestamp,
  uuid,
  type AnyPgColumn,
  type PgColumn,
} from 'drizzle-orm/pg-core';

/**
 * Shared column builders and constraint helpers.
 *
 * Conventions (documented in docs/DATABASE_DESIGN.md):
 *  - snake_case identifiers (drizzle `casing: 'snake_case'`), plural table names.
 *  - uuid primary keys via gen_random_uuid(); timestamptz everywhere.
 *  - "enums" are text + CHECK (not CREATE TYPE) so values can be evolved by a plain migration.
 *  - tenant-owned children carry company_id and use a COMPOSITE foreign key to the parent's
 *    (id, company_id) so a child row can never point at a parent owned by another company.
 */

export const citext = customType<{ data: string }>({ dataType: () => 'citext' });
export const tsvector = customType<{ data: string }>({ dataType: () => 'tsvector' });
export const bytea = customType<{ data: Buffer }>({ dataType: () => 'bytea' });

export const pk = () =>
  uuid()
    .primaryKey()
    .default(sql`gen_random_uuid()`);
export const tstz = () => timestamp({ withTimezone: true, mode: 'date' });
export const createdAt = () => tstz().notNull().defaultNow();
export const stamps = () => ({ createdAt: createdAt(), updatedAt: createdAt() });

type OnDelete = 'cascade' | 'restrict' | 'set null' | 'no action';

/** NOT NULL foreign key column. Default ON DELETE RESTRICT: nothing disappears implicitly. */
export const fk = (target: () => AnyPgColumn, onDelete: OnDelete = 'restrict') =>
  uuid().notNull().references(target, { onDelete });

/** Nullable foreign key column. */
export const fkOpt = (target: () => AnyPgColumn, onDelete: OnDelete = 'restrict') =>
  uuid().references(target, { onDelete });

/** Text column constrained to a TS union; pair with `oneOf` in the table's CHECK list. */
export const enumText = <const T extends readonly string[]>(_values: T) => text().$type<T[number]>();

/** `col IN ('a','b',...)` for CHECK constraints. Values are code constants, never user input. */
export const oneOf = (col: PgColumn, values: readonly string[]): SQL =>
  sql`${col} in (${sql.raw(values.map((v) => `'${v.replace(/'/g, "''")}'`).join(', '))})`;

/**
 * Composite tenant foreign key: (child.parentId, child.companyId) -> (parent.id, parent.companyId).
 * The parent table must declare unique(id, company_id).
 */
export const tenantFk = (
  name: string,
  child: [AnyPgColumn, AnyPgColumn],
  parent: () => [AnyPgColumn, AnyPgColumn],
  onDelete: OnDelete = 'cascade',
) => foreignKey({ name, columns: child, foreignColumns: parent() }).onDelete(onDelete);
