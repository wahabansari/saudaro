# Trade profiles, RFQ and supplier matching: UI design reference

Status: designed, not yet implemented.
Last verified against sources: 2026-11-17.
Scope: module G (Seller trade profile and buyer profile, 21 tables), module H (RFQ management, 16 tables), module I (Supplier matching, 5 tables) of the 155-table design.
Audience: UI/UX designer. This document is self-contained. No code access is needed.

Sources: `backend/docs/DATABASE_REFERENCE.md` (sections G, H, I), `backend/docs/ERD.md`, `backend/docs/DATABASE_DESIGN.md`, `backend/docs/SECURITY_ARCHITECTURE.md`, `backend/src/database/schema/trade-profiles.ts`, `rfq.ts`, `matching.ts`, migrations `0001_core_schema.sql` (CHECKs), `0003_functions_and_triggers.sql` (triggers and functions), `0005_rls_policies_and_grants.sql` (RLS, grants, projection views), `docs/ARCHITECTURE_ASSESSMENT.md` section 4, `docs/SYSTEM_ARCHITECTURE.md` sections 2, 5, 6, `docs/ARCHITECTURE_DECISIONS.md` section 3.

---

## 0. Conventions

- **Tenant = company.** A user belongs to companies through memberships and acts for one active company per request (A-4). Writes require the active company's role to hold the permission named in each table's write rule: `rfq.create`, `rfq.manage`, `seller_profile.manage`, `buyer_profile.manage`.
- **Buyer** = the company that owns an RFQ (`rfqs.company_id`). **Supplier** = any other company that can see or quote the RFQ.
- One company may hold a seller profile and a buyer profile. They are two profiles of one identity.
- Quantities and money are numeric. Units are rows in `units_of_measure`. Currencies are rows in `currencies`.
- Pickers for countries, states/provinces, ports, incoterms, currencies, units of measure, product categories, HS codes, certifications, certification issuers, packaging types, shipment modes, payment terms and companies come from reference tables (module A). They are not described here.
- Enumeration values are verbatim database CHECK values. A value marked **TS only** is enforced in application code, not by a database CHECK.
- Every table with a `version` column is bumped by a trigger on each update. Clients send `id` and `version` for optimistic concurrency.
- `updated_at` is maintained by a trigger on update. `created_at` is set at insert.

---

## 1. Module G: Seller trade profile and buyer profile (21 tables)

### 1.1 Purpose (product language)

- **Seller trade profile.** What a company sells, what it can supply, which markets it exports to, and its commercial terms. The public part is visible to other companies only when the seller profile is published. The private part (capacity, MOQ, lead times, accepted currencies, payment methods, packaging, trade terms) is visible only to the company itself and to platform workers.
- **Buyer profile.** What a company imports, from which origins, what import requirements it must meet, and its default trade preferences. The whole buyer profile is private to the buyer company (A-7).

### 1.2 Owner and status

- Owner service: **trade-profile** service (port 4005 in SYSTEM_ARCHITECTURE section 2).
- Status: **designed, not yet implemented.**
- ARCHITECTURE_ASSESSMENT section 4 says "seller_* (14)". The reference lists 15 seller tables, and this document covers all 15. Total with buyer tables is 21.

### 1.3 Entities: seller side (15 tables)

| Table | Represents | Key columns | Relations |
|---|---|---|---|
| `seller_trade_profiles` | One per company. Seller identity block. Primary key is the company. | `company_id` (PK); `seller_type` (enum, section 1.4); `summary` text; `years_exporting` smallint; `default_quote_validity_days` smallint, default 30, range 1-365; `accepts_rfqs` boolean, default true; `response_time_hours` smallint; `is_published` boolean, default false; `published_at` timestamptz, required when `is_published` is true; `version`; `created_at`; `updated_at` | `companies` (1:1, cascade) |
| `seller_capabilities` | Capability types the company offers. One row per type. | `id`; `capability_type` (enum, section 1.4); `description` text; unique (`company_id`, `capability_type`) | `companies` |
| `seller_product_capabilities` | Categories, HS codes and optionally one product the seller can supply. | `id`; `category_id` (required); `hs_code_id` (optional); `product_id` (optional, must be a product of the same company); `notes` text; unique (`company_id`, `category_id`, `hs_code_id`, `product_id`), nulls not distinct | `product_categories`, `hs_codes`, `products` (composite, same company) |
| `seller_export_markets` | Countries the seller exports to. | `company_id` + `country_id` (PK pair); `is_current` boolean, default true | `companies`, `countries` |
| `seller_supply_regions` | Countries and optional states/provinces where goods are sourced or produced. | `id`; `country_id` (required); `state_province_id` (optional); unique (`company_id`, `country_id`, `state_province_id`), nulls not distinct | `countries`, `states_provinces` |
| `seller_shipping_ports` | Ports the seller ships from. | `company_id` + `port_id` (PK pair); `is_primary` boolean, default false (no uniqueness constraint in schema) | `ports` |
| `seller_incoterm_capabilities` | Incoterms the seller offers, optionally with port, named place and shipment mode. | `id`; `incoterm_id` (required); `port_id`; `named_place` text; `shipment_mode_id`; unique (`company_id`, `incoterm_id`, `port_id`, `named_place`, `shipment_mode_id`), nulls not distinct | `incoterms`, `ports`, `shipment_modes` |
| `seller_certifications` | Certificates the company holds. | `id`; `certification_id` (required); `issuer_id` (optional); `certificate_number` text; `valid_from` date; `valid_until` date (valid_from <= valid_until when both set); `file_id` (file of the same company, module D) | `certifications`, `certification_issuers`, `files` (composite, same company) |
| `seller_capacity_records` | Production or availability capacity. Scope is a category, a product, or both. Private. | `id`; `category_id` (optional); `product_id` (optional; at least one of category or product); `capacity_qty` numeric(20,6), must be > 0; `uom_id` (required); `period` (enum, section 1.4, default month); `valid_from` date; `valid_until` date; `notes` text | `product_categories`, `products` (composite), `units_of_measure` |
| `seller_moq_records` | Minimum order quantity per category or product. Private. | `id`; `category_id` (optional); `product_id` (optional; at least one of category or product); `moq_qty` numeric(20,6), must be > 0; `uom_id` (required); `min_order_value` numeric(20,4), >= 0 (optional); `currency_id` (required when `min_order_value` is set) | `product_categories`, `products` (composite), `units_of_measure`, `currencies` |
| `seller_lead_times` | Lead time range per category or product. Private. | `id`; `category_id` (optional); `product_id` (optional); `lead_time_type` (enum, section 1.4, default total); `min_days` smallint; `max_days` smallint (0 <= min_days <= max_days <= 730) | `product_categories`, `products` (composite) |
| `seller_packaging_capabilities` | Packaging types the seller can use. Private. | `company_id` + `packaging_type_id` (PK pair); `notes` text | `packaging_types` |
| `seller_payment_methods` | Payment terms the seller accepts. Private. | `company_id` + `payment_term_id` (PK pair); `notes` text | `payment_terms` |
| `seller_accepted_currencies` | Currencies the seller accepts. Private. | `company_id` + `currency_id` (PK pair) | `currencies` |
| `seller_trade_terms` | Sample, minimum order, warranty and return terms. One per company. Private. | `company_id` (PK); `sample_available` boolean, default false; `sample_policy` text; `min_order_value` numeric(20,4), >= 0, requires `min_order_currency_id`; `min_order_currency_id`; `warranty_terms` text; `return_policy` text; `notes` text | `companies`, `currencies` |

