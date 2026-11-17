import pg from 'pg';
import type { TestProject } from 'vitest/node';
import { seedReference } from '../../src/database/seeds/reference.ts';
import { startTestDb, type TestDb } from './embedded-pg.ts';

declare module 'vitest' {
  export interface ProvidedContext {
    dbUrls: TestDb['urls'];
  }
}

/** One real PostgreSQL for the whole run: roles bootstrapped, migrations applied, reference data seeded. */
export default async function setup(project: TestProject): Promise<() => Promise<void>> {
  const db = await startTestDb();
  const migrator = new pg.Client({ connectionString: db.urls.migrator });
  await migrator.connect();
  try {
    await seedReference(migrator);
  } finally {
    await migrator.end();
  }
  project.provide('dbUrls', db.urls);
  return async () => {
    await db.stop();
  };
}
