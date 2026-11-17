import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  numeric,
  pgTable,
  smallint,
  text,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { createdAt, enumText, fk, fkOpt, oneOf, pk, stamps, tenantFk, tstz } from './_helpers.ts';
import { productSpecificationDefinitions } from './catalog.ts';
import { companies } from './companies.ts';
import { files } from './documents.ts';
import { users } from './identity.ts';
import { rfqItems, rfqs } from './rfq.ts';
import {
  certifications,
  countries,
  currencies,
  hsCodes,
  incoterms,
  packagingTypes,
  paymentTerms,
  ports,
  shipmentModes,
  unitsOfMeasure,
} from './reference.ts';

/**
 * Quotations & negotiation. company_id = SUPPLIER (the tenant); buyer_company_id is the RFQ owner,
 * enforced by composite FK (rfq_id, buyer_company_id) -> rfqs(id, company_id).
 * Commercial terms live in IMMUTABLE revisions: once submitted, a revision (and its items, terms,
 * attachments) can never change; the accepted quotation points at one exact accepted revision.
 */

export const QUOTATION_STATUS = [
  'draft',
  'submitted',
  'under_negotiation',
  'accepted',
  'rejected',
  'withdrawn',
  'expired',
  'superseded',
] as const;
export const OPEN_QUOTATION_STATUSES = ['draft', 'submitted', 'under_negotiation', 'accepted'] as const;

export const quotations = pgTable(
  'quotations',
  {
    id: pk(),
    companyId: fk(() => companies.id), // supplier
    rfqId: uuid().notNull(),
    buyerCompanyId: uuid().notNull(),
    createdByUserId: fk(() => users.id),
    referenceNo: text()
      .notNull()
      .default(sql`'QUO-' || to_char(now() at time zone 'utc', 'YYYY') || '-' || lpad(nextval('quotation_reference_seq')::text, 8, '0')`),
    status: enumText(QUOTATION_STATUS).notNull().default('draft'),
    currentRevisionNo: integer().notNull().default(1),
    /** Set exactly once, on acceptance. FK (accepted_revision_id, id) -> quotation_revisions is added in SQL. */
    acceptedRevisionId: uuid(),
    currencyId: fk(() => currencies.id),
    totalAmount: numeric({ precision: 24, scale: 4 }),
    validUntil: tstz(),
    submittedAt: tstz(),
    acceptedAt: tstz(),
    closedAt: tstz(),
    version: integer().notNull().default(1),
    ...stamps(),
  },
  (t) => [
    tenantFk('quotations_rfq_buyer_fk', [t.rfqId, t.buyerCompanyId], () => [rfqs.id, rfqs.companyId], 'restrict'),
    unique('ux_quotations_id_company').on(t.id, t.companyId),
    unique('ux_quotations_id_buyer').on(t.id, t.buyerCompanyId),
    uniqueIndex('ux_quotations_reference_no').on(t.referenceNo),
    // One live quotation per supplier per RFQ (supplier iterates through revisions).
    uniqueIndex('ux_quotations_one_live_per_supplier')
      .on(t.rfqId, t.companyId)
      .where(sql`${t.status} in ('draft','submitted','under_negotiation','accepted')`),
    // Business rule (A-9): at most ONE accepted quotation per RFQ. Final guard against races.
    uniqueIndex('ux_quotations_one_accepted_per_rfq')
      .on(t.rfqId)
      .where(sql`${t.status} = 'accepted'`),
    check('quotations_status_chk', oneOf(t.status, QUOTATION_STATUS)),
    check('quotations_not_self_chk', sql`${t.companyId} <> ${t.buyerCompanyId}`),
    check(
      'quotations_accepted_chk',
      sql`(${t.status} = 'accepted') = (${t.acceptedRevisionId} is not null and ${t.acceptedAt} is not null)`,
    ),
    check('quotations_submitted_chk', sql`${t.status} = 'draft' or ${t.submittedAt} is not null`),
    check('quotations_total_chk', sql`${t.totalAmount} is null or ${t.totalAmount} >= 0`),
    index('ix_quotations_supplier_status').on(t.companyId, t.status, t.createdAt.desc()),
    index('ix_quotations_buyer_status').on(t.buyerCompanyId, t.status, t.createdAt.desc()),
    index('ix_quotations_rfq_status').on(t.rfqId, t.status),
    index('ix_quotations_expiry').on(t.validUntil).where(sql`${t.status} in ('submitted','under_negotiation')`),
  ],
);

