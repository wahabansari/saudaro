import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  text,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { bytea, createdAt, enumText, fk, fkOpt, oneOf, pk, stamps, tenantFk, tstz } from './_helpers.ts';
import { companies } from './companies.ts';
import { files } from './documents.ts';
import { users } from './identity.ts';
import { countries } from './reference.ts';

/**
 * Business verification & compliance. A verification level is NEVER implied: the only source of
 * truth is a company_verification_levels row granted from an approved case. Verification does not
 * assert solvency, product quality or delivery performance. Writes to cases' decision fields,
 * checks, flags and screening are platform-admin only (enforced in RLS).
 */

export const VERIFICATION_LEVELS = [
  'email',
  'phone',
  'business_registration',
  'business_address',
  'authorized_representative',
  'documents_reviewed',
  'independent_check',
] as const;
export const CASE_STATUS = [
  'draft',
  'submitted',
  'in_review',
  'needs_info',
  'approved',
  'rejected',
  'expired',
  'revoked',
] as const;
export const OPEN_CASE_STATUSES = ['draft', 'submitted', 'in_review', 'needs_info'] as const;

export const verificationProviders = pgTable(
  'verification_providers',
  {
    id: pk(),
    key: text().notNull().unique(),
    name: text().notNull(),
    providerType: enumText(['manual', 'third_party'] as const).notNull(),
    isActive: boolean().notNull().default(true),
    ...stamps(),
  },
  (t) => [check('verification_providers_type_chk', oneOf(t.providerType, ['manual', 'third_party']))],
);

export const verificationCases = pgTable(
  'verification_cases',
  {
    id: pk(),
    companyId: fk(() => companies.id),
    level: enumText(VERIFICATION_LEVELS).notNull(),
    status: enumText(CASE_STATUS).notNull().default('draft'),
    submittedByUserId: fk(() => users.id),
    assignedAdminUserId: fkOpt(() => users.id),
    submittedAt: tstz(),
    decidedAt: tstz(),
    decidedByUserId: fkOpt(() => users.id),
    decisionReason: text(),
    expiresAt: tstz(),
    version: integer().notNull().default(1),
    ...stamps(),
  },
  (t) => [
    unique('ux_verification_cases_id_company').on(t.id, t.companyId),
    check('verification_cases_level_chk', oneOf(t.level, VERIFICATION_LEVELS)),
    check('verification_cases_status_chk', oneOf(t.status, CASE_STATUS)),
    check(
      'verification_cases_decision_chk',
      sql`${t.status} not in ('approved','rejected') or (${t.decidedAt} is not null and ${t.decidedByUserId} is not null)`,
    ),
    // At most one open case per company and level.
    uniqueIndex('ux_verification_cases_open')
      .on(t.companyId, t.level)
      .where(sql`${t.status} in ('draft','submitted','in_review','needs_info')`),
    index('ix_verification_cases_company').on(t.companyId, t.status),
    index('ix_verification_cases_queue')
      .on(t.status, t.submittedAt)
      .where(sql`${t.status} in ('submitted','in_review')`),
  ],
);

export const verificationDocuments = pgTable(
  'verification_documents',
  {
    id: pk(),
    caseId: uuid().notNull(),
    companyId: uuid().notNull(),
    fileId: uuid().notNull(),
    documentType: text().notNull(),
    issuerCountryId: fkOpt(() => countries.id),
    issuedAt: tstz(),
    expiresAt: tstz(),
    reviewStatus: enumText(['pending', 'accepted', 'rejected'] as const)
      .notNull()
      .default('pending'),
    reviewedByUserId: fkOpt(() => users.id),
    reviewedAt: tstz(),
    reviewNote: text(),
    createdAt: createdAt(),
  },
  (t) => [
    tenantFk('verification_documents_case_tenant_fk', [t.caseId, t.companyId], () => [
      verificationCases.id,
      verificationCases.companyId,
    ]),
    tenantFk(
      'verification_documents_file_tenant_fk',
      [t.fileId, t.companyId],
      () => [files.id, files.companyId],
      'restrict',
    ),
    check('verification_documents_review_chk', oneOf(t.reviewStatus, ['pending', 'accepted', 'rejected'])),
    index('ix_verification_documents_case').on(t.caseId),
    index('ix_verification_documents_expiry')
      .on(t.expiresAt)
      .where(sql`${t.expiresAt} is not null`),
  ],
);

export const verificationChecks = pgTable(
  'verification_checks',
  {
    id: pk(),
    caseId: uuid().notNull(),
    companyId: uuid().notNull(),
    checkType: text().notNull(),
    providerId: fkOpt(() => verificationProviders.id),
    result: enumText(['pending', 'pass', 'fail', 'inconclusive'] as const)
      .notNull()
      .default('pending'),
    externalReference: text(),
    /** Provider payloads can contain PII: encrypted at the application layer, key held outside the DB. */
    detailsCiphertext: bytea(),
    encryptionKeyId: text(),
    performedByUserId: fkOpt(() => users.id),
    checkedAt: tstz(),
    createdAt: createdAt(),
  },
  (t) => [
    tenantFk('verification_checks_case_tenant_fk', [t.caseId, t.companyId], () => [
      verificationCases.id,
      verificationCases.companyId,
    ]),
    check('verification_checks_result_chk', oneOf(t.result, ['pending', 'pass', 'fail', 'inconclusive'])),
    index('ix_verification_checks_case').on(t.caseId),
  ],
);

