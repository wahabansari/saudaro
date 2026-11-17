import { sql } from 'drizzle-orm';
import {
  boolean,
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
  uuid,
} from 'drizzle-orm/pg-core';
import { citext, createdAt, enumText, fk, fkOpt, oneOf, pk, stamps, tsvector, tstz } from './_helpers.ts';
import { businessTypes, cities, countries, currencies, languages, statesProvinces } from './reference.ts';
import { users } from './identity.ts';

/**
 * Companies are the PRIMARY TENANT BOUNDARY. A company may act as buyer and seller (one identity,
 * two optional profiles). Users reach companies only through company_memberships; a user id is
 * never used as a tenant id.
 */

export const COMPANY_STATUS = ['draft', 'active', 'suspended', 'closed'] as const;
export const companies = pgTable(
  'companies',
  {
    id: pk(),
    legalName: text().notNull(),
    displayName: text().notNull(),
    slug: citext().notNull(),
    status: enumText(COMPANY_STATUS).notNull().default('draft'),
    countryId: fk(() => countries.id), // country of registration
    createdByUserId: fk(() => users.id),
    /** Maintained ONLY by trigger from company_verification_levels; never client-writable. */
    isBusinessVerified: boolean().notNull().default(false),
    suspendedAt: tstz(),
    suspensionReason: text(),
    closedAt: tstz(),
    version: integer().notNull().default(1),
    searchVector: tsvector().generatedAlwaysAs(
      sql`to_tsvector('simple'::regconfig, coalesce(legal_name, '') || ' ' || coalesce(display_name, ''))`,
    ),
    ...stamps(),
  },
  (t) => [
    uniqueIndex('ux_companies_slug').on(t.slug),
    check('companies_status_chk', oneOf(t.status, COMPANY_STATUS)),
    check('companies_slug_chk', sql`${t.slug} ~ '^[a-z0-9]([a-z0-9-]{1,62})[a-z0-9]$'`),
    check(
      'companies_suspension_chk',
      sql`(${t.status} = 'suspended') = (${t.suspendedAt} is not null)`,
    ),
    index('ix_companies_country_status').on(t.countryId, t.status),
    index('ix_companies_creator').on(t.createdByUserId),
  ],
);

export const EMPLOYEE_RANGES = ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'] as const;
export const companyProfiles = pgTable(
  'company_profiles',
  {
    companyId: uuid()
      .primaryKey()
      .references(() => companies.id, { onDelete: 'cascade' }),
    tagline: text(),
    description: text(),
    yearEstablished: smallint(),
    employeeCountRange: enumText(EMPLOYEE_RANGES),
    website: text(),
    /** Only an explicitly published profile is visible to other companies. */
    isPublic: boolean().notNull().default(false),
    publishedAt: tstz(),
    ...stamps(),
  },
  (t) => [
    check('company_profiles_year_chk', sql`${t.yearEstablished} is null or ${t.yearEstablished} between 1800 and 2200`),
    check('company_profiles_employees_chk', sql`${t.employeeCountRange} is null or ${oneOf(t.employeeCountRange, EMPLOYEE_RANGES)}`),
    check('company_profiles_website_chk', sql`${t.website} is null or ${t.website} ~* '^https?://'`),
  ],
);

export const ADDRESS_TYPES = ['registered', 'operational', 'factory', 'warehouse', 'billing', 'other'] as const;
export const companyAddresses = pgTable(
  'company_addresses',
  {
    id: pk(),
    companyId: fk(() => companies.id, 'cascade'),
    addressType: enumText(ADDRESS_TYPES).notNull(),
    line1: text().notNull(),
    line2: text(),
    cityId: fkOpt(() => cities.id),
    cityName: text().notNull(),
    stateProvinceId: fkOpt(() => statesProvinces.id),
    stateName: text(),
    postalCode: text(),
    countryId: fk(() => countries.id),
    latitude: numeric({ precision: 9, scale: 6 }),
    longitude: numeric({ precision: 9, scale: 6 }),
    isPublic: boolean().notNull().default(false),
    verifiedAt: tstz(),
    ...stamps(),
  },
  (t) => [
    unique('ux_company_addresses_id_company').on(t.id, t.companyId),
    check('company_addresses_type_chk', oneOf(t.addressType, ADDRESS_TYPES)),
    index('ix_company_addresses_company').on(t.companyId, t.addressType),
    // Exactly one registered office per company.
    uniqueIndex('ux_company_addresses_registered')
      .on(t.companyId)
      .where(sql`${t.addressType} = 'registered'`),
  ],
);