export const REVISION_STATUS = ['draft', 'submitted'] as const;
export const quotationRevisions = pgTable(
  'quotation_revisions',
  {
    id: pk(),
    quotationId: uuid().notNull(),
    companyId: uuid().notNull(),
    revisionNo: integer().notNull(),
    status: enumText(REVISION_STATUS).notNull().default('draft'),
    currencyId: fk(() => currencies.id),
    totalAmount: numeric({ precision: 24, scale: 4 }),
    validUntil: tstz(),
    supplierNotes: text(),
    createdByUserId: fk(() => users.id),
    submittedAt: tstz(),
    createdAt: createdAt(),
  },
  (t) => [
    tenantFk('quotation_revisions_quotation_fk', [t.quotationId, t.companyId], () => [quotations.id, quotations.companyId]),
    unique('ux_quotation_revisions_quotation_no').on(t.quotationId, t.revisionNo),
    unique('ux_quotation_revisions_id_company').on(t.id, t.companyId),
    unique('ux_quotation_revisions_id_quotation').on(t.id, t.quotationId),
    check('quotation_revisions_no_chk', sql`${t.revisionNo} >= 1`),
    check('quotation_revisions_status_chk', oneOf(t.status, REVISION_STATUS)),
    check('quotation_revisions_submitted_chk', sql`(${t.status} = 'submitted') = (${t.submittedAt} is not null)`),
    check('quotation_revisions_total_chk', sql`${t.totalAmount} is null or ${t.totalAmount} >= 0`),
  ],
);

export const quotationItems = pgTable(
  'quotation_items',
  {
    id: pk(),
    revisionId: uuid().notNull(),
    companyId: uuid().notNull(),
    rfqItemId: fk(() => rfqItems.id),
    description: text(),
    unitPrice: numeric({ precision: 20, scale: 4 }).notNull(),
    quantity: numeric({ precision: 20, scale: 6 }).notNull(),
    uomId: fk(() => unitsOfMeasure.id),
    totalPrice: numeric({ precision: 24, scale: 4 }).generatedAlwaysAs(sql`round(quantity * unit_price, 4)`),
    moq: numeric({ precision: 20, scale: 6 }),
    leadTimeDays: smallint(),
    hsCodeId: fkOpt(() => hsCodes.id),
    originCountryId: fkOpt(() => countries.id),
    createdAt: createdAt(),
  },
  (t) => [
    tenantFk('quotation_items_revision_fk', [t.revisionId, t.companyId], () => [
      quotationRevisions.id,
      quotationRevisions.companyId,
    ]),
    unique('ux_quotation_items_id_company').on(t.id, t.companyId),
    unique('ux_quotation_items_revision_rfq_item').on(t.revisionId, t.rfqItemId),
    check('quotation_items_price_chk', sql`${t.unitPrice} >= 0 and ${t.quantity} > 0`),
    check('quotation_items_moq_chk', sql`${t.moq} is null or ${t.moq} > 0`),
    check('quotation_items_lead_chk', sql`${t.leadTimeDays} is null or ${t.leadTimeDays} between 0 and 730`),
    index('ix_quotation_items_rfq_item').on(t.rfqItemId),
  ],
);

export const quotationSpecifications = pgTable(
  'quotation_specifications',
  {
    id: pk(),
    quotationItemId: uuid().notNull(),
    companyId: uuid().notNull(),
    definitionId: fkOpt(() => productSpecificationDefinitions.id),
    customName: text(),
    valueText: text(),
    valueNumber: numeric({ precision: 24, scale: 8 }),
    valueBoolean: boolean(),
    valueMin: numeric({ precision: 24, scale: 8 }),
    valueMax: numeric({ precision: 24, scale: 8 }),
    uomId: fkOpt(() => unitsOfMeasure.id),
  },
  (t) => [
    tenantFk('quotation_specifications_item_fk', [t.quotationItemId, t.companyId], () => [
      quotationItems.id,
      quotationItems.companyId,
    ]),
    check('quotation_specifications_named_chk', sql`${t.definitionId} is not null or ${t.customName} is not null`),
    check(
      'quotation_specifications_one_shape_chk',
      sql`(${t.valueText} is not null)::int + (${t.valueNumber} is not null)::int + (${t.valueBoolean} is not null)::int + (${t.valueMin} is not null or ${t.valueMax} is not null)::int = 1`,
    ),
    index('ix_quotation_specifications_item').on(t.quotationItemId),
  ],
);

export const quotationTerms = pgTable(
  'quotation_terms',
  {
    revisionId: uuid().primaryKey(),
    companyId: uuid().notNull(),
    incotermId: fkOpt(() => incoterms.id),
    incotermNamedPlace: text(),
    portOfLoadingId: fkOpt(() => ports.id),
    deliveryPlace: text(),
    paymentTermId: fkOpt(() => paymentTerms.id),
    paymentTermNotes: text(),
    packagingTypeId: fkOpt(() => packagingTypes.id),
    packagingNotes: text(),
    shipmentModeId: fkOpt(() => shipmentModes.id),
    warrantyTerms: text(),
    createdAt: createdAt(),
  },
  (t) => [
    tenantFk('quotation_terms_revision_fk', [t.revisionId, t.companyId], () => [
      quotationRevisions.id,
      quotationRevisions.companyId,
    ]),
    check(
      'quotation_terms_incoterm_place_chk',
      sql`${t.incotermId} is null or ${t.incotermNamedPlace} is not null or ${t.portOfLoadingId} is not null`,
    ),
  ],
);

