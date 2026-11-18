# Reference data and product catalog: UI design brief

**Scope:** Module A (Global reference data, 17 tables) and Module F (Product catalog, 9 tables) of the 155-table database.
**Audience:** the human product owner and a UI/UX designer working from this document alone (no code access).
**Last updated:** 2026-11-17
**Sources:** `backend/docs/DATABASE_REFERENCE.md` (generated dictionary), `backend/docs/ERD.md`, `backend/docs/DATABASE_DESIGN.md`, `backend/src/database/schema/reference.ts` and `catalog.ts`, `backend/src/database/migrations/0001`–`0005` (CHECK constraints, grants, RLS, triggers), `backend/src/database/seeds/reference-data.ts` and `reference.ts`, `docs/ARCHITECTURE_ASSESSMENT.md` §4, `docs/ARCHITECTURE_DECISIONS.md` ADR-004.

---

## 0. Conventions

- Table and column names are exact database names. Types are PostgreSQL types.
- `id` is `uuid` primary key (default `gen_random_uuid()`) unless noted. Timestamps are `timestamp with time zone`.
- "Enum" means `text` plus a `CHECK` list (not a database enum type). Values are verbatim.
- Every Module A table except `product_category_closure` has `is_active boolean` (default `true`), `created_at` and `updated_at`. These are omitted from the tables below.
- Every Module F table with `company_id` is tenant-owned (the company is the tenant).
- "Public" in this document means readable by other companies. Not all catalog rows are public.

---

## 1. Cross-cutting facts (apply to A and F)

| Topic | Rule (source) |
|---|---|
| Who writes reference data | Nobody in the app. Module A tables have SELECT-only grants for app roles; writes happen only via the migration role and the seed runner. No admin screen for A is defined in the sources. |
| Who can read reference data | All app roles, the worker, read-only, authz and public-facing roles (`USING (true)` policies). Reference lists can be shown on public pages. |
| Tenant rule (F) | `products`, `seller_product_listings` and their child tables carry `company_id`. Child rows use composite foreign keys `(parent_id, company_id)`, so a child cannot point to another company's product. |
| Write permission (F) | Writes need the permission `catalog.manage` ("Manage products and listings") and an active company whose status is `draft` or `active`. |
| Seeded roles with `catalog.manage` | `owner` (100), `admin` (80), `manager` (60), `member` (40). `viewer` (20) has no catalog write. |
| Optimistic concurrency (F) | `products.version` and `seller_product_listings.version` (integer, default 1) increase by 1 on every UPDATE (trigger). Saves must send the version read; a mismatch means someone else changed the row. |
| Automatic timestamps | `updated_at` is set by trigger on UPDATE. |
| Delete (F) | **No delete.** Migration `0007` revoked DELETE on `products` and `seller_product_listings` from the app role and dropped their delete policies. Products and listings are archived instead (see §3.5). |

---

## 2. Module A: Global reference data (17 tables)

### 2.1 Purpose (product language)

Shared lookup lists used across the product: countries, currencies, units of measure, ports, Incoterms, payment terms, packaging, shipment modes, business types, languages, the product category tree, HS (customs tariff) codes, certification standards and certification issuers. Listings, RFQs, quotations and deals reference these lists by foreign key (see inbound references in §2.3). No end user creates them.

### 2.2 Owner and implementation status

- **Owner:** not assigned to one service in `ARCHITECTURE_ASSESSMENT.md` §4. Per ADR-004 the lists become a versioned package (`packages/reference-data`) seeded read-only into each service schema that needs it.
  - §4 places `business_types` under the **company** service.
  - §4 places `product_categories` (and `product_category_closure` with it, by implication), `hs_codes`, `certifications` and `certification_issuers` under the **catalog** service.
  - The other A tables are not named in §4.
- **Status:** designed, not yet implemented in the service. The schema and seed exist in the frozen `backend/` foundation (migrations `0001`, `0005`; seed `seeds/reference.ts`).

### 2.3 Entities

