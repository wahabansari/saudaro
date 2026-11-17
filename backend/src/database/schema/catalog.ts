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
import { companies } from './companies.ts';
import { files } from './documents.ts';
import {
  certificationIssuers,
  certifications,
  countries,
  currencies,
  hsCodes,
  incoterms,
  ports,
  productCategories,
  unitsOfMeasure,
} from './reference.ts';

/**
 * Product catalog. Products are tenant-owned (company_id = the publishing company). Listings are
 * the seller's commercial offers per product. Cross-supplier comparison of "similar" products is
 * by category / HS code / structured specifications (not by a shared master product), which keeps
 * ownership unambiguous. Specifications are relational (definition + typed value), not JSONB.
 */

export const SPEC_DATA_TYPES = ['text', 'number', 'boolean', 'enum', 'range'] as const;
/** Platform-curated vocabulary of specification fields (optionally scoped to a category). */
export const productSpecificationDefinitions = pgTable(
  'product_specification_definitions',
  {
    id: pk(),
    categoryId: fkOpt(() => productCategories.id),
    key: text().notNull(),
    name: text().notNull(),
    dataType: enumText(SPEC_DATA_TYPES).notNull(),
    uomId: fkOpt(() => unitsOfMeasure.id),
    allowedValues: text().array(),
    minValue: numeric({ precision: 24, scale: 8 }),
    maxValue: numeric({ precision: 24, scale: 8 }),
    isFilterable: boolean().notNull().default(false),
    isRequired: boolean().notNull().default(false),
    sortOrder: integer().notNull().default(0),
    isActive: boolean().notNull().default(true),
    ...stamps(),
  },
  (t) => [
    check('spec_definitions_type_chk', oneOf(t.dataType, SPEC_DATA_TYPES)),
    check('spec_definitions_key_chk', sql`${t.key} ~ '^[a-z][a-z0-9_]{1,60}$'`),
    check(
      'spec_definitions_enum_chk',
      sql`(${t.dataType} = 'enum') = (${t.allowedValues} is not null and cardinality(${t.allowedValues}) > 0)`,
    ),
    check(
      'spec_definitions_bounds_chk',
      sql`${t.minValue} is null or ${t.maxValue} is null or ${t.minValue} <= ${t.maxValue}`,
    ),
    uniqueIndex('ux_spec_definitions_global_key')
      .on(t.key)
      .where(sql`${t.categoryId} is null`),
    uniqueIndex('ux_spec_definitions_category_key')
      .on(t.categoryId, t.key)
      .where(sql`${t.categoryId} is not null`),
  ],
);

export const PRODUCT_STATUS = ['draft', 'active', 'archived', 'suspended'] as const;
export const products = pgTable(
  'products',
  {
    id: pk(),
    companyId: fk(() => companies.id),
    name: text().notNull(),
    slug: text().notNull(),
    shortDescription: text(),
    description: text(),
    brand: text(),
    modelNumber: text(),
    manufacturerName: text(),
    manufacturerCompanyId: fkOpt(() => companies.id),
    originCountryId: fkOpt(() => countries.id),
    primaryCategoryId: fk(() => productCategories.id),
    baseUomId: fk(() => unitsOfMeasure.id),
    status: enumText(PRODUCT_STATUS).notNull().default('draft'),
    publishedAt: tstz(),
    version: integer().notNull().default(1),
    searchVector: tsvector().generatedAlwaysAs(
      sql`setweight(to_tsvector('simple'::regconfig, coalesce(name, '')), 'A') || setweight(to_tsvector('simple'::regconfig, coalesce(brand, '')), 'B') || setweight(to_tsvector('simple'::regconfig, coalesce(short_description, '')), 'C') || setweight(to_tsvector('simple'::regconfig, coalesce(description, '')), 'D')`,
    ),
    ...stamps(),
  },
  (t) => [
    unique('ux_products_id_company').on(t.id, t.companyId),
    unique('ux_products_company_slug').on(t.companyId, t.slug),
    check('products_status_chk', oneOf(t.status, PRODUCT_STATUS)),
    check('products_published_chk', sql`${t.status} <> 'active' or ${t.publishedAt} is not null`),
    index('ix_products_company_status').on(t.companyId, t.status, t.createdAt.desc().nullsFirst()),
    index('ix_products_category_active')
      .on(t.primaryCategoryId, t.publishedAt.desc().nullsFirst())
      .where(sql`${t.status} = 'active'`),
    index('ix_products_origin_active')
      .on(t.originCountryId)
      .where(sql`${t.status} = 'active'`),
  ],
);