export const quotationCertifications = pgTable(
  'quotation_certifications',
  {
    id: pk(),
    revisionId: uuid().notNull(),
    companyId: uuid().notNull(),
    certificationId: fk(() => certifications.id),
    certificateNumber: text(),
    fileId: uuid(),
  },
  (t) => [
    tenantFk('quotation_certifications_revision_fk', [t.revisionId, t.companyId], () => [
      quotationRevisions.id,
      quotationRevisions.companyId,
    ]),
    tenantFk('quotation_certifications_file_fk', [t.fileId, t.companyId], () => [files.id, files.companyId], 'restrict'),
    unique('ux_quotation_certifications').on(t.revisionId, t.certificationId),
  ],
);

export const quotationAttachments = pgTable(
  'quotation_attachments',
  {
    id: pk(),
    revisionId: uuid().notNull(),
    companyId: uuid().notNull(),
    fileId: uuid().notNull(),
    title: text().notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    tenantFk('quotation_attachments_revision_fk', [t.revisionId, t.companyId], () => [
      quotationRevisions.id,
      quotationRevisions.companyId,
    ]),
    tenantFk('quotation_attachments_file_fk', [t.fileId, t.companyId], () => [files.id, files.companyId], 'restrict'),
    unique('ux_quotation_attachments_file').on(t.fileId),
    index('ix_quotation_attachments_revision').on(t.revisionId),
  ],
);

/** Append-only. */
export const quotationStatusHistory = pgTable(
  'quotation_status_history',
  {
    id: pk(),
    quotationId: uuid().notNull(),
    companyId: uuid().notNull(),
    fromStatus: enumText(QUOTATION_STATUS),
    toStatus: enumText(QUOTATION_STATUS).notNull(),
    actorCompanyId: fk(() => companies.id),
    actorUserId: fkOpt(() => users.id),
    reason: text(),
    createdAt: createdAt(),
  },
  (t) => [
    tenantFk('quotation_status_history_quotation_fk', [t.quotationId, t.companyId], () => [quotations.id, quotations.companyId]),
    index('ix_quotation_status_history_quotation').on(t.quotationId, t.createdAt.desc()),
  ],
);

/** Buyer-side working comparison of received quotations for one RFQ. Private to the buyer. */
export const quotationComparisons = pgTable(
  'quotation_comparisons',
  {
    id: pk(),
    rfqId: uuid().notNull(),
    companyId: uuid().notNull(), // buyer
    name: text().notNull(),
    createdByUserId: fk(() => users.id),
    ...stamps(),
  },
  (t) => [
    tenantFk('quotation_comparisons_rfq_fk', [t.rfqId, t.companyId], () => [rfqs.id, rfqs.companyId]),
    unique('ux_quotation_comparisons_id_company').on(t.id, t.companyId),
    index('ix_quotation_comparisons_rfq').on(t.rfqId),
  ],
);

export const quotationComparisonEntries = pgTable(
  'quotation_comparison_entries',
  {
    id: pk(),
    comparisonId: uuid().notNull(),
    companyId: uuid().notNull(), // buyer
    quotationId: fk(() => quotations.id, 'cascade'),
    revisionId: fk(() => quotationRevisions.id, 'cascade'),
    rank: smallint(),
    notes: text(),
  },
  (t) => [
    tenantFk('quotation_comparison_entries_comparison_fk', [t.comparisonId, t.companyId], () => [
      quotationComparisons.id,
      quotationComparisons.companyId,
    ]),
    unique('ux_quotation_comparison_entries').on(t.comparisonId, t.quotationId),
  ],
);

export const NEGOTIATION_EVENT_TYPES = [
  'counter_offer',
  'clarification_request',
  'clarification_response',
  'revision_submitted',
  'accept_intent',
  'decline',
  'note',
] as const;
/** Append-only negotiation timeline. company_id = quotation (supplier) tenant; actor may be either party. */
export const negotiationEvents = pgTable(
  'negotiation_events',
  {
    id: pk(),
    quotationId: uuid().notNull(),
    companyId: uuid().notNull(),
    actorCompanyId: fk(() => companies.id),
    actorUserId: fk(() => users.id),
    eventType: enumText(NEGOTIATION_EVENT_TYPES).notNull(),
    fromRevisionNo: integer(),
    toRevisionNo: integer(),
    message: text(),
    createdAt: createdAt(),
  },
  (t) => [
    tenantFk('negotiation_events_quotation_fk', [t.quotationId, t.companyId], () => [quotations.id, quotations.companyId]),
    check('negotiation_events_type_chk', oneOf(t.eventType, NEGOTIATION_EVENT_TYPES)),
    index('ix_negotiation_events_quotation').on(t.quotationId, t.createdAt.desc(), t.id),
  ],
);