| Table | What it represents | Key columns (type, constraint) | Relations (FK → target) |
|---|---|---|---|
| `countries` | Country master (ISO 3166-1) | `iso2` char(2) UNIQUE; `iso3` char(3) UNIQUE; `numeric_code` char(3); `name` text; `official_name` text; `region` text; `subregion` text; `calling_code` text; `default_currency_id` uuid | `default_currency_id` → `currencies.id` |
| `currencies` | Currency master (ISO 4217) | `code` char(3) UNIQUE; `numeric_code` char(3); `name` text; `symbol` text; `minor_units` smallint default 2 | none |
| `states_provinces` | Sub-national regions (ISO 3166-2 style code, e.g. `PK-PB` per source comment) | `country_id` uuid; `code` text; `name` text; `subdivision_type` text; UNIQUE (`country_id`, `code`) | `country_id` → `countries.id` |
| `cities` | City master | `country_id` uuid; `state_province_id` uuid; `name` text; `ascii_name` text; `geoname_id` integer UNIQUE; `latitude` numeric(9,6); `longitude` numeric(9,6) | `country_id` → `countries.id`; `state_province_id` → `states_provinces.id` |
| `ports` | Ports and terminals (UN/LOCODE) | `un_locode` char(5) UNIQUE; `name` text; `country_id` uuid; `city_id` uuid; `port_type` text (enum); `latitude` numeric(9,6); `longitude` numeric(9,6) | `country_id` → `countries.id`; `city_id` → `cities.id` |
| `units_of_measure` | Units (UN/CEFACT Rec. 20 code) and conversion to base | `code` text UNIQUE; `symbol` text; `name` text; `dimension` text (enum); `base_unit_id` uuid; `to_base_factor` numeric(24,12) | `base_unit_id` → `units_of_measure.id` (self) |
| `incoterms` | Incoterms rules by version | `code` char(3); `version_year` smallint; `name` text; `mode_scope` text (enum, default `any`); `named_place_kind` text; `seller_arranges_main_carriage` boolean; UNIQUE (`code`, `version_year`) | none |
| `payment_terms` | Payment term types | `code` text UNIQUE; `name` text; `category` text (enum); `description` text | none |
| `packaging_types` | Packaging types (UN/ECE Rec. 21 per seed comment) | `code` text UNIQUE; `name` text; `description` text | none |
| `shipment_modes` | Transport modes | `code` text UNIQUE; `name` text | none |
| `business_types` | Self-described company business types | `code` text UNIQUE; `name` text; `description` text | none |
| `languages` | Languages (BCP 47 / ISO 639-1 per source comment) | `code` text UNIQUE; `name` text; `native_name` text; `is_rtl` boolean default false | none |
| `product_categories` | Product category tree (max depth 8) | `parent_id` uuid; `slug` text UNIQUE; `name` text; `depth` smallint default 0 (0–8); `path` text UNIQUE (dotted slug path, e.g. `agriculture.rice.basmati`); `sort_order` integer default 0 | `parent_id` → `product_categories.id` (self) |
| `product_category_closure` | Transitive closure of the category tree (subtree queries without recursion). No `is_active`, no timestamps. | PK (`ancestor_id`, `descendant_id`); `depth` smallint (≥ 0) | `ancestor_id` → `product_categories.id` (cascade); `descendant_id` → `product_categories.id` (cascade) |
| `hs_codes` | HS (WCO HS2022) tariff codes, levels 2/4/6 | `code` text; `level` smallint (2, 4 or 6); `parent_id` uuid; `hs_version` text default `HS2022`; `description` text; UNIQUE (`code`, `hs_version`) | `parent_id` → `hs_codes.id` (self) |
| `certification_issuers` | Bodies that issue certificates | `code` text UNIQUE; `name` text; `country_id` uuid; `website` text | `country_id` → `countries.id` |
| `certifications` | Certification standards | `code` text UNIQUE; `name` text; `category` text (enum); `default_issuer_id` uuid; `description` text | `default_issuer_id` → `certification_issuers.id` |

**Inbound references (verified in the dictionary, for context):**
- `countries`: companies, company addresses, `products.origin_country_id`, `ports`, `states_provinces`, buyer/seller trade tables.
- `currencies`: `countries.default_currency_id`, `seller_product_listings.currency_id`, company settings, trade preference tables, RFQs, quotations, deals.
- `units_of_measure`: `products.base_uom_id`, `seller_product_listings.moq_uom_id` and `capacity_uom_id`, `product_specification_definitions.uom_id`, `product_specifications.uom_id`.
- `incoterms`, `ports`, `payment_terms`, `packaging_types`, `shipment_modes`: trade profile, RFQ, quotation and deal tables (modules G, H, J, K).
- `business_types`: `company_business_types.business_type_id` (module C).
- `languages`: `company_settings.default_language_id` (module C).
- `hs_codes`: `product_hs_codes`, `buyer_product_interests`, `seller_product_capabilities`, RFQ, quotation and deal item tables.
- `product_categories`: `products.primary_category_id`, `product_categories_mapping`, `product_specification_definitions.category_id`, trade profile tables, RFQs.
- `certifications` and `certification_issuers`: product, seller and quotation certification tables.

### 2.4 Enumerations (verbatim from CHECK constraints)

| Table.column | Allowed values | Default |
|---|---|---|
| `certifications.category` | `quality`, `food_safety`, `environmental`, `social`, `organic`, `halal`, `product_safety`, `other` | none (required) |
| `payment_terms.category` | `advance`, `open_account`, `letter_of_credit`, `documentary_collection`, `other` | none (required) |
| `ports.port_type` | `sea`, `air`, `inland`, `rail`, `road` | none (required) |
| `units_of_measure.dimension` | `mass`, `length`, `volume`, `area`, `count`, `time`, `other` | none (required) |
| `incoterms.mode_scope` | `any`, `sea_inland_waterway` | `any` |
| `hs_codes.level` | `2`, `4`, `6` | none (required) |

