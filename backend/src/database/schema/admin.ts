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
import { createdAt, enumText, fk, fkOpt, oneOf, pk, stamps, tstz } from './_helpers.ts';
import { companies } from './companies.ts';
import { users } from './identity.ts';

/**
 * Administration, audit, moderation, platform settings, outbox, idempotency.
 * Audit / security / action logs are APPEND-ONLY: the application roles have INSERT+SELECT only
 * and a trigger rejects UPDATE/DELETE even for the table owner.
 */

export const ADMIN_ROLES = [
  'super_admin',
  'verification_officer',
  'moderator',
  'support',
  'compliance_officer',
  'readonly_auditor',
] as const;
export const adminRoleAssignments = pgTable(
  'admin_role_assignments',
  {
    id: pk(),
    userId: fk(() => users.id),
    adminRole: enumText(ADMIN_ROLES).notNull(),
    grantedByUserId: fkOpt(() => users.id),
    grantedAt: createdAt(),
    revokedAt: tstz(),
  },
  (t) => [
    check('admin_role_assignments_role_chk', oneOf(t.adminRole, ADMIN_ROLES)),
    uniqueIndex('ux_admin_role_assignments_active')
      .on(t.userId, t.adminRole)
      .where(sql`${t.revokedAt} is null`),
    index('ix_admin_role_assignments_user')
      .on(t.userId)
      .where(sql`${t.revokedAt} is null`),
  ],
);

export const adminActions = pgTable(
  'admin_actions',
  {
    id: pk(),
    adminUserId: fk(() => users.id),
    action: text().notNull(),
    targetType: text().notNull(),
    targetId: uuid(),
    reason: text().notNull(), // admins must always state a reason
    requestId: text(),
    createdAt: createdAt(),
  },
  (t) => [
    index('ix_admin_actions_admin').on(t.adminUserId, t.createdAt.desc().nullsFirst()),
    index('ix_admin_actions_target').on(t.targetType, t.targetId),
  ],
);

export const ACTOR_TYPES = ['user', 'admin', 'system', 'worker', 'provider'] as const;
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: pk(),
    actorType: enumText(ACTOR_TYPES).notNull(),
    actorUserId: fkOpt(() => users.id),
    companyId: fkOpt(() => companies.id), // company context
    action: text().notNull(),
    resourceType: text().notNull(),
    resourceId: uuid(),
    requestId: text(), // correlation id
    ipAddress: inet(),
    userAgent: text(),
    /** Redacted before/after of safe fields only. Never credentials, tokens, secrets, or document contents. */
    changes: jsonb().$type<{ before?: Record<string, unknown>; after?: Record<string, unknown> }>(),
    createdAt: createdAt(),
  },
  (t) => [
    check('audit_logs_actor_type_chk', oneOf(t.actorType, ACTOR_TYPES)),
    index('ix_audit_logs_company_time').on(t.companyId, t.createdAt.desc().nullsFirst()),
    index('ix_audit_logs_resource').on(t.resourceType, t.resourceId, t.createdAt.desc().nullsFirst()),
    index('ix_audit_logs_actor').on(t.actorUserId, t.createdAt.desc().nullsFirst()),
    index('ix_audit_logs_request').on(t.requestId),
  ],
);

export const securityEvents = pgTable(
  'security_events',
  {
    id: pk(),
    eventType: text().notNull(), // rls_denied, privilege_escalation_attempt, brute_force_suspected, ...
    severity: enumText(['info', 'warning', 'critical'] as const)
      .notNull()
      .default('info'),
    userId: fkOpt(() => users.id),
    companyId: fkOpt(() => companies.id),
    ipAddress: inet(),
    requestId: text(),
    detail: jsonb().$type<Record<string, string | number | boolean | null>>(),
    createdAt: createdAt(),
  },
  (t) => [
    check('security_events_severity_chk', oneOf(t.severity, ['info', 'warning', 'critical'])),
    index('ix_security_events_time').on(t.createdAt.desc().nullsFirst()),
    index('ix_security_events_severity')
      .on(t.severity, t.createdAt.desc().nullsFirst())
      .where(sql`${t.severity} <> 'info'`),
  ],
);

