import { sql } from 'drizzle-orm';
import { bigint, char, check, index, integer, pgTable, text, unique, uuid } from 'drizzle-orm/pg-core';
import { createdAt, enumText, fk, fkOpt, oneOf, pk, tenantFk, tstz } from './_helpers.ts';
import { companies } from './companies.ts';
import { users } from './identity.ts';

/**
 * File metadata only. Binaries live in private object storage; this schema never stores
 * public URLs. Delivery = authorize via RLS, then mint a short-lived signed URL.
 */

export const STORAGE_PROVIDERS = ['s3', 'gcs', 'azure', 'local'] as const;
export const FILE_STATUS = ['pending_upload', 'available', 'quarantined', 'deleted'] as const;
export const SCAN_STATUS = ['pending', 'clean', 'infected', 'failed'] as const;
export const RETENTION_STATUS = ['active', 'legal_hold', 'scheduled_deletion', 'deleted'] as const;
export const MAX_FILE_BYTES = 524_288_000; // 500 MiB hard ceiling; per-type limits are enforced in the app layer

export const files = pgTable(
  'files',
  {
    id: pk(),
    companyId: fk(() => companies.id), // owning tenant
    uploadedByUserId: fk(() => users.id),
    storageProvider: enumText(STORAGE_PROVIDERS).notNull(),
    bucket: text().notNull(),
    storageKey: text().notNull(),
    originalFilename: text().notNull(),
    mimeType: text().notNull(),
    sizeBytes: bigint({ mode: 'number' }).notNull(),
    sha256: char({ length: 64 }).notNull(),
    /** 'public' still means "signed-URL delivery, no permanent public URL" (e.g. product images). */
    accessLevel: enumText(['private', 'public'] as const)
      .notNull()
      .default('private'),
    status: enumText(FILE_STATUS).notNull().default('pending_upload'),
    scanStatus: enumText(SCAN_STATUS).notNull().default('pending'),
    /** Informational association; real access derives from the owning join tables + grants. */
    resourceType: text(),
    resourceId: uuid(),
    retentionStatus: enumText(RETENTION_STATUS).notNull().default('active'),
    retainUntil: tstz(),
    createdAt: createdAt(),
    deletedAt: tstz(),
  },
  (t) => [
    unique('ux_files_id_company').on(t.id, t.companyId),
    unique('ux_files_storage_object').on(t.storageProvider, t.bucket, t.storageKey),
    check('files_size_chk', sql`${t.sizeBytes} > 0 and ${t.sizeBytes} <= ${sql.raw(String(MAX_FILE_BYTES))}`),
    check('files_sha256_chk', sql`${t.sha256} ~ '^[0-9a-f]{64}$'`),
    check('files_mime_chk', sql`${t.mimeType} ~ '^[a-z0-9.+-]+/[a-z0-9.+-]+$'`),
    check(
      'files_filename_chk',
      sql`${t.originalFilename} !~ '[/\\\\]' and length(${t.originalFilename}) between 1 and 255`,
    ),
    check('files_status_chk', oneOf(t.status, FILE_STATUS)),
    check('files_scan_chk', oneOf(t.scanStatus, SCAN_STATUS)),
    check('files_retention_chk', oneOf(t.retentionStatus, RETENTION_STATUS)),
    check('files_access_chk', oneOf(t.accessLevel, ['private', 'public'])),
    // Nothing is shared or public until a malware scan came back clean.
    check('files_public_clean_chk', sql`${t.accessLevel} = 'private' or ${t.scanStatus} = 'clean'`),
    check('files_available_clean_chk', sql`${t.status} <> 'available' or ${t.scanStatus} = 'clean'`),
    index('ix_files_company_created').on(t.companyId, t.createdAt.desc().nullsFirst()),
    index('ix_files_resource').on(t.resourceType, t.resourceId),
    index('ix_files_scan_pending')
      .on(t.createdAt)
      .where(sql`${t.scanStatus} = 'pending'`),
  ],
);