Other constrained values:
- `currencies.minor_units`: integer 0–6 (default 2).
- `incoterms.version_year`: 1936–2100.
- `hs_codes.code`: digits only, length equal to `level`.

Free text, no CHECK (seed values shown): `incoterms.named_place_kind` (`place_of_delivery`, `place_of_destination`, `port_of_loading`, `port_of_destination`); `hs_codes.hs_version` (`HS2022`).

### 2.5 Business rules and lifecycle (A)

- **No lifecycle.** Reference rows have only `is_active` (default `true`). Existing records keep their references (FKs use `ON DELETE RESTRICT`). How the UI treats inactive rows in pickers is not defined in the sources.
- **Uniqueness:** `countries.iso2`, `countries.iso3`, `currencies.code`, `ports.un_locode`, `cities.geoname_id`, `product_categories.slug`, `product_categories.path`, `certifications.code`, `certification_issuers.code`, `languages.code`, `payment_terms.code`, `packaging_types.code`, `shipment_modes.code`, `business_types.code`, `units_of_measure.code`; composites `(states_provinces.country_id, code)`, `(incoterms.code, version_year)`, `(hs_codes.code, hs_version)`.
- **Format checks:** `countries.iso2` = 2 uppercase letters; `countries.iso3` = 3 uppercase letters; `currencies.code` = 3 uppercase letters; `ports.un_locode` = 5 characters, 2 uppercase letters then 3 uppercase letters or digits.
- **Coordinates:** `cities.latitude` –90 to 90; `cities.longitude` –180 to 180; `ports` coordinates have no CHECK.
- **Units:** `to_base_factor` must be > 0 when set. Seeds: base units (e.g. `KGM`, `MTR`, `LTR`, `PCE`) have no base; derived units point to a base with a factor (e.g. `TNE` = 1000 × `KGM`).
- **Incoterms:** the same code can exist in several years (`version_year`). Seed contains version 2020 only.
- **Category tree:** `depth` 0–8; `path` is unique; the closure table includes a self-row with depth 0 (seed behaviour).
- **HS hierarchy:** level 2 → 4 → 6 via `parent_id` (seed sets the parent to the code minus the last two digits).
- **Enabled-state for pickers:** `is_active` is the only switch. There is no date-validity field for A rows.

### 2.6 Data and screens the UI needs (A)

- Pickers (single select, searchable) for: country, currency, unit of measure, Incoterm, payment term, packaging type, shipment mode, business type, language, port, HS code, certification, certification issuer, product category.
- Port picker: filter by `country_id` and `port_type`; show `un_locode`, `name`, country.
- Category browser: tree from `parent_id` ordered by `sort_order`; show `depth`, `path`; subtree queries via `product_category_closure`.
- HS code browser: tree by `level`/`parent_id`; search by `code` prefix and by `description` text; show `hs_version`.
- Unit picker grouped by `dimension`; show `symbol`, `name`; show conversion to base where `base_unit_id` is set.
- Currency input: decimal places from `minor_units` (0, 2 or 3 in the seed).
- Country display: `name`, `official_name`, `iso2`/`iso3`; default currency from `default_currency_id`.
- Certification picker: group by `category`; show `default_issuer_id` issuer when set; show `description`.
- Incoterm picker: show `code`, `name`, `version_year`; `mode_scope` decides which transport modes it applies to; `seller_arranges_main_carriage` can drive an explanatory label.
- Location search (`cities`, `states_provinces`): trigram name index exists on `cities.name`; **no seed data** (see §5).
- No create/edit screens for Module A (no app write grants).

### 2.7 Dropdown lists: seeded contents (starter sets)

Source: `backend/src/database/seeds/reference-data.ts`. Counts match `DATABASE_DESIGN.md` §6. Production will load full datasets through the same runner.

