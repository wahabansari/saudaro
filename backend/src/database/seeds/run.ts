import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { seedReference } from './reference.ts';

/** `npm run db:seed` — reference + RBAC data only. Demo/sample business records are never seeded here. */
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const url = process.env.DATABASE_MIGRATION_URL;
  if (!url) {
    console.error('DATABASE_MIGRATION_URL is required');
    process.exit(1);
  }
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    await seedReference(client);
    console.log('reference data seeded');
  } catch (err) {
    console.error('seed failed:', err instanceof Error ? err.message : err);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}
