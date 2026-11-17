import type pg from 'pg';

/** Removes sessions that expired or were revoked more than a day ago, together with their refresh tokens. */
export async function purgeExpiredSessions(pool: pg.Pool): Promise<{ sessions: number; refreshTokens: number }> {
  const { rows } = await pool.query<{ sessions: number; refresh_tokens: number }>(
    `WITH doomed AS (
       SELECT id FROM identity.sessions
       WHERE expires_at < now() - interval '1 day' OR revoked_at < now() - interval '1 day'
     ), tokens AS (
       DELETE FROM identity.refresh_tokens WHERE session_id IN (SELECT id FROM doomed) RETURNING 1
     ), removed AS (
       DELETE FROM identity.sessions WHERE id IN (SELECT id FROM doomed) RETURNING 1
     )
     SELECT (SELECT count(*) FROM removed)::int AS sessions, (SELECT count(*) FROM tokens)::int AS refresh_tokens`,
  );
  return { sessions: rows[0]!.sessions, refreshTokens: rows[0]!.refresh_tokens };
}