| List (table) | Seeded rows | Example codes (seeded values) |
|---|---|---|
| Currencies (`currencies`) | 40 | `USD` (2), `EUR`, `PKR`, `CNY`, `AED`, `SAR`; `JPY` and `KRW` (0 minor units); `VND` (0); `KWD`, `OMR`, `BHD` (3) |
| Countries (`countries`) | 50 | `PK` / `PAK` Pakistan (default `PKR`); `US`/`USA`; `GB`/`GBR`; `CN`/`CHN`; `IN`/`IND`; `AE`/`ARE`; `SA`/`SAU`; `DE`/`DEU` (default `EUR`) |
| Units of measure (`units_of_measure`) | 24 | Mass: `KGM` (kg), `GRM`, `TNE` (t), `LBR`; Length: `MTR` (m), `CMT`, `MMT`, `YRD`; Area: `MTK`; Volume: `MTQ`, `LTR`, `MLT`, `GLL`; Count: `PCE` (pc), `SET`, `PR` (pair), `DZN` (dozen), `BX` (box), `CT` (carton), `PF` (pallet), `CNT` (container); Time: `HUR`, `DAY`, `MON` |
| Incoterms (`incoterms`, version 2020) | 11 | `EXW` Ex Works; `FCA`; `CPT`; `CIP`; `DAP`; `DPU`; `DDP`; `FAS`; `FOB` (`sea_inland_waterway`); `CFR`; `CIF` (`sea_inland_waterway`) |
| Payment terms (`payment_terms`) | 10 | `advance_100`, `advance_30_balance_70`, `advance_30_balance_bl`, `lc_sight`, `lc_usance_90`, `dp_sight`, `da_60`, `net_30`, `net_60`, `tt_on_delivery` |
| Packaging types (`packaging_types`) | 14 | `BG` Bag, `SA` Sack, `BX` Box, `CT` Carton, `PX` Pallet, `CR` Crate, `DR` Drum, `BA` Barrel, `BE` Bundle, `RO` Roll, `BO` Bottle, `PK` Package, `CN` Container (bulk), `BU` Bulk (unpacked) |
| Shipment modes (`shipment_modes`) | 8 | `sea_fcl`, `sea_lcl`, `sea_bulk`, `air`, `road`, `rail`, `multimodal`, `courier` |
| Business types (`business_types`) | 8 | `manufacturer`, `exporter`, `importer`, `distributor`, `wholesaler`, `trading_company`, `supplier`, `other` |
| Languages (`languages`) | 15 | `en`, `ur` (RTL), `ar` (RTL), `zh`, `hi`, `bn`, `tr`, `fr`, `de`, `es`, `pt`, `ru`, `ja`, `ko`, `id` |
| Product categories (`product_categories`) | 29 (14 roots, 15 children, max depth 1 in seed) | Roots: `agriculture`, `textiles`, `leather`, `sports-goods`, `surgical-instruments`, `chemicals`, `machinery`, `electronics`, `construction`, `furniture`, `minerals`, `gems-jewelry`, `packaging`, `automotive`. Children: `rice`, `fruits-vegetables`, `spices`, `seafood`, `meat-poultry` (under agriculture); `cotton-fabric`, `garments`, `home-textiles`, `yarn` (textiles); `leather-goods`, `footwear` (leather); `plastics` (chemicals); `industrial-machinery` (machinery); `consumer-electronics` (electronics); `ceramics` (construction) |
| HS codes (`hs_codes`, HS2022) | 43 | Level 2: `10` Cereals, `09`, `03`, `52`, `61`, `63`, `41`, `64`, `95`, `90`, `39`, `84`, `85`, `69`, `94`, `71`, `25`, `87`. Level 4: `1006` Rice, `0904`, `0910`, `0306`, `5208`, `6109`, `6302`, `4203`, `6403`, `9506`, `9018`, `3923`, `8479`, `8517`, `6907`, `9403`, `7113`, `2501`, `8708`. Level 6: `100630`, `100640`, `520811`, `610910`, `950662`, `901890` |
| Certification issuers (`certification_issuers`) | 8 | `iso`, `sgs`, `bureau_veritas`, `tuv`, `intertek`, `global_gap`, `usda`, `fda` |
| Certifications (`certifications`) | 22 | `iso_9001` (quality), `iso_14001` (environmental), `iso_22000` (food_safety), `haccp` (food_safety), `brcgs`, `fssc_22000`, `gmp` (quality), `ce` (product_safety), `ul`, `rohs`, `reach`, `oeko_tex`, `halal` (halal), `organic_usda` and `organic_eu` (organic), `gots` (organic), `fairtrade` (social), `sa8000`, `bsci`, `wrap` (social), `iso_13485` (quality), `globalgap` (food_safety) |
| Ports (`ports`) | 26 (all `port_type` = `sea`) | `PKKHI` Karachi; `PKBQM` Port Qasim; `CNSHA` Shanghai; `CNNGB` Ningbo; `SGSIN` Singapore; `AEJEA` Jebel Ali; `NLRTM` Rotterdam; `DEHAM` Hamburg; `USLAX`; `USNYC`; `INNSA` Nhava Sheva (JNPT); `INMUN` Mundra; `SAJED` Jeddah; `KRPUS` Busan; `HKHKG`; `JPYOK`; `ESVLC`; `OMSLL`; `BRSSZ`; `ZADUR`; `EGPSD` |
| Cities, states/provinces | 0 | Not seeded. Pickers will be empty until data is imported. |

