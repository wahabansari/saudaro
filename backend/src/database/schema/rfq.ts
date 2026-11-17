import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  index,
  integer,
  numeric,
  pgTable,
  primaryKey,
  smallint,
  text,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { createdAt, enumText, fk, fkOpt, oneOf, pk, stamps, tenantFk, tstz, tsvector } from './_helpers.ts';
import { productSpecificationDefinitions } from './catalog.ts';
import { companies } from './companies.ts';
import { files } from './documents.ts';
import { users } from './identity.ts';
import { VERIFICATION_LEVELS } from './verification.ts';
import { SELLER_TYPES } from './trade-profiles.ts';
import {
  certifications,
  countries,
  currencies,
  hsCodes,
  incoterms,
  packagingTypes,
  paymentTerms,
  ports,
  productCategories,
  shipmentModes,
  unitsOfMeasure,
} from './reference.ts';

/**
 * RFQ management. The buyer company owns an RFQ and all its children (company_id on every child,
 * composite FK to the RFQ). Suppliers never read these base tables directly: they see only the
 * restricted projection views (public_rfqs / public_rfq_items) defined in the RLS migration,
 * which hide target prices, creator identity, and internal rules.
 */

export const RFQ_STATUS = ['draft', 'published', 'paused', 'closed', 'expired', 'cancelled', 'awarded'] as const;
export const RFQ_VISIBILITY = ['public', 'private', 'invited'] as const;
export const rfqs = pgTable(
  'rfqs',
  {
    id: pk(),
    companyId: fk(() => companies.id), // buyer company
    createdByUserId: fk(() => users.id),
    referenceNo: text()
      .notNull()
      .default(sql`'RFQ-' || to_char(now() at time zone 'utc', 'YYYY') || '-' || lpad(nextval('rfq_reference_seq')::text, 8, '0')`),
    title: text().notNull(),
    description: text(),
    primaryCategoryId: fk(() => productCategories.id),
    status: enumText(RFQ_STATUS).notNull().default('draft'),
    visibility: enumText(RFQ_VISIBILITY).notNull().default('public'),
    currencyId: fkOpt(() => currencies.id),
    allowPartialQuotes: boolean().notNull().default(true),
    quoteDeadlineAt: tstz(),
    publishedAt: tstz(),
    expiresAt: tstz(),
    closedAt: tstz(),
    closeReason: text(),
    version: integer().notNull().default(1),
    searchVector: tsvector().generatedAlwaysAs(
      sql`setweight(to_tsvector('simple'::regconfig, coalesce(title, '')), 'A') || setweight(to_tsvector('simple'::regconfig, coalesce(description, '')), 'C')`,
    ),
    ...stamps(),
  },
  (t) => [
    unique('ux_rfqs_id_company').on(t.id, t.companyId),
    uniqueIndex('ux_rfqs_reference_no').on(t.referenceNo),
    check('rfqs_status_chk', oneOf(t.status, RFQ_STATUS)),
    check('rfqs_visibility_chk', oneOf(t.visibility, RFQ_VISIBILITY)),
    check(
      'rfqs_published_chk',
      sql`${t.status} = 'draft' or ${t.status} = 'cancelled' or (${t.publishedAt} is not null and ${t.expiresAt} is not null)`,
    ),
    check('rfqs_expiry_chk', sql`${t.expiresAt} is null or ${t.publishedAt} is null or ${t.expiresAt} > ${t.publishedAt}`),
    check('rfqs_closed_chk', sql`${t.status} not in ('closed','cancelled','expired','awarded') or ${t.closedAt} is not null`),
    index('ix_rfqs_company_status_created').on(t.companyId, t.status, t.createdAt.desc()),
    index('ix_rfqs_public_feed')
      .on(t.publishedAt.desc(), t.id)
      .where(sql`${t.status} = 'published' and ${t.visibility} = 'public'`),
    index('ix_rfqs_category_feed')
      .on(t.primaryCategoryId, t.publishedAt.desc())
      .where(sql`${t.status} = 'published'`),
    index('ix_rfqs_expiry').on(t.expiresAt).where(sql`${t.status} = 'published'`),
  ],
);

