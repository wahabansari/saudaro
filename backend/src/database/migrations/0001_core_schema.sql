CREATE TABLE "business_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "business_types_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "certification_issuers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"country_id" uuid,
	"website" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "certification_issuers_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "certifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"default_issuer_id" uuid,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "certifications_code_unique" UNIQUE("code"),
	CONSTRAINT "certifications_category_chk" CHECK ("certifications"."category" in ('quality', 'food_safety', 'environmental', 'social', 'organic', 'halal', 'product_safety', 'other'))
);
--> statement-breakpoint
CREATE TABLE "cities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"country_id" uuid NOT NULL,
	"state_province_id" uuid,
	"name" text NOT NULL,
	"ascii_name" text,
	"geoname_id" integer,
	"latitude" numeric(9, 6),
	"longitude" numeric(9, 6),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cities_geonameId_unique" UNIQUE("geoname_id"),
	CONSTRAINT "cities_lat_chk" CHECK ("cities"."latitude" is null or "cities"."latitude" between -90 and 90),
	CONSTRAINT "cities_lng_chk" CHECK ("cities"."longitude" is null or "cities"."longitude" between -180 and 180)
);
--> statement-breakpoint
CREATE TABLE "countries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"iso2" char(2) NOT NULL,
	"iso3" char(3) NOT NULL,
	"numeric_code" char(3),
	"name" text NOT NULL,
	"official_name" text,
	"region" text,
	"subregion" text,
	"calling_code" text,
	"default_currency_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "countries_iso2_unique" UNIQUE("iso2"),
	CONSTRAINT "countries_iso3_unique" UNIQUE("iso3"),
	CONSTRAINT "countries_iso2_chk" CHECK ("countries"."iso2" ~ '^[A-Z]{2}$'),
	CONSTRAINT "countries_iso3_chk" CHECK ("countries"."iso3" ~ '^[A-Z]{3}$')
);
--> statement-breakpoint
CREATE TABLE "currencies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" char(3) NOT NULL,
	"numeric_code" char(3),
	"name" text NOT NULL,
	"symbol" text,
	"minor_units" smallint DEFAULT 2 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "currencies_code_unique" UNIQUE("code"),
	CONSTRAINT "currencies_code_chk" CHECK ("currencies"."code" ~ '^[A-Z]{3}$'),
	CONSTRAINT "currencies_minor_units_chk" CHECK ("currencies"."minor_units" between 0 and 6)
);
--> statement-breakpoint
CREATE TABLE "hs_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"level" smallint NOT NULL,
	"parent_id" uuid,
	"hs_version" text DEFAULT 'HS2022' NOT NULL,
	"description" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ux_hs_codes_code_version" UNIQUE("code","hs_version"),
	CONSTRAINT "hs_codes_level_chk" CHECK ("hs_codes"."level" in (2, 4, 6)),
	CONSTRAINT "hs_codes_code_chk" CHECK ("hs_codes"."code" ~ '^[0-9]{2}([0-9]{2}([0-9]{2})?)?$' and length("hs_codes"."code") = "hs_codes"."level")
);
--> statement-breakpoint
CREATE TABLE "incoterms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" char(3) NOT NULL,
	"version_year" smallint NOT NULL,
	"name" text NOT NULL,
	"mode_scope" text DEFAULT 'any' NOT NULL,
	"named_place_kind" text NOT NULL,
	"seller_arranges_main_carriage" boolean NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ux_incoterms_code_version" UNIQUE("code","version_year"),
	CONSTRAINT "incoterms_scope_chk" CHECK ("incoterms"."mode_scope" in ('any', 'sea_inland_waterway')),
	CONSTRAINT "incoterms_year_chk" CHECK ("incoterms"."version_year" between 1936 and 2100)
);
--> statement-breakpoint
CREATE TABLE "languages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"native_name" text,
	"is_rtl" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "languages_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "packaging_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "packaging_types_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "payment_terms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_terms_code_unique" UNIQUE("code"),
	CONSTRAINT "payment_terms_category_chk" CHECK ("payment_terms"."category" in ('advance', 'open_account', 'letter_of_credit', 'documentary_collection', 'other'))
);
--> statement-breakpoint
CREATE TABLE "ports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"un_locode" char(5) NOT NULL,
	"name" text NOT NULL,
	"country_id" uuid NOT NULL,
	"city_id" uuid,
	"port_type" text NOT NULL,
	"latitude" numeric(9, 6),
	"longitude" numeric(9, 6),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ports_unLocode_unique" UNIQUE("un_locode"),
	CONSTRAINT "ports_type_chk" CHECK ("ports"."port_type" in ('sea', 'air', 'inland', 'rail', 'road')),
	CONSTRAINT "ports_locode_chk" CHECK ("ports"."un_locode" ~ '^[A-Z]{2}[A-Z0-9]{3}$')
);
--> statement-breakpoint
CREATE TABLE "product_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_id" uuid,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"depth" smallint DEFAULT 0 NOT NULL,
	"path" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_categories_slug_unique" UNIQUE("slug"),
	CONSTRAINT "product_categories_depth_chk" CHECK ("product_categories"."depth" between 0 and 8)
);
--> statement-breakpoint
CREATE TABLE "product_category_closure" (
	"ancestor_id" uuid NOT NULL,
	"descendant_id" uuid NOT NULL,
	"depth" smallint NOT NULL,
	CONSTRAINT "pk_product_category_closure" PRIMARY KEY("ancestor_id","descendant_id"),
	CONSTRAINT "product_category_closure_depth_chk" CHECK ("product_category_closure"."depth" >= 0)
);
--> statement-breakpoint
CREATE TABLE "shipment_modes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shipment_modes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "states_provinces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"country_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"subdivision_type" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ux_states_provinces_country_code" UNIQUE("country_id","code")
);
--> statement-breakpoint
CREATE TABLE "units_of_measure" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"symbol" text NOT NULL,
	"name" text NOT NULL,
	"dimension" text NOT NULL,
	"base_unit_id" uuid,
	"to_base_factor" numeric(24, 12),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "units_of_measure_code_unique" UNIQUE("code"),
	CONSTRAINT "uom_dimension_chk" CHECK ("units_of_measure"."dimension" in ('mass', 'length', 'volume', 'area', 'count', 'time', 'other')),
	CONSTRAINT "uom_factor_chk" CHECK ("units_of_measure"."to_base_factor" is null or "units_of_measure"."to_base_factor" > 0)
);
--> statement-breakpoint
CREATE TABLE "email_verification_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"email" "citext" NOT NULL,
	CONSTRAINT "email_verification_tokens_tokenHash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "password_reset_tokens_tokenHash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "phone_verification_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"phone_e164" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "phone_verification_tokens_tokenHash_unique" UNIQUE("token_hash"),
	CONSTRAINT "phone_verification_tokens_attempts_chk" CHECK ("phone_verification_tokens"."attempts" between 0 and 10)
);
--> statement-breakpoint
CREATE TABLE "user_auth_identities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"provider_subject" text NOT NULL,
	"email_at_provider" "citext",
	"password_hash" text,
	"password_updated_at" timestamp with time zone,
	"last_used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ux_user_auth_identities_provider_subject" UNIQUE("provider","provider_subject"),
	CONSTRAINT "user_auth_identities_local_pw_chk" CHECK (("user_auth_identities"."provider" = 'local') = ("user_auth_identities"."password_hash" is not null))
);
--> statement-breakpoint
CREATE TABLE "user_mfa_methods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"method_type" text NOT NULL,
	"label" text,
	"secret_ciphertext" "bytea",
	"encryption_key_id" text,
	"verified_at" timestamp with time zone,
	"last_used_at" timestamp with time zone,
	"disabled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_mfa_methods_type_chk" CHECK ("user_mfa_methods"."method_type" in ('totp', 'webauthn', 'sms', 'recovery_codes'))
);
--> statement-breakpoint
CREATE TABLE "user_notification_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"category" text NOT NULL,
	"channel" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ux_user_notification_preferences" UNIQUE("user_id","category","channel"),
	CONSTRAINT "user_notification_preferences_category_chk" CHECK ("user_notification_preferences"."category" in ('rfq', 'quotation', 'message', 'deal', 'verification', 'invitation', 'security', 'system')),
	CONSTRAINT "user_notification_preferences_channel_chk" CHECK ("user_notification_preferences"."channel" in ('in_app', 'email', 'push', 'sms')),
	CONSTRAINT "user_notification_preferences_security_chk" CHECK (not ("user_notification_preferences"."category" = 'security' and "user_notification_preferences"."channel" = 'in_app' and "user_notification_preferences"."enabled" = false))
);
--> statement-breakpoint
CREATE TABLE "user_preferences" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"language_code" text DEFAULT 'en' NOT NULL,
	"date_format" text DEFAULT 'YYYY-MM-DD' NOT NULL,
	"marketing_opt_in" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_security_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"ip_address" "inet",
	"user_agent" text,
	"detail" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"family_id" uuid NOT NULL,
	"ip_address" "inet",
	"user_agent" text,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"last_seen_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_sessions_tokenHash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" "citext" NOT NULL,
	"display_name" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"locale" text DEFAULT 'en' NOT NULL,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"email_verified_at" timestamp with time zone,
	"phone_e164" text,
	"phone_verified_at" timestamp with time zone,
	"last_login_at" timestamp with time zone,
	"suspended_at" timestamp with time zone,
	"suspension_reason" text,
	"deletion_requested_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_status_chk" CHECK ("users"."status" in ('pending', 'active', 'suspended', 'deactivated', 'deletion_requested', 'deleted')),
	CONSTRAINT "users_phone_chk" CHECK ("users"."phone_e164" is null or "users"."phone_e164" ~ '^\+[1-9][0-9]{6,14}$'),
	CONSTRAINT "users_email_chk" CHECK (position('@' in "users"."email") > 1)
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"legal_name" text NOT NULL,
	"display_name" text NOT NULL,
	"slug" "citext" NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"country_id" uuid NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"is_business_verified" boolean DEFAULT false NOT NULL,
	"suspended_at" timestamp with time zone,
	"suspension_reason" text,
	"closed_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"search_vector" "tsvector" GENERATED ALWAYS AS (to_tsvector('simple'::regconfig, coalesce(legal_name, '') || ' ' || coalesce(display_name, ''))) STORED,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "companies_status_chk" CHECK ("companies"."status" in ('draft', 'active', 'suspended', 'closed')),
	CONSTRAINT "companies_slug_chk" CHECK ("companies"."slug" ~ '^[a-z0-9]([a-z0-9-]{1,62})[a-z0-9]$'),
	CONSTRAINT "companies_suspension_chk" CHECK (("companies"."status" = 'suspended') = ("companies"."suspended_at" is not null))
);
--> statement-breakpoint
CREATE TABLE "company_addresses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"address_type" text NOT NULL,
	"line1" text NOT NULL,
	"line2" text,
	"city_id" uuid,
	"city_name" text NOT NULL,
	"state_province_id" uuid,
	"state_name" text,
	"postal_code" text,
	"country_id" uuid NOT NULL,
	"latitude" numeric(9, 6),
	"longitude" numeric(9, 6),
	"is_public" boolean DEFAULT false NOT NULL,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ux_company_addresses_id_company" UNIQUE("id","company_id"),
	CONSTRAINT "company_addresses_type_chk" CHECK ("company_addresses"."address_type" in ('registered', 'operational', 'factory', 'warehouse', 'billing', 'other'))
);
--> statement-breakpoint
CREATE TABLE "company_business_types" (
	"company_id" uuid NOT NULL,
	"business_type_id" uuid NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pk_company_business_types" PRIMARY KEY("company_id","business_type_id")
);
--> statement-breakpoint
CREATE TABLE "company_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"user_id" uuid,
	"full_name" text NOT NULL,
	"job_title" text,
	"email" "citext",
	"phone_e164" text,
	"contact_type" text DEFAULT 'general' NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "company_contacts_type_chk" CHECK ("company_contacts"."contact_type" in ('sales', 'export', 'purchasing', 'finance', 'legal', 'general')),
	CONSTRAINT "company_contacts_reachable_chk" CHECK ("company_contacts"."email" is not null or "company_contacts"."phone_e164" is not null)
);
--> statement-breakpoint
CREATE TABLE "company_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"email" "citext" NOT NULL,
	"role_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"invited_by_user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_by_user_id" uuid,
	"accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "company_invitations_tokenHash_unique" UNIQUE("token_hash"),
	CONSTRAINT "company_invitations_status_chk" CHECK ("company_invitations"."status" in ('pending', 'accepted', 'revoked', 'expired')),
	CONSTRAINT "company_invitations_accept_chk" CHECK (("company_invitations"."status" = 'accepted') = ("company_invitations"."accepted_at" is not null))
);
--> statement-breakpoint
CREATE TABLE "company_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"invited_by_user_id" uuid,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"removed_at" timestamp with time zone,
	"removed_by_user_id" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ux_company_memberships_company_user" UNIQUE("company_id","user_id"),
	CONSTRAINT "ux_company_memberships_id_company" UNIQUE("id","company_id"),
	CONSTRAINT "company_memberships_status_chk" CHECK ("company_memberships"."status" in ('active', 'suspended', 'removed')),
	CONSTRAINT "company_memberships_removed_chk" CHECK (("company_memberships"."status" = 'removed') = ("company_memberships"."removed_at" is not null))
);
--> statement-breakpoint
CREATE TABLE "company_profiles" (
	"company_id" uuid PRIMARY KEY NOT NULL,
	"tagline" text,
	"description" text,
	"year_established" smallint,
	"employee_count_range" text,
	"website" text,
	"is_public" boolean DEFAULT false NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "company_profiles_year_chk" CHECK ("company_profiles"."year_established" is null or "company_profiles"."year_established" between 1800 and 2200),
	CONSTRAINT "company_profiles_employees_chk" CHECK ("company_profiles"."employee_count_range" is null or "company_profiles"."employee_count_range" in ('1-10', '11-50', '51-200', '201-500', '501-1000', '1000+')),
	CONSTRAINT "company_profiles_website_chk" CHECK ("company_profiles"."website" is null or "company_profiles"."website" ~* '^https?://')
);
--> statement-breakpoint
CREATE TABLE "company_registration_identifiers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"country_id" uuid NOT NULL,
	"identifier_type" text NOT NULL,
	"identifier_value" text NOT NULL,
	"issued_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ux_company_reg_ids_company" UNIQUE("company_id","country_id","identifier_type","identifier_value"),
	CONSTRAINT "company_reg_ids_type_chk" CHECK ("company_registration_identifiers"."identifier_type" in ('business_registration', 'tax_id', 'vat', 'eori', 'import_export_license', 'duns', 'lei', 'other'))
);
--> statement-breakpoint
CREATE TABLE "company_role_permissions" (
	"role_id" uuid NOT NULL,
	"permission_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pk_company_role_permissions" PRIMARY KEY("role_id","permission_id")
);
--> statement-breakpoint
CREATE TABLE "company_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"level" smallint NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "company_roles_level_chk" CHECK ("company_roles"."level" between 0 and 100),
	CONSTRAINT "company_roles_system_chk" CHECK (("company_roles"."is_system") = ("company_roles"."company_id" is null)),
	CONSTRAINT "company_roles_key_chk" CHECK ("company_roles"."key" ~ '^[a-z][a-z0-9_]{1,40}$'),
	CONSTRAINT "company_roles_custom_level_chk" CHECK ("company_roles"."is_system" or "company_roles"."level" < 100)
);
--> statement-breakpoint
CREATE TABLE "company_settings" (
	"company_id" uuid PRIMARY KEY NOT NULL,
	"default_currency_id" uuid,
	"default_language_id" uuid,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"default_quote_validity_days" smallint DEFAULT 30 NOT NULL,
	"default_rfq_visibility" text DEFAULT 'public' NOT NULL,
	"require_mfa_for_admins" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "company_settings_validity_chk" CHECK ("company_settings"."default_quote_validity_days" between 1 and 365),
	CONSTRAINT "company_settings_rfq_vis_chk" CHECK ("company_settings"."default_rfq_visibility" in ('public', 'private', 'invited'))
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"category" text NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "permissions_key_unique" UNIQUE("key"),
	CONSTRAINT "permissions_key_chk" CHECK ("permissions"."key" ~ '^[a-z_]+(\.[a-z_]+)+$')
);
--> statement-breakpoint
CREATE TABLE "company_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"file_id" uuid NOT NULL,
	"document_type" text NOT NULL,
	"title" text NOT NULL,
	"visibility" text DEFAULT 'private' NOT NULL,
	"expires_at" timestamp with time zone,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ux_company_documents_file" UNIQUE("file_id"),
	CONSTRAINT "company_documents_type_chk" CHECK ("company_documents"."document_type" in ('logo', 'business_license', 'certificate_of_incorporation', 'tax_certificate', 'export_license', 'catalog', 'brochure', 'other')),
	CONSTRAINT "company_documents_visibility_chk" CHECK ("company_documents"."visibility" in ('private', 'verifiers', 'public'))
);
--> statement-breakpoint
CREATE TABLE "file_access_grants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"file_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"grantee_company_id" uuid,
	"grantee_user_id" uuid,
	"reason" text,
	"granted_by_user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "file_access_grants_one_grantee_chk" CHECK (("file_access_grants"."grantee_company_id" is not null)::int + ("file_access_grants"."grantee_user_id" is not null)::int = 1)
);
--> statement-breakpoint
CREATE TABLE "file_scan_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"file_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"scanner" text NOT NULL,
	"scanner_version" text,
	"result" text NOT NULL,
	"signature" text,
	"scanned_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "file_scan_results_result_chk" CHECK ("file_scan_results"."result" in ('clean', 'infected', 'error'))
);
--> statement-breakpoint
CREATE TABLE "file_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"file_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"version_no" integer NOT NULL,
	"storage_key" text NOT NULL,
	"size_bytes" bigint NOT NULL,
	"sha256" char(64) NOT NULL,
	"uploaded_by_user_id" uuid NOT NULL,
	"scan_status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ux_file_versions_file_no" UNIQUE("file_id","version_no"),
	CONSTRAINT "file_versions_no_chk" CHECK ("file_versions"."version_no" >= 1),
	CONSTRAINT "file_versions_sha256_chk" CHECK ("file_versions"."sha256" ~ '^[0-9a-f]{64}$')
);
--> statement-breakpoint
CREATE TABLE "files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"uploaded_by_user_id" uuid NOT NULL,
	"storage_provider" text NOT NULL,
	"bucket" text NOT NULL,
	"storage_key" text NOT NULL,
	"original_filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" bigint NOT NULL,
	"sha256" char(64) NOT NULL,
	"access_level" text DEFAULT 'private' NOT NULL,
	"status" text DEFAULT 'pending_upload' NOT NULL,
	"scan_status" text DEFAULT 'pending' NOT NULL,
	"resource_type" text,
	"resource_id" uuid,
	"retention_status" text DEFAULT 'active' NOT NULL,
	"retain_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "ux_files_id_company" UNIQUE("id","company_id"),
	CONSTRAINT "ux_files_storage_object" UNIQUE("storage_provider","bucket","storage_key"),
	CONSTRAINT "files_size_chk" CHECK ("files"."size_bytes" > 0 and "files"."size_bytes" <= 524288000),
	CONSTRAINT "files_sha256_chk" CHECK ("files"."sha256" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "files_mime_chk" CHECK ("files"."mime_type" ~ '^[a-z0-9.+-]+/[a-z0-9.+-]+$'),
	CONSTRAINT "files_filename_chk" CHECK ("files"."original_filename" !~ '[/\\]' and length("files"."original_filename") between 1 and 255),
	CONSTRAINT "files_status_chk" CHECK ("files"."status" in ('pending_upload', 'available', 'quarantined', 'deleted')),
	CONSTRAINT "files_scan_chk" CHECK ("files"."scan_status" in ('pending', 'clean', 'infected', 'failed')),
	CONSTRAINT "files_retention_chk" CHECK ("files"."retention_status" in ('active', 'legal_hold', 'scheduled_deletion', 'deleted')),
	CONSTRAINT "files_access_chk" CHECK ("files"."access_level" in ('private', 'public')),
	CONSTRAINT "files_public_clean_chk" CHECK ("files"."access_level" = 'private' or "files"."scan_status" = 'clean'),
	CONSTRAINT "files_available_clean_chk" CHECK ("files"."status" <> 'available' or "files"."scan_status" = 'clean')
);
--> statement-breakpoint
CREATE TABLE "company_verification_levels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"level" text NOT NULL,
	"status" text DEFAULT 'verified' NOT NULL,
	"granted_case_id" uuid,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"revoked_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ux_company_verification_levels" UNIQUE("company_id","level"),
	CONSTRAINT "company_verification_levels_level_chk" CHECK ("company_verification_levels"."level" in ('email', 'phone', 'business_registration', 'business_address', 'authorized_representative', 'documents_reviewed', 'independent_check')),
	CONSTRAINT "company_verification_levels_status_chk" CHECK ("company_verification_levels"."status" in ('verified', 'expired', 'revoked')),
	CONSTRAINT "company_verification_levels_revoked_chk" CHECK (("company_verification_levels"."status" = 'revoked') = ("company_verification_levels"."revoked_at" is not null))
);
--> statement-breakpoint
CREATE TABLE "compliance_flags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"flag_type" text NOT NULL,
	"severity" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"raised_by_user_id" uuid,
	"notes" text,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "compliance_flags_severity_chk" CHECK ("compliance_flags"."severity" in ('low', 'medium', 'high', 'critical')),
	CONSTRAINT "compliance_flags_status_chk" CHECK ("compliance_flags"."status" in ('open', 'under_review', 'resolved', 'dismissed'))
);
--> statement-breakpoint
CREATE TABLE "sanctions_screening_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"provider_id" uuid,
	"result" text NOT NULL,
	"reference_no" text,
	"reviewed_by_user_id" uuid,
	"screened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"next_screening_due_at" timestamp with time zone,
	CONSTRAINT "sanctions_screening_result_chk" CHECK ("sanctions_screening_records"."result" in ('clear', 'potential_match', 'confirmed_match', 'error'))
);
--> statement-breakpoint
CREATE TABLE "verification_cases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"level" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"submitted_by_user_id" uuid NOT NULL,
	"assigned_admin_user_id" uuid,
	"submitted_at" timestamp with time zone,
	"decided_at" timestamp with time zone,
	"decided_by_user_id" uuid,
	"decision_reason" text,
	"expires_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ux_verification_cases_id_company" UNIQUE("id","company_id"),
	CONSTRAINT "verification_cases_level_chk" CHECK ("verification_cases"."level" in ('email', 'phone', 'business_registration', 'business_address', 'authorized_representative', 'documents_reviewed', 'independent_check')),
	CONSTRAINT "verification_cases_status_chk" CHECK ("verification_cases"."status" in ('draft', 'submitted', 'in_review', 'needs_info', 'approved', 'rejected', 'expired', 'revoked')),
	CONSTRAINT "verification_cases_decision_chk" CHECK ("verification_cases"."status" not in ('approved','rejected') or ("verification_cases"."decided_at" is not null and "verification_cases"."decided_by_user_id" is not null))
);
--> statement-breakpoint
CREATE TABLE "verification_checks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"check_type" text NOT NULL,
	"provider_id" uuid,
	"result" text DEFAULT 'pending' NOT NULL,
	"external_reference" text,
	"details_ciphertext" "bytea",
	"encryption_key_id" text,
	"performed_by_user_id" uuid,
	"checked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "verification_checks_result_chk" CHECK ("verification_checks"."result" in ('pending', 'pass', 'fail', 'inconclusive'))
);
--> statement-breakpoint
CREATE TABLE "verification_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"file_id" uuid NOT NULL,
	"document_type" text NOT NULL,
	"issuer_country_id" uuid,
	"issued_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"review_status" text DEFAULT 'pending' NOT NULL,
	"reviewed_by_user_id" uuid,
	"reviewed_at" timestamp with time zone,
	"review_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "verification_documents_review_chk" CHECK ("verification_documents"."review_status" in ('pending', 'accepted', 'rejected'))
);
--> statement-breakpoint
CREATE TABLE "verification_expiry_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"case_id" uuid,
	"verification_document_id" uuid,
	"expires_at" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'upcoming' NOT NULL,
	"notified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "verification_expiry_records_status_chk" CHECK ("verification_expiry_records"."status" in ('upcoming', 'notified', 'expired', 'renewed'))
);
--> statement-breakpoint
CREATE TABLE "verification_providers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"provider_type" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "verification_providers_key_unique" UNIQUE("key"),
	CONSTRAINT "verification_providers_type_chk" CHECK ("verification_providers"."provider_type" in ('manual', 'third_party'))
);
--> statement-breakpoint
CREATE TABLE "verification_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"from_status" text,
	"to_status" text NOT NULL,
	"actor_type" text NOT NULL,
	"actor_user_id" uuid,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "verification_status_history_actor_chk" CHECK ("verification_status_history"."actor_type" in ('user', 'admin', 'system', 'provider'))
);
--> statement-breakpoint
CREATE TABLE "product_categories_mapping" (
	"product_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	CONSTRAINT "pk_product_categories_mapping" PRIMARY KEY("product_id","category_id")
);
--> statement-breakpoint
CREATE TABLE "product_certifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"certification_id" uuid NOT NULL,
	"issuer_id" uuid,
	"certificate_number" text,
	"valid_from" date,
	"valid_until" date,
	"file_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_certifications_dates_chk" CHECK ("product_certifications"."valid_from" is null or "product_certifications"."valid_until" is null or "product_certifications"."valid_from" <= "product_certifications"."valid_until")
);
--> statement-breakpoint
CREATE TABLE "product_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"file_id" uuid NOT NULL,
	"document_type" text NOT NULL,
	"title" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_documents_type_chk" CHECK ("product_documents"."document_type" in ('datasheet', 'catalog', 'test_report', 'certificate', 'msds', 'other'))
);
--> statement-breakpoint
CREATE TABLE "product_hs_codes" (
	"product_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"hs_code_id" uuid NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	CONSTRAINT "pk_product_hs_codes" PRIMARY KEY("product_id","hs_code_id")
);
--> statement-breakpoint
CREATE TABLE "product_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"file_id" uuid NOT NULL,
	"alt_text" text,
	"sort_order" smallint DEFAULT 0 NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_specification_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"data_type" text NOT NULL,
	"uom_id" uuid,
	"allowed_values" text[],
	"min_value" numeric(24, 8),
	"max_value" numeric(24, 8),
	"is_filterable" boolean DEFAULT false NOT NULL,
	"is_required" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "spec_definitions_type_chk" CHECK ("product_specification_definitions"."data_type" in ('text', 'number', 'boolean', 'enum', 'range')),
	CONSTRAINT "spec_definitions_key_chk" CHECK ("product_specification_definitions"."key" ~ '^[a-z][a-z0-9_]{1,60}$'),
	CONSTRAINT "spec_definitions_enum_chk" CHECK (("product_specification_definitions"."data_type" = 'enum') = ("product_specification_definitions"."allowed_values" is not null and cardinality("product_specification_definitions"."allowed_values") > 0)),
	CONSTRAINT "spec_definitions_bounds_chk" CHECK ("product_specification_definitions"."min_value" is null or "product_specification_definitions"."max_value" is null or "product_specification_definitions"."min_value" <= "product_specification_definitions"."max_value")
);
--> statement-breakpoint
CREATE TABLE "product_specifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"definition_id" uuid NOT NULL,
	"value_text" text,
	"value_number" numeric(24, 8),
	"value_boolean" boolean,
	"value_min" numeric(24, 8),
	"value_max" numeric(24, 8),
	"uom_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ux_product_specifications" UNIQUE("product_id","definition_id"),
	CONSTRAINT "product_specifications_one_shape_chk" CHECK (("product_specifications"."value_text" is not null)::int + ("product_specifications"."value_number" is not null)::int + ("product_specifications"."value_boolean" is not null)::int + ("product_specifications"."value_min" is not null or "product_specifications"."value_max" is not null)::int = 1),
	CONSTRAINT "product_specifications_range_chk" CHECK ("product_specifications"."value_min" is null or "product_specifications"."value_max" is null or "product_specifications"."value_min" <= "product_specifications"."value_max")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"short_description" text,
	"description" text,
	"brand" text,
	"model_number" text,
	"manufacturer_name" text,
	"manufacturer_company_id" uuid,
	"origin_country_id" uuid,
	"primary_category_id" uuid NOT NULL,
	"base_uom_id" uuid NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"search_vector" "tsvector" GENERATED ALWAYS AS (setweight(to_tsvector('simple'::regconfig, coalesce(name, '')), 'A') || setweight(to_tsvector('simple'::regconfig, coalesce(brand, '')), 'B') || setweight(to_tsvector('simple'::regconfig, coalesce(short_description, '')), 'C') || setweight(to_tsvector('simple'::regconfig, coalesce(description, '')), 'D')) STORED,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ux_products_id_company" UNIQUE("id","company_id"),
	CONSTRAINT "ux_products_company_slug" UNIQUE("company_id","slug"),
	CONSTRAINT "products_status_chk" CHECK ("products"."status" in ('draft', 'active', 'archived', 'suspended')),
	CONSTRAINT "products_published_chk" CHECK ("products"."status" <> 'active' or "products"."published_at" is not null)
);
--> statement-breakpoint
CREATE TABLE "seller_product_listings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"min_order_qty" numeric(20, 6),
	"moq_uom_id" uuid,
	"price_min" numeric(20, 4),
	"price_max" numeric(20, 4),
	"currency_id" uuid,
	"lead_time_days_min" smallint,
	"lead_time_days_max" smallint,
	"monthly_capacity" numeric(20, 6),
	"capacity_uom_id" uuid,
	"incoterm_id" uuid,
	"origin_port_id" uuid,
	"status" text DEFAULT 'draft' NOT NULL,
	"valid_until" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ux_seller_product_listings_id_company" UNIQUE("id","company_id"),
	CONSTRAINT "seller_product_listings_status_chk" CHECK ("seller_product_listings"."status" in ('draft', 'active', 'paused', 'archived')),
	CONSTRAINT "seller_product_listings_price_chk" CHECK ("seller_product_listings"."price_min" is null or "seller_product_listings"."price_max" is null or "seller_product_listings"."price_min" <= "seller_product_listings"."price_max"),
	CONSTRAINT "seller_product_listings_price_currency_chk" CHECK (("seller_product_listings"."price_min" is null and "seller_product_listings"."price_max" is null) or "seller_product_listings"."currency_id" is not null),
	CONSTRAINT "seller_product_listings_moq_chk" CHECK ("seller_product_listings"."min_order_qty" is null or ("seller_product_listings"."min_order_qty" > 0 and "seller_product_listings"."moq_uom_id" is not null)),
	CONSTRAINT "seller_product_listings_lead_chk" CHECK ("seller_product_listings"."lead_time_days_min" is null or "seller_product_listings"."lead_time_days_max" is null or "seller_product_listings"."lead_time_days_min" <= "seller_product_listings"."lead_time_days_max"),
	CONSTRAINT "seller_product_listings_nonneg_chk" CHECK (coalesce("seller_product_listings"."price_min", 0) >= 0 and coalesce("seller_product_listings"."monthly_capacity", 0) >= 0)
);
--> statement-breakpoint
CREATE TABLE "buyer_import_markets" (
	"company_id" uuid NOT NULL,
	"country_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pk_buyer_import_markets" PRIMARY KEY("company_id","country_id")
);
--> statement-breakpoint
CREATE TABLE "buyer_import_requirements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"requirement_type" text NOT NULL,
	"certification_id" uuid,
	"description" text NOT NULL,
	"is_mandatory" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "buyer_import_requirements_type_chk" CHECK ("buyer_import_requirements"."requirement_type" in ('certification', 'document', 'labeling', 'inspection', 'other')),
	CONSTRAINT "buyer_import_requirements_cert_chk" CHECK (("buyer_import_requirements"."requirement_type" = 'certification') = ("buyer_import_requirements"."certification_id" is not null))
);
--> statement-breakpoint
CREATE TABLE "buyer_preferred_origins" (
	"company_id" uuid NOT NULL,
	"country_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pk_buyer_preferred_origins" PRIMARY KEY("company_id","country_id")
);
--> statement-breakpoint
CREATE TABLE "buyer_product_interests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"hs_code_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ux_buyer_product_interests" UNIQUE NULLS NOT DISTINCT("company_id","category_id","hs_code_id")
);
--> statement-breakpoint
CREATE TABLE "buyer_profiles" (
	"company_id" uuid PRIMARY KEY NOT NULL,
	"buyer_type" text NOT NULL,
	"summary" text,
	"annual_import_volume_usd_range" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "buyer_profiles_type_chk" CHECK ("buyer_profiles"."buyer_type" in ('importer', 'distributor', 'retailer', 'end_user_manufacturer', 'trader', 'other')),
	CONSTRAINT "buyer_profiles_volume_chk" CHECK ("buyer_profiles"."annual_import_volume_usd_range" is null or "buyer_profiles"."annual_import_volume_usd_range" in ('under_100k', '100k_1m', '1m_10m', 'over_10m'))
);
--> statement-breakpoint
CREATE TABLE "buyer_trade_preferences" (
	"company_id" uuid PRIMARY KEY NOT NULL,
	"preferred_currency_id" uuid,
	"preferred_incoterm_id" uuid,
	"preferred_payment_term_id" uuid,
	"preferred_shipment_mode_id" uuid,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seller_accepted_currencies" (
	"company_id" uuid NOT NULL,
	"currency_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pk_seller_accepted_currencies" PRIMARY KEY("company_id","currency_id")
);
--> statement-breakpoint
CREATE TABLE "seller_capabilities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"capability_type" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ux_seller_capabilities" UNIQUE("company_id","capability_type"),
	CONSTRAINT "seller_capabilities_type_chk" CHECK ("seller_capabilities"."capability_type" in ('manufacturing', 'oem', 'odm', 'private_label', 'custom_production', 'sourcing', 'warehousing', 'logistics'))
);
--> statement-breakpoint
CREATE TABLE "seller_capacity_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"category_id" uuid,
	"product_id" uuid,
	"capacity_qty" numeric(20, 6) NOT NULL,
	"uom_id" uuid NOT NULL,
	"period" text DEFAULT 'month' NOT NULL,
	"valid_from" date,
	"valid_until" date,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "seller_capacity_records_qty_chk" CHECK ("seller_capacity_records"."capacity_qty" > 0),
	CONSTRAINT "seller_capacity_records_period_chk" CHECK ("seller_capacity_records"."period" in ('day', 'week', 'month', 'year')),
	CONSTRAINT "seller_capacity_records_scope_chk" CHECK ("seller_capacity_records"."category_id" is not null or "seller_capacity_records"."product_id" is not null)
);
--> statement-breakpoint
CREATE TABLE "seller_certifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"certification_id" uuid NOT NULL,
	"issuer_id" uuid,
	"certificate_number" text,
	"valid_from" date,
	"valid_until" date,
	"file_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ux_seller_certifications" UNIQUE NULLS NOT DISTINCT("company_id","certification_id","certificate_number"),
	CONSTRAINT "seller_certifications_dates_chk" CHECK ("seller_certifications"."valid_from" is null or "seller_certifications"."valid_until" is null or "seller_certifications"."valid_from" <= "seller_certifications"."valid_until")
);
--> statement-breakpoint
CREATE TABLE "seller_export_markets" (
	"company_id" uuid NOT NULL,
	"country_id" uuid NOT NULL,
	"is_current" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pk_seller_export_markets" PRIMARY KEY("company_id","country_id")
);
--> statement-breakpoint
CREATE TABLE "seller_incoterm_capabilities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"incoterm_id" uuid NOT NULL,
	"port_id" uuid,
	"named_place" text,
	"shipment_mode_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ux_seller_incoterm_capabilities" UNIQUE NULLS NOT DISTINCT("company_id","incoterm_id","port_id","named_place","shipment_mode_id")
);
--> statement-breakpoint
CREATE TABLE "seller_lead_times" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"category_id" uuid,
	"product_id" uuid,
	"lead_time_type" text DEFAULT 'total' NOT NULL,
	"min_days" smallint NOT NULL,
	"max_days" smallint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "seller_lead_times_range_chk" CHECK ("seller_lead_times"."min_days" >= 0 and "seller_lead_times"."min_days" <= "seller_lead_times"."max_days" and "seller_lead_times"."max_days" <= 730),
	CONSTRAINT "seller_lead_times_type_chk" CHECK ("seller_lead_times"."lead_time_type" in ('production', 'dispatch', 'total'))
);
--> statement-breakpoint
CREATE TABLE "seller_moq_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"category_id" uuid,
	"product_id" uuid,
	"moq_qty" numeric(20, 6) NOT NULL,
	"uom_id" uuid NOT NULL,
	"min_order_value" numeric(20, 4),
	"currency_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "seller_moq_records_qty_chk" CHECK ("seller_moq_records"."moq_qty" > 0),
	CONSTRAINT "seller_moq_records_scope_chk" CHECK ("seller_moq_records"."category_id" is not null or "seller_moq_records"."product_id" is not null),
	CONSTRAINT "seller_moq_records_value_chk" CHECK ("seller_moq_records"."min_order_value" is null or "seller_moq_records"."currency_id" is not null)
);
--> statement-breakpoint
CREATE TABLE "seller_packaging_capabilities" (
	"company_id" uuid NOT NULL,
	"packaging_type_id" uuid NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pk_seller_packaging_capabilities" PRIMARY KEY("company_id","packaging_type_id")
);
--> statement-breakpoint
CREATE TABLE "seller_payment_methods" (
	"company_id" uuid NOT NULL,
	"payment_term_id" uuid NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pk_seller_payment_methods" PRIMARY KEY("company_id","payment_term_id")
);
--> statement-breakpoint
CREATE TABLE "seller_product_capabilities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"hs_code_id" uuid,
	"product_id" uuid,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ux_seller_product_capabilities" UNIQUE NULLS NOT DISTINCT("company_id","category_id","hs_code_id","product_id")
);
--> statement-breakpoint
CREATE TABLE "seller_shipping_ports" (
	"company_id" uuid NOT NULL,
	"port_id" uuid NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pk_seller_shipping_ports" PRIMARY KEY("company_id","port_id")
);
--> statement-breakpoint
CREATE TABLE "seller_supply_regions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"country_id" uuid NOT NULL,
	"state_province_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ux_seller_supply_regions" UNIQUE NULLS NOT DISTINCT("company_id","country_id","state_province_id")
);
--> statement-breakpoint
CREATE TABLE "seller_trade_profiles" (
	"company_id" uuid PRIMARY KEY NOT NULL,
	"seller_type" text NOT NULL,
	"summary" text,
	"years_exporting" smallint,
	"default_quote_validity_days" smallint DEFAULT 30 NOT NULL,
	"accepts_rfqs" boolean DEFAULT true NOT NULL,
	"response_time_hours" smallint,
	"is_published" boolean DEFAULT false NOT NULL,
	"published_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "seller_trade_profiles_type_chk" CHECK ("seller_trade_profiles"."seller_type" in ('manufacturer', 'exporter', 'distributor', 'wholesaler', 'trading_company', 'supplier', 'other')),
	CONSTRAINT "seller_trade_profiles_validity_chk" CHECK ("seller_trade_profiles"."default_quote_validity_days" between 1 and 365),
	CONSTRAINT "seller_trade_profiles_published_chk" CHECK (not "seller_trade_profiles"."is_published" or "seller_trade_profiles"."published_at" is not null)
);
--> statement-breakpoint
CREATE TABLE "seller_trade_terms" (
	"company_id" uuid PRIMARY KEY NOT NULL,
	"sample_available" boolean DEFAULT false NOT NULL,
	"sample_policy" text,
	"min_order_value" numeric(20, 4),
	"min_order_currency_id" uuid,
	"warranty_terms" text,
	"return_policy" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "seller_trade_terms_mov_chk" CHECK ("seller_trade_terms"."min_order_value" is null or ("seller_trade_terms"."min_order_value" >= 0 and "seller_trade_terms"."min_order_currency_id" is not null))
);
--> statement-breakpoint
CREATE TABLE "rfq_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rfq_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"file_id" uuid NOT NULL,
	"title" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ux_rfq_attachments_file" UNIQUE("file_id")
);
--> statement-breakpoint
CREATE TABLE "rfq_certification_requirements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rfq_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"rfq_item_id" uuid,
	"certification_id" uuid NOT NULL,
	"is_mandatory" boolean DEFAULT true NOT NULL,
	CONSTRAINT "ux_rfq_certification_requirements" UNIQUE NULLS NOT DISTINCT("rfq_id","rfq_item_id","certification_id")
);
--> statement-breakpoint
CREATE TABLE "rfq_clarifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rfq_id" uuid NOT NULL,
	"rfq_company_id" uuid NOT NULL,
	"asked_by_company_id" uuid NOT NULL,
	"asked_by_user_id" uuid NOT NULL,
	"question" text NOT NULL,
	"answer" text,
	"answered_by_user_id" uuid,
	"answered_at" timestamp with time zone,
	"is_public" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rfq_clarifications_answer_chk" CHECK (("rfq_clarifications"."answer" is null) = ("rfq_clarifications"."answered_at" is null)),
	CONSTRAINT "rfq_clarifications_not_self_chk" CHECK ("rfq_clarifications"."asked_by_company_id" <> "rfq_clarifications"."rfq_company_id")
);
--> statement-breakpoint
CREATE TABLE "rfq_destinations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rfq_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"country_id" uuid NOT NULL,
	"port_id" uuid,
	"place_name" text,
	"incoterm_id" uuid,
	"incoterm_named_place" text,
	"required_by_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rfq_destinations_named_place_chk" CHECK ("rfq_destinations"."incoterm_id" is null or "rfq_destinations"."incoterm_named_place" is not null or "rfq_destinations"."port_id" is not null)
);
--> statement-breakpoint
CREATE TABLE "rfq_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rfq_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"invited_company_id" uuid NOT NULL,
	"invited_by_user_id" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"message" text,
	"invited_at" timestamp with time zone DEFAULT now() NOT NULL,
	"responded_at" timestamp with time zone,
	CONSTRAINT "ux_rfq_invitations" UNIQUE("rfq_id","invited_company_id"),
	CONSTRAINT "rfq_invitations_status_chk" CHECK ("rfq_invitations"."status" in ('pending', 'viewed', 'declined', 'quoted')),
	CONSTRAINT "rfq_invitations_self_chk" CHECK ("rfq_invitations"."company_id" <> "rfq_invitations"."invited_company_id")
);
--> statement-breakpoint
CREATE TABLE "rfq_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rfq_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"line_no" smallint NOT NULL,
	"product_name" text NOT NULL,
	"description" text,
	"category_id" uuid,
	"hs_code_id" uuid,
	"quantity" numeric(20, 6) NOT NULL,
	"uom_id" uuid NOT NULL,
	"target_unit_price" numeric(20, 4),
	"required_delivery_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ux_rfq_items_id_company" UNIQUE("id","company_id"),
	CONSTRAINT "ux_rfq_items_rfq_line" UNIQUE("rfq_id","line_no"),
	CONSTRAINT "rfq_items_qty_chk" CHECK ("rfq_items"."quantity" > 0),
	CONSTRAINT "rfq_items_price_chk" CHECK ("rfq_items"."target_unit_price" is null or "rfq_items"."target_unit_price" >= 0),
	CONSTRAINT "rfq_items_line_chk" CHECK ("rfq_items"."line_no" between 1 and 200)
);
--> statement-breakpoint
CREATE TABLE "rfq_origin_preferences" (
	"rfq_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"country_id" uuid NOT NULL,
	"preference" text DEFAULT 'preferred' NOT NULL,
	CONSTRAINT "pk_rfq_origin_preferences" PRIMARY KEY("rfq_id","country_id"),
	CONSTRAINT "rfq_origin_preferences_chk" CHECK ("rfq_origin_preferences"."preference" in ('preferred', 'required', 'excluded'))
);
--> statement-breakpoint
CREATE TABLE "rfq_payment_preferences" (
	"rfq_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"payment_term_id" uuid NOT NULL,
	CONSTRAINT "pk_rfq_payment_preferences" PRIMARY KEY("rfq_id","payment_term_id")
);
--> statement-breakpoint
CREATE TABLE "rfq_required_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rfq_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"document_type" text NOT NULL,
	CONSTRAINT "ux_rfq_required_documents" UNIQUE("rfq_id","document_type"),
	CONSTRAINT "rfq_required_documents_type_chk" CHECK ("rfq_required_documents"."document_type" in ('commercial_invoice', 'packing_list', 'certificate_of_origin', 'bill_of_lading', 'phytosanitary_certificate', 'fumigation_certificate', 'health_certificate', 'certificate_of_analysis', 'msds', 'insurance_certificate', 'other'))
);
--> statement-breakpoint
CREATE TABLE "rfq_saved_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rfq_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"note" text,
	"saved_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ux_rfq_saved_records" UNIQUE("company_id","user_id","rfq_id")
);
--> statement-breakpoint
CREATE TABLE "rfq_specifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rfq_item_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"definition_id" uuid,
	"custom_name" text,
	"value_text" text,
	"value_number" numeric(24, 8),
	"value_boolean" boolean,
	"value_min" numeric(24, 8),
	"value_max" numeric(24, 8),
	"uom_id" uuid,
	"is_mandatory" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rfq_specifications_named_chk" CHECK ("rfq_specifications"."definition_id" is not null or "rfq_specifications"."custom_name" is not null),
	CONSTRAINT "rfq_specifications_one_shape_chk" CHECK (("rfq_specifications"."value_text" is not null)::int + ("rfq_specifications"."value_number" is not null)::int + ("rfq_specifications"."value_boolean" is not null)::int + ("rfq_specifications"."value_min" is not null or "rfq_specifications"."value_max" is not null)::int = 1)
);
--> statement-breakpoint
CREATE TABLE "rfq_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rfq_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"from_status" text,
	"to_status" text NOT NULL,
	"actor_user_id" uuid,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rfq_trade_requirements" (
	"rfq_id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"packaging_type_id" uuid,
	"packaging_notes" text,
	"shipment_mode_id" uuid,
	"inspection_required" boolean DEFAULT false NOT NULL,
	"samples_required" boolean DEFAULT false NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rfq_views" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rfq_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"viewer_user_id" uuid NOT NULL,
	"viewed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rfq_visibility_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rfq_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"rule_type" text NOT NULL,
	"country_id" uuid,
	"verification_level" text,
	"seller_type" text,
	CONSTRAINT "rfq_visibility_rules_type_chk" CHECK ("rfq_visibility_rules"."rule_type" in ('allow_country', 'block_country', 'min_verification', 'seller_type')),
	CONSTRAINT "rfq_visibility_rules_operand_chk" CHECK (("rfq_visibility_rules"."rule_type" in ('allow_country','block_country') and "rfq_visibility_rules"."country_id" is not null and "rfq_visibility_rules"."verification_level" is null and "rfq_visibility_rules"."seller_type" is null)
        or ("rfq_visibility_rules"."rule_type" = 'min_verification' and "rfq_visibility_rules"."verification_level" is not null and "rfq_visibility_rules"."country_id" is null and "rfq_visibility_rules"."seller_type" is null)
        or ("rfq_visibility_rules"."rule_type" = 'seller_type' and "rfq_visibility_rules"."seller_type" is not null and "rfq_visibility_rules"."country_id" is null and "rfq_visibility_rules"."verification_level" is null))
);
--> statement-breakpoint
CREATE TABLE "rfqs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"reference_no" text DEFAULT 'RFQ-' || to_char(now() at time zone 'utc', 'YYYY') || '-' || lpad(nextval('rfq_reference_seq')::text, 8, '0') NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"primary_category_id" uuid NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"visibility" text DEFAULT 'public' NOT NULL,
	"currency_id" uuid,
	"allow_partial_quotes" boolean DEFAULT true NOT NULL,
	"quote_deadline_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	"close_reason" text,
	"version" integer DEFAULT 1 NOT NULL,
	"search_vector" "tsvector" GENERATED ALWAYS AS (setweight(to_tsvector('simple'::regconfig, coalesce(title, '')), 'A') || setweight(to_tsvector('simple'::regconfig, coalesce(description, '')), 'C')) STORED,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ux_rfqs_id_company" UNIQUE("id","company_id"),
	CONSTRAINT "rfqs_status_chk" CHECK ("rfqs"."status" in ('draft', 'published', 'paused', 'closed', 'expired', 'cancelled', 'awarded')),
	CONSTRAINT "rfqs_visibility_chk" CHECK ("rfqs"."visibility" in ('public', 'private', 'invited')),
	CONSTRAINT "rfqs_published_chk" CHECK ("rfqs"."status" = 'draft' or "rfqs"."status" = 'cancelled' or ("rfqs"."published_at" is not null and "rfqs"."expires_at" is not null)),
	CONSTRAINT "rfqs_expiry_chk" CHECK ("rfqs"."expires_at" is null or "rfqs"."published_at" is null or "rfqs"."expires_at" > "rfqs"."published_at"),
	CONSTRAINT "rfqs_closed_chk" CHECK ("rfqs"."status" not in ('closed','cancelled','expired','awarded') or "rfqs"."closed_at" is not null)
);
--> statement-breakpoint
CREATE TABLE "rfq_match_reasons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_id" uuid NOT NULL,
	"supplier_company_id" uuid NOT NULL,
	"reason_code" text NOT NULL,
	"passed" boolean NOT NULL,
	"weight" numeric(6, 3) NOT NULL,
	"detail" text
);
--> statement-breakpoint
CREATE TABLE "rfq_match_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rfq_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"algorithm_version" text NOT NULL,
	"candidate_count" integer,
	"error" text,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ux_rfq_match_runs_id_company" UNIQUE("id","company_id"),
	CONSTRAINT "rfq_match_runs_status_chk" CHECK ("rfq_match_runs"."status" in ('queued', 'running', 'completed', 'failed'))
);
--> statement-breakpoint
CREATE TABLE "rfq_supplier_matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_run_id" uuid NOT NULL,
	"rfq_id" uuid NOT NULL,
	"buyer_company_id" uuid NOT NULL,
	"supplier_company_id" uuid NOT NULL,
	"score" numeric(6, 3) NOT NULL,
	"rank" integer NOT NULL,
	"is_eligible" boolean NOT NULL,
	"status" text DEFAULT 'suggested' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ux_rfq_supplier_matches_id_supplier" UNIQUE("id","supplier_company_id"),
	CONSTRAINT "ux_rfq_supplier_matches_run_supplier" UNIQUE("match_run_id","supplier_company_id"),
	CONSTRAINT "rfq_supplier_matches_score_chk" CHECK ("rfq_supplier_matches"."score" between 0 and 100),
	CONSTRAINT "rfq_supplier_matches_status_chk" CHECK ("rfq_supplier_matches"."status" in ('suggested', 'notified', 'viewed', 'dismissed', 'quoted')),
	CONSTRAINT "rfq_supplier_matches_not_self_chk" CHECK ("rfq_supplier_matches"."supplier_company_id" <> "rfq_supplier_matches"."buyer_company_id")
);
--> statement-breakpoint
CREATE TABLE "supplier_match_feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"feedback" text NOT NULL,
	"comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ux_supplier_match_feedback" UNIQUE("match_id","company_id"),
	CONSTRAINT "supplier_match_feedback_chk" CHECK ("supplier_match_feedback"."feedback" in ('relevant', 'not_relevant', 'spam', 'already_supplied'))
);
--> statement-breakpoint
CREATE TABLE "supplier_match_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"category_id" uuid,
	"destination_country_id" uuid,
	"min_order_value_usd" numeric(20, 2),
	"notify_enabled" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ux_supplier_match_preferences" UNIQUE NULLS NOT DISTINCT("company_id","category_id","destination_country_id")
);
--> statement-breakpoint
CREATE TABLE "negotiation_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quotation_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"actor_company_id" uuid NOT NULL,
	"actor_user_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"from_revision_no" integer,
	"to_revision_no" integer,
	"message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "negotiation_events_type_chk" CHECK ("negotiation_events"."event_type" in ('counter_offer', 'clarification_request', 'clarification_response', 'revision_submitted', 'accept_intent', 'decline', 'note'))
);
--> statement-breakpoint
CREATE TABLE "quotation_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"revision_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"file_id" uuid NOT NULL,
	"title" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ux_quotation_attachments_file" UNIQUE("file_id")
);
--> statement-breakpoint
CREATE TABLE "quotation_certifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"revision_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"certification_id" uuid NOT NULL,
	"certificate_number" text,
	"file_id" uuid,
	CONSTRAINT "ux_quotation_certifications" UNIQUE("revision_id","certification_id")
);
--> statement-breakpoint
CREATE TABLE "quotation_comparison_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"comparison_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"quotation_id" uuid NOT NULL,
	"revision_id" uuid NOT NULL,
	"rank" smallint,
	"notes" text,
	CONSTRAINT "ux_quotation_comparison_entries" UNIQUE("comparison_id","quotation_id")
);
--> statement-breakpoint
CREATE TABLE "quotation_comparisons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rfq_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ux_quotation_comparisons_id_company" UNIQUE("id","company_id")
);
--> statement-breakpoint
CREATE TABLE "quotation_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"revision_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"rfq_item_id" uuid NOT NULL,
	"description" text,
	"unit_price" numeric(20, 4) NOT NULL,
	"quantity" numeric(20, 6) NOT NULL,
	"uom_id" uuid NOT NULL,
	"total_price" numeric(24, 4) GENERATED ALWAYS AS (round(quantity * unit_price, 4)) STORED,
	"moq" numeric(20, 6),
	"lead_time_days" smallint,
	"hs_code_id" uuid,
	"origin_country_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ux_quotation_items_id_company" UNIQUE("id","company_id"),
	CONSTRAINT "ux_quotation_items_revision_rfq_item" UNIQUE("revision_id","rfq_item_id"),
	CONSTRAINT "quotation_items_price_chk" CHECK ("quotation_items"."unit_price" >= 0 and "quotation_items"."quantity" > 0),
	CONSTRAINT "quotation_items_moq_chk" CHECK ("quotation_items"."moq" is null or "quotation_items"."moq" > 0),
	CONSTRAINT "quotation_items_lead_chk" CHECK ("quotation_items"."lead_time_days" is null or "quotation_items"."lead_time_days" between 0 and 730)
);
--> statement-breakpoint
CREATE TABLE "quotation_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quotation_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"revision_no" integer NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"currency_id" uuid NOT NULL,
	"total_amount" numeric(24, 4),
	"valid_until" timestamp with time zone,
	"supplier_notes" text,
	"created_by_user_id" uuid NOT NULL,
	"submitted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ux_quotation_revisions_quotation_no" UNIQUE("quotation_id","revision_no"),
	CONSTRAINT "ux_quotation_revisions_id_company" UNIQUE("id","company_id"),
	CONSTRAINT "ux_quotation_revisions_id_quotation" UNIQUE("id","quotation_id"),
	CONSTRAINT "quotation_revisions_no_chk" CHECK ("quotation_revisions"."revision_no" >= 1),
	CONSTRAINT "quotation_revisions_status_chk" CHECK ("quotation_revisions"."status" in ('draft', 'submitted')),
	CONSTRAINT "quotation_revisions_submitted_chk" CHECK (("quotation_revisions"."status" = 'submitted') = ("quotation_revisions"."submitted_at" is not null)),
	CONSTRAINT "quotation_revisions_total_chk" CHECK ("quotation_revisions"."total_amount" is null or "quotation_revisions"."total_amount" >= 0)
);
--> statement-breakpoint
CREATE TABLE "quotation_specifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quotation_item_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"definition_id" uuid,
	"custom_name" text,
	"value_text" text,
	"value_number" numeric(24, 8),
	"value_boolean" boolean,
	"value_min" numeric(24, 8),
	"value_max" numeric(24, 8),
	"uom_id" uuid,
	CONSTRAINT "quotation_specifications_named_chk" CHECK ("quotation_specifications"."definition_id" is not null or "quotation_specifications"."custom_name" is not null),
	CONSTRAINT "quotation_specifications_one_shape_chk" CHECK (("quotation_specifications"."value_text" is not null)::int + ("quotation_specifications"."value_number" is not null)::int + ("quotation_specifications"."value_boolean" is not null)::int + ("quotation_specifications"."value_min" is not null or "quotation_specifications"."value_max" is not null)::int = 1)
);
--> statement-breakpoint
CREATE TABLE "quotation_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quotation_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"from_status" text,
	"to_status" text NOT NULL,
	"actor_company_id" uuid NOT NULL,
	"actor_user_id" uuid,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotation_terms" (
	"revision_id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"incoterm_id" uuid,
	"incoterm_named_place" text,
	"port_of_loading_id" uuid,
	"delivery_place" text,
	"payment_term_id" uuid,
	"payment_term_notes" text,
	"packaging_type_id" uuid,
	"packaging_notes" text,
	"shipment_mode_id" uuid,
	"warranty_terms" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quotation_terms_incoterm_place_chk" CHECK ("quotation_terms"."incoterm_id" is null or "quotation_terms"."incoterm_named_place" is not null or "quotation_terms"."port_of_loading_id" is not null)
);
--> statement-breakpoint
CREATE TABLE "quotations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"rfq_id" uuid NOT NULL,
	"buyer_company_id" uuid NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"reference_no" text DEFAULT 'QUO-' || to_char(now() at time zone 'utc', 'YYYY') || '-' || lpad(nextval('quotation_reference_seq')::text, 8, '0') NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"current_revision_no" integer DEFAULT 1 NOT NULL,
	"accepted_revision_id" uuid,
	"currency_id" uuid NOT NULL,
	"total_amount" numeric(24, 4),
	"valid_until" timestamp with time zone,
	"submitted_at" timestamp with time zone,
	"accepted_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ux_quotations_id_company" UNIQUE("id","company_id"),
	CONSTRAINT "ux_quotations_id_buyer" UNIQUE("id","buyer_company_id"),
	CONSTRAINT "quotations_status_chk" CHECK ("quotations"."status" in ('draft', 'submitted', 'under_negotiation', 'accepted', 'rejected', 'withdrawn', 'expired', 'superseded')),
	CONSTRAINT "quotations_not_self_chk" CHECK ("quotations"."company_id" <> "quotations"."buyer_company_id"),
	CONSTRAINT "quotations_accepted_chk" CHECK (("quotations"."status" = 'accepted') = ("quotations"."accepted_revision_id" is not null and "quotations"."accepted_at" is not null)),
	CONSTRAINT "quotations_submitted_chk" CHECK ("quotations"."status" = 'draft' or "quotations"."submitted_at" is not null),
	CONSTRAINT "quotations_total_chk" CHECK ("quotations"."total_amount" is null or "quotations"."total_amount" >= 0)
);
--> statement-breakpoint
CREATE TABLE "deal_activity_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deal_id" uuid NOT NULL,
	"actor_company_id" uuid,
	"actor_user_id" uuid,
	"event_type" text NOT NULL,
	"summary" text NOT NULL,
	"resource_type" text,
	"resource_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deal_cancellations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deal_id" uuid NOT NULL,
	"requested_by_company_id" uuid NOT NULL,
	"requested_by_user_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"status" text DEFAULT 'requested' NOT NULL,
	"responded_by_company_id" uuid,
	"responded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "deal_cancellations_status_chk" CHECK ("deal_cancellations"."status" in ('requested', 'accepted', 'rejected', 'withdrawn')),
	CONSTRAINT "deal_cancellations_response_chk" CHECK ("deal_cancellations"."responded_by_company_id" is null or "deal_cancellations"."responded_by_company_id" <> "deal_cancellations"."requested_by_company_id")
);
--> statement-breakpoint
CREATE TABLE "deal_confirmations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deal_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"confirmation_type" text NOT NULL,
	"confirmed_by_user_id" uuid NOT NULL,
	"note" text,
	"confirmed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ux_deal_confirmations" UNIQUE("deal_id","company_id","confirmation_type"),
	CONSTRAINT "deal_confirmations_type_chk" CHECK ("deal_confirmations"."confirmation_type" in ('terms_agreed', 'goods_dispatched', 'goods_received', 'completion'))
);
--> statement-breakpoint
CREATE TABLE "deal_disputes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deal_id" uuid NOT NULL,
	"raised_by_company_id" uuid NOT NULL,
	"raised_by_user_id" uuid NOT NULL,
	"category" text NOT NULL,
	"description" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"resolution" text,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "deal_disputes_category_chk" CHECK ("deal_disputes"."category" in ('quality', 'quantity', 'delivery', 'documents', 'payment', 'other')),
	CONSTRAINT "deal_disputes_status_chk" CHECK ("deal_disputes"."status" in ('open', 'under_review', 'resolved', 'closed'))
);
--> statement-breakpoint
CREATE TABLE "deal_document_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"deal_id" uuid NOT NULL,
	"version_no" integer NOT NULL,
	"file_id" uuid NOT NULL,
	"uploaded_by_company_id" uuid NOT NULL,
	"uploaded_by_user_id" uuid NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ux_deal_document_versions" UNIQUE("document_id","version_no"),
	CONSTRAINT "ux_deal_document_versions_file" UNIQUE("file_id"),
	CONSTRAINT "deal_document_versions_no_chk" CHECK ("deal_document_versions"."version_no" >= 1)
);
--> statement-breakpoint
CREATE TABLE "deal_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deal_id" uuid NOT NULL,
	"document_type" text NOT NULL,
	"title" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_by_company_id" uuid NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ux_deal_documents_id_deal" UNIQUE("id","deal_id"),
	CONSTRAINT "deal_documents_type_chk" CHECK ("deal_documents"."document_type" in ('purchase_order', 'contract', 'proforma_invoice', 'commercial_invoice', 'packing_list', 'product_specification', 'bill_of_lading', 'certificate', 'inspection_report', 'other')),
	CONSTRAINT "deal_documents_status_chk" CHECK ("deal_documents"."status" in ('draft', 'active', 'superseded'))
);
--> statement-breakpoint
CREATE TABLE "deal_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deal_id" uuid NOT NULL,
	"line_no" smallint NOT NULL,
	"rfq_item_id" uuid,
	"description" text NOT NULL,
	"quantity" numeric(20, 6) NOT NULL,
	"uom_id" uuid NOT NULL,
	"unit_price" numeric(20, 4) NOT NULL,
	"total_price" numeric(24, 4) NOT NULL,
	"hs_code_id" uuid,
	"origin_country_id" uuid,
	CONSTRAINT "ux_deal_items_line" UNIQUE("deal_id","line_no"),
	CONSTRAINT "deal_items_qty_chk" CHECK ("deal_items"."quantity" > 0 and "deal_items"."unit_price" >= 0)
);
--> statement-breakpoint
CREATE TABLE "deal_milestone_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"milestone_id" uuid NOT NULL,
	"deal_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"actor_company_id" uuid NOT NULL,
	"actor_user_id" uuid NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deal_milestones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deal_id" uuid NOT NULL,
	"milestone_type" text NOT NULL,
	"title" text NOT NULL,
	"due_date" date,
	"status" text DEFAULT 'pending' NOT NULL,
	"responsible_company_id" uuid NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ux_deal_milestones_id_deal" UNIQUE("id","deal_id"),
	CONSTRAINT "deal_milestones_type_chk" CHECK ("deal_milestones"."milestone_type" in ('production_start', 'production_complete', 'inspection', 'shipment', 'customs_clearance', 'delivery', 'custom')),
	CONSTRAINT "deal_milestones_status_chk" CHECK ("deal_milestones"."status" in ('pending', 'in_progress', 'completed', 'delayed', 'skipped')),
	CONSTRAINT "deal_milestones_completed_chk" CHECK (("deal_milestones"."status" = 'completed') = ("deal_milestones"."completed_at" is not null))
);
--> statement-breakpoint
CREATE TABLE "deal_parties" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deal_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"party_role" text NOT NULL,
	"added_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ux_deal_parties" UNIQUE("deal_id","company_id"),
	CONSTRAINT "deal_parties_role_chk" CHECK ("deal_parties"."party_role" in ('buyer', 'seller', 'agent', 'observer'))
);
--> statement-breakpoint
CREATE TABLE "deal_shipments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deal_id" uuid NOT NULL,
	"carrier" text,
	"tracking_reference" text,
	"bill_of_lading_no" text,
	"port_of_loading_id" uuid,
	"port_of_discharge_id" uuid,
	"etd" date,
	"eta" date,
	"added_by_company_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "deal_shipments_dates_chk" CHECK ("deal_shipments"."etd" is null or "deal_shipments"."eta" is null or "deal_shipments"."etd" <= "deal_shipments"."eta")
);
--> statement-breakpoint
CREATE TABLE "deal_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deal_id" uuid NOT NULL,
	"from_status" text,
	"to_status" text NOT NULL,
	"actor_company_id" uuid,
	"actor_user_id" uuid,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deal_terms" (
	"deal_id" uuid PRIMARY KEY NOT NULL,
	"incoterm_id" uuid,
	"incoterm_named_place" text,
	"port_of_loading_id" uuid,
	"delivery_place" text,
	"payment_term_id" uuid,
	"payment_term_notes" text,
	"packaging_type_id" uuid,
	"shipment_mode_id" uuid,
	"warranty_terms" text,
	"valid_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference_no" text DEFAULT 'DEAL-' || to_char(now() at time zone 'utc', 'YYYY') || '-' || lpad(nextval('deal_reference_seq')::text, 8, '0') NOT NULL,
	"quotation_id" uuid NOT NULL,
	"accepted_revision_id" uuid NOT NULL,
	"rfq_id" uuid NOT NULL,
	"buyer_company_id" uuid NOT NULL,
	"supplier_company_id" uuid NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"currency_id" uuid NOT NULL,
	"total_amount" numeric(24, 4) NOT NULL,
	"agreed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ux_deals_quotation" UNIQUE("quotation_id"),
	CONSTRAINT "deals_status_chk" CHECK ("deals"."status" in ('active', 'in_production', 'shipped', 'delivered', 'completed', 'cancelled', 'disputed')),
	CONSTRAINT "deals_parties_chk" CHECK ("deals"."buyer_company_id" <> "deals"."supplier_company_id"),
	CONSTRAINT "deals_completed_chk" CHECK (("deals"."status" = 'completed') = ("deals"."completed_at" is not null)),
	CONSTRAINT "deals_cancelled_chk" CHECK (("deals"."status" = 'cancelled') = ("deals"."cancelled_at" is not null)),
	CONSTRAINT "deals_total_chk" CHECK ("deals"."total_amount" >= 0)
);
--> statement-breakpoint
CREATE TABLE "conversation_archives" (
	"conversation_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"archived_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pk_conversation_archives" PRIMARY KEY("conversation_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "conversation_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"participant_role" text NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"left_at" timestamp with time zone,
	CONSTRAINT "ux_conversation_participants" UNIQUE("conversation_id","user_id"),
	CONSTRAINT "conversation_participants_role_chk" CHECK ("conversation_participants"."participant_role" in ('buyer', 'supplier', 'observer'))
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_type" text NOT NULL,
	"rfq_id" uuid,
	"quotation_id" uuid,
	"deal_id" uuid,
	"initiator_company_id" uuid NOT NULL,
	"counterparty_company_id" uuid NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"subject" text,
	"status" text DEFAULT 'active' NOT NULL,
	"last_message_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "conversations_type_chk" CHECK ("conversations"."conversation_type" in ('direct', 'rfq', 'quotation', 'deal')),
	CONSTRAINT "conversations_status_chk" CHECK ("conversations"."status" in ('active', 'closed')),
	CONSTRAINT "conversations_parties_chk" CHECK ("conversations"."initiator_company_id" <> "conversations"."counterparty_company_id"),
	CONSTRAINT "conversations_link_chk" CHECK (("conversations"."conversation_type" = 'direct' and "conversations"."rfq_id" is null and "conversations"."quotation_id" is null and "conversations"."deal_id" is null)
        or ("conversations"."conversation_type" = 'rfq' and "conversations"."rfq_id" is not null and "conversations"."quotation_id" is null and "conversations"."deal_id" is null)
        or ("conversations"."conversation_type" = 'quotation' and "conversations"."quotation_id" is not null and "conversations"."deal_id" is null)
        or ("conversations"."conversation_type" = 'deal' and "conversations"."deal_id" is not null))
);
--> statement-breakpoint
CREATE TABLE "message_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"file_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ux_message_attachments_file" UNIQUE("file_id")
);
--> statement-breakpoint
CREATE TABLE "message_delivery_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" uuid NOT NULL,
	"recipient_user_id" uuid NOT NULL,
	"channel" text NOT NULL,
	"status" text NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "message_delivery_events_channel_chk" CHECK ("message_delivery_events"."channel" in ('in_app', 'email', 'push')),
	CONSTRAINT "message_delivery_events_status_chk" CHECK ("message_delivery_events"."status" in ('queued', 'delivered', 'failed'))
);
--> statement-breakpoint
CREATE TABLE "message_read_receipts" (
	"message_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"read_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pk_message_read_receipts" PRIMARY KEY("message_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "message_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" uuid NOT NULL,
	"reporter_user_id" uuid NOT NULL,
	"reporter_company_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"details" text,
	"status" text DEFAULT 'open' NOT NULL,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ux_message_reports" UNIQUE("message_id","reporter_user_id"),
	CONSTRAINT "message_reports_reason_chk" CHECK ("message_reports"."reason" in ('spam', 'harassment', 'fraud', 'inappropriate', 'other')),
	CONSTRAINT "message_reports_status_chk" CHECK ("message_reports"."status" in ('open', 'reviewing', 'actioned', 'dismissed'))
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"sender_user_id" uuid,
	"sender_company_id" uuid,
	"kind" text DEFAULT 'text' NOT NULL,
	"body" text,
	"reply_to_id" uuid,
	"moderation_status" text DEFAULT 'visible' NOT NULL,
	"edited_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ux_messages_id_conversation" UNIQUE("id","conversation_id"),
	CONSTRAINT "messages_kind_chk" CHECK ("messages"."kind" in ('text', 'system', 'attachment')),
	CONSTRAINT "messages_moderation_chk" CHECK ("messages"."moderation_status" in ('visible', 'flagged', 'hidden')),
	CONSTRAINT "messages_body_chk" CHECK ("messages"."body" is null or length("messages"."body") <= 10000),
	CONSTRAINT "messages_text_body_chk" CHECK ("messages"."kind" <> 'text' or "messages"."body" is not null),
	CONSTRAINT "messages_sender_chk" CHECK ("messages"."kind" = 'system' or ("messages"."sender_user_id" is not null and "messages"."sender_company_id" is not null))
);
--> statement-breakpoint
CREATE TABLE "company_reputation_metrics" (
	"company_id" uuid PRIMARY KEY NOT NULL,
	"review_count" integer DEFAULT 0 NOT NULL,
	"average_rating" numeric(3, 2),
	"completed_deals" integer DEFAULT 0 NOT NULL,
	"avg_response_hours" numeric(8, 2),
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "company_reputation_metrics_rating_chk" CHECK ("company_reputation_metrics"."average_rating" is null or "company_reputation_metrics"."average_rating" between 1 and 5),
	CONSTRAINT "company_reputation_metrics_counts_chk" CHECK ("company_reputation_metrics"."review_count" >= 0 and "company_reputation_metrics"."completed_deals" >= 0)
);
--> statement-breakpoint
CREATE TABLE "company_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deal_id" uuid NOT NULL,
	"reviewer_company_id" uuid NOT NULL,
	"reviewed_company_id" uuid NOT NULL,
	"reviewer_user_id" uuid NOT NULL,
	"rating" smallint NOT NULL,
	"title" text,
	"body" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"moderated_by_user_id" uuid,
	"moderated_at" timestamp with time zone,
	"moderation_note" text,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ux_company_reviews_id_reviewed" UNIQUE("id","reviewed_company_id"),
	CONSTRAINT "ux_company_reviews_deal_reviewer" UNIQUE("deal_id","reviewer_company_id"),
	CONSTRAINT "company_reviews_rating_chk" CHECK ("company_reviews"."rating" between 1 and 5),
	CONSTRAINT "company_reviews_status_chk" CHECK ("company_reviews"."status" in ('pending', 'published', 'rejected', 'removed')),
	CONSTRAINT "company_reviews_not_self_chk" CHECK ("company_reviews"."reviewer_company_id" <> "company_reviews"."reviewed_company_id"),
	CONSTRAINT "company_reviews_body_chk" CHECK ("company_reviews"."body" is null or length("company_reviews"."body") <= 5000),
	CONSTRAINT "company_reviews_published_chk" CHECK (("company_reviews"."status" = 'published') = ("company_reviews"."published_at" is not null))
);
--> statement-breakpoint
CREATE TABLE "review_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"review_id" uuid NOT NULL,
	"reporter_user_id" uuid NOT NULL,
	"reporter_company_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"details" text,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	CONSTRAINT "ux_review_reports" UNIQUE("review_id","reporter_user_id"),
	CONSTRAINT "review_reports_reason_chk" CHECK ("review_reports"."reason" in ('fake', 'abusive', 'conflict_of_interest', 'privacy', 'other')),
	CONSTRAINT "review_reports_status_chk" CHECK ("review_reports"."status" in ('open', 'reviewing', 'actioned', 'dismissed'))
);
--> statement-breakpoint
CREATE TABLE "review_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"review_id" uuid NOT NULL,
	"responding_company_id" uuid NOT NULL,
	"responded_by_user_id" uuid NOT NULL,
	"body" text NOT NULL,
	"status" text DEFAULT 'published' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ux_review_responses_review" UNIQUE("review_id"),
	CONSTRAINT "review_responses_body_chk" CHECK (length("review_responses"."body") between 1 and 3000)
);
--> statement-breakpoint
CREATE TABLE "device_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"platform" text NOT NULL,
	"token" text NOT NULL,
	"last_seen_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ux_device_tokens_token" UNIQUE("token"),
	CONSTRAINT "device_tokens_platform_chk" CHECK ("device_tokens"."platform" in ('ios', 'android', 'web'))
);
--> statement-breakpoint
CREATE TABLE "notification_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"notification_id" uuid NOT NULL,
	"channel" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_error" text,
	"provider_message_id" text,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ux_notification_deliveries" UNIQUE("notification_id","channel"),
	CONSTRAINT "notification_deliveries_channel_chk" CHECK ("notification_deliveries"."channel" in ('in_app', 'email', 'push', 'sms')),
	CONSTRAINT "notification_deliveries_status_chk" CHECK ("notification_deliveries"."status" in ('pending', 'processing', 'sent', 'failed', 'suppressed')),
	CONSTRAINT "notification_deliveries_attempts_chk" CHECK ("notification_deliveries"."attempts" between 0 and 20)
);
--> statement-breakpoint
CREATE TABLE "notification_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_key" text NOT NULL,
	"channel" text NOT NULL,
	"locale" text DEFAULT 'en' NOT NULL,
	"subject_template" text,
	"body_template" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ux_notification_templates" UNIQUE("template_key","channel","locale"),
	CONSTRAINT "notification_templates_channel_chk" CHECK ("notification_templates"."channel" in ('in_app', 'email', 'push', 'sms'))
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipient_user_id" uuid NOT NULL,
	"company_id" uuid,
	"category" text NOT NULL,
	"notification_type" text NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"resource_type" text,
	"resource_id" uuid,
	"payload" jsonb,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notifications_category_chk" CHECK ("notifications"."category" in ('rfq', 'quotation', 'message', 'deal', 'verification', 'invitation', 'security', 'system'))
);
--> statement-breakpoint
CREATE TABLE "abuse_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reporter_user_id" uuid NOT NULL,
	"reporter_company_id" uuid,
	"subject_type" text NOT NULL,
	"subject_id" uuid,
	"reason" text NOT NULL,
	"details" text,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	CONSTRAINT "abuse_reports_subject_chk" CHECK ("abuse_reports"."subject_type" in ('company', 'product', 'rfq', 'quotation', 'user', 'other')),
	CONSTRAINT "abuse_reports_status_chk" CHECK ("abuse_reports"."status" in ('open', 'reviewing', 'actioned', 'dismissed'))
);
--> statement-breakpoint
CREATE TABLE "admin_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_user_id" uuid NOT NULL,
	"action" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" uuid,
	"reason" text NOT NULL,
	"request_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_role_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"admin_role" text NOT NULL,
	"granted_by_user_id" uuid,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "admin_role_assignments_role_chk" CHECK ("admin_role_assignments"."admin_role" in ('super_admin', 'verification_officer', 'moderator', 'support', 'compliance_officer', 'readonly_auditor'))
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_type" text NOT NULL,
	"actor_user_id" uuid,
	"company_id" uuid,
	"action" text NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" uuid,
	"request_id" text,
	"ip_address" "inet",
	"user_agent" text,
	"changes" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "audit_logs_actor_type_chk" CHECK ("audit_logs"."actor_type" in ('user', 'admin', 'system', 'worker', 'provider'))
);
--> statement-breakpoint
CREATE TABLE "idempotency_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"company_id" uuid,
	"scope" text NOT NULL,
	"key" text NOT NULL,
	"request_hash" text NOT NULL,
	"response_status" integer,
	"resource_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "ux_idempotency_keys" UNIQUE("user_id","scope","key")
);
--> statement-breakpoint
CREATE TABLE "moderation_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"admin_user_id" uuid NOT NULL,
	"action" text NOT NULL,
	"note" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "moderation_actions_action_chk" CHECK ("moderation_actions"."action" in ('warn', 'hide_content', 'remove_content', 'suspend_company', 'suspend_user', 'dismiss', 'restore'))
);
--> statement-breakpoint
CREATE TABLE "moderation_cases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject_type" text NOT NULL,
	"subject_id" uuid NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"assigned_admin_user_id" uuid,
	"summary" text,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "moderation_cases_subject_chk" CHECK ("moderation_cases"."subject_type" in ('message', 'review', 'product', 'rfq', 'company', 'file')),
	CONSTRAINT "moderation_cases_status_chk" CHECK ("moderation_cases"."status" in ('open', 'in_review', 'actioned', 'dismissed'))
);
--> statement-breakpoint
CREATE TABLE "outbox_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid,
	"aggregate_type" text NOT NULL,
	"aggregate_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone,
	"attempts" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	CONSTRAINT "outbox_events_attempts_chk" CHECK ("outbox_events"."attempts" between 0 and 50)
);
--> statement-breakpoint
CREATE TABLE "security_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" text NOT NULL,
	"severity" text DEFAULT 'info' NOT NULL,
	"user_id" uuid,
	"company_id" uuid,
	"ip_address" "inet",
	"request_id" text,
	"detail" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "security_events_severity_chk" CHECK ("security_events"."severity" in ('info', 'warning', 'critical'))
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"value" jsonb NOT NULL,
	"description" text,
	"is_public" boolean DEFAULT false NOT NULL,
	"updated_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "system_settings_key_unique" UNIQUE("key"),
	CONSTRAINT "system_settings_key_chk" CHECK ("system_settings"."key" ~ '^[a-z][a-z0-9_.]{1,100}$')
);
--> statement-breakpoint
ALTER TABLE "certification_issuers" ADD CONSTRAINT "certification_issuers_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certifications" ADD CONSTRAINT "certifications_default_issuer_id_certification_issuers_id_fk" FOREIGN KEY ("default_issuer_id") REFERENCES "public"."certification_issuers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cities" ADD CONSTRAINT "cities_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cities" ADD CONSTRAINT "cities_state_province_id_states_provinces_id_fk" FOREIGN KEY ("state_province_id") REFERENCES "public"."states_provinces"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "countries" ADD CONSTRAINT "countries_default_currency_id_currencies_id_fk" FOREIGN KEY ("default_currency_id") REFERENCES "public"."currencies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hs_codes" ADD CONSTRAINT "hs_codes_parent_id_hs_codes_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."hs_codes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ports" ADD CONSTRAINT "ports_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ports" ADD CONSTRAINT "ports_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_parent_id_product_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."product_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_category_closure" ADD CONSTRAINT "product_category_closure_ancestor_id_product_categories_id_fk" FOREIGN KEY ("ancestor_id") REFERENCES "public"."product_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_category_closure" ADD CONSTRAINT "product_category_closure_descendant_id_product_categories_id_fk" FOREIGN KEY ("descendant_id") REFERENCES "public"."product_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "states_provinces" ADD CONSTRAINT "states_provinces_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "units_of_measure" ADD CONSTRAINT "units_of_measure_base_unit_id_units_of_measure_id_fk" FOREIGN KEY ("base_unit_id") REFERENCES "public"."units_of_measure"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_verification_tokens" ADD CONSTRAINT "email_verification_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "phone_verification_tokens" ADD CONSTRAINT "phone_verification_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_auth_identities" ADD CONSTRAINT "user_auth_identities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_mfa_methods" ADD CONSTRAINT "user_mfa_methods_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_notification_preferences" ADD CONSTRAINT "user_notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_security_events" ADD CONSTRAINT "user_security_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_addresses" ADD CONSTRAINT "company_addresses_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_addresses" ADD CONSTRAINT "company_addresses_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_addresses" ADD CONSTRAINT "company_addresses_state_province_id_states_provinces_id_fk" FOREIGN KEY ("state_province_id") REFERENCES "public"."states_provinces"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_addresses" ADD CONSTRAINT "company_addresses_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_business_types" ADD CONSTRAINT "company_business_types_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_business_types" ADD CONSTRAINT "company_business_types_business_type_id_business_types_id_fk" FOREIGN KEY ("business_type_id") REFERENCES "public"."business_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_contacts" ADD CONSTRAINT "company_contacts_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_contacts" ADD CONSTRAINT "company_contacts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_invitations" ADD CONSTRAINT "company_invitations_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_invitations" ADD CONSTRAINT "company_invitations_role_id_company_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."company_roles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_invitations" ADD CONSTRAINT "company_invitations_invited_by_user_id_users_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_invitations" ADD CONSTRAINT "company_invitations_accepted_by_user_id_users_id_fk" FOREIGN KEY ("accepted_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_memberships" ADD CONSTRAINT "company_memberships_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_memberships" ADD CONSTRAINT "company_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_memberships" ADD CONSTRAINT "company_memberships_role_id_company_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."company_roles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_memberships" ADD CONSTRAINT "company_memberships_invited_by_user_id_users_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_memberships" ADD CONSTRAINT "company_memberships_removed_by_user_id_users_id_fk" FOREIGN KEY ("removed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_profiles" ADD CONSTRAINT "company_profiles_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_registration_identifiers" ADD CONSTRAINT "company_registration_identifiers_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_registration_identifiers" ADD CONSTRAINT "company_registration_identifiers_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_role_permissions" ADD CONSTRAINT "company_role_permissions_role_id_company_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."company_roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_role_permissions" ADD CONSTRAINT "company_role_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_roles" ADD CONSTRAINT "company_roles_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_settings" ADD CONSTRAINT "company_settings_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_settings" ADD CONSTRAINT "company_settings_default_currency_id_currencies_id_fk" FOREIGN KEY ("default_currency_id") REFERENCES "public"."currencies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_settings" ADD CONSTRAINT "company_settings_default_language_id_languages_id_fk" FOREIGN KEY ("default_language_id") REFERENCES "public"."languages"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_documents" ADD CONSTRAINT "company_documents_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_documents" ADD CONSTRAINT "company_documents_file_tenant_fk" FOREIGN KEY ("file_id","company_id") REFERENCES "public"."files"("id","company_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_access_grants" ADD CONSTRAINT "file_access_grants_grantee_company_id_companies_id_fk" FOREIGN KEY ("grantee_company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_access_grants" ADD CONSTRAINT "file_access_grants_grantee_user_id_users_id_fk" FOREIGN KEY ("grantee_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_access_grants" ADD CONSTRAINT "file_access_grants_granted_by_user_id_users_id_fk" FOREIGN KEY ("granted_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_access_grants" ADD CONSTRAINT "file_access_grants_file_tenant_fk" FOREIGN KEY ("file_id","company_id") REFERENCES "public"."files"("id","company_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_scan_results" ADD CONSTRAINT "file_scan_results_file_tenant_fk" FOREIGN KEY ("file_id","company_id") REFERENCES "public"."files"("id","company_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_versions" ADD CONSTRAINT "file_versions_uploaded_by_user_id_users_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_versions" ADD CONSTRAINT "file_versions_file_tenant_fk" FOREIGN KEY ("file_id","company_id") REFERENCES "public"."files"("id","company_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_uploaded_by_user_id_users_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_verification_levels" ADD CONSTRAINT "company_verification_levels_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_verification_levels" ADD CONSTRAINT "company_verification_levels_case_tenant_fk" FOREIGN KEY ("granted_case_id","company_id") REFERENCES "public"."verification_cases"("id","company_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_flags" ADD CONSTRAINT "compliance_flags_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_flags" ADD CONSTRAINT "compliance_flags_raised_by_user_id_users_id_fk" FOREIGN KEY ("raised_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sanctions_screening_records" ADD CONSTRAINT "sanctions_screening_records_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sanctions_screening_records" ADD CONSTRAINT "sanctions_screening_records_provider_id_verification_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."verification_providers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sanctions_screening_records" ADD CONSTRAINT "sanctions_screening_records_reviewed_by_user_id_users_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_cases" ADD CONSTRAINT "verification_cases_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_cases" ADD CONSTRAINT "verification_cases_submitted_by_user_id_users_id_fk" FOREIGN KEY ("submitted_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_cases" ADD CONSTRAINT "verification_cases_assigned_admin_user_id_users_id_fk" FOREIGN KEY ("assigned_admin_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_cases" ADD CONSTRAINT "verification_cases_decided_by_user_id_users_id_fk" FOREIGN KEY ("decided_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_checks" ADD CONSTRAINT "verification_checks_provider_id_verification_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."verification_providers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_checks" ADD CONSTRAINT "verification_checks_performed_by_user_id_users_id_fk" FOREIGN KEY ("performed_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_checks" ADD CONSTRAINT "verification_checks_case_tenant_fk" FOREIGN KEY ("case_id","company_id") REFERENCES "public"."verification_cases"("id","company_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_documents" ADD CONSTRAINT "verification_documents_issuer_country_id_countries_id_fk" FOREIGN KEY ("issuer_country_id") REFERENCES "public"."countries"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_documents" ADD CONSTRAINT "verification_documents_reviewed_by_user_id_users_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_documents" ADD CONSTRAINT "verification_documents_case_tenant_fk" FOREIGN KEY ("case_id","company_id") REFERENCES "public"."verification_cases"("id","company_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_documents" ADD CONSTRAINT "verification_documents_file_tenant_fk" FOREIGN KEY ("file_id","company_id") REFERENCES "public"."files"("id","company_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_expiry_records" ADD CONSTRAINT "verification_expiry_records_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_expiry_records" ADD CONSTRAINT "verification_expiry_records_verification_document_id_verification_documents_id_fk" FOREIGN KEY ("verification_document_id") REFERENCES "public"."verification_documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_status_history" ADD CONSTRAINT "verification_status_history_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_status_history" ADD CONSTRAINT "verification_status_history_case_tenant_fk" FOREIGN KEY ("case_id","company_id") REFERENCES "public"."verification_cases"("id","company_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_categories_mapping" ADD CONSTRAINT "product_categories_mapping_category_id_product_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."product_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_categories_mapping" ADD CONSTRAINT "product_categories_mapping_product_fk" FOREIGN KEY ("product_id","company_id") REFERENCES "public"."products"("id","company_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_certifications" ADD CONSTRAINT "product_certifications_certification_id_certifications_id_fk" FOREIGN KEY ("certification_id") REFERENCES "public"."certifications"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_certifications" ADD CONSTRAINT "product_certifications_issuer_id_certification_issuers_id_fk" FOREIGN KEY ("issuer_id") REFERENCES "public"."certification_issuers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_certifications" ADD CONSTRAINT "product_certifications_product_fk" FOREIGN KEY ("product_id","company_id") REFERENCES "public"."products"("id","company_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_certifications" ADD CONSTRAINT "product_certifications_file_fk" FOREIGN KEY ("file_id","company_id") REFERENCES "public"."files"("id","company_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_documents" ADD CONSTRAINT "product_documents_product_fk" FOREIGN KEY ("product_id","company_id") REFERENCES "public"."products"("id","company_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_documents" ADD CONSTRAINT "product_documents_file_fk" FOREIGN KEY ("file_id","company_id") REFERENCES "public"."files"("id","company_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_hs_codes" ADD CONSTRAINT "product_hs_codes_hs_code_id_hs_codes_id_fk" FOREIGN KEY ("hs_code_id") REFERENCES "public"."hs_codes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_hs_codes" ADD CONSTRAINT "product_hs_codes_product_fk" FOREIGN KEY ("product_id","company_id") REFERENCES "public"."products"("id","company_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_fk" FOREIGN KEY ("product_id","company_id") REFERENCES "public"."products"("id","company_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_file_fk" FOREIGN KEY ("file_id","company_id") REFERENCES "public"."files"("id","company_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_specification_definitions" ADD CONSTRAINT "product_specification_definitions_category_id_product_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."product_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_specification_definitions" ADD CONSTRAINT "product_specification_definitions_uom_id_units_of_measure_id_fk" FOREIGN KEY ("uom_id") REFERENCES "public"."units_of_measure"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_specifications" ADD CONSTRAINT "product_specifications_definition_id_product_specification_definitions_id_fk" FOREIGN KEY ("definition_id") REFERENCES "public"."product_specification_definitions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_specifications" ADD CONSTRAINT "product_specifications_uom_id_units_of_measure_id_fk" FOREIGN KEY ("uom_id") REFERENCES "public"."units_of_measure"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_specifications" ADD CONSTRAINT "product_specifications_product_fk" FOREIGN KEY ("product_id","company_id") REFERENCES "public"."products"("id","company_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_manufacturer_company_id_companies_id_fk" FOREIGN KEY ("manufacturer_company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_origin_country_id_countries_id_fk" FOREIGN KEY ("origin_country_id") REFERENCES "public"."countries"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_primary_category_id_product_categories_id_fk" FOREIGN KEY ("primary_category_id") REFERENCES "public"."product_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_base_uom_id_units_of_measure_id_fk" FOREIGN KEY ("base_uom_id") REFERENCES "public"."units_of_measure"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_product_listings" ADD CONSTRAINT "seller_product_listings_moq_uom_id_units_of_measure_id_fk" FOREIGN KEY ("moq_uom_id") REFERENCES "public"."units_of_measure"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_product_listings" ADD CONSTRAINT "seller_product_listings_currency_id_currencies_id_fk" FOREIGN KEY ("currency_id") REFERENCES "public"."currencies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_product_listings" ADD CONSTRAINT "seller_product_listings_capacity_uom_id_units_of_measure_id_fk" FOREIGN KEY ("capacity_uom_id") REFERENCES "public"."units_of_measure"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_product_listings" ADD CONSTRAINT "seller_product_listings_incoterm_id_incoterms_id_fk" FOREIGN KEY ("incoterm_id") REFERENCES "public"."incoterms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_product_listings" ADD CONSTRAINT "seller_product_listings_origin_port_id_ports_id_fk" FOREIGN KEY ("origin_port_id") REFERENCES "public"."ports"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_product_listings" ADD CONSTRAINT "seller_product_listings_product_fk" FOREIGN KEY ("product_id","company_id") REFERENCES "public"."products"("id","company_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buyer_import_markets" ADD CONSTRAINT "buyer_import_markets_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buyer_import_markets" ADD CONSTRAINT "buyer_import_markets_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buyer_import_requirements" ADD CONSTRAINT "buyer_import_requirements_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buyer_import_requirements" ADD CONSTRAINT "buyer_import_requirements_certification_id_certifications_id_fk" FOREIGN KEY ("certification_id") REFERENCES "public"."certifications"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buyer_preferred_origins" ADD CONSTRAINT "buyer_preferred_origins_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buyer_preferred_origins" ADD CONSTRAINT "buyer_preferred_origins_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buyer_product_interests" ADD CONSTRAINT "buyer_product_interests_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buyer_product_interests" ADD CONSTRAINT "buyer_product_interests_category_id_product_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."product_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buyer_product_interests" ADD CONSTRAINT "buyer_product_interests_hs_code_id_hs_codes_id_fk" FOREIGN KEY ("hs_code_id") REFERENCES "public"."hs_codes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buyer_profiles" ADD CONSTRAINT "buyer_profiles_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buyer_trade_preferences" ADD CONSTRAINT "buyer_trade_preferences_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buyer_trade_preferences" ADD CONSTRAINT "buyer_trade_preferences_preferred_currency_id_currencies_id_fk" FOREIGN KEY ("preferred_currency_id") REFERENCES "public"."currencies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buyer_trade_preferences" ADD CONSTRAINT "buyer_trade_preferences_preferred_incoterm_id_incoterms_id_fk" FOREIGN KEY ("preferred_incoterm_id") REFERENCES "public"."incoterms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buyer_trade_preferences" ADD CONSTRAINT "buyer_trade_preferences_preferred_payment_term_id_payment_terms_id_fk" FOREIGN KEY ("preferred_payment_term_id") REFERENCES "public"."payment_terms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buyer_trade_preferences" ADD CONSTRAINT "buyer_trade_preferences_preferred_shipment_mode_id_shipment_modes_id_fk" FOREIGN KEY ("preferred_shipment_mode_id") REFERENCES "public"."shipment_modes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_accepted_currencies" ADD CONSTRAINT "seller_accepted_currencies_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_accepted_currencies" ADD CONSTRAINT "seller_accepted_currencies_currency_id_currencies_id_fk" FOREIGN KEY ("currency_id") REFERENCES "public"."currencies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_capabilities" ADD CONSTRAINT "seller_capabilities_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_capacity_records" ADD CONSTRAINT "seller_capacity_records_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_capacity_records" ADD CONSTRAINT "seller_capacity_records_category_id_product_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."product_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_capacity_records" ADD CONSTRAINT "seller_capacity_records_uom_id_units_of_measure_id_fk" FOREIGN KEY ("uom_id") REFERENCES "public"."units_of_measure"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_capacity_records" ADD CONSTRAINT "seller_capacity_records_product_fk" FOREIGN KEY ("product_id","company_id") REFERENCES "public"."products"("id","company_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_certifications" ADD CONSTRAINT "seller_certifications_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_certifications" ADD CONSTRAINT "seller_certifications_certification_id_certifications_id_fk" FOREIGN KEY ("certification_id") REFERENCES "public"."certifications"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_certifications" ADD CONSTRAINT "seller_certifications_issuer_id_certification_issuers_id_fk" FOREIGN KEY ("issuer_id") REFERENCES "public"."certification_issuers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_certifications" ADD CONSTRAINT "seller_certifications_file_fk" FOREIGN KEY ("file_id","company_id") REFERENCES "public"."files"("id","company_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_export_markets" ADD CONSTRAINT "seller_export_markets_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_export_markets" ADD CONSTRAINT "seller_export_markets_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_incoterm_capabilities" ADD CONSTRAINT "seller_incoterm_capabilities_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_incoterm_capabilities" ADD CONSTRAINT "seller_incoterm_capabilities_incoterm_id_incoterms_id_fk" FOREIGN KEY ("incoterm_id") REFERENCES "public"."incoterms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_incoterm_capabilities" ADD CONSTRAINT "seller_incoterm_capabilities_port_id_ports_id_fk" FOREIGN KEY ("port_id") REFERENCES "public"."ports"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_incoterm_capabilities" ADD CONSTRAINT "seller_incoterm_capabilities_shipment_mode_id_shipment_modes_id_fk" FOREIGN KEY ("shipment_mode_id") REFERENCES "public"."shipment_modes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_lead_times" ADD CONSTRAINT "seller_lead_times_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_lead_times" ADD CONSTRAINT "seller_lead_times_category_id_product_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."product_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_lead_times" ADD CONSTRAINT "seller_lead_times_product_fk" FOREIGN KEY ("product_id","company_id") REFERENCES "public"."products"("id","company_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_moq_records" ADD CONSTRAINT "seller_moq_records_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_moq_records" ADD CONSTRAINT "seller_moq_records_category_id_product_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."product_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_moq_records" ADD CONSTRAINT "seller_moq_records_uom_id_units_of_measure_id_fk" FOREIGN KEY ("uom_id") REFERENCES "public"."units_of_measure"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_moq_records" ADD CONSTRAINT "seller_moq_records_currency_id_currencies_id_fk" FOREIGN KEY ("currency_id") REFERENCES "public"."currencies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_moq_records" ADD CONSTRAINT "seller_moq_records_product_fk" FOREIGN KEY ("product_id","company_id") REFERENCES "public"."products"("id","company_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_packaging_capabilities" ADD CONSTRAINT "seller_packaging_capabilities_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_packaging_capabilities" ADD CONSTRAINT "seller_packaging_capabilities_packaging_type_id_packaging_types_id_fk" FOREIGN KEY ("packaging_type_id") REFERENCES "public"."packaging_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_payment_methods" ADD CONSTRAINT "seller_payment_methods_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_payment_methods" ADD CONSTRAINT "seller_payment_methods_payment_term_id_payment_terms_id_fk" FOREIGN KEY ("payment_term_id") REFERENCES "public"."payment_terms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_product_capabilities" ADD CONSTRAINT "seller_product_capabilities_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_product_capabilities" ADD CONSTRAINT "seller_product_capabilities_category_id_product_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."product_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_product_capabilities" ADD CONSTRAINT "seller_product_capabilities_hs_code_id_hs_codes_id_fk" FOREIGN KEY ("hs_code_id") REFERENCES "public"."hs_codes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_product_capabilities" ADD CONSTRAINT "seller_product_capabilities_product_fk" FOREIGN KEY ("product_id","company_id") REFERENCES "public"."products"("id","company_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_shipping_ports" ADD CONSTRAINT "seller_shipping_ports_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_shipping_ports" ADD CONSTRAINT "seller_shipping_ports_port_id_ports_id_fk" FOREIGN KEY ("port_id") REFERENCES "public"."ports"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_supply_regions" ADD CONSTRAINT "seller_supply_regions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_supply_regions" ADD CONSTRAINT "seller_supply_regions_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_supply_regions" ADD CONSTRAINT "seller_supply_regions_state_province_id_states_provinces_id_fk" FOREIGN KEY ("state_province_id") REFERENCES "public"."states_provinces"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_trade_profiles" ADD CONSTRAINT "seller_trade_profiles_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_trade_terms" ADD CONSTRAINT "seller_trade_terms_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_trade_terms" ADD CONSTRAINT "seller_trade_terms_min_order_currency_id_currencies_id_fk" FOREIGN KEY ("min_order_currency_id") REFERENCES "public"."currencies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_attachments" ADD CONSTRAINT "rfq_attachments_rfq_fk" FOREIGN KEY ("rfq_id","company_id") REFERENCES "public"."rfqs"("id","company_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_attachments" ADD CONSTRAINT "rfq_attachments_file_fk" FOREIGN KEY ("file_id","company_id") REFERENCES "public"."files"("id","company_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_certification_requirements" ADD CONSTRAINT "rfq_certification_requirements_certification_id_certifications_id_fk" FOREIGN KEY ("certification_id") REFERENCES "public"."certifications"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_certification_requirements" ADD CONSTRAINT "rfq_certification_requirements_rfq_fk" FOREIGN KEY ("rfq_id","company_id") REFERENCES "public"."rfqs"("id","company_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_certification_requirements" ADD CONSTRAINT "rfq_certification_requirements_item_fk" FOREIGN KEY ("rfq_item_id","company_id") REFERENCES "public"."rfq_items"("id","company_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_clarifications" ADD CONSTRAINT "rfq_clarifications_asked_by_company_id_companies_id_fk" FOREIGN KEY ("asked_by_company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_clarifications" ADD CONSTRAINT "rfq_clarifications_asked_by_user_id_users_id_fk" FOREIGN KEY ("asked_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_clarifications" ADD CONSTRAINT "rfq_clarifications_answered_by_user_id_users_id_fk" FOREIGN KEY ("answered_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_clarifications" ADD CONSTRAINT "rfq_clarifications_rfq_fk" FOREIGN KEY ("rfq_id","rfq_company_id") REFERENCES "public"."rfqs"("id","company_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_destinations" ADD CONSTRAINT "rfq_destinations_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_destinations" ADD CONSTRAINT "rfq_destinations_port_id_ports_id_fk" FOREIGN KEY ("port_id") REFERENCES "public"."ports"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_destinations" ADD CONSTRAINT "rfq_destinations_incoterm_id_incoterms_id_fk" FOREIGN KEY ("incoterm_id") REFERENCES "public"."incoterms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_destinations" ADD CONSTRAINT "rfq_destinations_rfq_fk" FOREIGN KEY ("rfq_id","company_id") REFERENCES "public"."rfqs"("id","company_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_invitations" ADD CONSTRAINT "rfq_invitations_invited_company_id_companies_id_fk" FOREIGN KEY ("invited_company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_invitations" ADD CONSTRAINT "rfq_invitations_invited_by_user_id_users_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_invitations" ADD CONSTRAINT "rfq_invitations_rfq_fk" FOREIGN KEY ("rfq_id","company_id") REFERENCES "public"."rfqs"("id","company_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_items" ADD CONSTRAINT "rfq_items_category_id_product_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."product_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_items" ADD CONSTRAINT "rfq_items_hs_code_id_hs_codes_id_fk" FOREIGN KEY ("hs_code_id") REFERENCES "public"."hs_codes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_items" ADD CONSTRAINT "rfq_items_uom_id_units_of_measure_id_fk" FOREIGN KEY ("uom_id") REFERENCES "public"."units_of_measure"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_items" ADD CONSTRAINT "rfq_items_rfq_fk" FOREIGN KEY ("rfq_id","company_id") REFERENCES "public"."rfqs"("id","company_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_origin_preferences" ADD CONSTRAINT "rfq_origin_preferences_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_origin_preferences" ADD CONSTRAINT "rfq_origin_preferences_rfq_fk" FOREIGN KEY ("rfq_id","company_id") REFERENCES "public"."rfqs"("id","company_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_payment_preferences" ADD CONSTRAINT "rfq_payment_preferences_payment_term_id_payment_terms_id_fk" FOREIGN KEY ("payment_term_id") REFERENCES "public"."payment_terms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_payment_preferences" ADD CONSTRAINT "rfq_payment_preferences_rfq_fk" FOREIGN KEY ("rfq_id","company_id") REFERENCES "public"."rfqs"("id","company_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_required_documents" ADD CONSTRAINT "rfq_required_documents_rfq_fk" FOREIGN KEY ("rfq_id","company_id") REFERENCES "public"."rfqs"("id","company_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_saved_records" ADD CONSTRAINT "rfq_saved_records_rfq_id_rfqs_id_fk" FOREIGN KEY ("rfq_id") REFERENCES "public"."rfqs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_saved_records" ADD CONSTRAINT "rfq_saved_records_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_saved_records" ADD CONSTRAINT "rfq_saved_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_specifications" ADD CONSTRAINT "rfq_specifications_definition_id_product_specification_definitions_id_fk" FOREIGN KEY ("definition_id") REFERENCES "public"."product_specification_definitions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_specifications" ADD CONSTRAINT "rfq_specifications_uom_id_units_of_measure_id_fk" FOREIGN KEY ("uom_id") REFERENCES "public"."units_of_measure"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_specifications" ADD CONSTRAINT "rfq_specifications_item_fk" FOREIGN KEY ("rfq_item_id","company_id") REFERENCES "public"."rfq_items"("id","company_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_status_history" ADD CONSTRAINT "rfq_status_history_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_status_history" ADD CONSTRAINT "rfq_status_history_rfq_fk" FOREIGN KEY ("rfq_id","company_id") REFERENCES "public"."rfqs"("id","company_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_trade_requirements" ADD CONSTRAINT "rfq_trade_requirements_packaging_type_id_packaging_types_id_fk" FOREIGN KEY ("packaging_type_id") REFERENCES "public"."packaging_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_trade_requirements" ADD CONSTRAINT "rfq_trade_requirements_shipment_mode_id_shipment_modes_id_fk" FOREIGN KEY ("shipment_mode_id") REFERENCES "public"."shipment_modes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_trade_requirements" ADD CONSTRAINT "rfq_trade_requirements_rfq_fk" FOREIGN KEY ("rfq_id","company_id") REFERENCES "public"."rfqs"("id","company_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_views" ADD CONSTRAINT "rfq_views_rfq_id_rfqs_id_fk" FOREIGN KEY ("rfq_id") REFERENCES "public"."rfqs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_views" ADD CONSTRAINT "rfq_views_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_views" ADD CONSTRAINT "rfq_views_viewer_user_id_users_id_fk" FOREIGN KEY ("viewer_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_visibility_rules" ADD CONSTRAINT "rfq_visibility_rules_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_visibility_rules" ADD CONSTRAINT "rfq_visibility_rules_rfq_fk" FOREIGN KEY ("rfq_id","company_id") REFERENCES "public"."rfqs"("id","company_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfqs" ADD CONSTRAINT "rfqs_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfqs" ADD CONSTRAINT "rfqs_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfqs" ADD CONSTRAINT "rfqs_primary_category_id_product_categories_id_fk" FOREIGN KEY ("primary_category_id") REFERENCES "public"."product_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfqs" ADD CONSTRAINT "rfqs_currency_id_currencies_id_fk" FOREIGN KEY ("currency_id") REFERENCES "public"."currencies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_match_reasons" ADD CONSTRAINT "rfq_match_reasons_match_fk" FOREIGN KEY ("match_id","supplier_company_id") REFERENCES "public"."rfq_supplier_matches"("id","supplier_company_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_match_runs" ADD CONSTRAINT "rfq_match_runs_rfq_fk" FOREIGN KEY ("rfq_id","company_id") REFERENCES "public"."rfqs"("id","company_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_supplier_matches" ADD CONSTRAINT "rfq_supplier_matches_supplier_company_id_companies_id_fk" FOREIGN KEY ("supplier_company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_supplier_matches" ADD CONSTRAINT "rfq_supplier_matches_run_fk" FOREIGN KEY ("match_run_id","buyer_company_id") REFERENCES "public"."rfq_match_runs"("id","company_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_supplier_matches" ADD CONSTRAINT "rfq_supplier_matches_rfq_fk" FOREIGN KEY ("rfq_id","buyer_company_id") REFERENCES "public"."rfqs"("id","company_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_match_feedback" ADD CONSTRAINT "supplier_match_feedback_match_fk" FOREIGN KEY ("match_id","company_id") REFERENCES "public"."rfq_supplier_matches"("id","supplier_company_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_match_preferences" ADD CONSTRAINT "supplier_match_preferences_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_match_preferences" ADD CONSTRAINT "supplier_match_preferences_category_id_product_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."product_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_match_preferences" ADD CONSTRAINT "supplier_match_preferences_destination_country_id_countries_id_fk" FOREIGN KEY ("destination_country_id") REFERENCES "public"."countries"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "negotiation_events" ADD CONSTRAINT "negotiation_events_actor_company_id_companies_id_fk" FOREIGN KEY ("actor_company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "negotiation_events" ADD CONSTRAINT "negotiation_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "negotiation_events" ADD CONSTRAINT "negotiation_events_quotation_fk" FOREIGN KEY ("quotation_id","company_id") REFERENCES "public"."quotations"("id","company_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_attachments" ADD CONSTRAINT "quotation_attachments_revision_fk" FOREIGN KEY ("revision_id","company_id") REFERENCES "public"."quotation_revisions"("id","company_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_attachments" ADD CONSTRAINT "quotation_attachments_file_fk" FOREIGN KEY ("file_id","company_id") REFERENCES "public"."files"("id","company_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_certifications" ADD CONSTRAINT "quotation_certifications_certification_id_certifications_id_fk" FOREIGN KEY ("certification_id") REFERENCES "public"."certifications"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_certifications" ADD CONSTRAINT "quotation_certifications_revision_fk" FOREIGN KEY ("revision_id","company_id") REFERENCES "public"."quotation_revisions"("id","company_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_certifications" ADD CONSTRAINT "quotation_certifications_file_fk" FOREIGN KEY ("file_id","company_id") REFERENCES "public"."files"("id","company_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_comparison_entries" ADD CONSTRAINT "quotation_comparison_entries_quotation_id_quotations_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_comparison_entries" ADD CONSTRAINT "quotation_comparison_entries_revision_id_quotation_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."quotation_revisions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_comparison_entries" ADD CONSTRAINT "quotation_comparison_entries_comparison_fk" FOREIGN KEY ("comparison_id","company_id") REFERENCES "public"."quotation_comparisons"("id","company_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_comparisons" ADD CONSTRAINT "quotation_comparisons_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_comparisons" ADD CONSTRAINT "quotation_comparisons_rfq_fk" FOREIGN KEY ("rfq_id","company_id") REFERENCES "public"."rfqs"("id","company_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_items" ADD CONSTRAINT "quotation_items_rfq_item_id_rfq_items_id_fk" FOREIGN KEY ("rfq_item_id") REFERENCES "public"."rfq_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_items" ADD CONSTRAINT "quotation_items_uom_id_units_of_measure_id_fk" FOREIGN KEY ("uom_id") REFERENCES "public"."units_of_measure"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_items" ADD CONSTRAINT "quotation_items_hs_code_id_hs_codes_id_fk" FOREIGN KEY ("hs_code_id") REFERENCES "public"."hs_codes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_items" ADD CONSTRAINT "quotation_items_origin_country_id_countries_id_fk" FOREIGN KEY ("origin_country_id") REFERENCES "public"."countries"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_items" ADD CONSTRAINT "quotation_items_revision_fk" FOREIGN KEY ("revision_id","company_id") REFERENCES "public"."quotation_revisions"("id","company_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_revisions" ADD CONSTRAINT "quotation_revisions_currency_id_currencies_id_fk" FOREIGN KEY ("currency_id") REFERENCES "public"."currencies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_revisions" ADD CONSTRAINT "quotation_revisions_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_revisions" ADD CONSTRAINT "quotation_revisions_quotation_fk" FOREIGN KEY ("quotation_id","company_id") REFERENCES "public"."quotations"("id","company_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_specifications" ADD CONSTRAINT "quotation_specifications_definition_id_product_specification_definitions_id_fk" FOREIGN KEY ("definition_id") REFERENCES "public"."product_specification_definitions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_specifications" ADD CONSTRAINT "quotation_specifications_uom_id_units_of_measure_id_fk" FOREIGN KEY ("uom_id") REFERENCES "public"."units_of_measure"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_specifications" ADD CONSTRAINT "quotation_specifications_item_fk" FOREIGN KEY ("quotation_item_id","company_id") REFERENCES "public"."quotation_items"("id","company_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_status_history" ADD CONSTRAINT "quotation_status_history_actor_company_id_companies_id_fk" FOREIGN KEY ("actor_company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_status_history" ADD CONSTRAINT "quotation_status_history_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_status_history" ADD CONSTRAINT "quotation_status_history_quotation_fk" FOREIGN KEY ("quotation_id","company_id") REFERENCES "public"."quotations"("id","company_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_terms" ADD CONSTRAINT "quotation_terms_incoterm_id_incoterms_id_fk" FOREIGN KEY ("incoterm_id") REFERENCES "public"."incoterms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_terms" ADD CONSTRAINT "quotation_terms_port_of_loading_id_ports_id_fk" FOREIGN KEY ("port_of_loading_id") REFERENCES "public"."ports"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_terms" ADD CONSTRAINT "quotation_terms_payment_term_id_payment_terms_id_fk" FOREIGN KEY ("payment_term_id") REFERENCES "public"."payment_terms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_terms" ADD CONSTRAINT "quotation_terms_packaging_type_id_packaging_types_id_fk" FOREIGN KEY ("packaging_type_id") REFERENCES "public"."packaging_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_terms" ADD CONSTRAINT "quotation_terms_shipment_mode_id_shipment_modes_id_fk" FOREIGN KEY ("shipment_mode_id") REFERENCES "public"."shipment_modes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_terms" ADD CONSTRAINT "quotation_terms_revision_fk" FOREIGN KEY ("revision_id","company_id") REFERENCES "public"."quotation_revisions"("id","company_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_currency_id_currencies_id_fk" FOREIGN KEY ("currency_id") REFERENCES "public"."currencies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_rfq_buyer_fk" FOREIGN KEY ("rfq_id","buyer_company_id") REFERENCES "public"."rfqs"("id","company_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_activity_events" ADD CONSTRAINT "deal_activity_events_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_activity_events" ADD CONSTRAINT "deal_activity_events_actor_company_id_companies_id_fk" FOREIGN KEY ("actor_company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_activity_events" ADD CONSTRAINT "deal_activity_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_cancellations" ADD CONSTRAINT "deal_cancellations_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_cancellations" ADD CONSTRAINT "deal_cancellations_requested_by_company_id_companies_id_fk" FOREIGN KEY ("requested_by_company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_cancellations" ADD CONSTRAINT "deal_cancellations_requested_by_user_id_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_cancellations" ADD CONSTRAINT "deal_cancellations_responded_by_company_id_companies_id_fk" FOREIGN KEY ("responded_by_company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_confirmations" ADD CONSTRAINT "deal_confirmations_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_confirmations" ADD CONSTRAINT "deal_confirmations_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_confirmations" ADD CONSTRAINT "deal_confirmations_confirmed_by_user_id_users_id_fk" FOREIGN KEY ("confirmed_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_disputes" ADD CONSTRAINT "deal_disputes_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_disputes" ADD CONSTRAINT "deal_disputes_raised_by_company_id_companies_id_fk" FOREIGN KEY ("raised_by_company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_disputes" ADD CONSTRAINT "deal_disputes_raised_by_user_id_users_id_fk" FOREIGN KEY ("raised_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_document_versions" ADD CONSTRAINT "deal_document_versions_file_fk" FOREIGN KEY ("file_id","uploaded_by_company_id") REFERENCES "public"."files"("id","company_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_document_versions" ADD CONSTRAINT "deal_document_versions_uploaded_by_company_id_companies_id_fk" FOREIGN KEY ("uploaded_by_company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_document_versions" ADD CONSTRAINT "deal_document_versions_uploaded_by_user_id_users_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_document_versions" ADD CONSTRAINT "deal_document_versions_document_fk" FOREIGN KEY ("document_id","deal_id") REFERENCES "public"."deal_documents"("id","deal_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_documents" ADD CONSTRAINT "deal_documents_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_documents" ADD CONSTRAINT "deal_documents_created_by_company_id_companies_id_fk" FOREIGN KEY ("created_by_company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_documents" ADD CONSTRAINT "deal_documents_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_items" ADD CONSTRAINT "deal_items_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_items" ADD CONSTRAINT "deal_items_rfq_item_id_rfq_items_id_fk" FOREIGN KEY ("rfq_item_id") REFERENCES "public"."rfq_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_items" ADD CONSTRAINT "deal_items_uom_id_units_of_measure_id_fk" FOREIGN KEY ("uom_id") REFERENCES "public"."units_of_measure"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_items" ADD CONSTRAINT "deal_items_hs_code_id_hs_codes_id_fk" FOREIGN KEY ("hs_code_id") REFERENCES "public"."hs_codes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_items" ADD CONSTRAINT "deal_items_origin_country_id_countries_id_fk" FOREIGN KEY ("origin_country_id") REFERENCES "public"."countries"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_milestone_events" ADD CONSTRAINT "deal_milestone_events_actor_company_id_companies_id_fk" FOREIGN KEY ("actor_company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_milestone_events" ADD CONSTRAINT "deal_milestone_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_milestone_events" ADD CONSTRAINT "deal_milestone_events_milestone_fk" FOREIGN KEY ("milestone_id","deal_id") REFERENCES "public"."deal_milestones"("id","deal_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_milestones" ADD CONSTRAINT "deal_milestones_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_milestones" ADD CONSTRAINT "deal_milestones_responsible_company_id_companies_id_fk" FOREIGN KEY ("responsible_company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_parties" ADD CONSTRAINT "deal_parties_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_parties" ADD CONSTRAINT "deal_parties_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_parties" ADD CONSTRAINT "deal_parties_added_by_user_id_users_id_fk" FOREIGN KEY ("added_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_shipments" ADD CONSTRAINT "deal_shipments_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_shipments" ADD CONSTRAINT "deal_shipments_port_of_loading_id_ports_id_fk" FOREIGN KEY ("port_of_loading_id") REFERENCES "public"."ports"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_shipments" ADD CONSTRAINT "deal_shipments_port_of_discharge_id_ports_id_fk" FOREIGN KEY ("port_of_discharge_id") REFERENCES "public"."ports"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_shipments" ADD CONSTRAINT "deal_shipments_added_by_company_id_companies_id_fk" FOREIGN KEY ("added_by_company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_status_history" ADD CONSTRAINT "deal_status_history_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_status_history" ADD CONSTRAINT "deal_status_history_actor_company_id_companies_id_fk" FOREIGN KEY ("actor_company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_status_history" ADD CONSTRAINT "deal_status_history_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_terms" ADD CONSTRAINT "deal_terms_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_terms" ADD CONSTRAINT "deal_terms_incoterm_id_incoterms_id_fk" FOREIGN KEY ("incoterm_id") REFERENCES "public"."incoterms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_terms" ADD CONSTRAINT "deal_terms_port_of_loading_id_ports_id_fk" FOREIGN KEY ("port_of_loading_id") REFERENCES "public"."ports"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_terms" ADD CONSTRAINT "deal_terms_payment_term_id_payment_terms_id_fk" FOREIGN KEY ("payment_term_id") REFERENCES "public"."payment_terms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_terms" ADD CONSTRAINT "deal_terms_packaging_type_id_packaging_types_id_fk" FOREIGN KEY ("packaging_type_id") REFERENCES "public"."packaging_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_terms" ADD CONSTRAINT "deal_terms_shipment_mode_id_shipment_modes_id_fk" FOREIGN KEY ("shipment_mode_id") REFERENCES "public"."shipment_modes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_rfq_id_rfqs_id_fk" FOREIGN KEY ("rfq_id") REFERENCES "public"."rfqs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_currency_id_currencies_id_fk" FOREIGN KEY ("currency_id") REFERENCES "public"."currencies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_quotation_supplier_fk" FOREIGN KEY ("quotation_id","supplier_company_id") REFERENCES "public"."quotations"("id","company_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_quotation_buyer_fk" FOREIGN KEY ("quotation_id","buyer_company_id") REFERENCES "public"."quotations"("id","buyer_company_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_revision_fk" FOREIGN KEY ("accepted_revision_id","quotation_id") REFERENCES "public"."quotation_revisions"("id","quotation_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_buyer_company_fk" FOREIGN KEY ("buyer_company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_supplier_company_fk" FOREIGN KEY ("supplier_company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_archives" ADD CONSTRAINT "conversation_archives_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_archives" ADD CONSTRAINT "conversation_archives_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_membership_fk" FOREIGN KEY ("company_id","user_id") REFERENCES "public"."company_memberships"("company_id","user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_rfq_id_rfqs_id_fk" FOREIGN KEY ("rfq_id") REFERENCES "public"."rfqs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_quotation_id_quotations_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_initiator_company_id_companies_id_fk" FOREIGN KEY ("initiator_company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_counterparty_company_id_companies_id_fk" FOREIGN KEY ("counterparty_company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_attachments" ADD CONSTRAINT "message_attachments_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_attachments" ADD CONSTRAINT "message_attachments_file_fk" FOREIGN KEY ("file_id","company_id") REFERENCES "public"."files"("id","company_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_delivery_events" ADD CONSTRAINT "message_delivery_events_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_delivery_events" ADD CONSTRAINT "message_delivery_events_recipient_user_id_users_id_fk" FOREIGN KEY ("recipient_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_read_receipts" ADD CONSTRAINT "message_read_receipts_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_read_receipts" ADD CONSTRAINT "message_read_receipts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_reports" ADD CONSTRAINT "message_reports_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_reports" ADD CONSTRAINT "message_reports_reporter_user_id_users_id_fk" FOREIGN KEY ("reporter_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_reports" ADD CONSTRAINT "message_reports_reporter_company_id_companies_id_fk" FOREIGN KEY ("reporter_company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_user_id_users_id_fk" FOREIGN KEY ("sender_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_company_id_companies_id_fk" FOREIGN KEY ("sender_company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_reply_fk" FOREIGN KEY ("reply_to_id","conversation_id") REFERENCES "public"."messages"("id","conversation_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_reputation_metrics" ADD CONSTRAINT "company_reputation_metrics_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_reviews" ADD CONSTRAINT "company_reviews_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_reviews" ADD CONSTRAINT "company_reviews_reviewer_company_id_companies_id_fk" FOREIGN KEY ("reviewer_company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_reviews" ADD CONSTRAINT "company_reviews_reviewed_company_id_companies_id_fk" FOREIGN KEY ("reviewed_company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_reviews" ADD CONSTRAINT "company_reviews_reviewer_user_id_users_id_fk" FOREIGN KEY ("reviewer_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_reviews" ADD CONSTRAINT "company_reviews_moderated_by_user_id_users_id_fk" FOREIGN KEY ("moderated_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_reports" ADD CONSTRAINT "review_reports_review_id_company_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."company_reviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_reports" ADD CONSTRAINT "review_reports_reporter_user_id_users_id_fk" FOREIGN KEY ("reporter_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_reports" ADD CONSTRAINT "review_reports_reporter_company_id_companies_id_fk" FOREIGN KEY ("reporter_company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_responses" ADD CONSTRAINT "review_responses_responded_by_user_id_users_id_fk" FOREIGN KEY ("responded_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_responses" ADD CONSTRAINT "review_responses_review_fk" FOREIGN KEY ("review_id","responding_company_id") REFERENCES "public"."company_reviews"("id","reviewed_company_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_tokens" ADD CONSTRAINT "device_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_notification_id_notifications_id_fk" FOREIGN KEY ("notification_id") REFERENCES "public"."notifications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_user_id_users_id_fk" FOREIGN KEY ("recipient_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "abuse_reports" ADD CONSTRAINT "abuse_reports_reporter_user_id_users_id_fk" FOREIGN KEY ("reporter_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "abuse_reports" ADD CONSTRAINT "abuse_reports_reporter_company_id_companies_id_fk" FOREIGN KEY ("reporter_company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_actions" ADD CONSTRAINT "admin_actions_admin_user_id_users_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_role_assignments" ADD CONSTRAINT "admin_role_assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_role_assignments" ADD CONSTRAINT "admin_role_assignments_granted_by_user_id_users_id_fk" FOREIGN KEY ("granted_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_actions" ADD CONSTRAINT "moderation_actions_case_id_moderation_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."moderation_cases"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_actions" ADD CONSTRAINT "moderation_actions_admin_user_id_users_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_cases" ADD CONSTRAINT "moderation_cases_assigned_admin_user_id_users_id_fk" FOREIGN KEY ("assigned_admin_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outbox_events" ADD CONSTRAINT "outbox_events_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_events" ADD CONSTRAINT "security_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_events" ADD CONSTRAINT "security_events_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ix_cities_country_name" ON "cities" USING btree ("country_id","name");--> statement-breakpoint
CREATE INDEX "ix_cities_state" ON "cities" USING btree ("state_province_id");--> statement-breakpoint
CREATE INDEX "ix_countries_name" ON "countries" USING btree ("name");--> statement-breakpoint
CREATE INDEX "ix_hs_codes_parent" ON "hs_codes" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "ix_ports_country" ON "ports" USING btree ("country_id","port_type");--> statement-breakpoint
CREATE INDEX "ix_product_categories_parent" ON "product_categories" USING btree ("parent_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_product_categories_path" ON "product_categories" USING btree ("path");--> statement-breakpoint
CREATE INDEX "ix_product_category_closure_desc" ON "product_category_closure" USING btree ("descendant_id","depth");--> statement-breakpoint
CREATE INDEX "ix_email_verification_tokens_user" ON "email_verification_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ix_password_reset_tokens_user" ON "password_reset_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ix_password_reset_tokens_expiry" ON "password_reset_tokens" USING btree ("expires_at") WHERE "password_reset_tokens"."consumed_at" is null;--> statement-breakpoint
CREATE INDEX "ix_phone_verification_tokens_user" ON "phone_verification_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ix_user_auth_identities_user" ON "user_auth_identities" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ix_user_mfa_methods_user" ON "user_mfa_methods" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ix_user_security_events_user_time" ON "user_security_events" USING btree ("user_id","created_at" DESC);--> statement-breakpoint
CREATE INDEX "ix_user_sessions_user_active" ON "user_sessions" USING btree ("user_id","expires_at") WHERE "user_sessions"."revoked_at" is null;--> statement-breakpoint
CREATE INDEX "ix_user_sessions_family" ON "user_sessions" USING btree ("family_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_users_email" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "ix_users_status" ON "users" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_companies_slug" ON "companies" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "ix_companies_country_status" ON "companies" USING btree ("country_id","status");--> statement-breakpoint
CREATE INDEX "ix_companies_creator" ON "companies" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "ix_company_addresses_company" ON "company_addresses" USING btree ("company_id","address_type");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_company_addresses_registered" ON "company_addresses" USING btree ("company_id") WHERE "company_addresses"."address_type" = 'registered';--> statement-breakpoint
CREATE UNIQUE INDEX "ux_company_business_types_primary" ON "company_business_types" USING btree ("company_id") WHERE "company_business_types"."is_primary";--> statement-breakpoint
CREATE INDEX "ix_company_contacts_company" ON "company_contacts" USING btree ("company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_company_invitations_pending" ON "company_invitations" USING btree ("company_id","email") WHERE "company_invitations"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "ix_company_invitations_company" ON "company_invitations" USING btree ("company_id","status");--> statement-breakpoint
CREATE INDEX "ix_company_invitations_email" ON "company_invitations" USING btree ("email");--> statement-breakpoint
CREATE INDEX "ix_company_memberships_user_status" ON "company_memberships" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "ix_company_memberships_company_status" ON "company_memberships" USING btree ("company_id","status");--> statement-breakpoint
CREATE INDEX "ix_company_memberships_role" ON "company_memberships" USING btree ("role_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_company_reg_ids_verified_global" ON "company_registration_identifiers" USING btree ("country_id","identifier_type","identifier_value") WHERE "company_registration_identifiers"."verified_at" is not null;--> statement-breakpoint
CREATE INDEX "ix_company_reg_ids_company" ON "company_registration_identifiers" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "ix_company_role_permissions_perm" ON "company_role_permissions" USING btree ("permission_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_company_roles_system_key" ON "company_roles" USING btree ("key") WHERE "company_roles"."company_id" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "ux_company_roles_company_key" ON "company_roles" USING btree ("company_id","key") WHERE "company_roles"."company_id" is not null;--> statement-breakpoint
CREATE INDEX "ix_company_documents_company" ON "company_documents" USING btree ("company_id","document_type");--> statement-breakpoint
CREATE INDEX "ix_file_access_grants_file" ON "file_access_grants" USING btree ("file_id") WHERE "file_access_grants"."revoked_at" is null;--> statement-breakpoint
CREATE INDEX "ix_file_access_grants_company_grantee" ON "file_access_grants" USING btree ("grantee_company_id") WHERE "file_access_grants"."revoked_at" is null;--> statement-breakpoint
CREATE INDEX "ix_file_access_grants_user_grantee" ON "file_access_grants" USING btree ("grantee_user_id") WHERE "file_access_grants"."revoked_at" is null;--> statement-breakpoint
CREATE INDEX "ix_file_scan_results_file" ON "file_scan_results" USING btree ("file_id","scanned_at" DESC);--> statement-breakpoint
CREATE INDEX "ix_files_company_created" ON "files" USING btree ("company_id","created_at" DESC);--> statement-breakpoint
CREATE INDEX "ix_files_resource" ON "files" USING btree ("resource_type","resource_id");--> statement-breakpoint
CREATE INDEX "ix_files_scan_pending" ON "files" USING btree ("created_at") WHERE "files"."scan_status" = 'pending';--> statement-breakpoint
CREATE INDEX "ix_company_verification_levels_company" ON "company_verification_levels" USING btree ("company_id","status");--> statement-breakpoint
CREATE INDEX "ix_compliance_flags_company_status" ON "compliance_flags" USING btree ("company_id","status");--> statement-breakpoint
CREATE INDEX "ix_sanctions_screening_company" ON "sanctions_screening_records" USING btree ("company_id","screened_at" DESC);--> statement-breakpoint
CREATE UNIQUE INDEX "ux_verification_cases_open" ON "verification_cases" USING btree ("company_id","level") WHERE "verification_cases"."status" in ('draft','submitted','in_review','needs_info');--> statement-breakpoint
CREATE INDEX "ix_verification_cases_company" ON "verification_cases" USING btree ("company_id","status");--> statement-breakpoint
CREATE INDEX "ix_verification_cases_queue" ON "verification_cases" USING btree ("status","submitted_at") WHERE "verification_cases"."status" in ('submitted','in_review');--> statement-breakpoint
CREATE INDEX "ix_verification_checks_case" ON "verification_checks" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "ix_verification_documents_case" ON "verification_documents" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "ix_verification_documents_expiry" ON "verification_documents" USING btree ("expires_at") WHERE "verification_documents"."expires_at" is not null;--> statement-breakpoint
CREATE INDEX "ix_verification_expiry_due" ON "verification_expiry_records" USING btree ("expires_at") WHERE "verification_expiry_records"."status" in ('upcoming','notified');--> statement-breakpoint
CREATE INDEX "ix_verification_expiry_company" ON "verification_expiry_records" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "ix_verification_status_history_case" ON "verification_status_history" USING btree ("case_id","created_at" DESC);--> statement-breakpoint
CREATE INDEX "ix_product_categories_mapping_category" ON "product_categories_mapping" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "ix_product_certifications_product" ON "product_certifications" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "ix_product_certifications_cert" ON "product_certifications" USING btree ("certification_id");--> statement-breakpoint
CREATE INDEX "ix_product_documents_product" ON "product_documents" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "ix_product_hs_codes_hs" ON "product_hs_codes" USING btree ("hs_code_id");--> statement-breakpoint
CREATE INDEX "ix_product_images_product" ON "product_images" USING btree ("product_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_product_images_primary" ON "product_images" USING btree ("product_id") WHERE "product_images"."is_primary";--> statement-breakpoint
CREATE UNIQUE INDEX "ux_spec_definitions_global_key" ON "product_specification_definitions" USING btree ("key") WHERE "product_specification_definitions"."category_id" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "ux_spec_definitions_category_key" ON "product_specification_definitions" USING btree ("category_id","key") WHERE "product_specification_definitions"."category_id" is not null;--> statement-breakpoint
CREATE INDEX "ix_product_specifications_definition_number" ON "product_specifications" USING btree ("definition_id","value_number");--> statement-breakpoint
CREATE INDEX "ix_product_specifications_definition_text" ON "product_specifications" USING btree ("definition_id","value_text");--> statement-breakpoint
CREATE INDEX "ix_products_company_status" ON "products" USING btree ("company_id","status","created_at" DESC);--> statement-breakpoint
CREATE INDEX "ix_products_category_active" ON "products" USING btree ("primary_category_id","published_at" DESC) WHERE "products"."status" = 'active';--> statement-breakpoint
CREATE INDEX "ix_products_origin_active" ON "products" USING btree ("origin_country_id") WHERE "products"."status" = 'active';--> statement-breakpoint
CREATE INDEX "ix_seller_product_listings_company" ON "seller_product_listings" USING btree ("company_id","status","created_at" DESC);--> statement-breakpoint
CREATE INDEX "ix_seller_product_listings_product" ON "seller_product_listings" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "ix_seller_product_listings_active" ON "seller_product_listings" USING btree ("status","valid_until") WHERE "seller_product_listings"."status" = 'active';--> statement-breakpoint
CREATE INDEX "ix_buyer_import_requirements_company" ON "buyer_import_requirements" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "ix_seller_capacity_records_company" ON "seller_capacity_records" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "ix_seller_capacity_records_category" ON "seller_capacity_records" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "ix_seller_certifications_cert" ON "seller_certifications" USING btree ("certification_id","company_id");--> statement-breakpoint
CREATE INDEX "ix_seller_export_markets_country" ON "seller_export_markets" USING btree ("country_id","company_id");--> statement-breakpoint
CREATE INDEX "ix_seller_incoterm_capabilities_incoterm" ON "seller_incoterm_capabilities" USING btree ("incoterm_id","company_id");--> statement-breakpoint
CREATE INDEX "ix_seller_lead_times_company" ON "seller_lead_times" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "ix_seller_lead_times_category" ON "seller_lead_times" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "ix_seller_moq_records_company" ON "seller_moq_records" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "ix_seller_moq_records_category" ON "seller_moq_records" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "ix_seller_product_capabilities_category" ON "seller_product_capabilities" USING btree ("category_id","company_id");--> statement-breakpoint
CREATE INDEX "ix_seller_product_capabilities_hs" ON "seller_product_capabilities" USING btree ("hs_code_id","company_id");--> statement-breakpoint
CREATE INDEX "ix_seller_shipping_ports_port" ON "seller_shipping_ports" USING btree ("port_id");--> statement-breakpoint
CREATE INDEX "ix_seller_supply_regions_country" ON "seller_supply_regions" USING btree ("country_id");--> statement-breakpoint
CREATE INDEX "ix_seller_trade_profiles_published" ON "seller_trade_profiles" USING btree ("seller_type") WHERE "seller_trade_profiles"."is_published";--> statement-breakpoint
CREATE INDEX "ix_rfq_attachments_rfq" ON "rfq_attachments" USING btree ("rfq_id");--> statement-breakpoint
CREATE INDEX "ix_rfq_certification_requirements_cert" ON "rfq_certification_requirements" USING btree ("certification_id");--> statement-breakpoint
CREATE INDEX "ix_rfq_clarifications_rfq" ON "rfq_clarifications" USING btree ("rfq_id","created_at");--> statement-breakpoint
CREATE INDEX "ix_rfq_clarifications_asker" ON "rfq_clarifications" USING btree ("asked_by_company_id");--> statement-breakpoint
CREATE INDEX "ix_rfq_destinations_rfq" ON "rfq_destinations" USING btree ("rfq_id");--> statement-breakpoint
CREATE INDEX "ix_rfq_destinations_country" ON "rfq_destinations" USING btree ("country_id");--> statement-breakpoint
CREATE INDEX "ix_rfq_invitations_invitee" ON "rfq_invitations" USING btree ("invited_company_id","status","invited_at" DESC);--> statement-breakpoint
CREATE INDEX "ix_rfq_items_category" ON "rfq_items" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "ix_rfq_items_hs" ON "rfq_items" USING btree ("hs_code_id");--> statement-breakpoint
CREATE INDEX "ix_rfq_saved_records_rfq" ON "rfq_saved_records" USING btree ("rfq_id");--> statement-breakpoint
CREATE INDEX "ix_rfq_specifications_item" ON "rfq_specifications" USING btree ("rfq_item_id");--> statement-breakpoint
CREATE INDEX "ix_rfq_specifications_definition" ON "rfq_specifications" USING btree ("definition_id");--> statement-breakpoint
CREATE INDEX "ix_rfq_status_history_rfq" ON "rfq_status_history" USING btree ("rfq_id","created_at" DESC);--> statement-breakpoint
CREATE INDEX "ix_rfq_views_rfq" ON "rfq_views" USING btree ("rfq_id","viewed_at" DESC);--> statement-breakpoint
CREATE INDEX "ix_rfq_views_company" ON "rfq_views" USING btree ("company_id","viewed_at" DESC);--> statement-breakpoint
CREATE INDEX "ix_rfq_visibility_rules_rfq" ON "rfq_visibility_rules" USING btree ("rfq_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_rfqs_reference_no" ON "rfqs" USING btree ("reference_no");--> statement-breakpoint
CREATE INDEX "ix_rfqs_company_status_created" ON "rfqs" USING btree ("company_id","status","created_at" DESC);--> statement-breakpoint
CREATE INDEX "ix_rfqs_public_feed" ON "rfqs" USING btree ("published_at" DESC,"id") WHERE "rfqs"."status" = 'published' and "rfqs"."visibility" = 'public';--> statement-breakpoint
CREATE INDEX "ix_rfqs_category_feed" ON "rfqs" USING btree ("primary_category_id","published_at" DESC) WHERE "rfqs"."status" = 'published';--> statement-breakpoint
CREATE INDEX "ix_rfqs_expiry" ON "rfqs" USING btree ("expires_at") WHERE "rfqs"."status" = 'published';--> statement-breakpoint
CREATE INDEX "ix_rfq_match_reasons_match" ON "rfq_match_reasons" USING btree ("match_id");--> statement-breakpoint
CREATE INDEX "ix_rfq_match_runs_rfq" ON "rfq_match_runs" USING btree ("rfq_id","created_at" DESC);--> statement-breakpoint
CREATE INDEX "ix_rfq_match_runs_queue" ON "rfq_match_runs" USING btree ("created_at") WHERE "rfq_match_runs"."status" = 'queued';--> statement-breakpoint
CREATE INDEX "ix_rfq_supplier_matches_supplier" ON "rfq_supplier_matches" USING btree ("supplier_company_id","status","created_at" DESC);--> statement-breakpoint
CREATE INDEX "ix_rfq_supplier_matches_rfq_rank" ON "rfq_supplier_matches" USING btree ("rfq_id","rank");--> statement-breakpoint
CREATE INDEX "ix_supplier_match_preferences_company" ON "supplier_match_preferences" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "ix_negotiation_events_quotation" ON "negotiation_events" USING btree ("quotation_id","created_at" DESC,"id");--> statement-breakpoint
CREATE INDEX "ix_quotation_attachments_revision" ON "quotation_attachments" USING btree ("revision_id");--> statement-breakpoint
CREATE INDEX "ix_quotation_comparisons_rfq" ON "quotation_comparisons" USING btree ("rfq_id");--> statement-breakpoint
CREATE INDEX "ix_quotation_items_rfq_item" ON "quotation_items" USING btree ("rfq_item_id");--> statement-breakpoint
CREATE INDEX "ix_quotation_specifications_item" ON "quotation_specifications" USING btree ("quotation_item_id");--> statement-breakpoint
CREATE INDEX "ix_quotation_status_history_quotation" ON "quotation_status_history" USING btree ("quotation_id","created_at" DESC);--> statement-breakpoint
CREATE UNIQUE INDEX "ux_quotations_reference_no" ON "quotations" USING btree ("reference_no");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_quotations_one_live_per_supplier" ON "quotations" USING btree ("rfq_id","company_id") WHERE "quotations"."status" in ('draft','submitted','under_negotiation','accepted');--> statement-breakpoint
CREATE UNIQUE INDEX "ux_quotations_one_accepted_per_rfq" ON "quotations" USING btree ("rfq_id") WHERE "quotations"."status" = 'accepted';--> statement-breakpoint
CREATE INDEX "ix_quotations_supplier_status" ON "quotations" USING btree ("company_id","status","created_at" DESC);--> statement-breakpoint
CREATE INDEX "ix_quotations_buyer_status" ON "quotations" USING btree ("buyer_company_id","status","created_at" DESC);--> statement-breakpoint
CREATE INDEX "ix_quotations_rfq_status" ON "quotations" USING btree ("rfq_id","status");--> statement-breakpoint
CREATE INDEX "ix_quotations_expiry" ON "quotations" USING btree ("valid_until") WHERE "quotations"."status" in ('submitted','under_negotiation');--> statement-breakpoint
CREATE INDEX "ix_deal_activity_events_feed" ON "deal_activity_events" USING btree ("deal_id","created_at" DESC,"id" DESC);--> statement-breakpoint
CREATE UNIQUE INDEX "ux_deal_cancellations_open" ON "deal_cancellations" USING btree ("deal_id") WHERE "deal_cancellations"."status" = 'requested';--> statement-breakpoint
CREATE INDEX "ix_deal_disputes_deal" ON "deal_disputes" USING btree ("deal_id","status");--> statement-breakpoint
CREATE INDEX "ix_deal_document_versions_deal" ON "deal_document_versions" USING btree ("deal_id");--> statement-breakpoint
CREATE INDEX "ix_deal_documents_deal" ON "deal_documents" USING btree ("deal_id","document_type");--> statement-breakpoint
CREATE INDEX "ix_deal_milestone_events_milestone" ON "deal_milestone_events" USING btree ("milestone_id","created_at" DESC);--> statement-breakpoint
CREATE INDEX "ix_deal_milestones_deal" ON "deal_milestones" USING btree ("deal_id","due_date");--> statement-breakpoint
CREATE INDEX "ix_deal_parties_company" ON "deal_parties" USING btree ("company_id","deal_id");--> statement-breakpoint
CREATE INDEX "ix_deal_shipments_deal" ON "deal_shipments" USING btree ("deal_id");--> statement-breakpoint
CREATE INDEX "ix_deal_status_history_deal" ON "deal_status_history" USING btree ("deal_id","created_at" DESC);--> statement-breakpoint
CREATE UNIQUE INDEX "ux_deals_reference_no" ON "deals" USING btree ("reference_no");--> statement-breakpoint
CREATE INDEX "ix_deals_buyer_status" ON "deals" USING btree ("buyer_company_id","status","created_at" DESC);--> statement-breakpoint
CREATE INDEX "ix_deals_supplier_status" ON "deals" USING btree ("supplier_company_id","status","created_at" DESC);--> statement-breakpoint
CREATE INDEX "ix_deals_rfq" ON "deals" USING btree ("rfq_id");--> statement-breakpoint
CREATE INDEX "ix_conversation_participants_user" ON "conversation_participants" USING btree ("user_id","conversation_id") WHERE "conversation_participants"."left_at" is null;--> statement-breakpoint
CREATE INDEX "ix_conversation_participants_company" ON "conversation_participants" USING btree ("company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_conversations_quotation" ON "conversations" USING btree ("quotation_id") WHERE "conversations"."conversation_type" = 'quotation';--> statement-breakpoint
CREATE UNIQUE INDEX "ux_conversations_deal" ON "conversations" USING btree ("deal_id") WHERE "conversations"."conversation_type" = 'deal';--> statement-breakpoint
CREATE UNIQUE INDEX "ux_conversations_rfq_pair" ON "conversations" USING btree ("rfq_id","initiator_company_id","counterparty_company_id") WHERE "conversations"."conversation_type" = 'rfq';--> statement-breakpoint
CREATE INDEX "ix_conversations_initiator" ON "conversations" USING btree ("initiator_company_id","last_message_at" DESC);--> statement-breakpoint
CREATE INDEX "ix_conversations_counterparty" ON "conversations" USING btree ("counterparty_company_id","last_message_at" DESC);--> statement-breakpoint
CREATE INDEX "ix_message_attachments_message" ON "message_attachments" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "ix_message_delivery_events_message" ON "message_delivery_events" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "ix_message_read_receipts_user" ON "message_read_receipts" USING btree ("user_id","read_at" DESC);--> statement-breakpoint
CREATE INDEX "ix_message_reports_queue" ON "message_reports" USING btree ("status","created_at") WHERE "message_reports"."status" in ('open','reviewing');--> statement-breakpoint
CREATE INDEX "ix_messages_conversation_feed" ON "messages" USING btree ("conversation_id","created_at" DESC,"id" DESC);--> statement-breakpoint
CREATE INDEX "ix_company_reviews_reviewed" ON "company_reviews" USING btree ("reviewed_company_id","published_at" DESC) WHERE "company_reviews"."status" = 'published';--> statement-breakpoint
CREATE INDEX "ix_company_reviews_reviewer" ON "company_reviews" USING btree ("reviewer_company_id","created_at" DESC);--> statement-breakpoint
CREATE INDEX "ix_company_reviews_queue" ON "company_reviews" USING btree ("created_at") WHERE "company_reviews"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "ix_device_tokens_user" ON "device_tokens" USING btree ("user_id") WHERE "device_tokens"."revoked_at" is null;--> statement-breakpoint
CREATE INDEX "ix_notification_deliveries_queue" ON "notification_deliveries" USING btree ("next_attempt_at") WHERE "notification_deliveries"."status" in ('pending','failed');--> statement-breakpoint
CREATE INDEX "ix_notifications_inbox" ON "notifications" USING btree ("recipient_user_id","created_at" DESC,"id" DESC);--> statement-breakpoint
CREATE INDEX "ix_notifications_unread" ON "notifications" USING btree ("recipient_user_id","created_at" DESC) WHERE "notifications"."read_at" is null;--> statement-breakpoint
CREATE INDEX "ix_abuse_reports_queue" ON "abuse_reports" USING btree ("status","created_at") WHERE "abuse_reports"."status" in ('open','reviewing');--> statement-breakpoint
CREATE INDEX "ix_abuse_reports_reporter" ON "abuse_reports" USING btree ("reporter_user_id");--> statement-breakpoint
CREATE INDEX "ix_admin_actions_admin" ON "admin_actions" USING btree ("admin_user_id","created_at" DESC);--> statement-breakpoint
CREATE INDEX "ix_admin_actions_target" ON "admin_actions" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_admin_role_assignments_active" ON "admin_role_assignments" USING btree ("user_id","admin_role") WHERE "admin_role_assignments"."revoked_at" is null;--> statement-breakpoint
CREATE INDEX "ix_admin_role_assignments_user" ON "admin_role_assignments" USING btree ("user_id") WHERE "admin_role_assignments"."revoked_at" is null;--> statement-breakpoint
CREATE INDEX "ix_audit_logs_company_time" ON "audit_logs" USING btree ("company_id","created_at" DESC);--> statement-breakpoint
CREATE INDEX "ix_audit_logs_resource" ON "audit_logs" USING btree ("resource_type","resource_id","created_at" DESC);--> statement-breakpoint
CREATE INDEX "ix_audit_logs_actor" ON "audit_logs" USING btree ("actor_user_id","created_at" DESC);--> statement-breakpoint
CREATE INDEX "ix_audit_logs_request" ON "audit_logs" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "ix_idempotency_keys_expiry" ON "idempotency_keys" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "ix_moderation_actions_case" ON "moderation_actions" USING btree ("case_id","created_at" DESC);--> statement-breakpoint
CREATE INDEX "ix_moderation_cases_queue" ON "moderation_cases" USING btree ("status","created_at") WHERE "moderation_cases"."status" in ('open','in_review');--> statement-breakpoint
CREATE INDEX "ix_moderation_cases_subject" ON "moderation_cases" USING btree ("subject_type","subject_id");--> statement-breakpoint
CREATE INDEX "ix_outbox_events_pending" ON "outbox_events" USING btree ("created_at") WHERE "outbox_events"."published_at" is null;--> statement-breakpoint
CREATE INDEX "ix_outbox_events_aggregate" ON "outbox_events" USING btree ("aggregate_type","aggregate_id");--> statement-breakpoint
CREATE INDEX "ix_security_events_time" ON "security_events" USING btree ("created_at" DESC);--> statement-breakpoint
CREATE INDEX "ix_security_events_severity" ON "security_events" USING btree ("severity","created_at" DESC) WHERE "security_events"."severity" <> 'info';