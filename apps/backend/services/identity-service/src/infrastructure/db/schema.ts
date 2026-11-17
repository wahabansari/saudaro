import { sql } from 'drizzle-orm';
import { check, index, integer, pgSchema, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

/**
 * The `identity` schema — owned EXCLUSIVELY by this service. The common messaging tables (outbox_events,
 * inbox_events, audit_log) come from migration `0000_common_tables.sql`; the tables below are global identity
 * data (no RLS): `users.email` is stored already normalised (NFKC, lower-case, trimmed).
 */
export const identitySchema = pgSchema('identity');

export const users = identitySchema.table(
  'users',
  {
    id: uuid().primaryKey().defaultRandom(),
    email: text().notNull(),
    passwordHash: text().notNull(),
    locale: text(),
    status: text().notNull().default('active'),
    sessionVersion: integer().notNull().default(1),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('ux_users_email').on(t.email), check('ck_users_status', sql`${t.status} in ('active', 'disabled')`)],
);

export const sessions = identitySchema.table(
  'sessions',
  {
  id: uuid().primaryKey().defaultRandom(),
  userId: uuid()
    .notNull()
    .references(() => users.id),
  revokedAt: timestamp({ withTimezone: true }),
  expiresAt: timestamp({ withTimezone: true }).notNull(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('ix_sessions_user_id').on(t.userId)],
);

/** Only the SHA-256 of the opaque refresh token is stored. `used_at` set = already rotated. */
export const refreshTokens = identitySchema.table(
  'refresh_tokens',
  {
  tokenHash: text().primaryKey(),
  sessionId: uuid()
    .notNull()
    .references(() => sessions.id),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  usedAt: timestamp({ withTimezone: true }),
  },
  (t) => [index('ix_refresh_tokens_session_id').on(t.sessionId)],
);
