import { createPool } from '@saudaro/database-utils';
import { purgeExpiredSessions } from '../apps/backend/services/identity-service/src/application/purge.ts';
import { DB_SERVICES, roleUrl } from './services.ts';

/** Purges expired/long-revoked identity sessions and their refresh tokens, as the identity runtime role. */
const pool = createPool(roleUrl(DB_SERVICES[0], 'app'), { max: 1, applicationName: 'db-purge' });
try {
  const { sessions, refreshTokens } = await purgeExpiredSessions(pool);
  process.stdout.write(`purged ${sessions} sessions and ${refreshTokens} refresh tokens\n`);
} finally {
  await pool.end();
}