/** Append-only. */
export const verificationStatusHistory = pgTable(
  'verification_status_history',
  {
    id: pk(),
    caseId: uuid().notNull(),
    companyId: uuid().notNull(),
    fromStatus: enumText(CASE_STATUS),
    toStatus: enumText(CASE_STATUS).notNull(),
    actorType: enumText(['user', 'admin', 'system', 'provider'] as const).notNull(),
    actorUserId: fkOpt(() => users.id),
    reason: text(),
    createdAt: createdAt(),
  },
  (t) => [
    tenantFk('verification_status_history_case_tenant_fk', [t.caseId, t.companyId], () => [
      verificationCases.id,
      verificationCases.companyId,
    ]),
    check(
      'verification_status_history_actor_chk',
      oneOf(t.actorType, ['user', 'admin', 'system', 'provider']),
    ),
    index('ix_verification_status_history_case').on(t.caseId, t.createdAt.desc().nullsFirst()),
  ],
);

export const LEVEL_STATUS = ['verified', 'expired', 'revoked'] as const;
/** The ONLY source of truth for "what is this company verified for". */
export const companyVerificationLevels = pgTable(
  'company_verification_levels',
  {
    id: pk(),
    companyId: fk(() => companies.id),
    level: enumText(VERIFICATION_LEVELS).notNull(),
    status: enumText(LEVEL_STATUS).notNull().default('verified'),
    grantedCaseId: uuid(),
    grantedAt: tstz().notNull().defaultNow(),
    expiresAt: tstz(),
    revokedAt: tstz(),
    revokedReason: text(),
    ...stamps(),
  },
  (t) => [
    unique('ux_company_verification_levels').on(t.companyId, t.level),
    tenantFk(
      'company_verification_levels_case_tenant_fk',
      [t.grantedCaseId, t.companyId],
      () => [verificationCases.id, verificationCases.companyId],
      'restrict',
    ),
    check('company_verification_levels_level_chk', oneOf(t.level, VERIFICATION_LEVELS)),
    check('company_verification_levels_status_chk', oneOf(t.status, LEVEL_STATUS)),
    check(
      'company_verification_levels_revoked_chk',
      sql`(${t.status} = 'revoked') = (${t.revokedAt} is not null)`,
    ),
    index('ix_company_verification_levels_company').on(t.companyId, t.status),
  ],
);

export const complianceFlags = pgTable(
  'compliance_flags',
  {
    id: pk(),
    companyId: fk(() => companies.id),
    flagType: text().notNull(),
    severity: enumText(['low', 'medium', 'high', 'critical'] as const).notNull(),
    status: enumText(['open', 'under_review', 'resolved', 'dismissed'] as const)
      .notNull()
      .default('open'),
    raisedByUserId: fkOpt(() => users.id),
    notes: text(),
    resolvedAt: tstz(),
    ...stamps(),
  },
  (t) => [
    check('compliance_flags_severity_chk', oneOf(t.severity, ['low', 'medium', 'high', 'critical'])),
    check('compliance_flags_status_chk', oneOf(t.status, ['open', 'under_review', 'resolved', 'dismissed'])),
    index('ix_compliance_flags_company_status').on(t.companyId, t.status),
  ],
);

/** Only populated if a licensed screening provider is contracted; admin-only. */
export const sanctionsScreeningRecords = pgTable(
  'sanctions_screening_records',
  {
    id: pk(),
    companyId: fk(() => companies.id),
    providerId: fkOpt(() => verificationProviders.id),
    result: enumText(['clear', 'potential_match', 'confirmed_match', 'error'] as const).notNull(),
    referenceNo: text(),
    reviewedByUserId: fkOpt(() => users.id),
    screenedAt: tstz().notNull().defaultNow(),
    nextScreeningDueAt: tstz(),
  },
  (t) => [
    check(
      'sanctions_screening_result_chk',
      oneOf(t.result, ['clear', 'potential_match', 'confirmed_match', 'error']),
    ),
    index('ix_sanctions_screening_company').on(t.companyId, t.screenedAt.desc().nullsFirst()),
  ],
);

export const verificationExpiryRecords = pgTable(
  'verification_expiry_records',
  {
    id: pk(),
    companyId: fk(() => companies.id),
    caseId: uuid(),
    verificationDocumentId: fkOpt(() => verificationDocuments.id, 'set null'),
    expiresAt: tstz().notNull(),
    status: enumText(['upcoming', 'notified', 'expired', 'renewed'] as const)
      .notNull()
      .default('upcoming'),
    notifiedAt: tstz(),
    createdAt: createdAt(),
  },
  (t) => [
    check(
      'verification_expiry_records_status_chk',
      oneOf(t.status, ['upcoming', 'notified', 'expired', 'renewed']),
    ),
    index('ix_verification_expiry_due')
      .on(t.expiresAt)
      .where(sql`${t.status} in ('upcoming','notified')`),
    index('ix_verification_expiry_company').on(t.companyId),
  ],
);