export const rfqItems = pgTable(
  'rfq_items',
  {
    id: pk(),
    rfqId: uuid().notNull(),
    companyId: uuid().notNull(),
    lineNo: smallint().notNull(),
    productName: text().notNull(),
    description: text(),
    categoryId: fkOpt(() => productCategories.id),
    hsCodeId: fkOpt(() => hsCodes.id),
    quantity: numeric({ precision: 20, scale: 6 }).notNull(),
    uomId: fk(() => unitsOfMeasure.id),
    /** PRIVATE to the buyer (not in public projection). */
    targetUnitPrice: numeric({ precision: 20, scale: 4 }),
    requiredDeliveryDate: date({ mode: 'string' }),
    ...stamps(),
  },
  (t) => [
    tenantFk('rfq_items_rfq_fk', [t.rfqId, t.companyId], () => [rfqs.id, rfqs.companyId]),
    unique('ux_rfq_items_id_company').on(t.id, t.companyId),
    unique('ux_rfq_items_rfq_line').on(t.rfqId, t.lineNo),
    check('rfq_items_qty_chk', sql`${t.quantity} > 0`),
    check('rfq_items_price_chk', sql`${t.targetUnitPrice} is null or ${t.targetUnitPrice} >= 0`),
    check('rfq_items_line_chk', sql`${t.lineNo} between 1 and 200`),
    index('ix_rfq_items_category').on(t.categoryId),
    index('ix_rfq_items_hs').on(t.hsCodeId),
  ],
);

