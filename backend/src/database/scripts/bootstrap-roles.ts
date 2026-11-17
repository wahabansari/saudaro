import type { Client } from 'pg';

/**
 * Creates the least-privilege role set. Needs a SUPERUSER connection and is idempotent.
 *
 *   saudaro_migrator  LOGIN   owns the database/schema objects; used only by migrations
 *   saudaro_app       LOGIN   API runtime; NOT owner, NOBYPASSRLS, tiny privilege set
 *   saudaro_worker    LOGIN   background jobs (outbox, notifications, scans, matching); NOBYPASSRLS
 *   saudaro_readonly  LOGIN   reporting; read-only on reference/aggregate data only
 *   saudaro_authz     NOLOGIN owner of SECURITY DEFINER authorization helpers (membership/admin lookups)
 *   saudaro_pub       NOLOGIN owner of the restricted "public projection" views
 *
 * No role created here has SUPERUSER, CREATEROLE, CREATEDB or BYPASSRLS.
 */
export interface RolePasswords {
  migrator: string;
  app: string;
  worker: string;
  readonly: string;
}

const LOGIN_ROLES = ['saudaro_migrator', 'saudaro_app', 'saudaro_worker', 'saudaro_readonly'] as const;
const NOLOGIN_ROLES = ['saudaro_authz', 'saudaro_pub'] as const;

export async function bootstrapRoles(client: Client, dbName: string, passwords: RolePasswords): Promise<void> {
  const q = (s: string) => client.escapeIdentifier(s);
  const lit = (s: string) => client.escapeLiteral(s);
  const pw: Record<(typeof LOGIN_ROLES)[number], string> = {
    saudaro_migrator: passwords.migrator,
    saudaro_app: passwords.app,
    saudaro_worker: passwords.worker,
    saudaro_readonly: passwords.readonly,
  };

  for (const role of LOGIN_ROLES) {
    const exists = await client.query('select 1 from pg_roles where rolname = $1', [role]);
    const verb = exists.rowCount ? 'ALTER' : 'CREATE';
    await client.query(
      `${verb} ROLE ${q(role)} WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD ${lit(pw[role])}`,
    );
  }
  for (const role of NOLOGIN_ROLES) {
    const exists = await client.query('select 1 from pg_roles where rolname = $1', [role]);
    const verb = exists.rowCount ? 'ALTER' : 'CREATE';
    await client.query(
      `${verb} ROLE ${q(role)} WITH NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS`,
    );
  }

  await client.query(`ALTER DATABASE ${q(dbName)} OWNER TO saudaro_migrator`);
  await client.query(`REVOKE ALL ON DATABASE ${q(dbName)} FROM PUBLIC`);
  await client.query(
    `GRANT CONNECT ON DATABASE ${q(dbName)} TO saudaro_migrator, saudaro_app, saudaro_worker, saudaro_readonly`,
  );
  // The migrator may SET ROLE to the helper owners (needed to hand ownership of definer objects).
  await client.query('GRANT saudaro_authz, saudaro_pub TO saudaro_migrator WITH INHERIT FALSE, SET TRUE');

  // Per-role guard rails (apply to every new session of that role).
  await client.query(`ALTER ROLE saudaro_app SET statement_timeout = '15s'`);
  await client.query(`ALTER ROLE saudaro_app SET idle_in_transaction_session_timeout = '10s'`);
  await client.query(`ALTER ROLE saudaro_app SET lock_timeout = '5s'`);
  await client.query(`ALTER ROLE saudaro_app SET search_path = public`);
  await client.query(`ALTER ROLE saudaro_app CONNECTION LIMIT 100`);
  await client.query(`ALTER ROLE saudaro_worker SET statement_timeout = '60s'`);
  await client.query(`ALTER ROLE saudaro_worker SET idle_in_transaction_session_timeout = '30s'`);
  await client.query(`ALTER ROLE saudaro_worker SET search_path = public`);
  await client.query(`ALTER ROLE saudaro_worker CONNECTION LIMIT 30`);
  await client.query(`ALTER ROLE saudaro_readonly SET default_transaction_read_only = on`);
  await client.query(`ALTER ROLE saudaro_readonly SET statement_timeout = '30s'`);
  await client.query(`ALTER ROLE saudaro_readonly SET search_path = public`);
  await client.query(`ALTER ROLE saudaro_readonly CONNECTION LIMIT 10`);
}