### 1.4 Entities: buyer side (6 tables)

| Table | Represents | Key columns | Relations |
|---|---|---|---|
| `buyer_profiles` | One per company. Buyer identity block. Private. | `company_id` (PK); `buyer_type` (enum, required); `summary` text; `annual_import_volume_usd_range` (enum, optional); `version`; `created_at`; `updated_at` | `companies` (1:1, cascade) |
| `buyer_import_markets` | Countries the buyer imports into. | `company_id` + `country_id` (PK pair) | `countries` |
| `buyer_preferred_origins` | Countries the buyer prefers to source from. | `company_id` + `country_id` (PK pair) | `countries` |
| `buyer_product_interests` | Categories and optional HS codes the buyer is interested in. | `id`; `category_id` (required); `hs_code_id` (optional); unique (`company_id`, `category_id`, `hs_code_id`), nulls not distinct | `product_categories`, `hs_codes` |
| `buyer_import_requirements` | Requirements the buyer must meet on import. | `id`; `requirement_type` (enum, required); `certification_id` (required if and only if type is certification); `description` text (required); `is_mandatory` boolean, default true | `certifications` |
| `buyer_trade_preferences` | Default trade preferences. One per company. | `company_id` (PK); `preferred_currency_id`; `preferred_incoterm_id`; `preferred_payment_term_id`; `preferred_shipment_mode_id`; `notes` text; `created_at`; `updated_at` | `currencies`, `incoterms`, `payment_terms`, `shipment_modes` |

### 1.5 Enumerations: module G (verbatim)

- `seller_trade_profiles.seller_type`: `manufacturer`, `exporter`, `distributor`, `wholesaler`, `trading_company`, `supplier`, `other`
- `seller_capabilities.capability_type`: `manufacturing`, `oem`, `odm`, `private_label`, `custom_production`, `sourcing`, `warehousing`, `logistics`
- `seller_capacity_records.period`: `day`, `week`, `month`, `year` (default `month`)
- `seller_lead_times.lead_time_type`: `production`, `dispatch`, `total` (default `total`)
- `buyer_profiles.buyer_type`: `importer`, `distributor`, `retailer`, `end_user_manufacturer`, `trader`, `other`
- `buyer_profiles.annual_import_volume_usd_range`: `under_100k`, `100k_1m`, `1m_10m`, `over_10m`
- `buyer_import_requirements.requirement_type`: `certification`, `document`, `labeling`, `inspection`, `other`
- `companies.status` (used for visibility): `draft`, `active`, `suspended`, `closed`. Only `active` companies are visible to others.

### 1.6 Visibility and write rules: module G

| Data | Owning company | Other companies | Platform worker |
|---|---|---|---|
| `seller_trade_profiles` (whole row) | read, write | read only when `is_published` is true and the company is `active` | read |
| Public seller data: `seller_capabilities`, `seller_product_capabilities`, `seller_export_markets`, `seller_supply_regions`, `seller_shipping_ports`, `seller_incoterm_capabilities`, `seller_certifications` | read, write | read only when the seller profile is published and the company is `active` | read |
| Private seller data: `seller_capacity_records`, `seller_moq_records`, `seller_lead_times`, `seller_packaging_capabilities`, `seller_payment_methods`, `seller_accepted_currencies`, `seller_trade_terms` | read, write | **never** | read |
| All 6 buyer tables | read, write | **never** | read |

Write rules:
- `seller_profile.manage` is required to write all 15 seller tables. `buyer_profile.manage` is required to write all 6 buyer tables.
- **No delete** is allowed on `seller_trade_profiles`, `seller_trade_terms`, `buyer_profiles` and `buyer_trade_preferences`. The other 17 tables allow delete with the manage permission.
- Publication: `is_published` = true requires `published_at` to be set (CHECK). No trigger sets `published_at`. The application must set it.
- `accepts_rfqs` is not read by the visibility function `can_view_rfq` or by `can_quote_rfq`. Its effect is not defined in the sources (see section 5).
- `default_quote_validity_days` is stored here. Its use in quotations is defined in module J, which is not covered here.

### 1.7 Screens: module G

