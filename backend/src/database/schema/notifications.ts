import { sql } from 'drizzle-orm';
import { boolean, check, index, integer, jsonb, pgTable, text, unique, uuid } from 'drizzle-orm/pg-core';
import { createdAt, enumText, fk, fkOpt, oneOf, pk, stamps, tstz } from './_helpers.ts';
import { companies } from './companies.ts';
import { NOTIFICATION_CATEGORIES, NOTIFICATION_CHANNELS, users } from './identity.ts';

/**
 * Notifications. In-app notifications are rows; email/push/SMS delivery is asynchronous via
 * notification_deliveries processed by the worker role. Notifications are CREATED BY THE WORKER
 * (from outbox events), never by one tenant for another, so a user cannot inject notifications
 * into another user's inbox. (Per-user notification preferences: user_notification_preferences.)
 */

export const notificationTemplates = pgTable(
  'notification_templates',
  {
    id: pk(),
    templateKey: text().notNull(),
    channel: enumText(NOTIFICATION_CHANNELS).notNull(),
    locale: text().notNull().default('en'),
    subjectTemplate: text(),
    bodyTemplate: text().notNull(),
    isActive: boolean().notNull().default(true),
    ...stamps(),
  },
  (t) => [
    unique('ux_notification_templates').on(t.templateKey, t.channel, t.locale),
    check('notification_templates_channel_chk', oneOf(t.channel, NOTIFICATION_CHANNELS)),
  ],
);

export const notifications = pgTable(
  'notifications',
  {
    id: pk(),
    recipientUserId: fk(() => users.id, 'cascade'),
    companyId: fkOpt(() => companies.id, 'set null'), // company context, if any
    category: enumText(NOTIFICATION_CATEGORIES).notNull(),
    notificationType: text().notNull(),
    title: text().notNull(),
    body: text(),
    resourceType: text(),
    resourceId: uuid(),
    /** Small, non-sensitive render hints only (ids, counters). Never message bodies or secrets. */
    payload: jsonb().$type<Record<string, string | number | boolean | null>>(),
    readAt: tstz(),
    createdAt: createdAt(),
  },
  (t) => [
    check('notifications_category_chk', oneOf(t.category, NOTIFICATION_CATEGORIES)),
    index('ix_notifications_inbox').on(t.recipientUserId, t.createdAt.desc(), t.id.desc()),
    index('ix_notifications_unread').on(t.recipientUserId, t.createdAt.desc()).where(sql`${t.readAt} is null`),
  ],
);

export const DELIVERY_STATUS = ['pending', 'processing', 'sent', 'failed', 'suppressed'] as const;
export const notificationDeliveries = pgTable(
  'notification_deliveries',
  {
    id: pk(),
    notificationId: fk(() => notifications.id, 'cascade'),
    channel: enumText(NOTIFICATION_CHANNELS).notNull(),
    status: enumText(DELIVERY_STATUS).notNull().default('pending'),
    attempts: integer().notNull().default(0),
    nextAttemptAt: tstz().notNull().defaultNow(),
    lastError: text(),
    providerMessageId: text(),
    sentAt: tstz(),
    createdAt: createdAt(),
  },
  (t) => [
    unique('ux_notification_deliveries').on(t.notificationId, t.channel),
    check('notification_deliveries_channel_chk', oneOf(t.channel, NOTIFICATION_CHANNELS)),
    check('notification_deliveries_status_chk', oneOf(t.status, DELIVERY_STATUS)),
    check('notification_deliveries_attempts_chk', sql`${t.attempts} between 0 and 20`),
    // Worker queue: FOR UPDATE SKIP LOCKED over due rows.
    index('ix_notification_deliveries_queue').on(t.nextAttemptAt).where(sql`${t.status} in ('pending','failed')`),
  ],
);

export const deviceTokens = pgTable(
  'device_tokens',
  {
    id: pk(),
    userId: fk(() => users.id, 'cascade'),
    platform: enumText(['ios', 'android', 'web'] as const).notNull(),
    token: text().notNull(), // push token; treat as a secret (log redaction), rotated by the client
    lastSeenAt: tstz(),
    revokedAt: tstz(),
    createdAt: createdAt(),
  },
  (t) => [
    unique('ux_device_tokens_token').on(t.token),
    check('device_tokens_platform_chk', oneOf(t.platform, ['ios', 'android', 'web'])),
    index('ix_device_tokens_user').on(t.userId).where(sql`${t.revokedAt} is null`),
  ],
);
