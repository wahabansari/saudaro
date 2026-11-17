import { readMigrationFiles } from 'drizzle-orm/migrator';
import pg from 'pg';

const ident = (name: string): string => `"${name.replace(/"/g, '""')}"`;

/**
 * Applies a service's Drizzle-generated migrations with the SERVICE MIGRATOR role.
 *
 * Drizzle's own `migrate()` runs `CREATE SCHEMA IF NOT EXISTS`, which needs database-level CREATE. We do
 * not grant that to migrator roles (a migrator may only touch its own schema), so this runner reuses
 * Drizzle's migration-file reader and applies the SQL itself. The bookkeeping table lives inside the
 * service's own schema, so services never see each other's migration state. Runs under an advisory lock
 * so concurrent deploys cannot double-apply; every migration runs in its own transaction.
 */
export async function runServiceMigrations(opts: {
  connectionString: string;
  schema: string;
  migrationsFolder: string;
}): Promise<{ applied: number }> {
  const migrations = readMigrationFiles({ migrationsFolder: opts.migrationsFolder });
  const table = `${ident(opts.schema)}.${ident('__migrations')}`;
  const client = new pg.Client({ connectionString: opts.connectionString });
  await client.connect();
  let applied = 0;
  try {
    await client.query('SELECT pg_advisory_lock(hashtext($1))', [`migrate:${opts.schema}`]);
    await client.query(
      `CREATE TABLE IF NOT EXISTS ${table} (id serial PRIMARY KEY, hash text NOT NULL, created_at bigint NOT NULL)`,
    );
    const last = await client.query<{ created_at: string }>(
      `SELECT created_at FROM ${table} ORDER BY created_at DESC LIMIT 1`,
    );
    const lastApplied = last.rows[0] ? Number(last.rows[0].created_at) : -1;
    for (const migration of migrations) {
      if (migration.folderMillis <= lastApplied) continue;
      await client.query('BEGIN');
      try {
        for (const statement of migration.sql) await client.query(statement);
        await client.query(`INSERT INTO ${table} (hash, created_at) VALUES ($1, $2)`, [
          migration.hash,
          migration.folderMillis,
        ]);
        await client.query('COMMIT');
        applied += 1;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }
    return { applied };
  } finally {
    await client
      .query('SELECT pg_advisory_unlock(hashtext($1))', [`migrate:${opts.schema}`])
      .catch(() => undefined);
    await client.end();
  }
}