Not seeded (empty or null in the seed): `certifications.default_issuer_id`, `certification_issuers.country_id` and `website`, `countries.calling_code`/`region`/`subregion`, `units` base values for base units (intentionally null).

---

## 3. Module F: Product catalog (9 tables)

### 3.1 Purpose (product language)

A supplier company publishes **products** (what it makes or sells), classifies them (categories, HS codes), describes them with typed **specifications**, attaches **images**, **documents** and **certifications**, and offers each product through one or more **seller listings** (price range, minimum order, lead time, capacity, Incoterm, origin port, validity). Buyers see active products and listings of active companies. The schema comments state that similar products are compared by category, HS code and specifications, not by a shared master product.

### 3.2 Owner and implementation status

- **Owner:** `catalog` service (`ARCHITECTURE_ASSESSMENT.md` §4). §4 also lists the categories, HS codes, certifications and issuers that Module A holds, under this owner.
- **Status:** designed, not yet implemented in the service. Schema, grants and RLS exist in the frozen `backend/` foundation.

### 3.3 Entities

| Table | What it represents | Key columns (type, constraint) | Relations (FK → target) |
|---|---|---|---|
| `products` | A product the company publishes | `company_id` uuid NOT NULL; `name` text NOT NULL; `slug` text NOT NULL (UNIQUE per company); `short_description` text; `description` text; `brand` text; `model_number` text; `manufacturer_name` text (free text); `manufacturer_company_id` uuid; `origin_country_id` uuid; `primary_category_id` uuid NOT NULL; `base_uom_id` uuid NOT NULL; `status` text default `draft` (enum); `published_at` timestamptz; `version` integer default 1; `search_vector` tsvector (generated from name, brand, short_description, description) | `company_id` → `companies.id`; `manufacturer_company_id` → `companies.id`; `origin_country_id` → `countries.id`; `primary_category_id` → `product_categories.id`; `base_uom_id` → `units_of_measure.id` |
| `product_categories_mapping` | Additional categories of a product, with a primary flag. PK (`product_id`, `category_id`). No timestamps. | `product_id` uuid; `company_id` uuid; `category_id` uuid; `is_primary` boolean default false | `category_id` → `product_categories.id`; (`product_id`, `company_id`) → `products` (cascade) |
| `product_hs_codes` | HS codes of a product, with a primary flag. PK (`product_id`, `hs_code_id`). No timestamps. | `product_id` uuid; `company_id` uuid; `hs_code_id` uuid; `is_primary` boolean default false | `hs_code_id` → `hs_codes.id`; (`product_id`, `company_id`) → `products` (cascade) |
| `product_specification_definitions` | Platform-curated vocabulary of spec fields (global or scoped to a category) | `category_id` uuid (null = global); `key` text (format rule in §3.5); `name` text; `data_type` text (enum); `uom_id` uuid; `allowed_values` text[] (required for enum); `min_value` numeric(24,8); `max_value` numeric(24,8); `is_filterable` boolean default false; `is_required` boolean default false; `sort_order` integer default 0 | `category_id` → `product_categories.id`; `uom_id` → `units_of_measure.id` |
| `product_specifications` | One typed value of a product for a definition. UNIQUE (`product_id`, `definition_id`). | `product_id` uuid; `company_id` uuid; `definition_id` uuid; `value_text` text; `value_number` numeric(24,8); `value_boolean` boolean; `value_min` numeric(24,8); `value_max` numeric(24,8); `uom_id` uuid | `definition_id` → `product_specification_definitions.id`; `uom_id` → `units_of_measure.id`; (`product_id`, `company_id`) → `products` (cascade) |
| `product_images` | Product photos. No `updated_at`. | `product_id` uuid; `company_id` uuid; `file_id` uuid NOT NULL; `alt_text` text; `sort_order` smallint default 0; `is_primary` boolean default false; `created_at` | `file_id` + `company_id` → `files` (module D, restrict); (`product_id`, `company_id`) → `products` (cascade) |
| `product_documents` | Attached documents (datasheet, catalogue, test report, etc.). No `updated_at`. | `product_id` uuid; `company_id` uuid; `file_id` uuid NOT NULL; `document_type` text (enum); `title` text NOT NULL; `created_at` | `file_id` + `company_id` → `files` (module D, restrict); (`product_id`, `company_id`) → `products` (cascade) |
| `product_certifications` | A certification held for a product (certificate number, validity, issuer, scan). No `updated_at`. | `product_id` uuid; `company_id` uuid; `certification_id` uuid NOT NULL; `issuer_id` uuid; `certificate_number` text; `valid_from` date; `valid_until` date; `file_id` uuid; `created_at` | `certification_id` → `certifications.id`; `issuer_id` → `certification_issuers.id`; `file_id` + `company_id` → `files` (module D); (`product_id`, `company_id`) → `products` (cascade) |
| `seller_product_listings` | A seller's commercial offer for a product (price, minimum order, lead time, capacity, terms, validity) | `company_id` uuid NOT NULL; `product_id` uuid NOT NULL; `min_order_qty` numeric(20,6); `moq_uom_id` uuid; `price_min` numeric(20,4); `price_max` numeric(20,4); `currency_id` uuid; `lead_time_days_min` smallint; `lead_time_days_max` smallint; `monthly_capacity` numeric(20,6); `capacity_uom_id` uuid; `incoterm_id` uuid; `origin_port_id` uuid; `status` text default `draft` (enum); `valid_until` timestamptz; `version` integer default 1 | `moq_uom_id` → `units_of_measure.id`; `currency_id` → `currencies.id`; `capacity_uom_id` → `units_of_measure.id`; `incoterm_id` → `incoterms.id`; `origin_port_id` → `ports.id`; (`product_id`, `company_id`) → `products` (cascade) |