export const CONTACT_TYPES = ['sales', 'export', 'purchasing', 'finance', 'legal', 'general'] as const;
export const companyContacts = pgTable(
  'company_contacts',
  {
    id: pk(),
    companyId: fk(() => companies.id, 'cascade'),
    userId: fkOpt(() => users.id, 'set null'),
    fullName: text().notNull(),
    jobTitle: text(),
    email: citext(),
    phoneE164: text('phone_e164'),
    contactType: enumText(CONTACT_TYPES).notNull().default('general'),
    isPublic: boolean().notNull().default(false),
    ...stamps(),
  },
  (t) => [
    check('company_contacts_type_chk', oneOf(t.contactType, CONTACT_TYPES)),
    check('company_contacts_reachable_chk', sql`${t.email} is not null or ${t.phoneE164} is not null`),
    index('ix_company_contacts_company').on(t.companyId),
  ],
);

export const companySettings = pgTable(
  'company_settings',
  {
    companyId: uuid()
      .primaryKey()
      .references(() => companies.id, { onDelete: 'cascade' }),
    defaultCurrencyId: fkOpt(() => currencies.id),
    defaultLanguageId: fkOpt(() => languages.id),
    timezone: text().notNull().default('UTC'),
    defaultQuoteValidityDays: smallint().notNull().default(30),
    defaultRfqVisibility: enumText(['public', 'private', 'invited'] as const).notNull().default('public'),
    requireMfaForAdmins: boolean().notNull().default(false),
    ...stamps(),
  },
  (t) => [
    check('company_settings_validity_chk', sql`${t.defaultQuoteValidityDays} between 1 and 365`),
    check('company_settings_rfq_vis_chk', oneOf(t.defaultRfqVisibility, ['public', 'private', 'invited'])),
  ],
);

export const companyBusinessTypes = pgTable(
  'company_business_types',
  {
    companyId: fk(() => companies.id, 'cascade'),
    businessTypeId: fk(() => businessTypes.id),
    isPrimary: boolean().notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ name: 'pk_company_business_types', columns: [t.companyId, t.businessTypeId] }),
    uniqueIndex('ux_company_business_types_primary')
      .on(t.companyId)
      .where(sql`${t.isPrimary}`),
  ],
);

export const IDENTIFIER_TYPES = [
  'business_registration',
  'tax_id',
  'vat',
  'eori',
  'import_export_license',
  'duns',
  'lei',
  'other',
] as const;
/** Country-specific business registration identifiers. Sensitive: owner company + verifiers only. */
export const companyRegistrationIdentifiers = pgTable(
  'company_registration_identifiers',
  {
    id: pk(),
    companyId: fk(() => companies.id, 'cascade'),
    countryId: fk(() => countries.id),
    identifierType: enumText(IDENTIFIER_TYPES).notNull(),
    identifierValue: text().notNull(),
    issuedAt: tstz(),
    expiresAt: tstz(),
    verifiedAt: tstz(),
    ...stamps(),
  },
  (t) => [
    unique('ux_company_reg_ids_company').on(t.companyId, t.countryId, t.identifierType, t.identifierValue),
    // A VERIFIED identifier can belong to only one company (blocks identity reuse/impersonation).
    uniqueIndex('ux_company_reg_ids_verified_global')
      .on(t.countryId, t.identifierType, t.identifierValue)
      .where(sql`${t.verifiedAt} is not null`),
    check('company_reg_ids_type_chk', oneOf(t.identifierType, IDENTIFIER_TYPES)),
    index('ix_company_reg_ids_company').on(t.companyId),
  ],
);

// ---------------------------------------------------------------- RBAC

