import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { bootstrapRoles } from './bootstrap-roles.ts';
import { runMigrations } from './migrate.ts';
import { seedReference } from '../seeds/reference.ts';

/**
 * LOCAL DEVELOPMENT ONLY. Drops and recreates the development database, then bootstraps roles,
 * applies every migration and seeds reference data. Guard rails: refuses to run unless the host is
 * loopback, NODE_ENV is not production, and `--yes` is passed explicitly.
 */
const LOOPBACK = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is required`);
  return v;
}

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') throw new Error('refusing to reset a production database');
  if (!process.argv.includes('--yes'))
    throw new Error('destructive: re-run with --yes to drop and recreate the dev database');

  const adminUrl = new URL(required('DATABASE_ADMIN_URL'));
  if (!LOOPBACK.has(adminUrl.hostname))
    throw new Error(`refusing to reset a non-local host (${adminUrl.hostname})`);
  const dbName = adminUrl.pathname.replace(/^\//, '');
  if (!/^[a-z0-9_]+$/.test(dbName)) throw new Error('unexpected database name');

  const maintenance = new URL(adminUrl);
  maintenance.pathname = '/postgres';
  const root = new pg.Client({ connectionString: maintenance.toString() });
  await root.connect();
  try {
    await root.query(
      'select pg_terminate_backend(pid) from pg_stat_activity where datname = $1 and pid <> pg_backend_pid()',
      [dbName],
    );
    await root.query(`DROP DATABASE IF EXISTS ${root.escapeIdentifier(dbName)}`);
    await root.query(`CREATE DATABASE ${root.escapeIdentifier(dbName)} ENCODING 'UTF8'`);
  } finally {
    await root.end();
  }

  const admin = new pg.Client({ connectionString: adminUrl.toString() });
  await admin.connect();
  try {
    await bootstrapRoles(admin, dbName, {
      migrator: required('BOOTSTRAP_MIGRATOR_PASSWORD'),
      app: required('BOOTSTRAP_APP_PASSWORD'),
      worker: required('BOOTSTRAP_WORKER_PASSWORD'),
      readonly: process.env.BOOTSTRAP_READONLY_PASSWORD ?? `${required('BOOTSTRAP_APP_PASSWORD')}-ro`,
    });
  } finally {
    await admin.end();
  }

  const migrationUrl = required('DATABASE_MIGRATION_URL');
  await runMigrations(migrationUrl);
  const migrator = new pg.Client({ connectionString: migrationUrl });
  await migrator.connect();
  try {
    await seedReference(migrator);
  } finally {
    await migrator.end();
  }
  console.log(`database "${dbName}" recreated, migrated and seeded`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((err: unknown) => {
    console.error('reset failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
