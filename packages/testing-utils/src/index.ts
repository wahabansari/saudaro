import { randomBytes } from 'node:crypto';
import { createServer } from 'node:net';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import EmbeddedPostgres from 'embedded-postgres';
import pg from 'pg';

/**
 * Real PostgreSQL for tests (embedded binaries — no Docker needed). Never mock the database: RLS, grants,
 * constraints and migrations are only meaningful against a real server.
 */
export interface TestPostgres {
  port: number;
  /** Superuser connection string to the maintenance database. TEST ONLY. */
  adminUrl: string;
  stop: () => Promise<void>;
}

const SUPER_PASSWORD = 'test-superuser-pw';

async function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.listen(0, '127.0.0.1', () => {
      const address = srv.address();
      srv.close(() =>
        address && typeof address === 'object' ? resolve(address.port) : reject(new Error('no port')),
      );
    });
  });
}

export async function startPostgres(): Promise<TestPostgres> {
  const dir = mkdtempSync(join(tmpdir(), 'saudaro-pg-'));
  const port = await freePort();
  const server = new EmbeddedPostgres({
    databaseDir: dir,
    user: 'postgres',
    password: SUPER_PASSWORD,
    port,
    persistent: false,
    initdbFlags: ['--encoding=UTF8', '--locale=C'],
    onLog: () => undefined,
    onError: () => undefined,
  });
  await server.initialise();
  await server.start();
  return {
    port,
    adminUrl: `postgres://postgres:${SUPER_PASSWORD}@127.0.0.1:${port}/postgres`,
    stop: async () => {
      await server.stop();
      rmSync(dir, { recursive: true, force: true });
    },
  };
}

export interface TestDatabase {
  name: string;
  /** Superuser URL to THIS database (fixtures/bootstrap only). */
  adminUrl: string;
  /** Build a URL for a role created by bootstrap. */
  urlFor: (user: string, password: string) => string;
  drop: () => Promise<void>;
}

/** An isolated, uniquely named database inside the shared test server. */
export async function createTestDatabase(serverAdminUrl: string): Promise<TestDatabase> {
  const name = `t_${randomBytes(6).toString('hex')}`;
  const root = new pg.Client({ connectionString: serverAdminUrl });
  await root.connect();
  try {
    await root.query(`CREATE DATABASE ${root.escapeIdentifier(name)} ENCODING 'UTF8'`);
  } finally {
    await root.end();
  }
  const base = new URL(serverAdminUrl);
  const withDb = (user: string, password: string) => {
    const u = new URL(base);
    u.username = user;
    u.password = password;
    u.pathname = `/${name}`;
    return u.toString();
  };
  return {
    name,
    adminUrl: withDb(decodeURIComponent(base.username), decodeURIComponent(base.password)),
    urlFor: withDb,
    drop: async () => {
      const c = new pg.Client({ connectionString: serverAdminUrl });
      await c.connect();
      try {
        await c.query('select pg_terminate_backend(pid) from pg_stat_activity where datname = $1', [name]);
        await c.query(`DROP DATABASE IF EXISTS ${c.escapeIdentifier(name)}`);
      } finally {
        await c.end();
      }
    },
  };
}
