import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:net';
import EmbeddedPostgres from 'embedded-postgres';
import pg from 'pg';
import { bootstrapRoles } from '../../src/database/scripts/bootstrap-roles.ts';
import { runMigrations } from '../../src/database/scripts/migrate.ts';

export const TEST_DB = 'saudaro_test';
const SUPER_PW = 'test-superuser-pw';
export const TEST_PASSWORDS = {
  migrator: 'test-migrator-pw',
  app: 'test-app-pw',
  worker: 'test-worker-pw',
  readonly: 'test-readonly-pw',
} as const;

export interface TestDb {
  port: number;
  urls: { admin: string; migrator: string; app: string; worker: string; readonly: string };
  stop: () => Promise<void>;
}

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

/** Real PostgreSQL (embedded binaries) with roles bootstrapped and all migrations applied. */
export async function startTestDb(opts: { migrate?: boolean } = {}): Promise<TestDb> {
  const dir = mkdtempSync(join(tmpdir(), 'saudaro-pg-'));
  const port = await freePort();
  const server = new EmbeddedPostgres({
    databaseDir: dir,
    user: 'postgres',
    password: SUPER_PW,
    port,
    persistent: false,
    initdbFlags: ['--encoding=UTF8', '--locale=C'],
    onLog: () => undefined,
    onError: () => undefined,
  });
  await server.initialise();
  await server.start();
  await server.createDatabase(TEST_DB);

  const url = (user: string, pw: string) => `postgres://${user}:${pw}@127.0.0.1:${port}/${TEST_DB}`;
  const urls = {
    admin: url('postgres', SUPER_PW),
    migrator: url('saudaro_migrator', TEST_PASSWORDS.migrator),
    app: url('saudaro_app', TEST_PASSWORDS.app),
    worker: url('saudaro_worker', TEST_PASSWORDS.worker),
    readonly: url('saudaro_readonly', TEST_PASSWORDS.readonly),
  };

  const admin = new pg.Client({ connectionString: urls.admin });
  await admin.connect();
  try {
    await bootstrapRoles(admin, TEST_DB, TEST_PASSWORDS);
  } finally {
    await admin.end();
  }
  if (opts.migrate !== false) await runMigrations(urls.migrator);

  return {
    port,
    urls,
    stop: async () => {
      await server.stop();
      rmSync(dir, { recursive: true, force: true });
    },
  };
}
