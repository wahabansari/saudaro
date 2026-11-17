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
  uuid,
} from 'drizzle-orm/pg-core';
import { createdAt, enumText, fk, fkOpt, oneOf, pk, stamps, tenantFk, tstz } from './_helpers.ts';
import { products } from './catalog.ts';
import { companies } from './companies.ts';
import { files } from './documents.ts';
import {
  certificationIssuers,
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
  statesProvinces,
  unitsOfMeasure,
} from './reference.ts';

/**
 * Seller trade profile + Buyer profile. One company, up to two optional profiles (never separate
 * identities). Seller records are split into PUBLIC-when-published (capabilities, markets, ports,
 * incoterms, certifications) and PRIVATE (capacity, MOQ, lead times, payment/currency terms,
 * packaging, trade terms) groups; RLS enforces the split. Matching workers read both.
 */

export const SELLER_TYPES = [
  'manufacturer',
  'exporter',
  'distributor',
  'wholesaler',
  'trading_company',
  'supplier',
  'other',
] as const;
export const sellerTradeProfiles = pgTable(
  'seller_trade_profiles',
  {
    companyId: uuid()
      .primaryKey()
      .references(() => companies.id, { onDelete: 'cascade' }),
    sellerType: enumText(SELLER_TYPES).notNull(),
    summary: text(),
    yearsExporting: smallint(),
    defaultQuoteValidityDays: smallint().notNull().default(30),
    acceptsRfqs: boolean().notNull().default(true),
    responseTimeHours: smallint(),
    /** Publication is explicit; an unpublished profile is invisible to other companies. */
    isPublished: boolean().notNull().default(false),
    publishedAt: tstz(),
    version: integer().notNull().default(1),
    ...stamps(),
  },
  (t) => [
    check('seller_trade_profiles_type_chk', oneOf(t.sellerType, SELLER_TYPES)),
    check('seller_trade_profiles_validity_chk', sql`${t.defaultQuoteValidityDays} between 1 and 365`),
    check('seller_trade_profiles_published_chk', sql`not ${t.isPublished} or ${t.publishedAt} is not null`),
    index('ix_seller_trade_profiles_published').on(t.sellerType).where(sql`${t.isPublished}`),
  ],
);

const companyKey = () => fk(() => companies.id, 'cascade');

export const CAPABILITY_TYPES = [
  'manufacturing',
  'oem',
  'odm',
  'private_label',
  'custom_production',
  'sourcing',
  'warehousing',
  'logistics',
] as const;
export const sellerCapabilities = pgTable(
  'seller_capabilities',
  {
    id: pk(),
    companyId: companyKey(),
    capabilityType: enumText(CAPABILITY_TYPES).notNull(),
    description: text(),
    createdAt: createdAt(),
  },
  (t) => [
    unique('ux_seller_capabilities').on(t.companyId, t.capabilityType),
    check('seller_capabilities_type_chk', oneOf(t.capabilityType, CAPABILITY_TYPES)),
  ],
);

export const sellerExportMarkets = pgTable(
  'seller_export_markets',
  {
    companyId: companyKey(),
    countryId: fk(() => countries.id),
    isCurrent: boolean().notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ name: 'pk_seller_export_markets', columns: [t.companyId, t.countryId] }),
    index('ix_seller_export_markets_country').on(t.countryId, t.companyId),
  ],
);

export const sellerSupplyRegions = pgTable(
  'seller_supply_regions',
  {
    id: pk(),
    companyId: companyKey(),
    countryId: fk(() => countries.id),
    stateProvinceId: fkOpt(() => statesProvinces.id),
    createdAt: createdAt(),
  },
  (t) => [
    unique('ux_seller_supply_regions').on(t.companyId, t.countryId, t.stateProvinceId).nullsNotDistinct(),
    index('ix_seller_supply_regions_country').on(t.countryId),
  ],
);

