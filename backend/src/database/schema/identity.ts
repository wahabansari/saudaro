import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  inet,
  integer,
  jsonb,
  pgTable,
  text,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { bytea, citext, createdAt, enumText, fk, oneOf, pk, stamps, tstz } from './_helpers.ts';

/**
 * Identity & authentication. Users are global (not tenant-owned): a user may belong to many
 * companies through company_memberships. Access is self-scoped by RLS (id = current user).
 * Authentication is delegated to an external identity provider by default; local password
 * material (argon2id hash) is optional and only for deployments that self-host credentials.
 */

export const USER_STATUS = [
  'pending',
  'active',
  'suspended',
  'deactivated',
  'deletion_requested',
  'deleted',
] as const;
export const users = pgTable(
  'users',
  {
    id: pk(),
    email: citext().notNull(),
    displayName: text().notNull(),
    status: enumText(USER_STATUS).notNull().default('pending'),
    locale: text().notNull().default('en'),
    timezone: text().notNull().default('UTC'),
    emailVerifiedAt: tstz(),
    phoneE164: text('phone_e164'),
    phoneVerifiedAt: tstz(),
    lastLoginAt: tstz(),
    suspendedAt: tstz(),
    suspensionReason: text(),
    deletionRequestedAt: tstz(),
    deletedAt: tstz(),
    version: integer().notNull().default(1),
    ...stamps(),
  },
  (t) => [
    uniqueIndex('ux_users_email').on(t.email),
    check('users_status_chk', oneOf(t.status, USER_STATUS)),
    check('users_phone_chk', sql`${t.phoneE164} is null or ${t.phoneE164} ~ '^\\+[1-9][0-9]{6,14}$'`),
    check('users_email_chk', sql`position('@' in ${t.email}) > 1`),
    index('ix_users_status').on(t.status),
  ],
);

export const AUTH_PROVIDERS = ['oidc', 'google', 'microsoft', 'apple', 'saml', 'local'] as const;
export const userAuthIdentities = pgTable(
  'user_auth_identities',
  {
    id: pk(),
    userId: fk(() => users.id, 'cascade'),
    provider: enumText(AUTH_PROVIDERS).notNull(),
    providerSubject: text().notNull(), // IdP "sub" claim; opaque, never an email
    emailAtProvider: citext(),
    // Only for provider = 'local'. argon2id PHC string. Never plaintext, never reversible.
    passwordHash: text(),
    passwordUpdatedAt: tstz(),
    lastUsedAt: tstz(),
    ...stamps(),
  },
  (t) => [
    unique('ux_user_auth_identities_provider_subject').on(t.provider, t.providerSubject),
    index('ix_user_auth_identities_user').on(t.userId),
    check(
      'user_auth_identities_local_pw_chk',
      sql`(${t.provider} = 'local') = (${t.passwordHash} is not null)`,
    ),
  ],
);

export const userSessions = pgTable(
  'user_sessions',
  {
    id: pk(),
    userId: fk(() => users.id, 'cascade'),
    tokenHash: text().notNull().unique(), // SHA-256 of the refresh/session token; raw token never stored
    familyId: uuid().notNull(), // refresh-token rotation family for reuse detection
    ipAddress: inet(),
    userAgent: text(),
    expiresAt: tstz().notNull(),
    revokedAt: tstz(),
    lastSeenAt: tstz(),
    createdAt: createdAt(),
  },
  (t) => [
    index('ix_user_sessions_user_active')
      .on(t.userId, t.expiresAt)
      .where(sql`${t.revokedAt} is null`),
    index('ix_user_sessions_family').on(t.familyId),
  ],
);