**Screen G-1. Seller trade profile editor (own company).**
- Identity block: `seller_type` (single select, required); `years_exporting`; `summary`; `response_time_hours`; `accepts_rfqs` (toggle); `default_quote_validity_days` (number 1-365, default 30).
- Publication control: `is_published` toggle. Shows `published_at` and a preview of the public view (G-2). Off means invisible to other companies.
- Capabilities section: multi-select `capability_type`; per-capability `description`.
- Products section: rows of `category_id` (required), `hs_code_id`, `product_id` (picker of own products), `notes`.
- Markets and regions section: export markets (`country_id`, `is_current`); supply regions (`country_id`, `state_province_id`); shipping ports (`port_id`, `is_primary`).
- Incoterms section: rows of `incoterm_id` (required), `port_id`, `named_place`, `shipment_mode_id`.
- Certifications section: rows of `certification_id` (required), `issuer_id`, `certificate_number`, `valid_from`, `valid_until`, `file_id` (upload of an own company file).
- Capacity section (labelled private): rows of scope (category or product, at least one), `capacity_qty` (> 0), `uom_id`, `period` (day, week, month, year), `valid_from`, `valid_until`, `notes`.
- MOQ section (labelled private): rows of scope, `moq_qty` (> 0), `uom_id`, `min_order_value`, `currency_id` (required if `min_order_value` set).
- Lead times section (labelled private): rows of scope, `lead_time_type`, `min_days`, `max_days` (max <= 730).
- Commercial terms section (labelled private):
  - Accepted currencies: multi-select `currency_id`.
  - Payment methods: multi-select `payment_term_id`, `notes`.
  - Packaging: multi-select `packaging_type_id`, `notes`.
  - Trade terms: `sample_available`, `sample_policy`, `min_order_value` with `min_order_currency_id`, `warranty_terms`, `return_policy`, `notes`.
- Match settings section (module I): rows of `category_id`, `destination_country_id`, `min_order_value_usd`, `notify_enabled` (default on), `is_active` (default on).

**Screen G-2. Public seller profile (as seen by other companies).** Shown only if `is_published` and the company is active.
- Company card from `app.public_companies`: `display_name`, `slug`, `country_id`, `is_business_verified`, `tagline`, `description`, `year_established`, `employee_count_range`, `website` (the last five only when the company profile is public).
- Seller block: `seller_type`, `summary`, `years_exporting`, `response_time_hours`, `accepts_rfqs`, `default_quote_validity_days`.
- Public sections: capabilities, product capabilities, export markets, supply regions, shipping ports, incoterm capabilities, certifications (`certification_id`, `issuer_id`, `certificate_number`, `valid_from`, `valid_until`).
- **Not shown** to other companies: capacity, MOQ, lead times, accepted currencies, payment methods, packaging, trade terms.

**Screen G-3. Buyer profile editor (own company, private).**
- Identity: `buyer_type` (required); `annual_import_volume_usd_range` (optional); `summary`.
- Import markets: multi-select `country_id`.
- Preferred origins: multi-select `country_id`.
- Product interests: rows of `category_id` (required), `hs_code_id`.
- Import requirements: rows of `requirement_type` (required); `certification_id` (required only when type is certification); `description` (required); `is_mandatory` (default on).
- Trade preferences: `preferred_currency_id`, `preferred_incoterm_id`, `preferred_payment_term_id`, `preferred_shipment_mode_id`, `notes`.
- Nothing on this screen is public. Matching workers read buyer and seller data (trade-profiles.ts header comment).

---

## 2. Module H: RFQ management (16 tables)

### 2.1 Purpose (product language)

A buyer publishes a request for quotation (RFQ): what it wants (items and specifications), where it must be delivered, what documents and certifications it requires, who may see it, and when it closes. Eligible suppliers read the RFQ through restricted projections. They can ask clarifications, be invited, save the RFQ and submit quotations (module J, not covered here).

### 2.2 Owner and status

- Owner service: **rfq** service (port 4006 in SYSTEM_ARCHITECTURE section 2). Owns `rfqs` and its 15 child tables.
- Status: **designed, not yet implemented.**

### 2.3 Entities (16 tables)