export const productCategoriesMapping = pgTable(
  'product_categories_mapping',
  {
    productId: uuid().notNull(),
    companyId: uuid().notNull(),
    categoryId: fk(() => productCategories.id),
    isPrimary: boolean().notNull().default(false),
  },
  (t) => [
    primaryKey({ name: 'pk_product_categories_mapping', columns: [t.productId, t.categoryId] }),
    tenantFk('product_categories_mapping_product_fk', [t.productId, t.companyId], () => [
      products.id,
      products.companyId,
    ]),
    index('ix_product_categories_mapping_category').on(t.categoryId),
  ],
);

export const productImages = pgTable(
  'product_images',
  {
    id: pk(),
    productId: uuid().notNull(),
    companyId: uuid().notNull(),
    fileId: uuid().notNull(),
    altText: text(),
    sortOrder: smallint().notNull().default(0),
    isPrimary: boolean().notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [
    tenantFk('product_images_product_fk', [t.productId, t.companyId], () => [
      products.id,
      products.companyId,
    ]),
    tenantFk(
      'product_images_file_fk',
      [t.fileId, t.companyId],
      () => [files.id, files.companyId],
      'restrict',
    ),
    index('ix_product_images_product').on(t.productId, t.sortOrder),
    uniqueIndex('ux_product_images_primary')
      .on(t.productId)
      .where(sql`${t.isPrimary}`),
  ],
);

export const PRODUCT_DOCUMENT_TYPES = [
  'datasheet',
  'catalog',
  'test_report',
  'certificate',
  'msds',
  'other',
] as const;
export const productDocuments = pgTable(
  'product_documents',
  {
    id: pk(),
    productId: uuid().notNull(),
    companyId: uuid().notNull(),
    fileId: uuid().notNull(),
    documentType: enumText(PRODUCT_DOCUMENT_TYPES).notNull(),
    title: text().notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    tenantFk('product_documents_product_fk', [t.productId, t.companyId], () => [
      products.id,
      products.companyId,
    ]),
    tenantFk(
      'product_documents_file_fk',
      [t.fileId, t.companyId],
      () => [files.id, files.companyId],
      'restrict',
    ),
    check('product_documents_type_chk', oneOf(t.documentType, PRODUCT_DOCUMENT_TYPES)),
    index('ix_product_documents_product').on(t.productId),
  ],
);

export const productSpecifications = pgTable(
  'product_specifications',
  {
    id: pk(),
    productId: uuid().notNull(),
    companyId: uuid().notNull(),
    definitionId: fk(() => productSpecificationDefinitions.id),
    valueText: text(),
    valueNumber: numeric({ precision: 24, scale: 8 }),
    valueBoolean: boolean(),
    valueMin: numeric({ precision: 24, scale: 8 }),
    valueMax: numeric({ precision: 24, scale: 8 }),
    uomId: fkOpt(() => unitsOfMeasure.id),
    ...stamps(),
  },
  (t) => [
    tenantFk('product_specifications_product_fk', [t.productId, t.companyId], () => [
      products.id,
      products.companyId,
    ]),
    unique('ux_product_specifications').on(t.productId, t.definitionId),
    // Shape check; the value-vs-definition type match is enforced by trigger app.validate_spec_value().
    check(
      'product_specifications_one_shape_chk',
      sql`(${t.valueText} is not null)::int + (${t.valueNumber} is not null)::int + (${t.valueBoolean} is not null)::int + (${t.valueMin} is not null or ${t.valueMax} is not null)::int = 1`,
    ),
    check(
      'product_specifications_range_chk',
      sql`${t.valueMin} is null or ${t.valueMax} is null or ${t.valueMin} <= ${t.valueMax}`,
    ),
    index('ix_product_specifications_definition_number').on(t.definitionId, t.valueNumber),
    index('ix_product_specifications_definition_text').on(t.definitionId, t.valueText),
  ],
);

export const productCertifications = pgTable(
  'product_certifications',
  {
    id: pk(),
    productId: uuid().notNull(),
    companyId: uuid().notNull(),
    certificationId: fk(() => certifications.id),
    issuerId: fkOpt(() => certificationIssuers.id),
    certificateNumber: text(),
    validFrom: date({ mode: 'string' }),
    validUntil: date({ mode: 'string' }),
    fileId: uuid(),
    createdAt: createdAt(),
  },
  (t) => [
    tenantFk('product_certifications_product_fk', [t.productId, t.companyId], () => [
      products.id,
      products.companyId,
    ]),
    tenantFk(
      'product_certifications_file_fk',
      [t.fileId, t.companyId],
      () => [files.id, files.companyId],
      'restrict',
    ),
    check(
      'product_certifications_dates_chk',
      sql`${t.validFrom} is null or ${t.validUntil} is null or ${t.validFrom} <= ${t.validUntil}`,
    ),
    index('ix_product_certifications_product').on(t.productId),
    index('ix_product_certifications_cert').on(t.certificationId),
  ],
);

export const productHsCodes = pgTable(
  'product_hs_codes',
  {
    productId: uuid().notNull(),
    companyId: uuid().notNull(),
    hsCodeId: fk(() => hsCodes.id),
    isPrimary: boolean().notNull().default(false),
  },
  (t) => [
    primaryKey({ name: 'pk_product_hs_codes', columns: [t.productId, t.hsCodeId] }),
    tenantFk('product_hs_codes_product_fk', [t.productId, t.companyId], () => [
      products.id,
      products.companyId,
    ]),
    index('ix_product_hs_codes_hs').on(t.hsCodeId),
  ],
);

export const LISTING_STATUS = ['draft', 'active', 'paused', 'archived'] as const;
export const sellerProductListings = pgTable(
  'seller_product_listings',
  {
    id: pk(),
    companyId: uuid().notNull(),
    productId: uuid().notNull(),
    minOrderQty: numeric({ precision: 20, scale: 6 }),
    moqUomId: fkOpt(() => unitsOfMeasure.id),
    priceMin: numeric({ precision: 20, scale: 4 }),
    priceMax: numeric({ precision: 20, scale: 4 }),
    currencyId: fkOpt(() => currencies.id),
    leadTimeDaysMin: smallint(),
    leadTimeDaysMax: smallint(),
    monthlyCapacity: numeric({ precision: 20, scale: 6 }),
    capacityUomId: fkOpt(() => unitsOfMeasure.id),
    incotermId: fkOpt(() => incoterms.id),
    originPortId: fkOpt(() => ports.id),
    status: enumText(LISTING_STATUS).notNull().default('draft'),
    validUntil: tstz(),
    version: integer().notNull().default(1),
    ...stamps(),
  },
  (t) => [
    tenantFk('seller_product_listings_product_fk', [t.productId, t.companyId], () => [
      products.id,
      products.companyId,
    ]),
    unique('ux_seller_product_listings_id_company').on(t.id, t.companyId),
    check('seller_product_listings_status_chk', oneOf(t.status, LISTING_STATUS)),
    check(
      'seller_product_listings_price_chk',
      sql`${t.priceMin} is null or ${t.priceMax} is null or ${t.priceMin} <= ${t.priceMax}`,
    ),
    check(
      'seller_product_listings_price_currency_chk',
      sql`(${t.priceMin} is null and ${t.priceMax} is null) or ${t.currencyId} is not null`,
    ),
    check(
      'seller_product_listings_moq_chk',
      sql`${t.minOrderQty} is null or (${t.minOrderQty} > 0 and ${t.moqUomId} is not null)`,
    ),
    check(
      'seller_product_listings_lead_chk',
      sql`${t.leadTimeDaysMin} is null or ${t.leadTimeDaysMax} is null or ${t.leadTimeDaysMin} <= ${t.leadTimeDaysMax}`,
    ),
    check(
      'seller_product_listings_nonneg_chk',
      sql`coalesce(${t.priceMin}, 0) >= 0 and coalesce(${t.monthlyCapacity}, 0) >= 0`,
    ),
    index('ix_seller_product_listings_company').on(t.companyId, t.status, t.createdAt.desc().nullsFirst()),
    index('ix_seller_product_listings_product').on(t.productId),
    index('ix_seller_product_listings_active')
      .on(t.status, t.validUntil)
      .where(sql`${t.status} = 'active'`),
  ],
);