export const MFA_TYPES = ['totp', 'webauthn', 'sms', 'recovery_codes'] as const;
export const userMfaMethods = pgTable(
  'user_mfa_methods',
  {
    id: pk(),
    userId: fk(() => users.id, 'cascade'),
    methodType: enumText(MFA_TYPES).notNull(),
    label: text(),
    secretCiphertext: bytea(), // application-layer encrypted (AES-256-GCM); key lives in KMS, not in DB
    encryptionKeyId: text(),
    verifiedAt: tstz(),
    lastUsedAt: tstz(),
    disabledAt: tstz(),
    ...stamps(),
  },
  (t) => [
    check('user_mfa_methods_type_chk', oneOf(t.methodType, MFA_TYPES)),
    index('ix_user_mfa_methods_user').on(t.userId),
  ],
);

export const userSecurityEvents = pgTable(
  'user_security_events',
  {
    id: pk(),
    userId: fk(() => users.id, 'cascade'),
    eventType: text().notNull(), // login_succeeded, login_failed, password_changed, mfa_enabled, ...
    ipAddress: inet(),
    userAgent: text(),
    detail: jsonb().$type<Record<string, string | number | boolean | null>>(), // never credentials/tokens
    createdAt: createdAt(),
  },
  (t) => [index('ix_user_security_events_user_time').on(t.userId, t.createdAt.desc().nullsFirst())],
);

const tokenColumns = () => ({
  id: pk(),
  userId: fk(() => users.id, 'cascade'),
  tokenHash: text().notNull().unique(), // SHA-256 of the emailed/SMS token; raw token never stored
  expiresAt: tstz().notNull(),
  consumedAt: tstz(),
  createdAt: createdAt(),
});

export const passwordResetTokens = pgTable('password_reset_tokens', tokenColumns(), (t) => [
  index('ix_password_reset_tokens_user').on(t.userId),
  index('ix_password_reset_tokens_expiry')
    .on(t.expiresAt)
    .where(sql`${t.consumedAt} is null`),
]);

export const emailVerificationTokens = pgTable(
  'email_verification_tokens',
  { ...tokenColumns(), email: citext().notNull() },
  (t) => [index('ix_email_verification_tokens_user').on(t.userId)],
);

export const phoneVerificationTokens = pgTable(
  'phone_verification_tokens',
  { ...tokenColumns(), phoneE164: text('phone_e164').notNull(), attempts: integer().notNull().default(0) },
  (t) => [
    index('ix_phone_verification_tokens_user').on(t.userId),
    check('phone_verification_tokens_attempts_chk', sql`${t.attempts} between 0 and 10`),
  ],
);

export const userPreferences = pgTable('user_preferences', {
  userId: uuid()
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  languageCode: text().notNull().default('en'),
  dateFormat: text().notNull().default('YYYY-MM-DD'),
  marketingOptIn: boolean().notNull().default(false),
  ...stamps(),
});

export const NOTIFICATION_CATEGORIES = [
  'rfq',
  'quotation',
  'message',
  'deal',
  'verification',
  'invitation',
  'security',
  'system',
] as const;
export const NOTIFICATION_CHANNELS = ['in_app', 'email', 'push', 'sms'] as const;
/** Also serves as `notification_preferences` (merged: one preference model, per user). */
export const userNotificationPreferences = pgTable(
  'user_notification_preferences',
  {
    id: pk(),
    userId: fk(() => users.id, 'cascade'),
    category: enumText(NOTIFICATION_CATEGORIES).notNull(),
    channel: enumText(NOTIFICATION_CHANNELS).notNull(),
    enabled: boolean().notNull().default(true),
    ...stamps(),
  },
  (t) => [
    unique('ux_user_notification_preferences').on(t.userId, t.category, t.channel),
    check('user_notification_preferences_category_chk', oneOf(t.category, NOTIFICATION_CATEGORIES)),
    check('user_notification_preferences_channel_chk', oneOf(t.channel, NOTIFICATION_CHANNELS)),
    // Security alerts must never be switchable off for in-app delivery.
    check(
      'user_notification_preferences_security_chk',
      sql`not (${t.category} = 'security' and ${t.channel} = 'in_app' and ${t.enabled} = false)`,
    ),
  ],
);