| Table | Represents | Key columns | Relations |
|---|---|---|---|
| `rfqs` | RFQ header. | `id`; `company_id` (buyer); `created_by_user_id`; `reference_no` text, auto-generated as RFQ- + year + - + 8-digit sequence, unique; `title` (required); `description`; `primary_category_id` (required); `status` (enum, section 2.4, default draft); `visibility` (enum, default public); `currency_id`; `allow_partial_quotes` boolean, default true; `quote_deadline_at`; `published_at`; `expires_at`; `closed_at`; `close_reason` text; `version`; `search_vector` (generated from `title` and `description`); `created_at`; `updated_at` | `companies`, `users` (creator), `product_categories`, `currencies` |
| `rfq_items` | Line items. | `id`; `rfq_id`; `line_no` smallint, 1-200, unique per RFQ; `product_name` (required); `description`; `category_id`; `hs_code_id`; `quantity` numeric(20,6), > 0; `uom_id` (required); `target_unit_price` numeric(20,4), >= 0, buyer-only; `required_delivery_date` date | `rfqs`, `product_categories`, `hs_codes`, `units_of_measure` |
| `rfq_specifications` | Specification values for one item. | `id`; `rfq_item_id`; `definition_id` (catalog definition, optional); `custom_name` text; `value_text`; `value_number` numeric(24,8); `value_boolean`; `value_min` and `value_max` numeric(24,8); `uom_id`; `is_mandatory` boolean, default false | `rfq_items`, `product_specification_definitions`, `units_of_measure` |
| `rfq_destinations` | Delivery places. One RFQ may have several. | `id`; `country_id` (required); `port_id`; `place_name` text; `incoterm_id`; `incoterm_named_place` text; `required_by_date` date | `rfqs`, `countries`, `ports`, `incoterms` |
| `rfq_trade_requirements` | Packaging, shipment, inspection and sampling requirements. One per RFQ. | `rfq_id` (PK); `packaging_type_id`; `packaging_notes` text; `shipment_mode_id`; `inspection_required` boolean, default false; `samples_required` boolean, default false; `notes` text | `rfqs`, `packaging_types`, `shipment_modes` |
| `rfq_payment_preferences` | Payment terms the buyer accepts for this RFQ. | `rfq_id` + `payment_term_id` (PK pair) | `rfqs`, `payment_terms` |
| `rfq_origin_preferences` | Origin countries with a preference level. | `rfq_id` + `country_id` (PK pair); `preference` (enum, default preferred) | `rfqs`, `countries` |
| `rfq_required_documents` | Trade documents the supplier must provide. | `id`; `document_type` (enum); unique (`rfq_id`, `document_type`) | `rfqs` |
| `rfq_certification_requirements` | Certifications required for the whole RFQ or for one item. | `id`; `rfq_item_id` (null means whole RFQ); `certification_id` (required); `is_mandatory` boolean, default true; unique (`rfq_id`, `rfq_item_id`, `certification_id`), nulls not distinct | `rfqs`, `rfq_items`, `certifications` |
| `rfq_visibility_rules` | Rules deciding which suppliers may see the RFQ. | `id`; `rule_type` (enum); `country_id` (for allow_country and block_country); `verification_level` (for min_verification); `seller_type` (for seller_type) | `rfqs`, `countries` |
| `rfq_attachments` | Files attached to the RFQ. | `id`; `file_id` (unique, file of the same company); `title` (required) | `rfqs`, `files` (composite, same company) |
| `rfq_invitations` | Direct invitation of one company to one RFQ. | `id`; `invited_company_id`; `invited_by_user_id`; `status` (enum, default pending); `message` text; `invited_at`; `responded_at`; unique (`rfq_id`, `invited_company_id`) | `rfqs`, `companies`, `users` |
| `rfq_status_history` | Append-only log of RFQ status changes. | `id`; `from_status` (empty on creation); `to_status` (required); `actor_user_id`; `reason` text; `created_at` | `rfqs`, `users` |
| `rfq_views` | One row per supplier view of an RFQ. | `id`; `company_id` (viewing company); `viewer_user_id`; `viewed_at` | `rfqs`, `companies`, `users` |
| `rfq_saved_records` | RFQs a user has saved, with a note. | `id`; `company_id`; `user_id`; `note` text; `saved_at`; unique (`company_id`, `user_id`, `rfq_id`) | `rfqs`, `companies`, `users` |
| `rfq_clarifications` | Question and answer about an RFQ. | `id`; `rfq_id`; `rfq_company_id` (buyer); `asked_by_company_id`; `asked_by_user_id`; `question` (required); `answer` text; `answered_by_user_id`; `answered_at`; `is_public` boolean, default false; `created_at` | `rfqs`, `companies`, `users` |

### 2.4 Enumerations: module H (verbatim)

- `rfqs.status` (CHECK `rfqs_status_chk`): `draft`, `published`, `paused`, `closed`, `expired`, `cancelled`, `awarded`
- `rfqs.visibility` (CHECK `rfqs_visibility_chk`): `public`, `private`, `invited`
- `rfq_visibility_rules.rule_type` (CHECK): `allow_country`, `block_country`, `min_verification`, `seller_type`
- `rfq_visibility_rules` operand rule (CHECK): allow_country and block_country use `country_id` only; min_verification uses `verification_level` only; seller_type uses `seller_type` only.
- `rfq_visibility_rules.verification_level` values (**TS only**, no database CHECK on this column): `email`, `phone`, `business_registration`, `business_address`, `authorized_representative`, `documents_reviewed`, `independent_check`
- `rfq_visibility_rules.seller_type` values (**TS only**, no database CHECK on this column): same seven values as `seller_trade_profiles.seller_type` (section 1.5)
- `rfq_invitations.status` (CHECK `rfq_invitations_status_chk`): `pending`, `viewed`, `declined`, `quoted`
- `rfq_origin_preferences.preference` (CHECK): `preferred`, `required`, `excluded` (default `preferred`)
- `rfq_required_documents.document_type` (CHECK): `commercial_invoice`, `packing_list`, `certificate_of_origin`, `bill_of_lading`, `phytosanitary_certificate`, `fumigation_certificate`, `health_certificate`, `certificate_of_analysis`, `msds`, `insurance_certificate`, `other`
- `rfq_clarifications` rule (CHECK): `answer` is null if and only if `answered_at` is null. The asker company must differ from the owner company.
- `rfq_destinations` rule (CHECK): if `incoterm_id` is set, then `incoterm_named_place` or `port_id` must be set.

### 2.5 RFQ lifecycle: state machine

**States:** `draft`, `published`, `paused`, `closed`, `expired`, `cancelled`, `awarded`.

**Entry:** every RFQ is inserted as `draft`. Only a trusted caller may insert in another status. `created_by_user_id` must be the current user (RLS).

**Immutable columns** (trigger, for everyone except trusted callers): `company_id`, `reference_no`, `created_by_user_id`.

**Allowed transitions** (complete list from trigger `app.guard_rfq`):

| From | To | Database conditions | Who may trigger (as enforced) |
|---|---|---|---|
| draft | published | at least one `rfq_items` row; at least one `rfq_destinations` row; `expires_at` set and later than now. Sets `published_at` on first publication. | any user whose role has `rfq.create` in the owning company (RLS on `rfqs` update) |
| draft | cancelled | none | same as above |
| published | paused | none | same as above |
| published | closed | none. Sets `closed_at`. | same as above |
| published | expired | `expires_at` <= now. Sets `closed_at`. | worker role (RLS allows worker update); the job that performs it is not defined in the sources |
| published | cancelled | none. Sets `closed_at`. | same as above |
| published | awarded | an accepted quotation exists for this RFQ (`quotations.status` = accepted). Sets `closed_at`. | RFQ service on `quotation.accepted.v1` (SYSTEM_ARCHITECTURE section 6) |
| paused | published | same publish conditions as draft to published (items, destinations, future `expires_at`) | same as draft to published |
| paused | closed | none. Sets `closed_at`. | same as published to closed |
| paused | cancelled | none. Sets `closed_at`. | same as above |

