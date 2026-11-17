import { sql } from 'drizzle-orm';
import { check, date, foreignKey, index, integer, numeric, pgTable, smallint, text, unique, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { createdAt, enumText, fk, fkOpt, oneOf, pk, stamps, tstz } from './_helpers.ts';
import { companies } from './companies.ts';
import { files } from './documents.ts';
import { users } from './identity.ts';
import { quotationRevisions, quotations } from './quotations.ts';
import { rfqItems, rfqs } from './rfq.ts';
import {
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
 * Deals & deal room. A deal originates from exactly ONE accepted quotation revision and stores the
 * agreed terms as an immutable snapshot (deal_terms, deal_items). Visibility is party-based:
 * deal_parties is authoritative (buyer + seller + optional agents/observers); every child table is
 * reached through deals RLS. NO escrow/payment processing: 'completed' means commercially closed
 * by the parties and never implies payment was made.
 */

export const DEAL_STATUS = ['active', 'in_production', 'shipped', 'delivered', 'completed', 'cancelled', 'disputed'] as const;
export const deals = pgTable(
  'deals',
  {
    id: pk(),
    referenceNo: text()
      .notNull()
      .default(sql`'DEAL-' || to_char(now() at time zone 'utc', 'YYYY') || '-' || lpad(nextval('deal_reference_seq')::text, 8, '0')`),
    quotationId: uuid().notNull(),
    acceptedRevisionId: uuid().notNull(),
    rfqId: fk(() => rfqs.id),
    buyerCompanyId: uuid().notNull(),
    supplierCompanyId: uuid().notNull(),
    status: enumText(DEAL_STATUS).notNull().default('active'),
    currencyId: fk(() => currencies.id),
    totalAmount: numeric({ precision: 24, scale: 4 }).notNull(),
    agreedAt: tstz().notNull().defaultNow(),
    completedAt: tstz(),
    cancelledAt: tstz(),
    version: integer().notNull().default(1),
    ...stamps(),
  },
  (t) => [
    // The deal's parties must be exactly the quotation's supplier and the RFQ's buyer, and the
    // snapshot revision must belong to that quotation.
    foreignKey({ name: 'deals_quotation_supplier_fk', columns: [t.quotationId, t.supplierCompanyId], foreignColumns: [quotations.id, quotations.companyId] }),
    foreignKey({ name: 'deals_quotation_buyer_fk', columns: [t.quotationId, t.buyerCompanyId], foreignColumns: [quotations.id, quotations.buyerCompanyId] }),
    foreignKey({ name: 'deals_revision_fk', columns: [t.acceptedRevisionId, t.quotationId], foreignColumns: [quotationRevisions.id, quotationRevisions.quotationId] }),
    foreignKey({ name: 'deals_buyer_company_fk', columns: [t.buyerCompanyId], foreignColumns: [companies.id] }),
    foreignKey({ name: 'deals_supplier_company_fk', columns: [t.supplierCompanyId], foreignColumns: [companies.id] }),
    // One deal per quotation: duplicate deal creation is impossible even under races.
    unique('ux_deals_quotation').on(t.quotationId),
    uniqueIndex('ux_deals_reference_no').on(t.referenceNo),
    check('deals_status_chk', oneOf(t.status, DEAL_STATUS)),
    check('deals_parties_chk', sql`${t.buyerCompanyId} <> ${t.supplierCompanyId}`),
    check('deals_completed_chk', sql`(${t.status} = 'completed') = (${t.completedAt} is not null)`),
    check('deals_cancelled_chk', sql`(${t.status} = 'cancelled') = (${t.cancelledAt} is not null)`),
    check('deals_total_chk', sql`${t.totalAmount} >= 0`),
    index('ix_deals_buyer_status').on(t.buyerCompanyId, t.status, t.createdAt.desc()),
    index('ix_deals_supplier_status').on(t.supplierCompanyId, t.status, t.createdAt.desc()),
    index('ix_deals_rfq').on(t.rfqId),
  ],
);

export const DEAL_PARTY_ROLES = ['buyer', 'seller', 'agent', 'observer'] as const;
export const dealParties = pgTable(
  'deal_parties',
  {
    id: pk(),
    dealId: fk(() => deals.id, 'cascade'),
    companyId: fk(() => companies.id),
    partyRole: enumText(DEAL_PARTY_ROLES).notNull(),
    addedByUserId: fkOpt(() => users.id),
    createdAt: createdAt(),
  },
  (t) => [
    unique('ux_deal_parties').on(t.dealId, t.companyId),
    check('deal_parties_role_chk', oneOf(t.partyRole, DEAL_PARTY_ROLES)),
    index('ix_deal_parties_company').on(t.companyId, t.dealId),
  ],
);

/** Immutable snapshot of the agreed commercial terms. */
export const dealTerms = pgTable(
  'deal_terms',
  {
    dealId: uuid()
      .primaryKey()
      .references(() => deals.id, { onDelete: 'cascade' }),
    incotermId: fkOpt(() => incoterms.id),
    incotermNamedPlace: text(),
    portOfLoadingId: fkOpt(() => ports.id),
    deliveryPlace: text(),
    paymentTermId: fkOpt(() => paymentTerms.id),
    paymentTermNotes: text(),
    packagingTypeId: fkOpt(() => packagingTypes.id),
    shipmentModeId: fkOpt(() => shipmentModes.id),
    warrantyTerms: text(),
    validUntil: tstz(),
    createdAt: createdAt(),
  },
);

/** Immutable snapshot of agreed line items. */
export const dealItems = pgTable(
  'deal_items',
  {
    id: pk(),
    dealId: fk(() => deals.id, 'cascade'),
    lineNo: smallint().notNull(),
    rfqItemId: fkOpt(() => rfqItems.id),
    description: text().notNull(),
    quantity: numeric({ precision: 20, scale: 6 }).notNull(),
    uomId: fk(() => unitsOfMeasure.id),
    unitPrice: numeric({ precision: 20, scale: 4 }).notNull(),
    totalPrice: numeric({ precision: 24, scale: 4 }).notNull(),
    hsCodeId: fkOpt(() => hsCodes.id),
    originCountryId: fkOpt(() => countries.id),
  },
  (t) => [
    unique('ux_deal_items_line').on(t.dealId, t.lineNo),
    check('deal_items_qty_chk', sql`${t.quantity} > 0 and ${t.unitPrice} >= 0`),
  ],
);

export const DEAL_DOCUMENT_TYPES = [
  'purchase_order',
  'contract',
  'proforma_invoice',
  'commercial_invoice',
  'packing_list',
  'product_specification',
  'bill_of_lading',
  'certificate',
  'inspection_report',
  'other',
] as const;
export const dealDocuments = pgTable(
  'deal_documents',
  {
    id: pk(),
    dealId: fk(() => deals.id, 'cascade'),
    documentType: enumText(DEAL_DOCUMENT_TYPES).notNull(),
    title: text().notNull(),
    status: enumText(['draft', 'active', 'superseded'] as const).notNull().default('active'),
    createdByCompanyId: fk(() => companies.id),
    createdByUserId: fk(() => users.id),
    ...stamps(),
  },
  (t) => [
    unique('ux_deal_documents_id_deal').on(t.id, t.dealId),
    check('deal_documents_type_chk', oneOf(t.documentType, DEAL_DOCUMENT_TYPES)),
    check('deal_documents_status_chk', oneOf(t.status, ['draft', 'active', 'superseded'])),
    index('ix_deal_documents_deal').on(t.dealId, t.documentType),
  ],
);

/** Append-only version history; the file itself is immutable. */
export const dealDocumentVersions = pgTable(
  'deal_document_versions',
  {
    id: pk(),
    documentId: uuid().notNull(),
    dealId: uuid().notNull(),
    versionNo: integer().notNull(),
    fileId: fk(() => files.id),
    uploadedByCompanyId: fk(() => companies.id),
    uploadedByUserId: fk(() => users.id),
    note: text(),
    createdAt: createdAt(),
  },
  (t) => [
    foreignKey({ name: 'deal_document_versions_document_fk', columns: [t.documentId, t.dealId], foreignColumns: [dealDocuments.id, dealDocuments.dealId] }).onDelete('cascade'),
    unique('ux_deal_document_versions').on(t.documentId, t.versionNo),
    unique('ux_deal_document_versions_file').on(t.fileId),
    check('deal_document_versions_no_chk', sql`${t.versionNo} >= 1`),
    index('ix_deal_document_versions_deal').on(t.dealId),
  ],
);

export const MILESTONE_TYPES = [
  'production_start',
  'production_complete',
  'inspection',
  'shipment',
  'customs_clearance',
  'delivery',
  'custom',
] as const;
export const MILESTONE_STATUS = ['pending', 'in_progress', 'completed', 'delayed', 'skipped'] as const;
export const dealMilestones = pgTable(
  'deal_milestones',
  {
    id: pk(),
    dealId: fk(() => deals.id, 'cascade'),
    milestoneType: enumText(MILESTONE_TYPES).notNull(),
    title: text().notNull(),
    dueDate: date({ mode: 'string' }),
    status: enumText(MILESTONE_STATUS).notNull().default('pending'),
    responsibleCompanyId: fk(() => companies.id),
    completedAt: tstz(),
    ...stamps(),
  },
  (t) => [
    unique('ux_deal_milestones_id_deal').on(t.id, t.dealId),
    check('deal_milestones_type_chk', oneOf(t.milestoneType, MILESTONE_TYPES)),
    check('deal_milestones_status_chk', oneOf(t.status, MILESTONE_STATUS)),
    check('deal_milestones_completed_chk', sql`(${t.status} = 'completed') = (${t.completedAt} is not null)`),
    index('ix_deal_milestones_deal').on(t.dealId, t.dueDate),
  ],
);

export const dealMilestoneEvents = pgTable(
  'deal_milestone_events',
  {
    id: pk(),
    milestoneId: uuid().notNull(),
    dealId: uuid().notNull(),
    eventType: text().notNull(),
    actorCompanyId: fk(() => companies.id),
    actorUserId: fk(() => users.id),
    note: text(),
    createdAt: createdAt(),
  },
  (t) => [
    foreignKey({ name: 'deal_milestone_events_milestone_fk', columns: [t.milestoneId, t.dealId], foreignColumns: [dealMilestones.id, dealMilestones.dealId] }).onDelete('cascade'),
    index('ix_deal_milestone_events_milestone').on(t.milestoneId, t.createdAt.desc()),
  ],
);

/** Append-only. */
export const dealStatusHistory = pgTable(
  'deal_status_history',
  {
    id: pk(),
    dealId: fk(() => deals.id, 'cascade'),
    fromStatus: enumText(DEAL_STATUS),
    toStatus: enumText(DEAL_STATUS).notNull(),
    actorCompanyId: fkOpt(() => companies.id),
    actorUserId: fkOpt(() => users.id),
    reason: text(),
    createdAt: createdAt(),
  },
  (t) => [index('ix_deal_status_history_deal').on(t.dealId, t.createdAt.desc())],
);

/** Append-only activity feed; cursor pagination on (deal_id, created_at desc, id desc). */
export const dealActivityEvents = pgTable(
  'deal_activity_events',
  {
    id: pk(),
    dealId: fk(() => deals.id, 'cascade'),
    actorCompanyId: fkOpt(() => companies.id),
    actorUserId: fkOpt(() => users.id),
    eventType: text().notNull(),
    summary: text().notNull(),
    resourceType: text(),
    resourceId: uuid(),
    createdAt: createdAt(),
  },
  (t) => [index('ix_deal_activity_events_feed').on(t.dealId, t.createdAt.desc(), t.id.desc())],
);

export const CONFIRMATION_TYPES = ['terms_agreed', 'goods_dispatched', 'goods_received', 'completion'] as const;
export const dealConfirmations = pgTable(
  'deal_confirmations',
  {
    id: pk(),
    dealId: fk(() => deals.id, 'cascade'),
    companyId: fk(() => companies.id),
    confirmationType: enumText(CONFIRMATION_TYPES).notNull(),
    confirmedByUserId: fk(() => users.id),
    note: text(),
    confirmedAt: createdAt(),
  },
  (t) => [
    unique('ux_deal_confirmations').on(t.dealId, t.companyId, t.confirmationType),
    check('deal_confirmations_type_chk', oneOf(t.confirmationType, CONFIRMATION_TYPES)),
  ],
);

export const CANCELLATION_STATUS = ['requested', 'accepted', 'rejected', 'withdrawn'] as const;
export const dealCancellations = pgTable(
  'deal_cancellations',
  {
    id: pk(),
    dealId: fk(() => deals.id, 'cascade'),
    requestedByCompanyId: fk(() => companies.id),
    requestedByUserId: fk(() => users.id),
    reason: text().notNull(),
    status: enumText(CANCELLATION_STATUS).notNull().default('requested'),
    respondedByCompanyId: fkOpt(() => companies.id),
    respondedAt: tstz(),
    createdAt: createdAt(),
  },
  (t) => [
    check('deal_cancellations_status_chk', oneOf(t.status, CANCELLATION_STATUS)),
    uniqueIndex('ux_deal_cancellations_open').on(t.dealId).where(sql`${t.status} = 'requested'`),
    check('deal_cancellations_response_chk', sql`${t.respondedByCompanyId} is null or ${t.respondedByCompanyId} <> ${t.requestedByCompanyId}`),
  ],
);

export const DISPUTE_CATEGORIES = ['quality', 'quantity', 'delivery', 'documents', 'payment', 'other'] as const;
export const dealDisputes = pgTable(
  'deal_disputes',
  {
    id: pk(),
    dealId: fk(() => deals.id, 'cascade'),
    raisedByCompanyId: fk(() => companies.id),
    raisedByUserId: fk(() => users.id),
    category: enumText(DISPUTE_CATEGORIES).notNull(),
    description: text().notNull(),
    status: enumText(['open', 'under_review', 'resolved', 'closed'] as const).notNull().default('open'),
    resolution: text(),
    resolvedAt: tstz(),
    ...stamps(),
  },
  (t) => [
    check('deal_disputes_category_chk', oneOf(t.category, DISPUTE_CATEGORIES)),
    check('deal_disputes_status_chk', oneOf(t.status, ['open', 'under_review', 'resolved', 'closed'])),
    index('ix_deal_disputes_deal').on(t.dealId, t.status),
  ],
);

export const dealShipments = pgTable(
  'deal_shipments',
  {
    id: pk(),
    dealId: fk(() => deals.id, 'cascade'),
    carrier: text(),
    trackingReference: text(),
    billOfLadingNo: text(),
    portOfLoadingId: fkOpt(() => ports.id),
    portOfDischargeId: fkOpt(() => ports.id),
    etd: date({ mode: 'string' }),
    eta: date({ mode: 'string' }),
    addedByCompanyId: fk(() => companies.id),
    ...stamps(),
  },
  (t) => [
    check('deal_shipments_dates_chk', sql`${t.etd} is null or ${t.eta} is null or ${t.etd} <= ${t.eta}`),
    index('ix_deal_shipments_deal').on(t.dealId),
  ],
);
