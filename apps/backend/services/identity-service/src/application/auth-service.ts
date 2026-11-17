import type pg from 'pg';
import type { AuthPayload } from '@saudaro/api-contracts';
import {
  DUMMY_HASH,
  generateOpaqueToken,
  hashPassword,
  hashToken,
  verifyPassword,
  type TokenService,
} from '@saudaro/authentication';
import { enqueueEvent, withSystemContext, type Tx } from '@saudaro/database-utils';
import { AuthenticationError, AuthorizationError } from '@saudaro/error-handling';
import { identitySchema } from '../infrastructure/db/schema.ts';
import type { CompanyClient } from '../infrastructure/clients/company-client.ts';

/** A rotated refresh token replayed within this window is refused but not treated as theft. */
const REUSE_GRACE_SECONDS = 5;
const invalidCredentials = () => new AuthenticationError('Invalid email or password.', { code: 'INVALID_CREDENTIALS' });
const invalidRefresh = () => new AuthenticationError('Your session is invalid. Please sign in again.', { code: 'INVALID_REFRESH_TOKEN' });

/** Emails are stored and looked up in one canonical form so case/compatibility variants cannot duplicate. */
const normalizeEmail = (email: string): string => email.normalize('NFKC').toLowerCase().trim();

export function createAuthService(deps: { pool: pg.Pool; tokens: TokenService; company: CompanyClient; refreshTtlSeconds: number }) {
  const { pool, tokens, company, refreshTtlSeconds } = deps;

  async function newRefreshToken(tx: Tx, sessionId: string): Promise<string> {
    const { token, hash } = generateOpaqueToken();
    await tx.query('INSERT INTO identity.refresh_tokens (token_hash, session_id) VALUES ($1, $2)', [hash, sessionId]);
    return token;
  }

  /** A rotated token came back: assume theft, end the whole session and leave an audit trail. */
  async function revokeForReuse(sessionId: string, userId: string): Promise<never> {
    await withSystemContext(pool, async (tx) => {
      const revoked = await tx.query('UPDATE identity.sessions SET revoked_at = now() WHERE id = $1 AND revoked_at IS NULL', [sessionId]);
      if (revoked.rowCount)
        await tx.query(
          "INSERT INTO identity.audit_log (actor_type, actor_user_id, action, resource_type, resource_id) VALUES ('system', $1, 'session.refresh_token_reused', 'session', $2)",
          [userId, sessionId],
        );
    });
    throw invalidRefresh();
  }

  return {
    /** Always succeeds from the caller's view: a taken email must be indistinguishable from a new one. */
    async register(input: { email: string; password: string; locale: string }): Promise<void> {
      const passwordHash = await hashPassword(input.password);
      await withSystemContext(pool, async (tx) => {
        const inserted = await tx.query<{ id: string }>(
          'INSERT INTO identity.users (email, password_hash, locale) VALUES ($1, $2, $3) ON CONFLICT (email) DO NOTHING RETURNING id',
          [normalizeEmail(input.email), passwordHash, input.locale],
        );
        const userId = inserted.rows[0]?.id;
        if (!userId) return;
        await enqueueEvent(tx, identitySchema.schemaName, {
          aggregateType: 'user',
          aggregateId: userId,
          eventType: 'user.registered.v1',
          payload: { userId, locale: input.locale },
        });
      });
    },

    async login(input: { email: string; password: string }): Promise<AuthPayload> {
      const found = await pool.query<{ id: string; password_hash: string; status: string; session_version: number }>(
        'SELECT id, password_hash, status, session_version FROM identity.users WHERE email = $1',
        [normalizeEmail(input.email)],
      );
      const user = found.rows[0];
      const passwordOk = await verifyPassword(input.password, user?.password_hash ?? DUMMY_HASH);
      if (!user || !passwordOk || user.status !== 'active') throw invalidCredentials();
      const { sessionId, refreshToken } = await withSystemContext(pool, async (tx) => {
        const session = await tx.query<{ id: string }>(
          'INSERT INTO identity.sessions (user_id, expires_at) VALUES ($1, now() + make_interval(secs => $2)) RETURNING id',
          [user.id, refreshTtlSeconds],
        );
        const id = session.rows[0]!.id;
        return { sessionId: id, refreshToken: await newRefreshToken(tx, id) };
      });
      const accessToken = await tokens.signAccess({ sub: user.id, sid: sessionId, ver: user.session_version, perms: [], amr: ['pwd'] });
      return { accessToken, refreshToken };
    },

    async refresh(
      input: { refreshToken: string; companyId?: string | undefined },
      forwardHeaders: Record<string, string> = {},
    ): Promise<AuthPayload> {
      const hash = hashToken(input.refreshToken);
      const found = await pool.query<{ session_id: string; user_id: string; used_at: Date | null; recently_used: boolean | null; session_version: number }>(
        `SELECT s.id AS session_id, s.user_id, rt.used_at, (rt.used_at > now() - make_interval(secs => $2)) AS recently_used, u.session_version
         FROM identity.refresh_tokens rt
         JOIN identity.sessions s ON s.id = rt.session_id
         JOIN identity.users u ON u.id = s.user_id
         WHERE rt.token_hash = $1 AND s.revoked_at IS NULL AND s.expires_at > now() AND u.status = 'active'`,
        [hash, REUSE_GRACE_SECONDS],
      );
      const ctx = found.rows[0];
      if (!ctx) throw invalidRefresh();
      // A just-rotated token is a lost race (or a retry), not theft: refuse without revoking.
      if (ctx.used_at) return ctx.recently_used ? Promise.reject(invalidRefresh()) : revokeForReuse(ctx.session_id, ctx.user_id);

      // Checked BEFORE rotating so a refused company switch does not burn the caller's refresh token.
      const membership = input.companyId ? await company.membership(input.companyId, ctx.user_id, forwardHeaders) : undefined;
      if (input.companyId && membership?.status !== 'active')
        throw new AuthorizationError('You are not an active member of this company.', { code: 'NOT_A_MEMBER' });

      const refreshToken = await withSystemContext(pool, async (tx) => {
        const rotated = await tx.query(
          `UPDATE identity.refresh_tokens rt SET used_at = now() FROM identity.sessions s
           WHERE rt.token_hash = $1 AND rt.used_at IS NULL AND s.id = rt.session_id AND s.revoked_at IS NULL AND s.expires_at > now()
           RETURNING rt.session_id`,
          [hash],
        );
        return rotated.rowCount ? newRefreshToken(tx, ctx.session_id) : undefined;
      });
      // 0 rows here = a concurrent refresh won the race: refuse, but do NOT revoke (the winner's new token must work).
      if (!refreshToken) throw invalidRefresh();

      const accessToken = await tokens.signAccess({
        sub: ctx.user_id,
        sid: ctx.session_id,
        ver: ctx.session_version,
        perms: membership?.permissions ?? [],
        amr: ['pwd'],
        ...(membership ? { cid: membership.companyId } : {}),
      });
      return { accessToken, refreshToken };
    },

    async logout(input: { refreshToken: string }): Promise<void> {
      await pool.query(
        'UPDATE identity.sessions SET revoked_at = now() WHERE revoked_at IS NULL AND id = (SELECT session_id FROM identity.refresh_tokens WHERE token_hash = $1)',
        [hashToken(input.refreshToken)],
      );
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;