**Terminal states:** `closed`, `expired`, `cancelled`, `awarded`. No transition leaves a terminal state.

**Explicitly not allowed** (any other pair is rejected): draft to paused, draft to closed, draft to expired, draft to awarded, paused to expired, paused to awarded, and any transition from a terminal state or back to draft.

**Recorded automatically:** every insert and every status change writes one `rfq_status_history` row (`from_status`, `to_status`, `actor_user_id`). `reason` and `rfqs.close_reason` are free text set by the application. No trigger sets them.

**Read-only after publication (content lock):**
- Header columns: after the RFQ leaves draft or paused, `title`, `primary_category_id`, `visibility` and `currency_id` cannot change. Other header columns (`description`, `quote_deadline_at`, `expires_at`, `allow_partial_quotes`) are not locked by the trigger. `expires_at` must still be later than `published_at` (CHECK).
- Child rows: `rfq_items`, `rfq_destinations`, `rfq_trade_requirements`, `rfq_payment_preferences`, `rfq_origin_preferences`, `rfq_required_documents`, `rfq_certification_requirements`, `rfq_visibility_rules`, `rfq_attachments` and `rfq_specifications` can be inserted, updated or deleted only while the RFQ is draft or paused.
- Practical consequence: to change content of a published RFQ, the buyer pauses it (published to paused), edits, and publishes again (paused to published). A paused RFQ is hidden from suppliers (section 2.6) while it is paused.
- Not locked: `rfq_clarifications`, `rfq_invitations`, `rfq_saved_records`, `rfq_views`.
- `rfq_status_history` is append-only for every role.

**Status checks that also apply:**
- Every status except `draft` and `cancelled` requires `published_at` and `expires_at`. (CHECK `rfqs_published_chk`.)
- `closed`, `cancelled`, `expired` and `awarded` require `closed_at`. (CHECK `rfqs_closed_chk`.)

### 2.6 Visibility rules: who may see an RFQ

Supplier company **p** can see RFQ **r** only if all of the following hold (function `app.can_view_rfq`):
1. `r.status` = published.
2. `r.expires_at` is later than now.
3. p is not the owning company.
4. p has status `active`.
5. Visibility: `r.visibility` = public, **or** `r.visibility` = invited and an `rfq_invitations` row exists for p (any invitation status counts). `private` gives no supplier access: the function returns false for every supplier.
6. Country rules: no `block_country` rule matches the country of p. If any `allow_country` rules exist, the country of p must match one of them.
7. Verification rules: for every `min_verification` rule, p must have a `company_verification_levels` row with that `level`, status `verified`, and `expires_at` empty or in the future.
8. Seller-type rules: if any `seller_type` rules exist, p must have a `seller_trade_profiles` row whose `seller_type` equals one of the rule values. (The function does not check `is_published` here.)

Additional access:
- A supplier that already has a quotation on an RFQ keeps read access to that RFQ through `app.public_rfqs`, even after the RFQ is paused, closed, expired, cancelled or awarded.

Quoting (`app.can_quote_rfq`): visibility as above **and** (`quote_deadline_at` is empty or later than now). The quotation trigger enforces this on submit (module J).

Match scores never affect any of these rules (A-12). Matching is advisory only (section 3).

### 2.7 Supplier read surface and buyer read surface

**Suppliers never read the base `rfqs` table.** They read security-barrier projection views:

| View | Columns |
|---|---|
| `app.public_rfqs` (rows: visible RFQs, plus RFQs the company has quoted on) | `id`, `reference_no`, `buyer_company_id`, `title`, `description`, `primary_category_id`, `status`, `currency_id`, `allow_partial_quotes`, `quote_deadline_at`, `published_at`, `expires_at` |
| `app.public_rfq_items` | `id`, `rfq_id`, `line_no`, `product_name`, `description`, `category_id`, `hs_code_id`, `quantity`, `uom_id`, `required_delivery_date`. **No** `target_unit_price`. |
| `app.public_rfq_specifications` | `id`, `rfq_item_id`, `definition_id`, `custom_name`, `value_text`, `value_number`, `value_boolean`, `value_min`, `value_max`, `uom_id`, `is_mandatory` |
| `app.public_rfq_destinations` | `id`, `rfq_id`, `country_id`, `port_id`, `place_name`, `incoterm_id`, `incoterm_named_place`, `required_by_date` |

Base-table reads granted to suppliers:
- `rfq_attachments`: rows of RFQs the supplier can see (`id`, `rfq_id`, `file_id`, `title`).
- `rfq_clarifications`: rows the supplier asked, rows with `is_public` true on visible RFQs.
- `rfq_saved_records`: the user's own rows.
- `rfq_invitations`: rows addressed to the supplier company.
- `rfq_views`: insert and read own rows.

**Not readable by suppliers** (base-table policy is owner-only): `rfq_trade_requirements`, `rfq_payment_preferences`, `rfq_origin_preferences`, `rfq_required_documents`, `rfq_certification_requirements`, `rfq_visibility_rules`, `rfq_status_history`, `rfq_items` and `rfq_destinations` (base tables; suppliers use the projections above).

**Buyer (owning company) reads:** `rfqs` and all child tables where `company_id` is the active company; `rfq_status_history`; `rfq_invitations` sent by the company; `rfq_clarifications` on its RFQs; `rfq_views` (see section 5, item 3); match runs and supplier matches for its RFQs (section 3).

### 2.8 Clarifications (Q&A)