export const MODERATION_STATUS = ['open', 'in_review', 'actioned', 'dismissed'] as const;
export const moderationCases = pgTable(
  'moderation_cases',
  {
    id: pk(),
    subjectType: enumText(['message', 'review', 'product', 'rfq', 'company', 'file'] as const).notNull(),
    subjectId: uuid().notNull(),
    status: enumText(MODERATION_STATUS).notNull().default('open'),
    assignedAdminUserId: fkOpt(() => users.id),
    summary: text(),
    resolvedAt: tstz(),
    ...stamps(),
  },
  (t) => [
    check(
      'moderation_cases_subject_chk',
      oneOf(t.subjectType, ['message', 'review', 'product', 'rfq', 'company', 'file']),
    ),
    check('moderation_cases_status_chk', oneOf(t.status, MODERATION_STATUS)),
    index('ix_moderation_cases_queue')
      .on(t.status, t.createdAt)
      .where(sql`${t.status} in ('open','in_review')`),
    index('ix_moderation_cases_subject').on(t.subjectType, t.subjectId),
  ],
);

export const moderationActions = pgTable(
  'moderation_actions',
  {
    id: pk(),
    caseId: fk(() => moderationCases.id),
    adminUserId: fk(() => users.id),
    action: enumText([
      'warn',
      'hide_content',
      'remove_content',
      'suspend_company',
      'suspend_user',
      'dismiss',
      'restore',
    ] as const).notNull(),
    note: text().notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    check(
      'moderation_actions_action_chk',
      oneOf(t.action, [
        'warn',
        'hide_content',
        'remove_content',
        'suspend_company',
        'suspend_user',
        'dismiss',
        'restore',
      ]),
    ),
    index('ix_moderation_actions_case').on(t.caseId, t.createdAt.desc().nullsFirst()),
  ],
);

export const abuseReports = pgTable(
  'abuse_reports',
  {
    id: pk(),
    reporterUserId: fk(() => users.id),
    reporterCompanyId: fkOpt(() => companies.id),
    subjectType: enumText(['company', 'product', 'rfq', 'quotation', 'user', 'other'] as const).notNull(),
    subjectId: uuid(),
    reason: text().notNull(),
    details: text(),
    status: enumText(['open', 'reviewing', 'actioned', 'dismissed'] as const)
      .notNull()
      .default('open'),
    createdAt: createdAt(),
    resolvedAt: tstz(),
  },
  (t) => [
    check(
      'abuse_reports_subject_chk',
      oneOf(t.subjectType, ['company', 'product', 'rfq', 'quotation', 'user', 'other']),
    ),
    check('abuse_reports_status_chk', oneOf(t.status, ['open', 'reviewing', 'actioned', 'dismissed'])),
    index('ix_abuse_reports_queue')
      .on(t.status, t.createdAt)
      .where(sql`${t.status} in ('open','reviewing')`),
    index('ix_abuse_reports_reporter').on(t.reporterUserId),
  ],
);

/** Business rules/feature flags. Commission/fee/subscription policy is deliberately NOT modelled here (A-3). */
export const systemSettings = pgTable(
  'system_settings',
  {
    id: pk(),
    key: text().notNull().unique(),
    value: jsonb().notNull(),
    description: text(),
    isPublic: boolean().notNull().default(false),
    updatedByUserId: fkOpt(() => users.id),
    ...stamps(),
  },
  (t) => [check('system_settings_key_chk', sql`${t.key} ~ '^[a-z][a-z0-9_.]{1,100}$'`)],
);

/** Transactional outbox: written in the same transaction as the business change, published by the worker. */
export const outboxEvents = pgTable(
  'outbox_events',
  {
    id: pk(),
    companyId: fkOpt(() => companies.id),
    aggregateType: text().notNull(),
    aggregateId: uuid().notNull(),
    eventType: text().notNull(),
    payload: jsonb().$type<Record<string, string | number | boolean | null>>().notNull(),
    createdAt: createdAt(),
    publishedAt: tstz(),
    attempts: integer().notNull().default(0),
    lockedUntil: tstz(),
  },
  (t) => [
    check('outbox_events_attempts_chk', sql`${t.attempts} between 0 and 50`),
    index('ix_outbox_events_pending')
      .on(t.createdAt)
      .where(sql`${t.publishedAt} is null`),
    index('ix_outbox_events_aggregate').on(t.aggregateType, t.aggregateId),
  ],
);

/** Idempotency keys for retried, non-naturally-idempotent writes (e.g. accept quotation, create deal). */
export const idempotencyKeys = pgTable(
  'idempotency_keys',
  {
    id: pk(),
    userId: fk(() => users.id, 'cascade'),
    companyId: fkOpt(() => companies.id, 'cascade'),
    scope: text().notNull(),
    key: text().notNull(),
    requestHash: text().notNull(),
    responseStatus: integer(),
    resourceId: uuid(),
    createdAt: createdAt(),
    expiresAt: tstz().notNull(),
  },
  (t) => [
    unique('ux_idempotency_keys').on(t.userId, t.scope, t.key),
    index('ix_idempotency_keys_expiry').on(t.expiresAt),
  ],
);