### 3.4 Enumerations (verbatim from CHECK constraints)

| Table.column | Allowed values | Default |
|---|---|---|
| `products.status` | `draft`, `active`, `archived`, `suspended` | `draft` |
| `seller_product_listings.status` | `draft`, `active`, `paused`, `archived` | `draft` |
| `product_documents.document_type` | `datasheet`, `catalog`, `test_report`, `certificate`, `msds`, `other` | none (required) |
| `product_specification_definitions.data_type` | `text`, `number`, `boolean`, `enum`, `range` | none (required) |

### 3.4a Status lifecycle (enforced by trigger `guard_catalog_status`, migration `0007`)

Applies to every non-trusted write. Trusted callers (database roles `saudaro_authz`, `saudaro_migrator`, and superusers) skip the transition rules.

**Products (`products.status`)**

| From | To | Allowed for app roles |
|---|---|---|
| (insert) | `draft`, `active`, `archived` | yes; inserting `suspended` is rejected |
| `draft` | `active`, `archived` | yes |
| `active` | `archived` | yes |
| `archived` | `draft` | yes (restore) |
| any | `suspended` | no (moderation only) |
| `suspended` | any | no (moderation only) |

Not allowed for app roles: `active` → `draft`, `archived` → `active` directly, and any change to or from `suspended`.

**Listings (`seller_product_listings.status`)**

| From | To | Allowed for app roles |
|---|---|---|
| (insert) | `draft`, `active`, `paused`, `archived` | yes |
| `draft` | `active`, `archived` | yes |
| `active` | `paused`, `archived` | yes |
| `paused` | `active`, `archived` | yes |
| `archived` | `draft` | yes (restore) |

Not allowed for app roles: `active` → `draft`, `paused` → `draft`, and any direct `draft` → `paused`.

The trigger checks only changes of `status`. Other column updates are not restricted by it.

**Publication timestamp:** when a product row is written with `status = active` and `published_at` is null, the trigger sets `published_at` to the current time (for every caller). Re-activation after archive keeps the original `published_at`, because it is set only when null.

**Suspension:** `suspended` is a moderation state. Application roles cannot set it and cannot leave it. `seller_product_listings` has no `suspended` value.

### 3.5 Business rules and lifecycle (F)

**Product (`products`)**

- Status set: `draft`, `active`, `archived`, `suspended`.
- A product with `status = active` must have `published_at` set (CHECK `products_published_chk`). The trigger sets it on activation (§3.4a).
- Slug is unique per company (`company_id`, `slug`).
- Required on create: `name`, `slug`, `primary_category_id`, `base_uom_id`, `company_id`.
- Status changes follow the graph in §3.4a (enforced by trigger). Rows cannot be deleted by app roles; archive is the removal path.
- Visibility:
  - The owning company sees all its products in every status.
  - Other companies see a product only when `status = active` **and** the owning company's `companies.status` is `active` (helper `app.is_public_company`).
  - Child rows (images, documents, certifications, HS codes, categories, specifications) follow the product's visibility.
- Search: full-text on `search_vector` (name weighted highest, then brand, short description, description). Trigram index on `name`. Both indexes apply to `status = active` rows.
- Indexes that imply filters: `(company_id, status, created_at)`; `(primary_category_id, published_at)` for active products; `origin_country_id` for active products.

**Listing (`seller_product_listings`)**

- Status set: `draft`, `active`, `paused`, `archived`. Transitions follow §3.4a (`active` ⇄ `paused`; archive from `draft`, `active` or `paused`; restore from `archived` to `draft`). No delete.
- Visibility: owning company sees all; other companies see only `status = active` when the owning company is `active`. A `paused` listing is hidden from other companies.
- The schema has **no unique constraint on (`company_id`, `product_id`)**. More than one listing per product is allowed by the schema.
- Prices: if both set, `price_min ≤ price_max`. If any price is set, `currency_id` is required. Prices and `monthly_capacity` must be ≥ 0.
- Minimum order: if `min_order_qty` is set it must be > 0 and `moq_uom_id` is required.
- Lead time: if both set, `lead_time_days_min ≤ lead_time_days_max` (days, smallint).
- `valid_until` is optional (timestamptz). No CHECK links it to `status`.
- `capacity_uom_id` has no CHECK that requires it when `monthly_capacity` is set.