- **Ask:** a supplier user (writable company, own user id) inserts `question` on an RFQ that is in that supplier's `public_rfqs`. `asked_by_company_id` and `asked_by_user_id` are set from the session. The owner company cannot ask.
- **Answer:** the owner with `rfq.manage` updates only `answer`, `answered_by_user_id`, `answered_at` and `is_public`. `answer` and `answered_at` are set together (CHECK).
- **Visibility:** the asking company, the owning company, and, when `is_public` is true, any company that can see the RFQ.
- **Immutability:** the question cannot be edited by anyone. No row can be deleted.

### 2.9 Invitations

- **Create / delete:** the owner with `rfq.manage` inserts `invited_company_id`, `message`, and `invited_by_user_id`. One invitation per (RFQ, company). Delete is allowed for the owner.
- **Respond:** users of the invited company can read the row and update `status` and `responded_at`. No database trigger restricts status transitions (section 5, item 4).
- **Status values:** `pending`, `viewed`, `declined`, `quoted`. The CHECK does not include an accepted value.
- **Effect on visibility:** an `invited` RFQ is visible to the invited company whatever the invitation status. Declining does not remove access.
- **Visibility of rows:** the owner sees all invitations of its RFQs; the invited company sees the invitations addressed to it.

### 2.10 Screens: module H

**Screen H-1. RFQ list (buyer).**
- Table of the company's RFQs: `reference_no`, `title`, `status`, `visibility`, `published_at`, `quote_deadline_at`, `expires_at`, `closed_at`.
- Filter by `status` (7 values); sort by creation time (default newest first).
- Action: create RFQ (wizard H-2).

**Screen H-2. RFQ creation wizard (saves as draft at any step; publish only at the last step).** Steps in order:

1. **Basics** (`rfqs`): `title` (required); `description`; `primary_category_id` (required); `currency_id`; `allow_partial_quotes` (default on); `visibility` (public, private or invited; default public). The reference number is shown after the first save, not entered.
2. **Items** (`rfq_items`): one row per item. Fields: `line_no` (automatic, 1-200); `product_name` (required); `description`; `category_id`; `hs_code_id`; `quantity` (> 0); `uom_id` (required); `target_unit_price` (>= 0; label it as private to the buyer); `required_delivery_date`.
   - Specifications per item (`rfq_specifications`): choose `definition_id` or type `custom_name` (one is required). Choose exactly one value shape: text (`value_text`), number (`value_number`), yes/no (`value_boolean`), or range (`value_min` and/or `value_max`). Also `uom_id` and `is_mandatory` (default off). The database checks the value against the definition: data type text, number, boolean, enum or range; enums must be one of the allowed values; numbers must be within bounds.
3. **Destinations** (`rfq_destinations`): one or more rows. Fields: `country_id` (required); `port_id`; `place_name`; `incoterm_id`; `incoterm_named_place`; `required_by_date`. If an incoterm is set, a named place or a port is required.
4. **Trade requirements** (`rfq_trade_requirements`, `rfq_payment_preferences`, `rfq_origin_preferences`): `packaging_type_id`; `packaging_notes`; `shipment_mode_id`; `inspection_required` (default off); `samples_required` (default off); `notes`. Payment terms: multi-select `payment_term_id`. Origins: rows of `country_id` with `preference` (preferred, required or excluded; default preferred).
5. **Required documents** (`rfq_required_documents`): multi-select `document_type` from the 11 values in section 2.4. No duplicates.
6. **Required certifications** (`rfq_certification_requirements`): rows of `certification_id` (required), `rfq_item_id` (empty means whole RFQ; otherwise pick one item), `is_mandatory` (default on).
7. **Visibility rules** (`rfq_visibility_rules`): rows of `rule_type` plus operand:
   - allow_country or block_country: `country_id`.
   - min_verification: `verification_level` (one of the seven levels).
   - seller_type: `seller_type` (one of the seven seller types).
8. **Attachments** (`rfq_attachments`): rows of uploaded file (`file_id`, own company, module D) and `title` (required).
9. **Deadlines and publish**: `quote_deadline_at` (optional; quoting closes after it); `expires_at` (required to publish; must be in the future). Review screen shows a readiness checklist: at least one item, at least one destination, expiry in the future. Publish is enabled only when all three pass. After publish, the header fields in section 2.5 become read-only.

**Screen H-3. RFQ detail (buyer).**
- Header: `reference_no`, `title`, status badge, `visibility`, `published_at`, `expires_at`, `quote_deadline_at`, `closed_at`, `close_reason`.
- Status actions: show only the transitions in section 2.5 that apply to the current status. Show "Pause to edit" when published. Show a read-only banner when content is locked.
- Tabs: Items and specifications; Destinations; Trade requirements (including payment and origin); Required documents; Required certifications; Visibility rules; Attachments; Invitations; Clarifications; Views; Matched suppliers (screen I-1); History.

**Screen H-4. Clarifications inbox (buyer).**
- List per RFQ: asking company, `question`, `created_at`, answered or not.
- Answer form: `answer`, `is_public` toggle (answers become visible to all suppliers that can see the RFQ).

**Screen H-5. Invitations (buyer).**
- Invite form: company picker (`invited_company_id`; cannot be the owner), `message`.
- List: invited company, `status`, `invited_at`, `responded_at`. Action: delete invitation.

**Screen H-6. Views and history (buyer).**
- Views list: viewing company (`company_id`), `viewer_user_id`, `viewed_at`.
- Status history timeline: `from_status` to `to_status`, `actor_user_id`, `reason`, `created_at`.

**Screen H-7. Supplier RFQ feed.**
- Rows from `app.public_rfqs`. Columns: `reference_no`, `title`, buyer company card (from `public_companies`), `primary_category_id`, `currency_id`, `published_at`, `quote_deadline_at`, `expires_at`, `allow_partial_quotes` (badge), `status`.
- Sort by `published_at` (newest first). Filter by `primary_category_id`.
- The feed also contains RFQs the company has already quoted on, with their current `status` (closed, awarded and so on).