export const rfqSpecifications = pgTable(
  'rfq_specifications',
  {
    id: pk(),
    rfqItemId: uuid().notNull(),
    companyId: uuid().notNull(),
    definitionId: fkOpt(() => productSpecificationDefinitions.id),
    customName: text(),
    valueText: text(),
    valueNumber: numeric({ precision: 24, scale: 8 }),
    valueBoolean: boolean(),
    valueMin: numeric({ precision: 24, scale: 8 }),
    valueMax: numeric({ precision: 24, scale: 8 }),
    uomId: fkOpt(() => unitsOfMeasure.id),
    isMandatory: boolean().notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [
    tenantFk('rfq_specifications_item_fk', [t.rfqItemId, t.companyId], () => [rfqItems.id, rfqItems.companyId]),
    check('rfq_specifications_named_chk', sql`${t.definitionId} is not null or ${t.customName} is not null`),
    check(
      'rfq_specifications_one_shape_chk',
      sql`(${t.valueText} is not null)::int + (${t.valueNumber} is not null)::int + (${t.valueBoolean} is not null)::int + (${t.valueMin} is not null or ${t.valueMax} is not null)::int = 1`,
    ),
    index('ix_rfq_specifications_item').on(t.rfqItemId),
    index('ix_rfq_specifications_definition').on(t.definitionId),
  ],
);

export const rfqDestinations = pgTable(
  'rfq_destinations',
  {
    id: pk(),
    rfqId: uuid().notNull(),
    companyId: uuid().notNull(),
    countryId: fk(() => countries.id),
    portId: fkOpt(() => ports.id),
    placeName: text(),
    incotermId: fkOpt(() => incoterms.id),
    incotermNamedPlace: text(),
    requiredByDate: date({ mode: 'string' }),
    createdAt: createdAt(),
  },
  (t) => [
    tenantFk('rfq_destinations_rfq_fk', [t.rfqId, t.companyId], () => [rfqs.id, rfqs.companyId]),
    check('rfq_destinations_named_place_chk', sql`${t.incotermId} is null or ${t.incotermNamedPlace} is not null or ${t.portId} is not null`),
    index('ix_rfq_destinations_rfq').on(t.rfqId),
    index('ix_rfq_destinations_country').on(t.countryId),
  ],
);

export const rfqTradeRequirements = pgTable(
  'rfq_trade_requirements',
  {
    rfqId: uuid().primaryKey(),
    companyId: uuid().notNull(),
    packagingTypeId: fkOpt(() => packagingTypes.id),
    packagingNotes: text(),
    shipmentModeId: fkOpt(() => shipmentModes.id),
    inspectionRequired: boolean().notNull().default(false),
    samplesRequired: boolean().notNull().default(false),
    notes: text(),
    ...stamps(),
  },
  (t) => [tenantFk('rfq_trade_requirements_rfq_fk', [t.rfqId, t.companyId], () => [rfqs.id, rfqs.companyId])],
);

export const rfqPaymentPreferences = pgTable(
  'rfq_payment_preferences',
  {
    rfqId: uuid().notNull(),
    companyId: uuid().notNull(),
    paymentTermId: fk(() => paymentTerms.id),
  },
  (t) => [
    primaryKey({ name: 'pk_rfq_payment_preferences', columns: [t.rfqId, t.paymentTermId] }),
    tenantFk('rfq_payment_preferences_rfq_fk', [t.rfqId, t.companyId], () => [rfqs.id, rfqs.companyId]),
  ],
);

export const ORIGIN_PREFERENCES = ['preferred', 'required', 'excluded'] as const;
export const rfqOriginPreferences = pgTable(
  'rfq_origin_preferences',
  {
    rfqId: uuid().notNull(),
    companyId: uuid().notNull(),
    countryId: fk(() => countries.id),
    preference: enumText(ORIGIN_PREFERENCES).notNull().default('preferred'),
  },
  (t) => [
    primaryKey({ name: 'pk_rfq_origin_preferences', columns: [t.rfqId, t.countryId] }),
    tenantFk('rfq_origin_preferences_rfq_fk', [t.rfqId, t.companyId], () => [rfqs.id, rfqs.companyId]),
    check('rfq_origin_preferences_chk', oneOf(t.preference, ORIGIN_PREFERENCES)),
  ],
);

export const TRADE_DOCUMENT_TYPES = [
  'commercial_invoice',
  'packing_list',
  'certificate_of_origin',
  'bill_of_lading',
  'phytosanitary_certificate',
  'fumigation_certificate',
  'health_certificate',
  'certificate_of_analysis',
  'msds',
  'insurance_certificate',
  'other',
] as const;
export const rfqRequiredDocuments = pgTable(
  'rfq_required_documents',
  {
    id: pk(),
    rfqId: uuid().notNull(),
    companyId: uuid().notNull(),
    documentType: enumText(TRADE_DOCUMENT_TYPES).notNull(),
  },
  (t) => [
    tenantFk('rfq_required_documents_rfq_fk', [t.rfqId, t.companyId], () => [rfqs.id, rfqs.companyId]),
    unique('ux_rfq_required_documents').on(t.rfqId, t.documentType),
    check('rfq_required_documents_type_chk', oneOf(t.documentType, TRADE_DOCUMENT_TYPES)),
  ],
);

export const rfqCertificationRequirements = pgTable(
  'rfq_certification_requirements',
  {
    id: pk(),
    rfqId: uuid().notNull(),
    companyId: uuid().notNull(),
    rfqItemId: uuid(),
    certificationId: fk(() => certifications.id),
    isMandatory: boolean().notNull().default(true),
  },
  (t) => [
    tenantFk('rfq_certification_requirements_rfq_fk', [t.rfqId, t.companyId], () => [rfqs.id, rfqs.companyId]),
    tenantFk('rfq_certification_requirements_item_fk', [t.rfqItemId, t.companyId], () => [rfqItems.id, rfqItems.companyId]),
    unique('ux_rfq_certification_requirements').on(t.rfqId, t.rfqItemId, t.certificationId).nullsNotDistinct(),
    index('ix_rfq_certification_requirements_cert').on(t.certificationId),
  ],
);

export const rfqAttachments = pgTable(
  'rfq_attachments',
  {
    id: pk(),
    rfqId: uuid().notNull(),
    companyId: uuid().notNull(),
    fileId: uuid().notNull(),
    title: text().notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    tenantFk('rfq_attachments_rfq_fk', [t.rfqId, t.companyId], () => [rfqs.id, rfqs.companyId]),
    tenantFk('rfq_attachments_file_fk', [t.fileId, t.companyId], () => [files.id, files.companyId], 'restrict'),
    unique('ux_rfq_attachments_file').on(t.fileId),
    index('ix_rfq_attachments_rfq').on(t.rfqId),
  ],
);

export const RFQ_RULE_TYPES = ['allow_country', 'block_country', 'min_verification', 'seller_type'] as const;
export const rfqVisibilityRules = pgTable(
  'rfq_visibility_rules',
  {
    id: pk(),
    rfqId: uuid().notNull(),
    companyId: uuid().notNull(),
    ruleType: enumText(RFQ_RULE_TYPES).notNull(),
    countryId: fkOpt(() => countries.id),
    verificationLevel: enumText(VERIFICATION_LEVELS),
    sellerType: enumText(SELLER_TYPES),
  },
  (t) => [
    tenantFk('rfq_visibility_rules_rfq_fk', [t.rfqId, t.companyId], () => [rfqs.id, rfqs.companyId]),
    check('rfq_visibility_rules_type_chk', oneOf(t.ruleType, RFQ_RULE_TYPES)),
    check(
      'rfq_visibility_rules_operand_chk',
      sql`(${t.ruleType} in ('allow_country','block_country') and ${t.countryId} is not null and ${t.verificationLevel} is null and ${t.sellerType} is null)
        or (${t.ruleType} = 'min_verification' and ${t.verificationLevel} is not null and ${t.countryId} is null and ${t.sellerType} is null)
        or (${t.ruleType} = 'seller_type' and ${t.sellerType} is not null and ${t.countryId} is null and ${t.verificationLevel} is null)`,
    ),
    index('ix_rfq_visibility_rules_rfq').on(t.rfqId),
  ],
);

export const INVITATION_RESPONSE = ['pending', 'viewed', 'declined', 'quoted'] as const;
export const rfqInvitations = pgTable(
  'rfq_invitations',
  {
    id: pk(),
    rfqId: uuid().notNull(),
    companyId: uuid().notNull(), // inviting (buyer) company
    invitedCompanyId: fk(() => companies.id),
    invitedByUserId: fk(() => users.id),
    status: enumText(INVITATION_RESPONSE).notNull().default('pending'),
    message: text(),
    invitedAt: createdAt(),
    respondedAt: tstz(),
  },
  (t) => [
    tenantFk('rfq_invitations_rfq_fk', [t.rfqId, t.companyId], () => [rfqs.id, rfqs.companyId]),
    unique('ux_rfq_invitations').on(t.rfqId, t.invitedCompanyId),
    check('rfq_invitations_status_chk', oneOf(t.status, INVITATION_RESPONSE)),
    check('rfq_invitations_self_chk', sql`${t.companyId} <> ${t.invitedCompanyId}`),
    index('ix_rfq_invitations_invitee').on(t.invitedCompanyId, t.status, t.invitedAt.desc()),
  ],
);

/** Append-only. */
export const rfqStatusHistory = pgTable(
  'rfq_status_history',
  {
    id: pk(),
    rfqId: uuid().notNull(),
    companyId: uuid().notNull(),
    fromStatus: enumText(RFQ_STATUS),
    toStatus: enumText(RFQ_STATUS).notNull(),
    actorUserId: fkOpt(() => users.id),
    reason: text(),
    createdAt: createdAt(),
  },
  (t) => [
    tenantFk('rfq_status_history_rfq_fk', [t.rfqId, t.companyId], () => [rfqs.id, rfqs.companyId]),
    index('ix_rfq_status_history_rfq').on(t.rfqId, t.createdAt.desc()),
  ],
);

/** company_id = the VIEWING company (supplier side). Buyers read only aggregates via the RFQ owner policy. */
export const rfqViews = pgTable(
  'rfq_views',
  {
    id: pk(),
    rfqId: fk(() => rfqs.id, 'cascade'),
    companyId: fk(() => companies.id, 'cascade'),
    viewerUserId: fk(() => users.id, 'cascade'),
    viewedAt: createdAt(),
  },
  (t) => [
    index('ix_rfq_views_rfq').on(t.rfqId, t.viewedAt.desc()),
    index('ix_rfq_views_company').on(t.companyId, t.viewedAt.desc()),
  ],
);

export const rfqSavedRecords = pgTable(
  'rfq_saved_records',
  {
    id: pk(),
    rfqId: fk(() => rfqs.id, 'cascade'),
    companyId: fk(() => companies.id, 'cascade'),
    userId: fk(() => users.id, 'cascade'),
    note: text(),
    savedAt: createdAt(),
  },
  (t) => [
    unique('ux_rfq_saved_records').on(t.companyId, t.userId, t.rfqId),
    index('ix_rfq_saved_records_rfq').on(t.rfqId),
  ],
);

export const rfqClarifications = pgTable(
  'rfq_clarifications',
  {
    id: pk(),
    rfqId: uuid().notNull(),
    rfqCompanyId: uuid().notNull(), // buyer (RFQ owner)
    askedByCompanyId: fk(() => companies.id),
    askedByUserId: fk(() => users.id),
    question: text().notNull(),
    answer: text(),
    answeredByUserId: fkOpt(() => users.id),
    answeredAt: tstz(),
    /** If true the Q&A is shown to every supplier that can see the RFQ. */
    isPublic: boolean().notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [
    tenantFk('rfq_clarifications_rfq_fk', [t.rfqId, t.rfqCompanyId], () => [rfqs.id, rfqs.companyId]),
    check('rfq_clarifications_answer_chk', sql`(${t.answer} is null) = (${t.answeredAt} is null)`),
    check('rfq_clarifications_not_self_chk', sql`${t.askedByCompanyId} <> ${t.rfqCompanyId}`),
    index('ix_rfq_clarifications_rfq').on(t.rfqId, t.createdAt),
    index('ix_rfq_clarifications_asker').on(t.askedByCompanyId),
  ],
);
