import { sql } from 'drizzle-orm';
import {
  check,
  foreignKey,
  index,
  pgTable,
  primaryKey,
  text,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { createdAt, enumText, fk, fkOpt, oneOf, pk, tenantFk, tstz } from './_helpers.ts';
import { companies, companyMemberships } from './companies.ts';
import { deals } from './deals.ts';
import { files } from './documents.ts';
import { users } from './identity.ts';
import { quotations } from './quotations.ts';
import { rfqs } from './rfq.ts';

/**
 * Conversations & messaging. Access is PARTICIPANT-based (user + company, who must hold an ACTIVE
 * membership of that company at read time), not merely company-based: only listed participants can
 * read. Message bodies are never indexed for search and never logged. Messages are append-only
 * (soft delete / moderation flags only).
 */

export const CONVERSATION_TYPES = ['direct', 'rfq', 'quotation', 'deal'] as const;
export const conversations = pgTable(
  'conversations',
  {
    id: pk(),
    conversationType: enumText(CONVERSATION_TYPES).notNull(),
    rfqId: fkOpt(() => rfqs.id),
    quotationId: fkOpt(() => quotations.id),
    dealId: fkOpt(() => deals.id),
    initiatorCompanyId: fk(() => companies.id),
    counterpartyCompanyId: fk(() => companies.id),
    createdByUserId: fk(() => users.id),
    subject: text(),
    status: enumText(['active', 'closed'] as const)
      .notNull()
      .default('active'),
    lastMessageAt: tstz(),
    createdAt: createdAt(),
  },
  (t) => [
    check('conversations_type_chk', oneOf(t.conversationType, CONVERSATION_TYPES)),
    check('conversations_status_chk', oneOf(t.status, ['active', 'closed'])),
    check('conversations_parties_chk', sql`${t.initiatorCompanyId} <> ${t.counterpartyCompanyId}`),
    // A conversation is linked to exactly the resource its type names.
    check(
      'conversations_link_chk',
      sql`(${t.conversationType} = 'direct' and ${t.rfqId} is null and ${t.quotationId} is null and ${t.dealId} is null)
        or (${t.conversationType} = 'rfq' and ${t.rfqId} is not null and ${t.quotationId} is null and ${t.dealId} is null)
        or (${t.conversationType} = 'quotation' and ${t.quotationId} is not null and ${t.dealId} is null)
        or (${t.conversationType} = 'deal' and ${t.dealId} is not null)`,
    ),
    uniqueIndex('ux_conversations_quotation')
      .on(t.quotationId)
      .where(sql`${t.conversationType} = 'quotation'`),
    uniqueIndex('ux_conversations_deal')
      .on(t.dealId)
      .where(sql`${t.conversationType} = 'deal'`),
    uniqueIndex('ux_conversations_rfq_pair')
      .on(t.rfqId, t.initiatorCompanyId, t.counterpartyCompanyId)
      .where(sql`${t.conversationType} = 'rfq'`),
    index('ix_conversations_initiator').on(t.initiatorCompanyId, t.lastMessageAt.desc().nullsFirst()),
    index('ix_conversations_counterparty').on(t.counterpartyCompanyId, t.lastMessageAt.desc().nullsFirst()),
  ],
);

export const PARTICIPANT_ROLES = ['buyer', 'supplier', 'observer'] as const;
export const conversationParticipants = pgTable(
  'conversation_participants',
  {
    id: pk(),
    conversationId: fk(() => conversations.id, 'cascade'),
    companyId: uuid().notNull(),
    userId: uuid().notNull(),
    participantRole: enumText(PARTICIPANT_ROLES).notNull(),
    joinedAt: createdAt(),
    leftAt: tstz(),
  },
  (t) => [
    // A participant must be a member of the company they speak for.
    foreignKey({
      name: 'conversation_participants_membership_fk',
      columns: [t.companyId, t.userId],
      foreignColumns: [companyMemberships.companyId, companyMemberships.userId],
    }),
    unique('ux_conversation_participants').on(t.conversationId, t.userId),
    check('conversation_participants_role_chk', oneOf(t.participantRole, PARTICIPANT_ROLES)),
    index('ix_conversation_participants_user')
      .on(t.userId, t.conversationId)
      .where(sql`${t.leftAt} is null`),
    index('ix_conversation_participants_company').on(t.companyId),
  ],
);

export const MESSAGE_KINDS = ['text', 'system', 'attachment'] as const;
export const messages = pgTable(
  'messages',
  {
    id: pk(),
    conversationId: fk(() => conversations.id, 'cascade'),
    senderUserId: fkOpt(() => users.id), // null for system messages
    senderCompanyId: fkOpt(() => companies.id),
    kind: enumText(MESSAGE_KINDS).notNull().default('text'),
    body: text(),
    replyToId: uuid(),
    moderationStatus: enumText(['visible', 'flagged', 'hidden'] as const)
      .notNull()
      .default('visible'),
    editedAt: tstz(),
    deletedAt: tstz(),
    createdAt: createdAt(),
  },
  (t) => [
    unique('ux_messages_id_conversation').on(t.id, t.conversationId),
    foreignKey({
      name: 'messages_reply_fk',
      columns: [t.replyToId, t.conversationId],
      foreignColumns: [t.id, t.conversationId],
    }),
    check('messages_kind_chk', oneOf(t.kind, MESSAGE_KINDS)),
    check('messages_moderation_chk', oneOf(t.moderationStatus, ['visible', 'flagged', 'hidden'])),
    check('messages_body_chk', sql`${t.body} is null or length(${t.body}) <= 10000`),
    check('messages_text_body_chk', sql`${t.kind} <> 'text' or ${t.body} is not null`),
    check(
      'messages_sender_chk',
      sql`${t.kind} = 'system' or (${t.senderUserId} is not null and ${t.senderCompanyId} is not null)`,
    ),
    // Efficient history retrieval + keyset pagination.
    index('ix_messages_conversation_feed').on(
      t.conversationId,
      t.createdAt.desc().nullsFirst(),
      t.id.desc().nullsFirst(),
    ),
  ],
);

export const messageAttachments = pgTable(
  'message_attachments',
  {
    id: pk(),
    messageId: fk(() => messages.id, 'cascade'),
    /** Sender's company: the attached file MUST belong to it (composite tenant FK below). */
    companyId: uuid().notNull(),
    fileId: uuid().notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    tenantFk(
      'message_attachments_file_fk',
      [t.fileId, t.companyId],
      () => [files.id, files.companyId],
      'restrict',
    ),
    unique('ux_message_attachments_file').on(t.fileId),
    index('ix_message_attachments_message').on(t.messageId),
  ],
);

export const messageReadReceipts = pgTable(
  'message_read_receipts',
  {
    messageId: fk(() => messages.id, 'cascade'),
    userId: fk(() => users.id, 'cascade'),
    readAt: createdAt(),
  },
  (t) => [
    primaryKey({ name: 'pk_message_read_receipts', columns: [t.messageId, t.userId] }),
    index('ix_message_read_receipts_user').on(t.userId, t.readAt.desc().nullsFirst()),
  ],
);

export const messageDeliveryEvents = pgTable(
  'message_delivery_events',
  {
    id: pk(),
    messageId: fk(() => messages.id, 'cascade'),
    recipientUserId: fk(() => users.id, 'cascade'),
    channel: enumText(['in_app', 'email', 'push'] as const).notNull(),
    status: enumText(['queued', 'delivered', 'failed'] as const).notNull(),
    occurredAt: createdAt(),
  },
  (t) => [
    check('message_delivery_events_channel_chk', oneOf(t.channel, ['in_app', 'email', 'push'])),
    check('message_delivery_events_status_chk', oneOf(t.status, ['queued', 'delivered', 'failed'])),
    index('ix_message_delivery_events_message').on(t.messageId),
  ],
);

export const conversationArchives = pgTable(
  'conversation_archives',
  {
    conversationId: fk(() => conversations.id, 'cascade'),
    userId: fk(() => users.id, 'cascade'),
    archivedAt: createdAt(),
  },
  (t) => [primaryKey({ name: 'pk_conversation_archives', columns: [t.conversationId, t.userId] })],
);

export const REPORT_REASONS = ['spam', 'harassment', 'fraud', 'inappropriate', 'other'] as const;
export const REPORT_STATUS = ['open', 'reviewing', 'actioned', 'dismissed'] as const;
export const messageReports = pgTable(
  'message_reports',
  {
    id: pk(),
    messageId: fk(() => messages.id, 'cascade'),
    reporterUserId: fk(() => users.id),
    reporterCompanyId: fk(() => companies.id),
    reason: enumText(REPORT_REASONS).notNull(),
    details: text(),
    status: enumText(REPORT_STATUS).notNull().default('open'),
    resolvedAt: tstz(),
    createdAt: createdAt(),
  },
  (t) => [
    unique('ux_message_reports').on(t.messageId, t.reporterUserId),
    check('message_reports_reason_chk', oneOf(t.reason, REPORT_REASONS)),
    check('message_reports_status_chk', oneOf(t.status, REPORT_STATUS)),
    index('ix_message_reports_queue')
      .on(t.status, t.createdAt)
      .where(sql`${t.status} in ('open','reviewing')`),
  ],
);