**Screen H-8. Supplier RFQ detail.**
- Header from `app.public_rfqs`: `title`, `description`, `reference_no`, deadlines (`quote_deadline_at` shown as closed once past), `expires_at`, `allow_partial_quotes`.
- Items from `app.public_rfq_items` (no target price). Specifications from `app.public_rfq_specifications`. Destinations from `app.public_rfq_destinations`.
- Attachments: `rfq_attachments` rows (`title`, file link).
- Public Q&A: clarifications with `is_public` true.
- Actions: ask a question (`question`); save RFQ with `note`; invitation banner when an invitation row exists (with its `status`). Quote action leads to module J.
- Required certifications and documents cannot be shown: suppliers cannot read those tables (section 5, item 1).

**Screen H-9. Supplier invitations inbox.**
- List of invitations addressed to the company: RFQ `reference_no` and `title` (from `public_rfqs`), `message`, `invited_at`, `status`, `responded_at`.
- Actions: change `status` (one of pending, viewed, declined, quoted) and set `responded_at`.

**Screen H-10. Saved RFQs (supplier user).**
- List of `rfq_saved_records` for the user: RFQ, `note` (editable), `saved_at`. Action: remove.

---

## 3. Module I: Supplier matching (5 tables)

### 3.1 Purpose (product language)

For each published RFQ, a worker ranks candidate suppliers and records the reasons for each score. Buyers see the ranked list. Suppliers see their own matches, the reasons, and can give feedback. Scores are advisory. Who can see or quote an RFQ is decided only by the visibility rules in section 2.6 (A-12).

### 3.2 Owner and status

- Owner service: **matching** service (port 4007 in SYSTEM_ARCHITECTURE section 2).
- Status: **designed, not yet implemented.**
- Writes come from the worker role. The application can only read, except for supplier status updates and feedback.

### 3.3 Entities (5 tables)

| Table | Represents | Key columns | Relations |
|---|---|---|---|
| `rfq_match_runs` | One run of matching for one RFQ. | `id`; `rfq_id`; `company_id` (buyer, tenant); `status` (enum, default queued); `algorithm_version` text (required); `candidate_count` integer; `error` text; `started_at`; `finished_at`; `created_at` | `rfqs` (composite, same company) |
| `rfq_supplier_matches` | One candidate supplier in one run. | `id`; `match_run_id`; `rfq_id`; `buyer_company_id`; `supplier_company_id`; `score` numeric(6,3), 0-100; `rank` integer; `is_eligible` boolean (stored flag); `status` (enum, default suggested); `created_at`; unique (`match_run_id`, `supplier_company_id`) | `rfq_match_runs`, `rfqs`, `companies` (supplier) |
| `rfq_match_reasons` | One explanation line for one match. | `id`; `match_id`; `supplier_company_id`; `reason_code` text (not a CHECK; examples in section 3.4); `passed` boolean (required); `weight` numeric(6,3) (required); `detail` text | `rfq_supplier_matches` (composite, same supplier) |
| `supplier_match_preferences` | Supplier's own rules for which RFQs it wants to be matched to. | `id`; `company_id`; `category_id` (optional); `destination_country_id` (optional); `min_order_value_usd` numeric(20,2); `notify_enabled` boolean, default true; `is_active` boolean, default true; unique (`company_id`, `category_id`, `destination_country_id`), nulls not distinct | `companies`, `product_categories`, `countries` |
| `supplier_match_feedback` | Supplier's feedback on one match. One per match per supplier. | `id`; `match_id`; `company_id` (supplier); `feedback` (enum, required); `comment` text; `created_at`; unique (`match_id`, `company_id`) | `rfq_supplier_matches` (composite, same supplier) |

### 3.4 Enumerations: module I (verbatim)

- `rfq_match_runs.status` (CHECK): `queued`, `running`, `completed`, `failed`
- `rfq_supplier_matches.status` (CHECK): `suggested`, `notified`, `viewed`, `dismissed`, `quoted`
- `supplier_match_feedback.feedback` (CHECK): `relevant`, `not_relevant`, `spam`, `already_supplied`
- `rfq_supplier_matches.score` (CHECK): between 0 and 100
- `rfq_match_reasons.reason_code`: free text, **no CHECK**. Examples in the schema comment: `category_match`, `hs_match`, `moq_ok`, `capacity_ok`, `incoterm_ok`, and "...". The full code list is not defined in the sources.
- `rfq_match_reasons.detail` may reference private supplier data such as capacity (schema comment). Only that supplier can read it.

### 3.5 Matching flow

1. **Trigger.** `rfq.published.v1` is consumed by the matching service (SYSTEM_ARCHITECTURE section 5). Consumers of `company.verified.v1` and `product.published.v1` also include matching.
2. **Run.** A run row is created with `status` = queued and `algorithm_version`. It moves to running (`started_at`), then to completed (`finished_at`, `candidate_count`) or failed (`error`). The database index covers queued runs.
3. **Matches.** For each candidate supplier, one `rfq_supplier_matches` row: `score` (0-100, three decimals), `rank` (integer; the schema does not declare it unique), `is_eligible` (stored by the worker), and `status` = suggested.
4. **Reasons.** Several `rfq_match_reasons` rows per match: `reason_code`, `passed`, `weight`, `detail`. The sources do not define the scoring formula, the weights or the reason codes.
5. **Notification and preferences.** `supplier_match_preferences` holds the supplier's category, destination, minimum order value, `notify_enabled` and `is_active` settings. The sources name these fields but do not define how they change matching or notification.
6. **Supplier actions.** The supplier may update `status` (only that column is writable). The four status values after suggested are listed in the CHECK. No trigger enforces an order. The supplier may also create or update one feedback row per match.

**Eligibility vs score:** `is_eligible` is a stored flag set by the worker. The sources do not define how it is computed. Whether a supplier may see or quote the RFQ is decided only by section 2.6.

### 3.6 Visibility: buyer vs supplier