export const companyRoles = pgTable(
  'company_roles',
  {
    id: pk(),
    /** NULL = platform-defined system role; otherwise a custom role private to that company. */
    companyId: fkOpt(() => companies.id, 'cascade'),
    key: text().notNull(),
    name: text().notNull(),
    description: text(),
    /** Hierarchy rank (0-100). Users can only grant roles strictly below their own level. */
    level: smallint().notNull(),
    isSystem: boolean().notNull().default(false),
    ...stamps(),
  },
  (t) => [
    check('company_roles_level_chk', sql`${t.level} between 0 and 100`),
    check('company_roles_system_chk', sql`(${t.isSystem}) = (${t.companyId} is null)`),
    check('company_roles_key_chk', sql`${t.key} ~ '^[a-z][a-z0-9_]{1,40}$'`),
    uniqueIndex('ux_company_roles_system_key').on(t.key).where(sql`${t.companyId} is null`),
    uniqueIndex('ux_company_roles_company_key').on(t.companyId, t.key).where(sql`${t.companyId} is not null`),
    // Custom roles can never be created at or above 'owner' level.
    check('company_roles_custom_level_chk', sql`${t.isSystem} or ${t.level} < 100`),
  ],
);

export const permissions = pgTable(
  'permissions',
  {
    id: pk(),
    key: text().notNull().unique(), // e.g. rfq.create, quotation.accept, members.manage
    category: text().notNull(),
    description: text().notNull(),
    createdAt: createdAt(),
  },
  (t) => [check('permissions_key_chk', sql`${t.key} ~ '^[a-z_]+(\\.[a-z_]+)+$'`)],
);

export const companyRolePermissions = pgTable(
  'company_role_permissions',
  {
    roleId: fk(() => companyRoles.id, 'cascade'),
    permissionId: fk(() => permissions.id, 'cascade'),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ name: 'pk_company_role_permissions', columns: [t.roleId, t.permissionId] }),
    index('ix_company_role_permissions_perm').on(t.permissionId),
  ],
);

export const MEMBERSHIP_STATUS = ['active', 'suspended', 'removed'] as const;
export const companyMemberships = pgTable(
  'company_memberships',
  {
    id: pk(),
    companyId: fk(() => companies.id, 'cascade'),
    userId: fk(() => users.id, 'cascade'),
    roleId: fk(() => companyRoles.id),
    status: enumText(MEMBERSHIP_STATUS).notNull().default('active'),
    invitedByUserId: fkOpt(() => users.id, 'set null'),
    joinedAt: tstz().notNull().defaultNow(),
    removedAt: tstz(),
    removedByUserId: fkOpt(() => users.id, 'set null'),
    version: integer().notNull().default(1),
    ...stamps(),
  },
  (t) => [
    unique('ux_company_memberships_company_user').on(t.companyId, t.userId),
    unique('ux_company_memberships_id_company').on(t.id, t.companyId),
    check('company_memberships_status_chk', oneOf(t.status, MEMBERSHIP_STATUS)),
    check('company_memberships_removed_chk', sql`(${t.status} = 'removed') = (${t.removedAt} is not null)`),
    index('ix_company_memberships_user_status').on(t.userId, t.status),
    index('ix_company_memberships_company_status').on(t.companyId, t.status),
    index('ix_company_memberships_role').on(t.roleId),
  ],
);

export const INVITATION_STATUS = ['pending', 'accepted', 'revoked', 'expired'] as const;
export const companyInvitations = pgTable(
  'company_invitations',
  {
    id: pk(),
    companyId: fk(() => companies.id, 'cascade'),
    email: citext().notNull(),
    roleId: fk(() => companyRoles.id),
    tokenHash: text().notNull().unique(), // SHA-256; raw token only travels by email
    status: enumText(INVITATION_STATUS).notNull().default('pending'),
    invitedByUserId: fk(() => users.id),
    expiresAt: tstz().notNull(),
    acceptedByUserId: fkOpt(() => users.id),
    acceptedAt: tstz(),
    createdAt: createdAt(),
  },
  (t) => [
    check('company_invitations_status_chk', oneOf(t.status, INVITATION_STATUS)),
    check('company_invitations_accept_chk', sql`(${t.status} = 'accepted') = (${t.acceptedAt} is not null)`),
    uniqueIndex('ux_company_invitations_pending')
      .on(t.companyId, t.email)
      .where(sql`${t.status} = 'pending'`),
    index('ix_company_invitations_company').on(t.companyId, t.status),
    index('ix_company_invitations_email').on(t.email),
  ],
);
