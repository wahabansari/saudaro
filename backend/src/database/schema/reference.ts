import { sql } from 'drizzle-orm';
import {
  boolean,
  char,
  check,
  index,
  integer,
  numeric,
  pgTable,
  primaryKey,
  smallint,
  text,
  unique,
  uniqueIndex,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { enumText, fk, fkOpt, oneOf, pk, stamps } from './_helpers.ts';

/**
 * Global reference data. Not tenant-owned: readable by every authenticated role, writable only
 * by the migration role / platform administrators (no INSERT/UPDATE/DELETE grant to the app role).
 * Natural codes follow international standards (ISO 3166/4217/639, UN/LOCODE, UN/CEFACT Rec 20/21,
 * Incoterms(R), WCO HS) and are unique; surrogate uuid keys are used for all foreign keys.
 */

export const currencies = pgTable(
  'currencies',
  {
    id: pk(),
    code: char({ length: 3 }).notNull().unique(), // ISO 4217 alpha
    numericCode: char({ length: 3 }), // ISO 4217 numeric
    name: text().notNull(),
    symbol: text(),
    minorUnits: smallint().notNull().default(2),
    isActive: boolean().notNull().default(true),
    ...stamps(),
  },
  (t) => [
    check('currencies_code_chk', sql`${t.code} ~ '^[A-Z]{3}$'`),
    check('currencies_minor_units_chk', sql`${t.minorUnits} between 0 and 6`),
  ],
);

export const countries = pgTable(
  'countries',
  {
    id: pk(),
    iso2: char({ length: 2 }).notNull().unique(), // ISO 3166-1 alpha-2
    iso3: char({ length: 3 }).notNull().unique(),
    numericCode: char({ length: 3 }),
    name: text().notNull(),
    officialName: text(),
    region: text(),
    subregion: text(),
    callingCode: text(),
    defaultCurrencyId: fkOpt(() => currencies.id),
    isActive: boolean().notNull().default(true),
    ...stamps(),
  },
  (t) => [
    check('countries_iso2_chk', sql`${t.iso2} ~ '^[A-Z]{2}$'`),
    check('countries_iso3_chk', sql`${t.iso3} ~ '^[A-Z]{3}$'`),
    index('ix_countries_name').on(t.name),
  ],
);

export const statesProvinces = pgTable(
  'states_provinces',
  {
    id: pk(),
    countryId: fk(() => countries.id),
    code: text().notNull(), // ISO 3166-2, e.g. PK-PB
    name: text().notNull(),
    subdivisionType: text(),
    isActive: boolean().notNull().default(true),
    ...stamps(),
  },
  (t) => [unique('ux_states_provinces_country_code').on(t.countryId, t.code)],
);

export const cities = pgTable(
  'cities',
  {
    id: pk(),
    countryId: fk(() => countries.id),
    stateProvinceId: fkOpt(() => statesProvinces.id),
    name: text().notNull(),
    asciiName: text(),
    geonameId: integer().unique(),
    latitude: numeric({ precision: 9, scale: 6 }),
    longitude: numeric({ precision: 9, scale: 6 }),
    isActive: boolean().notNull().default(true),
    ...stamps(),
  },
  (t) => [
    index('ix_cities_country_name').on(t.countryId, t.name),
    index('ix_cities_state').on(t.stateProvinceId),
    check('cities_lat_chk', sql`${t.latitude} is null or ${t.latitude} between -90 and 90`),
    check('cities_lng_chk', sql`${t.longitude} is null or ${t.longitude} between -180 and 180`),
  ],
);

export const PORT_TYPES = ['sea', 'air', 'inland', 'rail', 'road'] as const;
export const ports = pgTable(
  'ports',
  {
    id: pk(),
    unLocode: char({ length: 5 }).notNull().unique(), // UN/LOCODE, e.g. PKKHI
    name: text().notNull(),
    countryId: fk(() => countries.id),
    cityId: fkOpt(() => cities.id),
    portType: enumText(PORT_TYPES).notNull(),
    latitude: numeric({ precision: 9, scale: 6 }),
    longitude: numeric({ precision: 9, scale: 6 }),
    isActive: boolean().notNull().default(true),
    ...stamps(),
  },
  (t) => [
    check('ports_type_chk', oneOf(t.portType, PORT_TYPES)),
    check('ports_locode_chk', sql`${t.unLocode} ~ '^[A-Z]{2}[A-Z0-9]{3}$'`),
    index('ix_ports_country').on(t.countryId, t.portType),
  ],
);

export const UOM_DIMENSIONS = ['mass', 'length', 'volume', 'area', 'count', 'time', 'other'] as const;
export const unitsOfMeasure = pgTable(
  'units_of_measure',
  {
    id: pk(),
    code: text().notNull().unique(), // UN/CEFACT Recommendation 20 code (KGM, TNE, PCE, ...)
    symbol: text().notNull(),
    name: text().notNull(),
    dimension: enumText(UOM_DIMENSIONS).notNull(),
    baseUnitId: fkOpt((): AnyPgColumn => unitsOfMeasure.id),
    toBaseFactor: numeric({ precision: 24, scale: 12 }),
    isActive: boolean().notNull().default(true),
    ...stamps(),
  },
  (t) => [
    check('uom_dimension_chk', oneOf(t.dimension, UOM_DIMENSIONS)),
    check('uom_factor_chk', sql`${t.toBaseFactor} is null or ${t.toBaseFactor} > 0`),
  ],
);

export const languages = pgTable('languages', {
  id: pk(),
  code: text().notNull().unique(), // BCP 47 / ISO 639-1
  name: text().notNull(),
  nativeName: text(),
  isRtl: boolean().notNull().default(false),
  isActive: boolean().notNull().default(true),
  ...stamps(),
});

export const incoterms = pgTable(
  'incoterms',
  {
    id: pk(),
    code: char({ length: 3 }).notNull(), // EXW, FCA, FOB, CIF, DAP, DDP ...
    versionYear: smallint().notNull(), // 2010, 2020 ...
    name: text().notNull(),
    modeScope: text().notNull().default('any'), // any | sea_inland_waterway
    namedPlaceKind: text().notNull(), // what the named location means for this rule
    sellerArrangesMainCarriage: boolean().notNull(),
    isActive: boolean().notNull().default(true),
    ...stamps(),
  },
  (t) => [
    unique('ux_incoterms_code_version').on(t.code, t.versionYear),
    check('incoterms_scope_chk', oneOf(t.modeScope, ['any', 'sea_inland_waterway'])),
    check('incoterms_year_chk', sql`${t.versionYear} between 1936 and 2100`),
  ],
);

export const PAYMENT_TERM_CATEGORIES = [
  'advance',
  'open_account',
  'letter_of_credit',
  'documentary_collection',
  'other',
] as const;
export const paymentTerms = pgTable(
  'payment_terms',
  {
    id: pk(),
    code: text().notNull().unique(),
    name: text().notNull(),
    category: enumText(PAYMENT_TERM_CATEGORIES).notNull(),
    description: text(),
    isActive: boolean().notNull().default(true),
    ...stamps(),
  },
  (t) => [check('payment_terms_category_chk', oneOf(t.category, PAYMENT_TERM_CATEGORIES))],
);

export const packagingTypes = pgTable('packaging_types', {
  id: pk(),
  code: text().notNull().unique(),
  name: text().notNull(),
  description: text(),
  isActive: boolean().notNull().default(true),
  ...stamps(),
});

export const shipmentModes = pgTable('shipment_modes', {
  id: pk(),
  code: text().notNull().unique(),
  name: text().notNull(),
  isActive: boolean().notNull().default(true),
  ...stamps(),
});

export const businessTypes = pgTable('business_types', {
  id: pk(),
  code: text().notNull().unique(),
  name: text().notNull(),
  description: text(),
  isActive: boolean().notNull().default(true),
  ...stamps(),
});

export const productCategories = pgTable(
  'product_categories',
  {
    id: pk(),
    parentId: fkOpt((): AnyPgColumn => productCategories.id),
    slug: text().notNull().unique(),
    name: text().notNull(),
    depth: smallint().notNull().default(0),
    path: text().notNull(), // dotted slug path, e.g. agriculture.rice.basmati
    sortOrder: integer().notNull().default(0),
    isActive: boolean().notNull().default(true),
    ...stamps(),
  },
  (t) => [
    check('product_categories_depth_chk', sql`${t.depth} between 0 and 8`),
    index('ix_product_categories_parent').on(t.parentId, t.sortOrder),
    uniqueIndex('ux_product_categories_path').on(t.path),
  ],
);

/** Transitive closure (ancestor, descendant, depth) so subtree queries need no recursion. */
export const productCategoryClosure = pgTable(
  'product_category_closure',
  {
    ancestorId: fk(() => productCategories.id, 'cascade'),
    descendantId: fk(() => productCategories.id, 'cascade'),
    depth: smallint().notNull(),
  },
  (t) => [
    primaryKey({ name: 'pk_product_category_closure', columns: [t.ancestorId, t.descendantId] }),
    index('ix_product_category_closure_desc').on(t.descendantId, t.depth),
    check('product_category_closure_depth_chk', sql`${t.depth} >= 0`),
  ],
);

export const hsCodes = pgTable(
  'hs_codes',
  {
    id: pk(),
    code: text().notNull(), // digits only: 2, 4 or 6 (national tariff lines extend per country elsewhere)
    level: smallint().notNull(),
    parentId: fkOpt((): AnyPgColumn => hsCodes.id),
    hsVersion: text().notNull().default('HS2022'),
    description: text().notNull(),
    isActive: boolean().notNull().default(true),
    ...stamps(),
  },
  (t) => [
    unique('ux_hs_codes_code_version').on(t.code, t.hsVersion),
    check('hs_codes_level_chk', sql`${t.level} in (2, 4, 6)`),
    check('hs_codes_code_chk', sql`${t.code} ~ '^[0-9]{2}([0-9]{2}([0-9]{2})?)?$' and length(${t.code}) = ${t.level}`),
    index('ix_hs_codes_parent').on(t.parentId),
  ],
);

export const certificationIssuers = pgTable('certification_issuers', {
  id: pk(),
  code: text().notNull().unique(),
  name: text().notNull(),
  countryId: fkOpt(() => countries.id),
  website: text(),
  isActive: boolean().notNull().default(true),
  ...stamps(),
});

export const CERTIFICATION_CATEGORIES = [
  'quality',
  'food_safety',
  'environmental',
  'social',
  'organic',
  'halal',
  'product_safety',
  'other',
] as const;
export const certifications = pgTable(
  'certifications',
  {
    id: pk(),
    code: text().notNull().unique(),
    name: text().notNull(),
    category: enumText(CERTIFICATION_CATEGORIES).notNull(),
    defaultIssuerId: fkOpt(() => certificationIssuers.id),
    description: text(),
    isActive: boolean().notNull().default(true),
    ...stamps(),
  },
  (t) => [check('certifications_category_chk', oneOf(t.category, CERTIFICATION_CATEGORIES))],
);
