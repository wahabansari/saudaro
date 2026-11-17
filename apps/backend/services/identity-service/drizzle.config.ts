import { defineConfig } from 'drizzle-kit';

/**
 * Drizzle Kit for the IDENTITY schema only. Migrations are applied by `identity_migrator` (owner of the
 * schema); the runtime role `identity_svc` can never run DDL. Bookkeeping lives in identity.__migrations.
 */
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/infrastructure/db/schema.ts',
  out: './migrations',
  schemaFilter: ['identity'],
  migrations: { schema: 'identity', table: '__migrations' },
  casing: 'snake_case',
  strict: true,
  dbCredentials: {
    url: process.env.IDENTITY_MIGRATION_URL ?? 'postgres://identity_migrator@127.0.0.1:5432/saudaro_marketplace',
  },
});
