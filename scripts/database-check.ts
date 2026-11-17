import type pg from 'pg';
import { assertSafeRuntimeRole, createPool } from '@saudaro/database-utils';
import { DB_SERVICES, roleUrl } from './services.ts';

/**
 * Verifies, with each service's REAL runtime role, that: it can connect; it is not a superuser/BYPASSRLS/owner;
 * its own tables exist; and every OTHER service's schema is inaccessible (permission denied).
 */
let failures = 0;
const report = (ok: boolean, msg: string) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`);
  if (!ok) failures += 1;
};

for (const s of DB_SERVICES) {
  const pool = createPool(roleUrl(s, 'app'), { max: 1 });
  try {
    const role = await assertSafeRuntimeRole(pool);
    report(true, `${role}: connected, least-privilege (no superuser, no BYPASSRLS, owns nothing)`);
    const own = await pool.query(
      `select count(*)::int n from information_schema.tables where table_schema = $1`,
      [s.schema],
    );
    report(own.rows[0].n >= 3, `${role}: sees ${own.rows[0].n} tables in schema "${s.schema}"`);
    for (const other of DB_SERVICES.filter((o) => o.name !== s.name)) {
      try {
        await pool.query(`select 1 from ${other.schema}.outbox_events limit 1`);
        report(false, `${role}: could read ${other.schema}.outbox_events (ISOLATION BROKEN)`);
      } catch (err) {
        report(
          (err as pg.DatabaseError).code === '42501',
          `${role}: denied access to schema "${other.schema}"`,
        );
      }
    }
  } catch (err) {
    report(false, `${s.name}_svc: ${(err as Error).message}`);
  } finally {
    await pool.end();
  }
}
process.exit(failures ? 1 : 0);