export const sellerShippingPorts = pgTable(
  'seller_shipping_ports',
  {
    companyId: companyKey(),
    portId: fk(() => ports.id),
    isPrimary: boolean().notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ name: 'pk_seller_shipping_ports', columns: [t.companyId, t.portId] }),
    index('ix_seller_shipping_ports_port').on(t.portId),
  ],
);

export const sellerProductCapabilities = pgTable(
  'seller_product_capabilities',
  {
    id: pk(),
    companyId: companyKey(),
    categoryId: fk(() => productCategories.id),
    hsCodeId: fkOpt(() => hsCodes.id),
    productId: uuid(),
    notes: text(),
    createdAt: createdAt(),
  },
  (t) => [
    tenantFk('seller_product_capabilities_product_fk', [t.productId, t.companyId], () => [products.id, products.companyId], 'cascade'),
    unique('ux_seller_product_capabilities').on(t.companyId, t.categoryId, t.hsCodeId, t.productId).nullsNotDistinct(),
    index('ix_seller_product_capabilities_category').on(t.categoryId, t.companyId),
    index('ix_seller_product_capabilities_hs').on(t.hsCodeId, t.companyId),
  ],
);

export const sellerTradeTerms = pgTable(
  'seller_trade_terms',
  {
    companyId: uuid()
      .primaryKey()
      .references(() => companies.id, { onDelete: 'cascade' }),
    sampleAvailable: boolean().notNull().default(false),
    samplePolicy: text(),
    minOrderValue: numeric({ precision: 20, scale: 4 }),
    minOrderCurrencyId: fkOpt(() => currencies.id),
    warrantyTerms: text(),
    returnPolicy: text(),
    notes: text(),
    ...stamps(),
  },
  (t) => [
    check('seller_trade_terms_mov_chk', sql`${t.minOrderValue} is null or (${t.minOrderValue} >= 0 and ${t.minOrderCurrencyId} is not null)`),
  ],
);

export const sellerPaymentMethods = pgTable(
  'seller_payment_methods',
  {
    companyId: companyKey(),
    paymentTermId: fk(() => paymentTerms.id),
    notes: text(),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ name: 'pk_seller_payment_methods', columns: [t.companyId, t.paymentTermId] })],
);

export const sellerAcceptedCurrencies = pgTable(
  'seller_accepted_currencies',
  {
    companyId: companyKey(),
    currencyId: fk(() => currencies.id),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ name: 'pk_seller_accepted_currencies', columns: [t.companyId, t.currencyId] })],
);

export const sellerIncotermCapabilities = pgTable(
  'seller_incoterm_capabilities',
  {
    id: pk(),
    companyId: companyKey(),
    incotermId: fk(() => incoterms.id),
    portId: fkOpt(() => ports.id),
    namedPlace: text(),
    shipmentModeId: fkOpt(() => shipmentModes.id),
    createdAt: createdAt(),
  },
  (t) => [
    unique('ux_seller_incoterm_capabilities')
      .on(t.companyId, t.incotermId, t.portId, t.namedPlace, t.shipmentModeId)
      .nullsNotDistinct(),
    index('ix_seller_incoterm_capabilities_incoterm').on(t.incotermId, t.companyId),
  ],
);

export const sellerCertifications = pgTable(
  'seller_certifications',
  {
    id: pk(),
    companyId: companyKey(),
    certificationId: fk(() => certifications.id),
    issuerId: fkOpt(() => certificationIssuers.id),
    certificateNumber: text(),
    validFrom: date({ mode: 'string' }),
    validUntil: date({ mode: 'string' }),
    fileId: uuid(),
    createdAt: createdAt(),
  },
  (t) => [
    tenantFk('seller_certifications_file_fk', [t.fileId, t.companyId], () => [files.id, files.companyId], 'restrict'),
    unique('ux_seller_certifications').on(t.companyId, t.certificationId, t.certificateNumber).nullsNotDistinct(),
    check('seller_certifications_dates_chk', sql`${t.validFrom} is null or ${t.validUntil} is null or ${t.validFrom} <= ${t.validUntil}`),
    index('ix_seller_certifications_cert').on(t.certificationId, t.companyId),
  ],
);