**Product images (`product_images`)**

- At most one `is_primary = true` image per product (partial unique index on `product_id`).
- No maximum image count in the schema.
- Order within a product by `sort_order` (index `(product_id, sort_order)`).

**Product categories**

- `products.primary_category_id` is required. `product_categories_mapping` allows several categories with `is_primary`. **No constraint** in the sources links `primary_category_id` to a mapping row with `is_primary = true`, and no constraint limits the number of primary mapping rows per product.

**HS codes (`product_hs_codes`)**

- PK (`product_id`, `hs_code_id`). `is_primary` has no uniqueness constraint in the sources.

**Certifications (`product_certifications`)**

- If both dates are set, `valid_from ≤ valid_until`.
- `file_id` is optional (a scan of the certificate). There is no uniqueness on certificate numbers.
- Expiry state (valid / expiring / expired) is not stored; it can only be derived from `valid_until` at display time.

**Documents (`product_documents`)**

- `file_id` and `title` are required; `document_type` must be one of the enum values.

**Specification definitions (`product_specification_definitions`)**

- `key` must match `^[a-z][a-z0-9_]{1,60}$` (2–61 characters, lowercase letter first, then lowercase letters, digits or underscore).
- Enum rule: `allowed_values` must be non-empty **if and only if** `data_type = enum`.
- If `min_value` and `max_value` are both set, `min_value ≤ max_value`.
- `key` is unique among global definitions (`category_id` null) and unique per category (`category_id`, `key`).
- Definitions are read-only for all app roles (migration role writes them).

**Specification values (`product_specifications`)**

- Exactly one value shape per row:
  - `value_text` (text or enum), or
  - `value_number` (number), or
  - `value_boolean` (boolean), or
  - `value_min` and/or `value_max` (range; at least one of them).
- If both `value_min` and `value_max` are set, `value_min ≤ value_max`.
- Trigger `validate_spec_value` (insert and update) enforces the definition's type:
  - `text`: `value_text` required.
  - `enum`: `value_text` must be one of the definition's `allowed_values`.
  - `boolean`: `value_boolean` required.
  - `number`: `value_number` required and within `min_value`..`max_value` when those are set.
  - `range`: at least one of `value_min`/`value_max` required; within bounds when set.
  - An inactive definition (`is_active = false`) is rejected.
- One value per definition per product (UNIQUE `product_id`, `definition_id`).

**Concurrency and writes**

- `products.version` and `seller_product_listings.version` are bumped on every UPDATE. Saves must include the version read.
- App writes on all F tables need `catalog.manage` and a writable company (status `draft` or `active`). Insert and update apply to every F table. Delete applies to child tables only; `products` and `seller_product_listings` have no app-role delete (migration `0007`).

---

## 4. Screens and data the UI needs (Module F)

Implied by the schema only. Each item lists the data it needs.

### 4.1 Company catalog (seller side, own company)

- **Product list:** `name`, `brand`, `primary_category_id` (category name), `status`, `published_at`, `updated_at`, primary image (`product_images.is_primary`), count of listings.
  - Filters: `status`; category (tree, via `primary_category_id`); `origin_country_id`.
  - Search: `search_vector` (free text); `name` (trigram / partial match).
- **Product create and edit form:**
  - Core: `name`, `slug` (unique per company), `short_description`, `description`, `brand`, `model_number`.
  - Manufacturer: `manufacturer_name` (free text) or `manufacturer_company_id` (company picker).
  - Origin: `origin_country_id` (country picker).
  - Classification: `primary_category_id` (required category tree), `base_uom_id` (required, unit picker).
  - Status: `status` with `published_at` shown when status is `active`. Show only the transitions allowed in §3.4a. Show `suspended` as a read-only state with no action (set by moderation).
  - Actions: Save, Activate (`draft` → `active`), Archive (from `draft` or `active`), Restore (from `archived` to `draft`). **No Delete action.**
  - Save with `version` for conflict detection.
- **Categories panel:** multi-select of categories (`product_categories_mapping`) with a primary flag (`is_primary`).
- **HS codes panel:** multi-select of `hs_codes` (search by code prefix and description) with a primary flag (`product_hs_codes.is_primary`).
- **Specifications panel:**
  - Dynamic form built from `product_specification_definitions` for the product's category plus global definitions.
  - Field type from `data_type`:
    - `text`: text input.
    - `enum`: select from `allowed_values`.
    - `boolean`: toggle.
    - `number`: numeric input with `min_value`/`max_value`, unit from `uom_id`.
    - `range`: two numeric inputs (`value_min`, `value_max`), unit from `uom_id`.
  - Show `is_required` (mandatory fields) and `is_filterable` (fields that can be used as search facets).
  - Units: definition's `uom_id` or the value's own `uom_id`.