export const fileVersions = pgTable(
  'file_versions',
  {
    id: pk(),
    fileId: uuid().notNull(),
    companyId: uuid().notNull(),
    versionNo: integer().notNull(),
    storageKey: text().notNull(),
    sizeBytes: bigint({ mode: 'number' }).notNull(),
    sha256: char({ length: 64 }).notNull(),
    uploadedByUserId: fk(() => users.id),
    scanStatus: enumText(SCAN_STATUS).notNull().default('pending'),
    createdAt: createdAt(),
  },
  (t) => [
    tenantFk('file_versions_file_tenant_fk', [t.fileId, t.companyId], () => [files.id, files.companyId]),
    unique('ux_file_versions_file_no').on(t.fileId, t.versionNo),
    check('file_versions_no_chk', sql`${t.versionNo} >= 1`),
    check('file_versions_sha256_chk', sql`${t.sha256} ~ '^[0-9a-f]{64}$'`),
  ],
);

export const fileAccessGrants = pgTable(
  'file_access_grants',
  {
    id: pk(),
    fileId: uuid().notNull(),
    companyId: uuid().notNull(), // granting (owning) company
    granteeCompanyId: fkOpt(() => companies.id, 'cascade'),
    granteeUserId: fkOpt(() => users.id, 'cascade'),
    reason: text(), // e.g. 'rfq_invited_supplier'
    grantedByUserId: fk(() => users.id),
    expiresAt: tstz(),
    revokedAt: tstz(),
    createdAt: createdAt(),
  },
  (t) => [
    tenantFk('file_access_grants_file_tenant_fk', [t.fileId, t.companyId], () => [files.id, files.companyId]),
    check(
      'file_access_grants_one_grantee_chk',
      sql`(${t.granteeCompanyId} is not null)::int + (${t.granteeUserId} is not null)::int = 1`,
    ),
    index('ix_file_access_grants_file')
      .on(t.fileId)
      .where(sql`${t.revokedAt} is null`),
    index('ix_file_access_grants_company_grantee')
      .on(t.granteeCompanyId)
      .where(sql`${t.revokedAt} is null`),
    index('ix_file_access_grants_user_grantee')
      .on(t.granteeUserId)
      .where(sql`${t.revokedAt} is null`),
  ],
);

export const fileScanResults = pgTable(
  'file_scan_results',
  {
    id: pk(),
    fileId: uuid().notNull(),
    companyId: uuid().notNull(),
    scanner: text().notNull(),
    scannerVersion: text(),
    result: enumText(['clean', 'infected', 'error'] as const).notNull(),
    signature: text(),
    scannedAt: tstz().notNull().defaultNow(),
  },
  (t) => [
    tenantFk('file_scan_results_file_tenant_fk', [t.fileId, t.companyId], () => [files.id, files.companyId]),
    check('file_scan_results_result_chk', oneOf(t.result, ['clean', 'infected', 'error'])),
    index('ix_file_scan_results_file').on(t.fileId, t.scannedAt.desc().nullsFirst()),
  ],
);

export const COMPANY_DOCUMENT_TYPES = [
  'logo',
  'business_license',
  'certificate_of_incorporation',
  'tax_certificate',
  'export_license',
  'catalog',
  'brochure',
  'other',
] as const;
export const companyDocuments = pgTable(
  'company_documents',
  {
    id: pk(),
    companyId: uuid().notNull(),
    fileId: uuid().notNull(),
    documentType: enumText(COMPANY_DOCUMENT_TYPES).notNull(),
    title: text().notNull(),
    /** private = owner only, verifiers = owner + platform verifiers, public = other companies */
    visibility: enumText(['private', 'verifiers', 'public'] as const)
      .notNull()
      .default('private'),
    expiresAt: tstz(),
    createdByUserId: fk(() => users.id),
    createdAt: createdAt(),
  },
  (t) => [
    tenantFk('company_documents_file_tenant_fk', [t.fileId, t.companyId], () => [files.id, files.companyId]),
    unique('ux_company_documents_file').on(t.fileId),
    check('company_documents_type_chk', oneOf(t.documentType, COMPANY_DOCUMENT_TYPES)),
    check('company_documents_visibility_chk', oneOf(t.visibility, ['private', 'verifiers', 'public'])),
    index('ix_company_documents_company').on(t.companyId, t.documentType),
  ],
);
