import { defineConfig } from 'drizzle-kit';

// Migrations are generated from the Drizzle schema and applied with the dedicated
// migrator role (never the runtime application role). `generate` needs no DB connection.
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/database/schema/index.ts',
  out: './src/database/migrations',
  casing: 'snake_case',
  strict: true,
  verbose: true,
  dbCredentials: {
    url: process.env.DATABASE_MIGRATION_URL ?? 'postgres://saudaro_migrator@localhost:5432/saudaro',
  },
});
