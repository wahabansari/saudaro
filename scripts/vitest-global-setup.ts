import { startPostgres } from '@saudaro/testing-utils';
import type { TestProject } from 'vitest/node';

declare module 'vitest' {
  export interface ProvidedContext {
    pgAdminUrl: string;
  }
}

/** Starts ONE real PostgreSQL for the whole test run; DB-backed suites create their own database in it. */
export default async function setup(project: TestProject): Promise<() => Promise<void>> {
  const pg = await startPostgres();
  project.provide('pgAdminUrl', pg.adminUrl);
  return async () => {
    await pg.stop();
  };
}
