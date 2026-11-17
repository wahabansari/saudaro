import { sql } from 'drizzle-orm';
import { char, check, index, pgSchema, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';

/**
 * The `company` schema — owned EXCLUSIVELY by this service. The common messaging tables (outbox_events,
 * inbox_events, audit_log) are created by `0000_common_tables.sql`; row-level security for the tables below
 * lives in the custom `rls` migration (Drizzle cannot express FORCE RLS keyed on a transaction-local setting).
 */
export const companyDb = pgSchema('company');

export const companies = companyDb.table(
  'companies',
  {
    id: uuid().primaryKey().defaultRandom(),
    legalName: text().notNull(),
    countryCode: char({ length: 2 }).notNull(),
    createdBy: uuid().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('companies_country_code_check', sql`${t.countryCode} ~ '^[A-Z]{2}$'`),
    index('ix_companies_created_by').on(t.createdBy),
  ],
);

export const memberships = companyDb.table(
  'memberships',
  {
    companyId: uuid()
      .notNull()
      .references(() => companies.id),
    userId: uuid().notNull(),
    roleKey: text().notNull(),
    status: text().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.companyId, t.userId] }),
    index('ix_memberships_user_status').on(t.userId, t.status),
    check('memberships_status_check', sql`${t.status} in ('active','suspended','removed')`),
  ],
);
