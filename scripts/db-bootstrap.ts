import pg from 'pg';
import { bootstrapServiceRoles } from '@saudaro/database-utils';
import { DB_SERVICES, adminUrl, dbName, passwords } from './services.ts';

/** Creates one schema + one app role + one migrator role per service (idempotent). Needs the superuser URL. */
const client = new pg.Client({ connectionString: adminUrl() });
await client.connect();
try {
  await bootstrapServiceRoles(
    client,
    dbName(),
    DB_SERVICES.map((s) => ({
      name: s.name,
      schema: s.schema,
      appPassword: passwords(s).app,
      migratorPassword: passwords(s).migrator,
      // Unlimited by default (bounded by max_connections); set to cap each service role, e.g. replicas x DB_POOL_MAX.
      connectionLimit: Number(process.env.DB_APP_CONNECTION_LIMIT ?? -1),
    })),
  );
  console.log(
    `roles and schemas ready on "${dbName()}": ${DB_SERVICES.map((s) => `${s.name}_svc/${s.name}_migrator → ${s.schema}`).join(', ')}`,
  );
} finally {
  await client.end();
}
