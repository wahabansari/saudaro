import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { bootstrapRoles } from './bootstrap-roles.ts';

function required(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`${name} is required`);
    process.exit(1);
  }
  return v;
}

async function main(): Promise<void> {
  const adminUrl = required('DATABASE_ADMIN_URL');
  const dbName = new URL(adminUrl).pathname.replace(/^\//, '');
  const client = new pg.Client({ connectionString: adminUrl });
  await client.connect();
  try {
    await bootstrapRoles(client, dbName, {
      migrator: required('BOOTSTRAP_MIGRATOR_PASSWORD'),
      app: required('BOOTSTRAP_APP_PASSWORD'),
      worker: required('BOOTSTRAP_WORKER_PASSWORD'),
      readonly: process.env.BOOTSTRAP_READONLY_PASSWORD ?? required('BOOTSTRAP_APP_PASSWORD') + '-ro',
    });
    console.log(`roles bootstrapped on database "${dbName}"`);
  } finally {
    await client.end();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((err: unknown) => {
    console.error('bootstrap failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
