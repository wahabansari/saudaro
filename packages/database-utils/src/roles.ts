import type { Client } from 'pg';

const IDENT = /^[a-z][a-z0-9_]{1,40}$/;

export interface ServiceDbSpec {
  /** service short name, e.g. "identity" → roles identity_svc / identity_migrator */
  name: string;
  /** schema owned by the service (usually == name; trade_profile for trade-profile) */
  schema: string;
  appPassword: string;
  migratorPassword: string;
  /** Max concurrent connections of the runtime role; -1 (default) = unlimited, governed by max_connections. */
  connectionLimit?: number;
}

export const appRole = (s: Pick<ServiceDbSpec, 'name'>) => `${s.name}_svc`;
export const migratorRole = (s: Pick<ServiceDbSpec, 'name'>) => `${s.name}_migrator`;

/**
 * Creates, per service: one schema, one runtime role (`<name>_svc`) and one migration role
 * (`<name>_migrator` — owns the schema). Needs a SUPERUSER connection; idempotent.
 *
 * Isolation guarantees (verified by tests): a service role can use ONLY its own schema; it cannot read,
 * write or even see another service's schema; nothing is granted on `public`; runtime roles own nothing
 * and cannot create objects; no role is SUPERUSER, CREATEDB, CREATEROLE or BYPASSRLS.
 */
export async function bootstrapServiceRoles(
  client: Client,
  dbName: string,
  services: ServiceDbSpec[],
): Promise<void> {
  const q = (s: string) => client.escapeIdentifier(s);
  const lit = (s: string) => client.escapeLiteral(s);

  await client.query(`REVOKE ALL ON DATABASE ${q(dbName)} FROM PUBLIC`);
  await client.query('REVOKE ALL ON SCHEMA public FROM PUBLIC');

  for (const s of services) {
    for (const v of [s.name, s.schema]) {
      if (!IDENT.test(v)) throw new Error(`invalid identifier "${v}"`);
    }
    const app = appRole(s);
    const mig = migratorRole(s);

    for (const [role, password, limit] of [
      [app, s.appPassword, s.connectionLimit ?? -1],
      [mig, s.migratorPassword, 5],
    ] as const) {
      const exists = await client.query('select 1 from pg_roles where rolname = $1', [role]);
      const verb = exists.rowCount ? 'ALTER' : 'CREATE';
      await client.query(
        `${verb} ROLE ${q(role)} WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS CONNECTION LIMIT ${limit} PASSWORD ${lit(password)}`,
      );
      await client.query(`GRANT CONNECT ON DATABASE ${q(dbName)} TO ${q(role)}`);
      await client.query(`ALTER ROLE ${q(role)} SET search_path = ${q(s.schema)}`);
    }
    await client.query(`ALTER ROLE ${q(app)} SET statement_timeout = '15s'`);
    await client.query(`ALTER ROLE ${q(app)} SET idle_in_transaction_session_timeout = '10s'`);
    await client.query(`ALTER ROLE ${q(app)} SET lock_timeout = '5s'`);

    await client.query(`CREATE SCHEMA IF NOT EXISTS ${q(s.schema)} AUTHORIZATION ${q(mig)}`);
    await client.query(`ALTER SCHEMA ${q(s.schema)} OWNER TO ${q(mig)}`);
    await client.query(`REVOKE ALL ON SCHEMA ${q(s.schema)} FROM PUBLIC`);
    await client.query(`GRANT USAGE ON SCHEMA ${q(s.schema)} TO ${q(app)}`);
    // Tables/sequences the migrator creates later are usable by the runtime role (DML only; no DDL, no TRUNCATE).
    await client.query(
      `ALTER DEFAULT PRIVILEGES FOR ROLE ${q(mig)} IN SCHEMA ${q(s.schema)} GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${q(app)}`,
    );
    await client.query(
      `ALTER DEFAULT PRIVILEGES FOR ROLE ${q(mig)} IN SCHEMA ${q(s.schema)} GRANT USAGE, SELECT ON SEQUENCES TO ${q(app)}`,
    );
  }
}