- **Images panel:** upload to files (module D) and link via `product_images.file_id`; edit `alt_text`; reorder by `sort_order`; one primary image (`is_primary`).
- **Documents panel:** upload to files and link via `product_documents.file_id`; `document_type` (6 values); `title`.
- **Certifications panel:** `certification_id` (picker grouped by category), `issuer_id` (picker), `certificate_number`, `valid_from`, `valid_until` (date pickers), certificate file (`file_id`, optional). Show expiry status derived from `valid_until`.
- **Listings panel (per product):**
  - Status (`draft`, `active`, `paused`, `archived`), with actions Pause (`active` → `paused`), Resume (`paused` → `active`), Archive, Restore (`archived` → `draft`). **No Delete action.**
  - Minimum order: `min_order_qty` and `moq_uom_id`.
  - Price range: `price_min`, `price_max`, `currency_id`.
  - Lead time: `lead_time_days_min`, `lead_time_days_max` (days).
  - Capacity: `monthly_capacity` and `capacity_uom_id`.
  - Terms: `incoterm_id` (picker), `origin_port_id` (port picker).
  - Validity: `valid_until` (date-time).
  - Versioned save with `version`.
  - Multiple listings per product are allowed by the schema; the UI can show them as a list.

### 4.2 Buyer-facing catalog (other companies)

- **Browse by category:** category tree (`product_categories`), subtree via `product_category_closure`; counts per node are a UI choice (not defined in the schema).
- **Search results:** active products only; facets from filterable specifications (`is_filterable`), `origin_country_id`, `primary_category_id`, HS code, listing Incoterm (`incoterm_id`), listing currency (`currency_id`), price range (`price_min`, `price_max`), minimum order (`min_order_qty`).
- **Product detail page:** product fields; images (ordered, primary first); specifications (value shape per data type); certifications (with issuer and validity); documents (with `document_type`); HS codes; listings with `status = active` only.
- **Public company context:** the page shows only data of companies whose status is `active`.

### 4.3 Administration and reference maintenance

- No screens for reference data (Module A) are defined. No app role can write it.
- Specification definitions are platform-curated; no UI to create them is defined in the sources.

---

## 5. Gaps, decisions and uncertainties

### 5.1 Resolved by migration 0007

Source: `backend/src/database/migrations/0007_review_fixes.sql`; `backend/docs/DATABASE_DESIGN.md` §2.

- App roles can no longer delete products or listings. Use archive (§3.4a).
- Status transitions for products and listings are enforced by trigger (§3.4a).
- `published_at` is set automatically on activation (§3.4a).
- `suspended` is moderation-only (§3.4a).

### 5.2 Open uncertainties

| # | Item | Detail |
|---|---|---|
| 1 | Module A owner | Not assigned in `ARCHITECTURE_ASSESSMENT.md` §4 for countries, currencies, units, ports, Incoterms, payment terms, packaging, shipment modes, languages, states/provinces and cities. ADR-004 says a versioned reference package. |
| 2 | Multiple listings per product | Allowed by schema (no unique on `company_id`, `product_id`). Confirm whether one product should have one listing per company. |
| 3 | Primary category consistency | `products.primary_category_id` and `product_categories_mapping.is_primary` are not linked by any constraint. |
| 4 | Primary HS code and primary image rules | `product_hs_codes.is_primary` has no uniqueness rule. `product_images.is_primary` is unique per product (partial index). |
| 5 | Specification scoping | Definitions are global or per category. The schema does not say which definitions apply to a product whose category has no definitions; the UI must decide how to show the form (assumed: category definitions plus global). |
| 6 | Empty seeds | No specification definitions, cities or states/provinces are seeded. Spec forms and location pickers will be empty until curated data is loaded. |
| 7 | Seed scope | Starter sets only (see §2.7). Production imports full ISO, UN/LOCODE and WCO datasets (`DATABASE_DESIGN.md` §6). Do not design fixed list sizes from the seed counts. |
| 8 | Incoterm years | Seed has version 2020 only. The picker must support `version_year` if other years are added. |
| 9 | Port types | Seed has `sea` ports only; `air`, `inland`, `rail`, `road` are valid values with no seed rows. |
| 10 | Language direction | `languages.is_rtl` is stored; the sources do not define how the UI applies it. |
| 11 | Public visibility of company | Product visibility depends on the owning company's `companies.status = active` (Module C). The company statuses are defined in Module C. |
