import { defineConfig } from 'drizzle-kit';

/**
 * Drizzle Kit for the COMPANY schema only. Migrations are applied by `company_migrator` (owner of the
 * schema); the runtime role `company_svc` can never run DDL. Bookkeeping lives in company.__migrations.
 */
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/infrastructure/db/schema.ts',
  out: './migrations',
  schemaFilter: ['company'],
  migrations: { schema: 'company', table: '__migrations' },
  casing: 'snake_case',
  strict: true,
  dbCredentials: {
    url: process.env.COMPANY_MIGRATION_URL ?? 'postgres://company_migrator@127.0.0.1:5432/saudaro_marketplace',
  },
});