export const CAPACITY_PERIODS = ['day', 'week', 'month', 'year'] as const;
export const sellerCapacityRecords = pgTable(
  'seller_capacity_records',
  {
    id: pk(),
    companyId: companyKey(),
    categoryId: fkOpt(() => productCategories.id),
    productId: uuid(),
    capacityQty: numeric({ precision: 20, scale: 6 }).notNull(),
    uomId: fk(() => unitsOfMeasure.id),
    period: enumText(CAPACITY_PERIODS).notNull().default('month'),
    validFrom: date({ mode: 'string' }),
    validUntil: date({ mode: 'string' }),
    notes: text(),
    ...stamps(),
  },
  (t) => [
    tenantFk('seller_capacity_records_product_fk', [t.productId, t.companyId], () => [products.id, products.companyId], 'cascade'),
    check('seller_capacity_records_qty_chk', sql`${t.capacityQty} > 0`),
    check('seller_capacity_records_period_chk', oneOf(t.period, CAPACITY_PERIODS)),
    check('seller_capacity_records_scope_chk', sql`${t.categoryId} is not null or ${t.productId} is not null`),
    index('ix_seller_capacity_records_company').on(t.companyId),
    index('ix_seller_capacity_records_category').on(t.categoryId),
  ],
);

export const sellerMoqRecords = pgTable(
  'seller_moq_records',
  {
    id: pk(),
    companyId: companyKey(),
    categoryId: fkOpt(() => productCategories.id),
    productId: uuid(),
    moqQty: numeric({ precision: 20, scale: 6 }).notNull(),
    uomId: fk(() => unitsOfMeasure.id),
    minOrderValue: numeric({ precision: 20, scale: 4 }),
    currencyId: fkOpt(() => currencies.id),
    ...stamps(),
  },
  (t) => [
    tenantFk('seller_moq_records_product_fk', [t.productId, t.companyId], () => [products.id, products.companyId], 'cascade'),
    check('seller_moq_records_qty_chk', sql`${t.moqQty} > 0`),
    check('seller_moq_records_scope_chk', sql`${t.categoryId} is not null or ${t.productId} is not null`),
    check('seller_moq_records_value_chk', sql`${t.minOrderValue} is null or ${t.currencyId} is not null`),
    index('ix_seller_moq_records_company').on(t.companyId),
    index('ix_seller_moq_records_category').on(t.categoryId),
  ],
);

export const LEAD_TIME_TYPES = ['production', 'dispatch', 'total'] as const;
export const sellerLeadTimes = pgTable(
  'seller_lead_times',
  {
    id: pk(),
    companyId: companyKey(),
    categoryId: fkOpt(() => productCategories.id),
    productId: uuid(),
    leadTimeType: enumText(LEAD_TIME_TYPES).notNull().default('total'),
    minDays: smallint().notNull(),
    maxDays: smallint().notNull(),
    ...stamps(),
  },
  (t) => [
    tenantFk('seller_lead_times_product_fk', [t.productId, t.companyId], () => [products.id, products.companyId], 'cascade'),
    check('seller_lead_times_range_chk', sql`${t.minDays} >= 0 and ${t.minDays} <= ${t.maxDays} and ${t.maxDays} <= 730`),
    check('seller_lead_times_type_chk', oneOf(t.leadTimeType, LEAD_TIME_TYPES)),
    index('ix_seller_lead_times_company').on(t.companyId),
    index('ix_seller_lead_times_category').on(t.categoryId),
  ],
);