| Data | Buyer (RFQ owner company) | Supplier (match subject company) |
|---|---|---|
| `rfq_match_runs` | rows of own company: `status`, `algorithm_version`, `candidate_count`, `error`, `started_at`, `finished_at` | none |
| `rfq_supplier_matches` | rows where `buyer_company_id` is the active company: `supplier_company_id`, `score`, `rank`, `is_eligible`, `status` | rows where `supplier_company_id` is the active company: `buyer_company_id`, `rfq_id`, `score`, `rank`, `is_eligible`, `status` (updatable) |
| `rfq_match_reasons` | none | reasons of own matches: `reason_code`, `passed`, `weight`, `detail` |
| `supplier_match_feedback` | none | own feedback rows |
| `supplier_match_preferences` | none | own rows (read, insert, update, delete with `seller_profile.manage`) |

Notes:
- The buyer never sees reasons or feedback.
- The supplier-side match policy does not check RFQ visibility. A supplier may hold a match row for an RFQ it cannot see (see section 5, item 6).
- Platform workers read and write matching data (`rfq_match_runs`: insert and update; `rfq_supplier_matches`: insert and update; `rfq_match_reasons`: insert only).

### 3.7 Screens: module I

**Screen I-1. Matched suppliers (buyer, per RFQ).**
- Run status panel: `status`, `algorithm_version`, `candidate_count`, `started_at`, `finished_at`, and `error` when failed.
- Ranked table: `rank` (ascending), supplier company card (from `public_companies`), `score`, `is_eligible`, `status`.
- Filter by `status`. The sources define no action to start a run.
- No reasons are shown to the buyer.

**Screen I-2. Supplier match inbox (supplier).**
- List of own matches: RFQ context (`rfq_id`, `buyer_company_id`; RFQ title only if visible), `score`, `rank`, `status`, `created_at`.
- Expand a match: reasons table (`reason_code`, `passed`, `weight`, `detail`).
- Actions: change `status` (suggested, notified, viewed, dismissed, quoted); feedback form (`feedback` one of relevant, not_relevant, spam, already_supplied; `comment`).

**Screen I-3. Match settings (supplier).**
- Rows of `category_id`, `destination_country_id`, `min_order_value_usd`, `notify_enabled`, `is_active`. Unique per category and destination pair. Same rows as section G-1 match settings.

---

## 4. Events and cross-module dependencies (planned, not implemented)

| Event (SYSTEM_ARCHITECTURE section 5) | Producer | Consumers relevant here |
|---|---|---|
| `rfq.published.v1` | rfq | matching, search, notification |
| `company.verified.v1` | verification | company, search, rfq, matching, notification |
| `product.published.v1` | catalog | search, matching |
| `supplier.match.created.v1` | matching | notification, rfq |
| `quotation.submitted.v1` | quotation | notification, rfq |
| `quotation.accepted.v1` | quotation | rfq (award), deal, notification |

Saga on acceptance (SYSTEM_ARCHITECTURE section 6): when a quotation is accepted, the RFQ service awards the RFQ and closes it to new quotes (idempotent). The quotation stays accepted even if deal creation fails.

Eligibility call (ARCHITECTURE_ASSESSMENT section 3): the quotation service asks the RFQ service for eligibility when a draft is created and when it is submitted.

---

## 5. Open points for the designer (confirmed in the sources)

1. **Suppliers cannot read required certifications, required documents, trade requirements, payment preferences, origin preferences or visibility rules.** These tables are owner-only. No supplier projection exists for them. Only attachments are readable. Decide whether suppliers should see these, which requires a projection.
2. **`private` visibility gives no supplier access** (`can_view_rfq` returns false for all suppliers). Only the owner sees such an RFQ, and suppliers that already quoted keep access. The sources define no other supplier path for `private`.
3. **`rfq_views` read policy differs between sources.** The SQL policy lets the owner read full view rows (viewer company, viewer user, time) for its RFQs. The schema comment says buyers read only aggregates. Treat as an open decision.
4. **Invitation status is not governed by the database.** The CHECK allows `pending`, `viewed`, `declined`, `quoted`. No trigger orders transitions. The invited company can set any allowed value.
5. **Invitation status does not change visibility.** An invited RFQ is visible to the invited company even after decline.
6. **Match rows are not gated by RFQ visibility.** The supplier policy on `rfq_supplier_matches` checks only the supplier company. A supplier can hold a match whose RFQ it cannot view (for example when `is_eligible` is false). The UI must handle a match with no visible RFQ.
7. **Matching semantics are undefined.** `is_eligible`, `rank`, `weight` and the reason codes have no defined formula or code list in the sources.
8. **Expiry is time-based for suppliers, but the job that sets `expired` is not defined.** `can_view_rfq` stops showing an RFQ at `expires_at` even while its status is still published. The worker is allowed to set `expired` once `expires_at` has passed. The sources do not state the job.
9. **Published RFQs can change some header fields.** The trigger locks only `title`, `primary_category_id`, `visibility` and `currency_id` after publication. `description`, `quote_deadline_at`, `expires_at` and `allow_partial_quotes` remain editable. The sources do not decide whether that is intended.
10. **`accepts_rfqs` has no defined effect** on visibility or quoting in the sources.
11. **`published_at` is not set by a trigger** for seller profiles. The application must set it when publishing (CHECK).
12. **`seller_shipping_ports.is_primary` has no uniqueness constraint.** Several primary ports are allowed by the schema.
13. **Rule-type value lists** for `rfq_visibility_rules.verification_level` and `rfq_visibility_rules.seller_type` are checked only in application code (TS only). The database accepts any text in those columns.
14. **Free-text reason fields** (`rfqs.close_reason`, `rfq_status_history.reason`) have no trigger support. They are filled only by the application.
15. **Module ownership count.** ARCHITECTURE_ASSESSMENT section 4 says 14 seller tables and 6 buyer tables (20). The reference lists 21 in total (15 seller, 6 buyer). This document uses 21.
