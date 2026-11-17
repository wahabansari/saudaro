import pg from 'pg';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import { createTestDatabase, type TestDatabase } from '@saudaro/testing-utils';
import { provision, renderDataDictionary } from '../scripts/gen-data-dictionary.ts';

let db: TestDatabase;
let client: pg.Client;

beforeAll(async () => {
  db = await createTestDatabase(inject('pgAdminUrl'));
  await provision(db);
  client = new pg.Client({ connectionString: db.adminUrl });
  await client.connect();
});
afterAll(async () => {
  await client.end();
  await db.drop();
});

describe('renderDataDictionary', () => {
  it('documents every implemented table, RLS and policies', async () => {
    const md = await renderDataDictionary(client);
    for (const t of [
      'identity.users',
      'identity.sessions',
      'identity.refresh_tokens',
      'company.companies',
      'company.memberships',
    ]) {
      expect(md).toContain(`### ${t}`);
    }
    const memberships = md.slice(md.indexOf('### company.memberships'));
    expect(memberships).toContain('FORCE: yes');
    for (const p of ['memberships_own_select', 'memberships_creator_insert']) {
      expect(memberships).toContain(p);
    }
    expect(md).toContain('do not edit by hand');
  });

  it('is deterministic across renders', async () => {
    expect(await renderDataDictionary(client)).toBe(await renderDataDictionary(client));
  });
});