export const sellerPackagingCapabilities = pgTable(
  'seller_packaging_capabilities',
  {
    companyId: companyKey(),
    packagingTypeId: fk(() => packagingTypes.id),
    notes: text(),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ name: 'pk_seller_packaging_capabilities', columns: [t.companyId, t.packagingTypeId] })],
);

// ------------------------------------------------------------------ Buyer side

export const BUYER_TYPES = ['importer', 'distributor', 'retailer', 'end_user_manufacturer', 'trader', 'other'] as const;
export const IMPORT_VOLUME_RANGES = ['under_100k', '100k_1m', '1m_10m', 'over_10m'] as const;
/** Buyer data is private to the buyer company by default (assumption A-7 in ARCHITECTURE_DECISIONS). */
export const buyerProfiles = pgTable(
  'buyer_profiles',
  {
    companyId: uuid()
      .primaryKey()
      .references(() => companies.id, { onDelete: 'cascade' }),
    buyerType: enumText(BUYER_TYPES).notNull(),
    summary: text(),
    annualImportVolumeUsdRange: enumText(IMPORT_VOLUME_RANGES),
    version: integer().notNull().default(1),
    ...stamps(),
  },
  (t) => [
    check('buyer_profiles_type_chk', oneOf(t.buyerType, BUYER_TYPES)),
    check('buyer_profiles_volume_chk', sql`${t.annualImportVolumeUsdRange} is null or ${oneOf(t.annualImportVolumeUsdRange, IMPORT_VOLUME_RANGES)}`),
  ],
);

export const buyerProductInterests = pgTable(
  'buyer_product_interests',
  {
    id: pk(),
    companyId: companyKey(),
    categoryId: fk(() => productCategories.id),
    hsCodeId: fkOpt(() => hsCodes.id),
    createdAt: createdAt(),
  },
  (t) => [unique('ux_buyer_product_interests').on(t.companyId, t.categoryId, t.hsCodeId).nullsNotDistinct()],
);

export const buyerImportMarkets = pgTable(
  'buyer_import_markets',
  { companyId: companyKey(), countryId: fk(() => countries.id), createdAt: createdAt() },
  (t) => [primaryKey({ name: 'pk_buyer_import_markets', columns: [t.companyId, t.countryId] })],
);

export const buyerPreferredOrigins = pgTable(
  'buyer_preferred_origins',
  { companyId: companyKey(), countryId: fk(() => countries.id), createdAt: createdAt() },
  (t) => [primaryKey({ name: 'pk_buyer_preferred_origins', columns: [t.companyId, t.countryId] })],
);

export const buyerTradePreferences = pgTable('buyer_trade_preferences', {
  companyId: uuid()
    .primaryKey()
    .references(() => companies.id, { onDelete: 'cascade' }),
  preferredCurrencyId: fkOpt(() => currencies.id),
  preferredIncotermId: fkOpt(() => incoterms.id),
  preferredPaymentTermId: fkOpt(() => paymentTerms.id),
  preferredShipmentModeId: fkOpt(() => shipmentModes.id),
  notes: text(),
  ...stamps(),
});

export const IMPORT_REQUIREMENT_TYPES = ['certification', 'document', 'labeling', 'inspection', 'other'] as const;
export const buyerImportRequirements = pgTable(
  'buyer_import_requirements',
  {
    id: pk(),
    companyId: companyKey(),
    requirementType: enumText(IMPORT_REQUIREMENT_TYPES).notNull(),
    certificationId: fkOpt(() => certifications.id),
    description: text().notNull(),
    isMandatory: boolean().notNull().default(true),
    ...stamps(),
  },
  (t) => [
    check('buyer_import_requirements_type_chk', oneOf(t.requirementType, IMPORT_REQUIREMENT_TYPES)),
    check(
      'buyer_import_requirements_cert_chk',
      sql`(${t.requirementType} = 'certification') = (${t.certificationId} is not null)`,
    ),
    index('ix_buyer_import_requirements_company').on(t.companyId),
  ],
);
