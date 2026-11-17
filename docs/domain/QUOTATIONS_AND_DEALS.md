# Quotations and Deals: Product Specification (Modules J and K)

Scope: 25 tables. Module J = Quotations and negotiation (11 tables). Module K = Deals and deal room (14 tables).
Audience: a UI/UX designer who has no access to the code. Everything below is taken from the database sources. Where the sources do not state something, the text says "not defined in sources". Do not invent screens, fields or rules beyond this document.

Sources (migrations win on any conflict):
- `backend/src/database/migrations/0001_core_schema.sql` to `0006_fk_support_indexes.sql` (CHECK constraints, enums, indexes)
- `backend/src/database/migrations/0003_functions_and_triggers.sql` (state machines, immutability, snapshot checks)
- `backend/src/database/migrations/0005_rls_policies_and_grants.sql` (who can read, insert, update, delete)
- `backend/src/database/schema/quotations.ts`, `backend/src/database/schema/deals.ts`
- `backend/docs/DATABASE_REFERENCE.md` (sections J and K), `backend/docs/ERD.md`, `backend/docs/DATABASE_DESIGN.md`, `backend/docs/SECURITY_ARCHITECTURE.md`
- `docs/ARCHITECTURE_ASSESSMENT.md` section 4 (owner service), `docs/SYSTEM_ARCHITECTURE.md` sections 5 and 6 (events, acceptance saga)
- `backend/src/database/seeds/reference-data.ts` (permission names and descriptions, system roles)

---

## 0. Shared definitions

### 0.1 Actors and terms

| Term | Meaning in the data |
|---|---|
| Supplier | The company that owns a quotation: `quotations.company_id` (the tenant). Seller side. |
| Buyer | The owner of the RFQ: `quotations.buyer_company_id`. Buyer side. |
| Active company | The company the signed-in user has selected. All reads and writes are scoped to it. Membership is checked by the database on every statement. |
| Writable company | The active company when its status is `draft` or `active`. Suspended or closed companies are read-only. |
| Deal party | A company that has a `deal_parties` row for the deal. |
| Live quotation | A quotation whose status is `draft`, `submitted`, `under_negotiation` or `accepted` (`OPEN_QUOTATION_STATUSES`). |

### 0.2 Permissions used here

Permission names are exactly as enforced by RLS. Descriptions are from the seed file. Roles are the 5 system roles (hierarchy level in brackets). Custom company roles can also hold these permissions.

| Permission | Seed description | System roles that hold it |
|---|---|---|
| `quotation.create` | Create and edit quotation drafts | member (40), manager (60), admin (80), owner (100) |
| `quotation.submit` | Submit, revise and withdraw quotations | manager, admin, owner |
| `quotation.accept` | Accept or reject quotations and create deals | manager, admin, owner |
| `rfq.manage` | Delete drafts, invite suppliers, answer clarifications, compare quotations | manager, admin, owner |
| `deal.manage` | Manage deal documents, milestones, shipments and cancellations | manager, admin, owner |
| `deal.confirm` | Confirm deal steps on behalf of the company | manager, admin, owner |

viewer (20) holds none of these. Platform administrators are checked separately by `is_platform_admin('support')` (deal disputes).

### 0.3 Eligibility to quote (checked when a quotation draft is created and again when it is submitted)

The database checks all of the following for the supplier company (`can_view_rfq` and `can_quote_rfq`):
- RFQ `status` = `published`.
- RFQ `expires_at` is in the future.
- The supplier is not the RFQ owner.
- RFQ `visibility` is `public`, or the supplier has an `rfq_invitations` row (`invited`).
- Country allow and block rules (`rfq_visibility_rules`) pass for the supplier's country.
- Minimum verification level rule passes (verified level, not expired).
- Seller type rule passes.
- RFQ `quote_deadline_at` is null or in the future.

### 0.4 Cross-cutting conventions

- Keys: `uuid`.
- Money: totals are `numeric(24,4)`; unit prices are `numeric(20,4)`. Each revision has one `currency_id` (foreign key to `currencies`). Amounts are never floats.
- Quantities: `numeric(20,6)`, must be greater than 0.
- Reference numbers (assigned by database sequence, unique, not editable): `QUO-YYYY-NNNNNNNN` in `quotations.reference_no`; `DEAL-YYYY-NNNNNNNN` in `deals.reference_no`.
- Timestamps are `timestamptz`. Calendar dates (`due_date`, `etd`, `eta`) are `date`.
- Concurrency: `quotations.version` and `deals.version` increase on every update. Saves send the id and the expected version; a mismatch is a conflict.
- Append-only tables reject UPDATE, DELETE and TRUNCATE for every role, including the owner. These are: `quotation_status_history`, `negotiation_events`, `deal_status_history`, `deal_activity_events`, `deal_milestone_events`, `deal_document_versions`, and `deal_terms`/`deal_items` (immutable snapshot rows).
- Business records are never hard-deleted. Use withdraw, reject, cancel or close.
- Payments: the platform processes no payment and holds no escrow. Deal status `completed` never implies payment was made (`deals.ts` header; ADR A-1).

---

## MODULE J: Quotations and negotiation

### J.1 Purpose (product language)

A supplier prices an open RFQ (request for quotation) from a buyer. The offer is a quotation. It has numbered revisions. A submitted revision is frozen: its prices, terms, certifications and attachments can never change. A supplier that wants to change terms submits the next revision. The buyer compares quotations side by side, exchanges messages in a negotiation timeline, and accepts exactly one submitted revision. Acceptance creates the agreed terms that open a deal (module K).

### J.2 Owner and status

- Owner service: **quotation** (`ARCHITECTURE_ASSESSMENT` section 4 lists all 11 tables for it).
- Status: **designed, not yet implemented.** The tables exist as SQL migrations in `backend/`. No service, API or UI is built.

### J.3 Entities

#### J.3.1 Entity table

| Table | What it represents | Key columns (exact names and types) | Relations |
|---|---|---|---|
| `quotations` | One supplier's offer for one RFQ. The headline record the buyer sees in lists. | `id` uuid; `reference_no` text (QUO-...); `company_id` uuid (supplier, tenant); `buyer_company_id` uuid; `rfq_id` uuid; `created_by_user_id` uuid; `status` text enum (J.4); `current_revision_no` integer; `accepted_revision_id` uuid (set only on acceptance); `currency_id` uuid; `total_amount` numeric(24,4) nullable; `valid_until` timestamptz nullable; `submitted_at`, `accepted_at`, `closed_at` timestamptz nullable; `version` integer; `created_at`, `updated_at` | `rfq_id + buyer_company_id` to `rfqs(id, company_id)`; `company_id` to `companies`; `currency_id` to `currencies`; has many `quotation_revisions`; `accepted_revision_id` to one revision of the same quotation; at most one `deals` row per quotation |
| `quotation_revisions` | One numbered version of the commercial offer. Submitted revisions are immutable. | `id`; `quotation_id`; `company_id` (supplier); `revision_no` integer (1, 2, 3 ...); `status` text enum (`draft`, `submitted`); `currency_id` uuid (required); `total_amount` numeric(24,4) nullable; `valid_until` timestamptz nullable; `supplier_notes` text nullable; `created_by_user_id`; `submitted_at` timestamptz nullable; `created_at` | to `quotations(id, company_id)`; has many items, terms (one), certifications, attachments |
| `quotation_items` | One priced line of a revision. One line per RFQ item. | `id`; `revision_id`; `company_id`; `rfq_item_id` uuid (required, must belong to the quotation's RFQ); `description` text nullable; `unit_price` numeric(20,4) (>= 0); `quantity` numeric(20,6) (> 0); `uom_id` uuid (required); `total_price` numeric(24,4) **generated** = round(quantity * unit_price, 4); `moq` numeric(20,6) nullable (> 0 if set); `lead_time_days` smallint nullable (0 to 730); `hs_code_id` uuid nullable; `origin_country_id` uuid nullable; `created_at` | to `quotation_revisions`; to `rfq_items`; to `units_of_measure`; to `hs_codes`; to `countries`; has many `quotation_specifications` |
| `quotation_specifications` | Technical values for one quotation line. | `id`; `quotation_item_id`; `company_id`; `definition_id` uuid nullable (catalog definition); `custom_name` text nullable; `value_text` text; `value_number` numeric(24,8); `value_boolean` boolean; `value_min` numeric(24,8); `value_max` numeric(24,8); `uom_id` uuid nullable | to `quotation_items`; to `product_specification_definitions`; to `units_of_measure` |
| `quotation_terms` | Commercial terms of one revision. One row per revision (the primary key is `revision_id`). | `revision_id` uuid (PK); `company_id`; `incoterm_id` uuid nullable; `incoterm_named_place` text nullable; `port_of_loading_id` uuid nullable; `delivery_place` text nullable; `payment_term_id` uuid nullable; `payment_term_notes` text nullable; `packaging_type_id` uuid nullable; `packaging_notes` text nullable; `shipment_mode_id` uuid nullable; `warranty_terms` text nullable; `created_at` | to `quotation_revisions`; to `incoterms`, `ports`, `payment_terms`, `packaging_types`, `shipment_modes` |
| `quotation_certifications` | Certifications offered with a revision. | `id`; `revision_id`; `company_id`; `certification_id` uuid (required); `certificate_number` text nullable; `file_id` uuid nullable | to `quotation_revisions`; to `certifications`; to `files` (must belong to the supplier); unique per (`revision_id`, `certification_id`) |
| `quotation_attachments` | Files attached to a revision (for example a technical sheet). | `id`; `revision_id`; `company_id`; `file_id` uuid (required, globally unique in this table); `title` text (required); `created_at` | to `quotation_revisions`; to `files` (must belong to the supplier) |
| `quotation_status_history` | Append-only log of every status change of a quotation. | `id`; `quotation_id`; `company_id`; `from_status` text nullable (null on creation); `to_status` text; `actor_company_id` uuid; `actor_user_id` uuid nullable; `reason` text nullable (not written by the trigger, see J.5.5); `created_at` | to `quotations`; to `companies`; to `users` |
| `negotiation_events` | Append-only negotiation timeline between the two parties. | `id`; `quotation_id`; `company_id` (supplier tenant); `actor_company_id` uuid; `actor_user_id` uuid; `event_type` text enum (J.4); `from_revision_no` integer nullable; `to_revision_no` integer nullable; `message` text nullable; `created_at` | to `quotations`; to `companies`; to `users` |
| `quotation_comparisons` | Buyer's private working comparison of quotations for one RFQ. | `id`; `rfq_id`; `company_id` (buyer, private); `name` text (required); `created_by_user_id`; `created_at`; `updated_at` | to `rfqs(id, company_id)`; has many entries |
| `quotation_comparison_entries` | One quotation (at one specific revision) inside a comparison. | `id`; `comparison_id`; `company_id` (buyer); `quotation_id`; `revision_id` (the exact revision compared); `rank` smallint nullable; `notes` text nullable | to `quotation_comparisons(id, company_id)`; to `quotations`; to `quotation_revisions`; unique per (`comparison_id`, `quotation_id`) |

#### J.3.2 Constraints the UI must respect (from CHECK constraints and triggers)

- `quotations`: one live quotation per supplier per RFQ; at most one `accepted` quotation per RFQ; `accepted` if and only if `accepted_revision_id` and `accepted_at` are both set; a non-draft quotation has `submitted_at` set; `total_amount` >= 0; supplier and buyer must be different companies.
- `quotation_revisions`: `revision_no` >= 1; numbers are sequential per quotation (next number = highest + 1); at most one `draft` revision per quotation (partial unique index); `submitted` if and only if `submitted_at` is set; `total_amount` >= 0.
- `quotation_items`: `unit_price` >= 0; `quantity` > 0; `moq` null or > 0; `lead_time_days` null or between 0 and 730; one line per RFQ item per revision.
- `quotation_specifications`: must name the specification by `definition_id` or `custom_name` (or both); exactly one value shape: `value_text`, or `value_number`, or `value_boolean`, or a range (`value_min` and/or `value_max`). When `definition_id` is set, a trigger checks the value against the definition. Required value by `data_type`: `text` needs `value_text`; `enum` needs `value_text` and it must be one of the definition's `allowed_values`; `boolean` needs `value_boolean`; `number` needs `value_number` within `min_value`/`max_value`; `range` needs `value_min` and/or `value_max` within the bounds. Values outside these rules are rejected.
- `quotation_terms`: if `incoterm_id` is set, then `incoterm_named_place` or `port_of_loading_id` must also be set.
- `quotation_comparison_entries` and `negotiation_events`: `event_type` is a closed list (J.4).

### J.4 Enumerations (verbatim)

| Enum | Values |
|---|---|
| `quotations.status` (`QUOTATION_STATUS`) | `draft`, `submitted`, `under_negotiation`, `accepted`, `rejected`, `withdrawn`, `expired`, `superseded` |
| Live statuses (`OPEN_QUOTATION_STATUSES`) | `draft`, `submitted`, `under_negotiation`, `accepted` |
| `quotation_revisions.status` (`REVISION_STATUS`) | `draft`, `submitted` |
| `negotiation_events.event_type` (`NEGOTIATION_EVENT_TYPES`) | `counter_offer`, `clarification_request`, `clarification_response`, `revision_submitted`, `accept_intent`, `decline`, `note` |
| `product_specification_definitions.data_type` (used by `quotation_specifications` through `definition_id`) | `text`, `number`, `boolean`, `enum`, `range` |
| `quotation_status_history.from_status` / `to_status` | same as `quotations.status` |
| Conversation type linked to a quotation (module L, referenced only) | `conversations.conversation_type` = `quotation` with `quotation_id` set |

### J.5 State machines

#### J.5.1 Quotation status

```
(new) -Q1-> draft -Q2-> submitted -Q3-> under_negotiation
              |            |  |                |
              |            |  +--Q4 reject / Q5 accept / Q6 withdraw--+
              |            +-----Q4 / Q5 / Q6-------------------------+
              +--Q6 withdraw--+                                       |
                              v                                       v
               rejected | accepted | withdrawn   (final; no further change)

expired, superseded: enum values only; no transition is defined in the sources.
```

Rules as enforced by the trigger `guard_quotation` (0003) and by RLS (0005). The table lists every allowed transition. Q4 and Q5 start only from `submitted` or `under_negotiation`; Q6 starts from `draft`, `submitted` or `under_negotiation`.

| # | From | To | Who acts (permission) | Condition enforced | What changes |
|---|---|---|---|---|---|
| Q1 | (new) | `draft` | Supplier (`quotation.create`) | Eligibility (0.3); status must start as `draft`; `accepted_revision_id` must be null; `created_by_user_id` set to the acting user | `reference_no` assigned; history row written |
| Q2 | `draft` | `submitted` | Supplier (`quotation.submit`) | `current_revision_no` must point to a revision with status `submitted`; eligibility (0.3) still holds at submit time | `total_amount`, `currency_id`, `valid_until` copied from the current revision; `submitted_at` = now |
| Q3 | `submitted` | `under_negotiation` | Buyer (`quotation.accept` on the update) | Only from `submitted` | Status and history only |
| Q4 | `submitted`, `under_negotiation` | `rejected` | Buyer (`quotation.accept`) | Only from these two | `closed_at` = now |
| Q5 | `submitted`, `under_negotiation` | `accepted` | Buyer (`quotation.accept`) | (a) RFQ `status` must be `published` (RFQ row locked); (b) `valid_until` is null or later than now; (c) `accepted_revision_id` must be the latest submitted revision, and its `revision_no` must equal `current_revision_no`; (d) unique index: no other accepted quotation for the same RFQ | `total_amount`, `currency_id`, `valid_until` copied from the accepted revision; `accepted_at` = now; `closed_at` = now; `accepted_revision_id` set (cannot be set by any other action) |
| Q6 | `draft`, `submitted`, `under_negotiation` | `withdrawn` | Supplier (`quotation.submit`) | Only the supplier | `closed_at` = now |
| Q7 | live status | same status, new revision | Supplier (`quotation.submit` on the quotation row) | Commercial figures change only by moving `current_revision_no` up by exactly 1 to a revision that is `submitted`. In `draft`, figures may be edited directly, and are overwritten on Q2. | Status does not change |

Final statuses: `accepted`, `rejected`, `withdrawn`, `expired`, `superseded`. The trigger rejects every change from these ("quotation is final"). Transitions not listed above are rejected for the acting party.

Not defined in sources: which actor or job sets `expired` or `superseded`. The database only checks validity at acceptance (Q5 b). The worker role bypasses the guard, but no sweep or supersede rule is written.

After a quotation is rejected, withdrawn, expired or superseded, the same supplier may open a new quotation for the same RFQ. This is allowed because those statuses are not live (partial unique index).

#### J.5.2 Revision lifecycle

| # | Step | Who (permission) | Rule enforced | Locks after |
|---|---|---|---|---|
| R1 | Create revision (status `draft`) | Supplier (`quotation.create`) | Quotation status must be `draft`, `submitted` or `under_negotiation`; `revision_no` = highest + 1 (first is 1); status must be `draft` on insert; at most one draft per quotation | Nothing yet |
| R2 | Edit draft: items, terms, specifications, certifications, attachments | Supplier (`quotation.create`) | Parent revision must be `draft` (checked under a row lock) | Locked when submitted |
| R3 | Submit revision | Supplier (`quotation.create` on the revision row) | Quotation still `draft`, `submitted` or `under_negotiation`; at least one `quotation_items` row; `total_amount` = sum of item `total_price`; `submitted_at` = now | **Frozen forever**: the revision, its items, specifications, terms, certifications and attachments can no longer be inserted, changed or deleted |
| R4 | Delete revision | Supplier | Only while `draft`. Submitted revisions can never be deleted | n/a |
| R5 | Accept revision | Buyer (see Q5) | Must be the latest submitted revision and equal to `current_revision_no` | Quotation becomes `accepted`; the revision is the agreed one |

Each submitted revision is a frozen snapshot. The buyer can read only submitted revisions. Draft revisions are visible only to the supplier.

#### J.5.3 Negotiation timeline

- Append-only. Rows are inserted by either party. Nothing is updated or deleted.
- Insert rule: the actor's company is writable, `actor_user_id` is the acting user, and the quotation is visible to that company. No permission check is applied on insert.
- Event types are the seven values in J.4. A message (`message`) is optional. `from_revision_no` and `to_revision_no` are optional and are used when a revision moves.
- Not defined in sources: no trigger writes negotiation events. Which UI action creates which event type is an application decision (the application layer is not built).
- Read pagination follows the index on (`quotation_id`, `created_at` descending, `id`).

#### J.5.4 Quotation comparison (buyer only)

- A comparison belongs to one RFQ and one buyer company (`quotation_comparisons`). It has a required `name`.
- Entries reference a quotation and the exact revision compared (`revision_id`). Each quotation appears at most once per comparison.
- Entries can be ranked (`rank`, smallint, optional) and annotated (`notes`).
- Read: buyer company only. Insert, update, delete: `rfq.manage`.
- Stored fields: none computed. The sources define no comparison score or formula. Comparison columns are read from the pinned revision: `total_amount`, `currency_id`, `valid_until` (`quotation_revisions`); line data (`quotation_items`: `unit_price`, `quantity`, `moq`, `lead_time_days`, `uom_id`); terms (`quotation_terms`); certifications (`quotation_certifications`).
- Buyers see only non-draft quotations, so only those can be added.

#### J.5.5 Quotation status history

- Written by a trigger on every insert and status change. Fields: from, to, actor company, actor user, time.
- `reason` exists in the table but the trigger does not fill it. Not defined in sources how a rejection reason is captured on the quotation. The only free-text field on the timeline is `negotiation_events.message` (event type `decline`).

### J.6 Visibility and access (who sees what)

| Object | Supplier (quotation company) | Buyer (RFQ owner) |
|---|---|---|
| `quotations` | All statuses, own rows | Only where `status` is not `draft` |
| `quotation_revisions` | All, own rows | Only `submitted` revisions of visible quotations |
| `quotation_items`, `quotation_specifications`, `quotation_terms`, `quotation_certifications`, `quotation_attachments` | Own rows | Rows of visible (submitted) revisions |
| `quotation_status_history` | Quotations visible to the company | Same |
| `negotiation_events` | Quotations visible to the company | Same |
| `quotation_comparisons`, `quotation_comparison_entries` | Not visible | Own rows only |

Supplier writes need `quotation.create` (drafts, revisions, items, terms, certifications, attachments) and `quotation.submit` (quotation row updates: submit, revise, withdraw). Buyer updates on a quotation need `quotation.accept` (moving to `under_negotiation`, `rejected`, `accepted`).

### J.7 Screens and data (module J)

#### J.7.1 Quotation builder (supplier)

Purpose: prepare a draft, revise it, submit it.

Header:
- `reference_no` (read-only), RFQ identity (from `rfq_id`), buyer company, `status` badge, `current_revision_no`, revision selector (all revisions, `revision_no` and `status`), `valid_until`, `version` (hidden, sent on save).

Line items (one row per RFQ item; `rfq_item_id` is required):
- `description`, `quantity`, `uom_id`, `unit_price`, `total_price` (computed and read-only: quantity * unit_price rounded to 4 decimals), `moq`, `lead_time_days` (0 to 730), `hs_code_id`, `origin_country_id`.
- Specifications under each line: pick a `definition_id` (catalog definition, shows `data_type` and bounds) or enter `custom_name`; `uom_id` optional; one value field by data type: text, number, boolean, enum choice, or range (`value_min` and/or `value_max`).
- Revision total: sum of `total_price` (computed on submit; show as a preview).

Commercial terms (one set per revision):
- `incoterm_id`; `incoterm_named_place` and `port_of_loading_id` (one of these is required when an Incoterm is set); `delivery_place`; `payment_term_id`; `payment_term_notes`; `packaging_type_id`; `packaging_notes`; `shipment_mode_id`; `warranty_terms`.
- `currency_id` (required per revision) and `valid_until` (optional).
- `supplier_notes` (on the revision).

Certifications (repeatable, one per certification per revision): `certification_id` (required), `certificate_number`, `file_id` (supplier's file).

Attachments (repeatable): `file_id` (required, one attachment per file), `title` (required).

Actions and their states:
- Save draft: edits the draft revision. Allowed while quotation is `draft`, `submitted` or `under_negotiation`.
- Submit revision: R3. Shows that the revision is frozen after this action. At least one item required.
- Submit quotation (first time): Q2. Only when the current revision is submitted. Shows the copied total, currency and validity.
- Submit next revision (live quotation): submits the new revision and moves `current_revision_no` up by one (Q7). Status does not change.
- Withdraw: Q6. Allowed from `draft`, `submitted`, `under_negotiation`.
- Read-only state: after a revision is submitted, its screen is read-only. A live quotation cannot edit a submitted revision.

#### J.7.2 Supplier quotation inbox

- List of own quotations (all statuses). Columns: `reference_no`, RFQ, buyer company, `status`, `current_revision_no`, `total_amount` with currency, `valid_until`, `submitted_at`, `accepted_at`, `closed_at`.
- Filter by `status` (all eight values) and by RFQ.
- Row actions: open builder (draft or live), withdraw, view negotiation thread.
- Expiry display: `valid_until` in the past on a `submitted` or `under_negotiation` quotation means the buyer cannot accept it (Q5 b). Showing it as expired is a UI choice; the database status does not change.

#### J.7.3 Buyer RFQ quotation inbox

- Quotations received for one RFQ (`rfq_id`). Only non-draft quotations are returned.
- Columns: supplier company, `reference_no`, `status`, `current_revision_no`, `total_amount` with currency, `valid_until`, `submitted_at`.
- Filters by `status`. Quick actions: open, add to comparison, open negotiation thread.

#### J.7.4 Quotation comparison table (buyer)

- Header: comparison `name`, RFQ, count of entries, created and updated time.
- Entries (one row per quotation): supplier company, `reference_no`, pinned revision number, `total_amount`, `currency_id`, `valid_until`, incoterm and payment term (from terms), lead time and MOQ per line, certifications, `rank` (editable), `notes` (editable).
- Actions: create comparison (name), add or remove a quotation, set rank and notes. Permission: `rfq.manage`.
- Note: each entry is pinned to one `revision_id`. The sources define no rule that updates an entry when a newer revision is submitted.

#### J.7.5 Quotation detail (read-only view, both parties)

- Header: `reference_no`, `status`, RFQ, parties, `submitted_at`, `accepted_at`, `closed_at`, `valid_until`, `total_amount` with currency.
- Revision switcher: visible revisions only (buyer: submitted revisions). Each revision shows `revision_no`, `submitted_at`, `supplier_notes`, `total_amount`, `valid_until`.
- Per revision: items table, specifications, terms, certifications (with file link), attachments (title and file link).
- Status timeline: from `quotation_status_history` (from, to, actor company, actor user, time).

#### J.7.6 Negotiation thread

- Timeline of `negotiation_events`, newest first, cursor pagination.
- Each entry shows: `event_type`, actor company and user, `from_revision_no` to `to_revision_no` (when set), `message`, time.
- Composer: `event_type` (seven values), `message` (optional), `from_revision_no`, `to_revision_no` (optional). Available to both parties while the quotation is visible to them.
- The thread is append-only: no edit, no delete.
- Link to the messaging conversation of type `quotation` (module L, not described here).

#### J.7.7 Accept flow (buyer)

Available when status is `submitted` or `under_negotiation`.

Data shown before the action:
- Revision to accept: the latest submitted revision (`revision_no`, `total_amount`, `currency_id`, `valid_until`).
- Items, specifications, terms (incoterm, named place or port of loading, delivery place, payment term, packaging, shipment mode, warranty), certifications, attachments.
- Blocking messages from the database rules: RFQ no longer `published`; `valid_until` has passed; a newer revision exists than the one shown; another quotation for the same RFQ is already accepted.

Action: accept (Q5). On success: quotation `accepted`, `accepted_at` and `closed_at` set, and the accepted revision is frozen.

Open points in sources (designer must decide, do not assume):
- Other live quotations for the same RFQ are not changed by acceptance. No trigger rejects or closes them.
- RFQ `status` is not set to `awarded` by the quotation database rules (`DATABASE_DESIGN.md` item 3). `SYSTEM_ARCHITECTURE.md` section 5 says the RFQ is awarded by a `quotation.accepted.v1` event.
- Deal creation timing: see K.5.1.

#### J.7.8 Reject and withdraw

- Reject (buyer): from `submitted` or `under_negotiation`. Writes `closed_at`. No reason field on the quotation; a reason can only be written as a `decline` event with a `message` in the negotiation timeline.
- Withdraw (supplier): from `draft`, `submitted` or `under_negotiation`. Writes `closed_at`.

---

## MODULE K: Deals and deal room

### K.1 Purpose (product language)

When a buyer accepts a quotation, the agreed terms become a deal between the buyer and the supplier. The deal is a shared workspace (the deal room). The parties track status, milestones, shipments, documents with versions, confirmations of each step, a cancellation request if needed, and a dispute if needed. A deal stores an immutable copy of the agreed terms and items. "Completed" means the parties closed the deal commercially. It never records a payment.

### K.2 Owner and status

- Owner service: **deal** (`ARCHITECTURE_ASSESSMENT` section 4 lists these 14 tables for it). Reviews and reputation (module M) are also assigned to this service but are not described here.
- Status: **designed, not yet implemented.** The tables exist as SQL migrations in `backend/`. No service, API or UI is built.

### K.3 Entities

#### K.3.1 Entity table

| Table | What it represents | Key columns (exact names and types) | Relations |
|---|---|---|---|
| `deals` | The deal created from one accepted quotation. | `id`; `reference_no` text (DEAL-...); `quotation_id` uuid (unique: one deal per quotation); `accepted_revision_id` uuid (the snapshot revision); `rfq_id` uuid; `buyer_company_id`; `supplier_company_id`; `status` text enum (K.4); `currency_id`; `total_amount` numeric(24,4); `agreed_at` timestamptz (default now); `completed_at` timestamptz nullable; `cancelled_at` timestamptz nullable; `version` integer; `created_at`; `updated_at` | to `quotations`; to `quotation_revisions` (same quotation); to `rfqs`; to `companies` (buyer and supplier); to `currencies`; has many child rows below |
| `deal_parties` | Which companies are in the deal, and in what role. | `id`; `deal_id`; `company_id`; `party_role` text enum (K.4); `added_by_user_id` nullable; `created_at` | to `deals`; to `companies`; unique per (`deal_id`, `company_id`) |
| `deal_terms` | Immutable snapshot of the agreed commercial terms (one row per deal; PK `deal_id`). | `deal_id` (PK); `incoterm_id`; `incoterm_named_place`; `port_of_loading_id`; `delivery_place`; `payment_term_id`; `payment_term_notes`; `packaging_type_id`; `shipment_mode_id`; `warranty_terms`; `valid_until` timestamptz nullable; `created_at` | to `deals`; to `incoterms`, `ports`, `payment_terms`, `packaging_types`, `shipment_modes` |
| `deal_items` | Immutable snapshot of the agreed line items. | `id`; `deal_id`; `line_no` smallint (unique per deal); `rfq_item_id` uuid nullable; `description` text (required); `quantity` numeric(20,6) (> 0); `uom_id` uuid; `unit_price` numeric(20,4) (>= 0); `total_price` numeric(24,4) (= round(quantity * unit_price, 4)); `hs_code_id` nullable; `origin_country_id` nullable | to `deals`; to `rfq_items`, `units_of_measure`, `hs_codes`, `countries` |
| `deal_documents` | A named document in the deal room (contract, invoice, packing list and so on). Versions are separate rows. | `id`; `deal_id`; `document_type` text enum (K.4); `title` text; `status` text enum (`draft`, `active`, `superseded`, default `active`); `created_by_company_id`; `created_by_user_id`; `created_at`; `updated_at` | to `deals`; to `companies`, `users`; has many versions |
| `deal_document_versions` | Append-only version of a document. The file itself never changes. | `id`; `document_id`; `deal_id`; `version_no` integer (>= 1; unique per document); `file_id` uuid (unique in this table); `uploaded_by_company_id`; `uploaded_by_user_id`; `note` text nullable; `created_at` | to `deal_documents(id, deal_id)`; to `files` (must belong to the uploading company) |
| `deal_milestones` | A planned step of the deal (production, inspection, shipment and so on). | `id`; `deal_id`; `milestone_type` text enum (K.4); `title` text; `due_date` date nullable; `status` text enum (K.4, default `pending`); `responsible_company_id` uuid (required); `completed_at` timestamptz nullable; `created_at`; `updated_at` | to `deals`; to `companies` |
| `deal_milestone_events` | Append-only log of changes to a milestone. | `id`; `milestone_id`; `deal_id`; `event_type` text (free text, no CHECK); `actor_company_id`; `actor_user_id`; `note` text nullable; `created_at` | to `deal_milestones(id, deal_id)`; to `companies`, `users` |
| `deal_activity_events` | Append-only activity feed of the deal room. | `id`; `deal_id`; `actor_company_id` nullable; `actor_user_id` nullable; `event_type` text (free text); `summary` text (required); `resource_type` text nullable; `resource_id` uuid nullable (points to the changed object); `created_at` | to `deals`; to `companies`, `users` |
| `deal_status_history` | Append-only log of deal status changes. | `id`; `deal_id`; `from_status` text nullable; `to_status` text; `actor_company_id` nullable; `actor_user_id` nullable; `reason` text nullable (not written by the trigger); `created_at` | to `deals`; to `companies`, `users` |
| `deal_confirmations` | One party's confirmation of a deal step. Append-only in practice (no update or delete grant). | `id`; `deal_id`; `company_id`; `confirmation_type` text enum (K.4); `confirmed_by_user_id`; `note` text nullable; `confirmed_at` timestamptz; unique per (`deal_id`, `company_id`, `confirmation_type`) | to `deals`; to `companies`, `users` |
| `deal_cancellations` | A request to cancel the deal, answered by the other party. | `id`; `deal_id`; `requested_by_company_id`; `requested_by_user_id`; `reason` text (required); `status` text enum (K.4, default `requested`); `responded_by_company_id` nullable; `responded_at` timestamptz nullable; `created_at` | to `deals`; to `companies`, `users`; at most one `requested` row per deal (partial unique index) |
| `deal_disputes` | A formal problem raised by one party, reviewed by platform support. | `id`; `deal_id`; `raised_by_company_id`; `raised_by_user_id`; `category` text enum (K.4); `description` text (required); `status` text enum (K.4, default `open`); `resolution` text nullable; `resolved_at` timestamptz nullable; `created_at`; `updated_at` | to `deals`; to `companies`, `users` |
| `deal_shipments` | A shipment for the deal. A deal can have several. | `id`; `deal_id`; `carrier` text nullable; `tracking_reference` text nullable; `bill_of_lading_no` text nullable; `port_of_loading_id` nullable; `port_of_discharge_id` nullable; `etd` date nullable; `eta` date nullable (etd must be on or before eta when both set); `added_by_company_id`; `created_at`; `updated_at` | to `deals`; to `ports` (loading and discharge); to `companies` |

#### K.3.2 Constraints the UI must respect

- `deals`: one deal per quotation; `buyer_company_id` and `supplier_company_id` must differ; `status` = `completed` if and only if `completed_at` is set; `status` = `cancelled` if and only if `cancelled_at` is set; `total_amount` >= 0; `quotation_id` must match the supplier and buyer of the quotation.
- `deal_milestones`: `status` = `completed` if and only if `completed_at` is set.
- `deal_shipments`: etd <= eta when both are set.
- `deal_cancellations`: the responding company must not be the requesting company.
- `deal_items`: `total_price` = round(quantity * unit_price, 4).
- `deal_parties`: role is one of the four values in K.4.

### K.4 Enumerations (verbatim)

| Enum | Values |
|---|---|
| `deals.status` (`DEAL_STATUS`) | `active`, `in_production`, `shipped`, `delivered`, `completed`, `cancelled`, `disputed` |
| `deal_parties.party_role` (`DEAL_PARTY_ROLES`) | `buyer`, `seller`, `agent`, `observer` |
| `deal_documents.document_type` (`DEAL_DOCUMENT_TYPES`) | `purchase_order`, `contract`, `proforma_invoice`, `commercial_invoice`, `packing_list`, `product_specification`, `bill_of_lading`, `certificate`, `inspection_report`, `other` |
| `deal_documents.status` | `draft`, `active`, `superseded` |
| `deal_milestones.milestone_type` (`MILESTONE_TYPES`) | `production_start`, `production_complete`, `inspection`, `shipment`, `customs_clearance`, `delivery`, `custom` |
| `deal_milestones.status` (`MILESTONE_STATUS`) | `pending`, `in_progress`, `completed`, `delayed`, `skipped` |
| `deal_confirmations.confirmation_type` (`CONFIRMATION_TYPES`) | `terms_agreed`, `goods_dispatched`, `goods_received`, `completion` |
| `deal_cancellations.status` (`CANCELLATION_STATUS`) | `requested`, `accepted`, `rejected`, `withdrawn` |
| `deal_disputes.category` (`DISPUTE_CATEGORIES`) | `quality`, `quantity`, `delivery`, `documents`, `payment`, `other` |
| `deal_disputes.status` | `open`, `under_review`, `resolved`, `closed` |
| `deal_activity_events.event_type`, `deal_milestone_events.event_type` | Free text. No list is defined in sources. |

### K.5 State machines and rules

#### K.5.1 Deal creation (from an accepted quotation)

Who: the **buyer** (writable company = buyer) with `quotation.accept`. The deal, its terms, its items and its two party rows are written in one transaction.

Preconditions enforced by `guard_deal` and `verify_deal_snapshot` (0003):
- The quotation must be `accepted`.
- `deals.buyer_company_id` = the active buyer; `supplier_company_id` = quotation supplier; `rfq_id`, `accepted_revision_id`, `currency_id`, `total_amount` must equal the quotation and its accepted revision.
- At commit: `deal_terms` must equal the accepted revision's terms on incoterm, named place, port of loading, delivery place, payment term, payment term notes, packaging type, shipment mode and warranty terms. Note: `packaging_notes` is not copied into the deal.
- At commit: `deal_items` must equal the accepted revision's items on `rfq_item_id`, `quantity`, `uom_id` and `unit_price`, with no extras and no missing lines. Sum of `deal_items.total_price` = `deals.total_amount`.
- At commit: exactly two `deal_parties` rows (buyer and seller).
- One deal per quotation (unique).
- Snapshot rows (`deal_terms`, `deal_items`, `deal_parties`) can only be written in the transaction that creates the deal.
- Initial `status` = `active`; `agreed_at` = now.

Conflict to resolve in design: the schema (`deals.ts`, `guard_deal`) creates the deal in a buyer transaction that runs after the quotation is accepted. `SYSTEM_ARCHITECTURE.md` section 6 says the deal is created by the deal service asynchronously from `quotation.accepted.v1`, which means a short period where the quotation is accepted and the deal does not yet exist. No state for "deal pending" is defined.

#### K.5.2 Deal status

```
active -> in_production -> shipped -> delivered -> completed   (final)

active, in_production, shipped, delivered -> disputed
disputed -> active | in_production | shipped | delivered | cancelled
active, in_production, shipped, disputed -> cancelled          (final; needs an accepted cancellation)
```

Allowed transitions (enforced by `guard_deal`):

| From | To |
|---|---|
| `active` | `in_production`, `shipped`, `disputed`, `cancelled` |
| `in_production` | `shipped`, `disputed`, `cancelled` |
| `shipped` | `delivered`, `disputed`, `cancelled` |
| `delivered` | `completed`, `disputed` |
| `disputed` | `active`, `in_production`, `shipped`, `delivered`, `cancelled` |
| `completed`, `cancelled` | none (final: "deal is final") |

Conditions:
- To `completed`: completion confirmations (`deal_confirmations.confirmation_type` = `completion`) must exist from **both** the buyer company and the supplier company. Then `completed_at` = now.
- To `cancelled`: an accepted cancellation (`deal_cancellations.status` = `accepted`) must exist for the deal. Then `cancelled_at` = now.
- Who: any party company with `deal.manage` (RLS: deal party and `can(deal.manage)`). The database does not distinguish buyer from supplier for any status change.
- Not defined in sources: the database does not check the timing or evidence of `in_production`, `shipped`, `delivered` or `disputed`. The UI has no database check to show these as "reached".

Immutable on the deal row at all times: `quotation_id`, `accepted_revision_id`, `rfq_id`, `buyer_company_id`, `supplier_company_id`, `currency_id`, `total_amount`, `reference_no`, `agreed_at`. Only `status`, `completed_at`, `cancelled_at`, `version`, `updated_at` change.

Each status change writes a `deal_status_history` row (from, to, actor company, actor user, time). `reason` is not filled by the trigger.

#### K.5.3 Confirmations (both parties)

- Four step types: `terms_agreed`, `goods_dispatched`, `goods_received`, `completion`.
- Each company records each type once per deal (unique). A confirmation cannot be edited or deleted.
- Who: a user with `deal.confirm` in the writable company. The deal must be visible to the company (party).
- Effect in the database: only `completion` is checked. A deal cannot move to `completed` until both parties have a `completion` row. The other three types are stored with no database rule on status or other rows.
- Not defined in sources: whether confirmations must come in a set order, and whether they can be recorded in any deal status (the database has no status check on insert).

Lock: none beyond uniqueness. A confirmed step is a permanent row. Corrections are new documents or activity entries, not edits.

#### K.5.4 Cancellation request

| Step | Who (permission) | Rule enforced by `guard_deal_cancellation` and RLS |
|---|---|---|
| Request | Either party company (`deal.manage`) | Inserted with `status` forced to `requested`; `requested_by_company_id` = active company; `requested_by_user_id` = acting user; `reason` required. Only one `requested` row per deal. |
| Accept or reject | **Counterparty only** (the other company, `deal.manage`) | Sets `status` to `accepted` or `rejected`; sets `responded_by_company_id` and `responded_at`. The requester cannot respond to its own request. |
| Withdraw | **Requester only** | Sets `status` to `withdrawn`; clears the response fields. |
| Final | - | Once not `requested`, the row cannot change ("cancellation request is final"). |

Effect on the deal: a deal moves to `cancelled` only when an `accepted` cancellation exists. A request, a rejection or a withdrawal does not change the deal status. Immutable columns: `deal_id`, `requested_by_company_id`, `requested_by_user_id`, `reason`. Updatable: `status`, `responded_by_company_id`, `responded_at`.

#### K.5.5 Disputes

- Raise: a party with `deal.manage`. Fields: `category` (6 values), `description` (required). Starts as `open`. Stored with `raised_by_company_id` and `raised_by_user_id`.
- Read: both parties, and platform administrators with the `support` role (`is_platform_admin('support')`).
- Review and resolution: platform administrators with `support` only (RLS update). The update grant covers the whole row (no column restriction in `0005`), and no trigger validates dispute changes. The fields the sources name for resolution are `status`, `resolution`, `resolved_at`.
- Status values: `open`, `under_review`, `resolved`, `closed`. Not defined in sources: the allowed order between these values. The database has no transition rule for disputes.
- Not defined in sources: whether raising a dispute changes the deal status. The deal status `disputed` is set by a party with `deal.manage` and is not linked to any dispute row by the database.
- No delete is granted.

Dispute lifecycle as far as the sources define it:

| Step | Actor | Result |
|---|---|---|
| Raise | Party | Row with status `open`; deal may be moved to `disputed` by a party |
| Review | Platform support | Status `under_review` (value exists; sequence not defined) |
| Resolve | Platform support | Status `resolved`, `resolution` text and `resolved_at` set |
| Close | Platform support | Status `closed` |

#### K.5.6 Milestones

- Fields: `milestone_type` (7 values), `title`, `due_date` (optional), `status` (5 values, default `pending`), `responsible_company_id` (required), `completed_at`.
- Rule: `completed_at` is set if and only if `status` = `completed`.
- Who: a party with `deal.manage` creates and updates (`title`, `due_date`, `status`, `completed_at` are the updatable columns). No delete.
- Each change should write a `deal_milestone_events` row (append-only; `event_type` free text, `note` optional, actor company and user). Not defined in sources: which change produces which event type.
- Not defined in sources: any order of status transitions for milestones (no trigger).

#### K.5.7 Documents and versions

- A document has `document_type` (10 values), `title`, `status` (`draft`, `active`, `superseded`; default `active`). Updatable: `title`, `status` (party with `deal.manage`). No delete.
- A version (`deal_document_versions`) is a new row with `version_no`, `file_id`, `note`, uploader company and user. The version row cannot change or be deleted. Unique (`document_id`, `version_no`) and unique `file_id`.
- The file must belong to the uploading company (composite key with `files`).
- Not defined in sources: a rule that `version_no` starts at 1 or increases by 1 (the database enforces only `version_no` >= 1 and uniqueness). Not defined: how `status` `superseded` is set (the document status is updatable by a party; no trigger links it to versions).

#### K.5.8 Shipments

- Any number of shipments per deal. Fields: `carrier`, `tracking_reference`, `bill_of_lading_no`, `port_of_loading_id`, `port_of_discharge_id`, `etd`, `eta`.
- Rule: `etd` <= `eta` when both are set.
- Who: party with `deal.manage` (insert and update). No delete.
- Not defined in sources: a shipment status field.

#### K.5.9 Parties

- Created only in the deal-creation transaction (K.5.1): one `buyer` row and one `seller` row.
- The CHECK allows `agent` and `observer`, but the database refuses any party insert after creation (snapshot guard). With the rules as written, no screen can add an agent or observer.
- Not defined in sources: whether agents or observers are a future feature.

#### K.5.10 Activity feed and status history

- `deal_activity_events`: append-only, written by parties (active company) and by the worker. `summary` is required; `resource_type` and `resource_id` point to the changed object (optional). Read by party companies. Cursor pagination on (`deal_id`, `created_at` descending, `id` descending).
- `deal_status_history`: written by a trigger on every status change; append-only.
- Not defined in sources: the list of `event_type` values for the activity feed.

#### K.5.11 What the database locks after a deal is final

- The deal row: all agreed-term columns (K.5.2) are immutable from creation. `status` is final when `completed` or `cancelled`.
- Snapshot rows (`deal_terms`, `deal_items`) and `deal_parties`: immutable from creation.
- Not locked by the database after `completed` or `cancelled`: documents, versions (append-only anyway), milestones, shipments, confirmations (insert allowed), activity events, disputes, cancellation rows (their own final rule applies). The database does not check deal status for these tables. Designers must state the post-completion behaviour explicitly.

### K.6 Visibility and access

| Object | Party companies (buyer and supplier) | Platform support |
|---|---|---|
| `deals`, `deal_terms`, `deal_items`, `deal_parties` (read) | Yes | No rule |
| `deal_documents`, `deal_document_versions`, `deal_milestones`, `deal_milestone_events`, `deal_shipments`, `deal_activity_events`, `deal_status_history`, `deal_confirmations`, `deal_cancellations` (read) | Yes | No rule |
| `deal_disputes` (read) | Yes | Yes (`support`) |
| `deal_disputes` (update) | No | Yes (`support`) |

Writes by party companies: `deal.manage` (documents, versions, milestones, shipments, cancellations, disputes, party rows at creation); `deal.confirm` (confirmations); `quotation.accept` (creation of the deal and its snapshot rows).

### K.7 Screens and data (module K)

#### K.7.1 Deal list (both parties)

- Columns: `reference_no`, counterparty (the other party company), `status`, `total_amount` with currency, `agreed_at`, next milestone (`due_date`, `status`), open cancellation or dispute indicator.
- Filters: `status` (7 values), date range on `agreed_at`.
- Rows are linked to the deal room. Visible: deals where the active company is buyer or supplier (or a deal party).

#### K.7.2 Deal creation (buyer, after acceptance)

- Shown when the quotation is `accepted` and the buyer has `quotation.accept`.
- Read-only summary of the accepted revision: items, totals, terms.
- Action: create deal (K.5.1). Result: `reference_no` assigned, `status` `active`, `agreed_at` set.
- Failure messages (from the database): quotation not accepted; deal total or currency does not match the revision; terms or items do not match; deal does not list exactly its buyer and seller.

#### K.7.3 Deal room (both parties)

Header:
- `reference_no`, `status` badge, buyer and supplier companies, `total_amount` with currency, `agreed_at`, `completed_at` or `cancelled_at` when set, link to the source quotation (`quotation_id`, `accepted_revision_id`) and RFQ (`rfq_id`).
- Status action buttons (K.5.2). Each button is shown only for its allowed next statuses. `completed` shows only when both completion confirmations exist. `cancelled` shows only when an accepted cancellation exists.

Tabs or sections:
- **Overview / terms**: `deal_terms` (read-only): incoterm, named place, port of loading, delivery place, payment term and notes, packaging type, shipment mode, warranty, `valid_until`. `deal_items` (read-only table): `line_no`, description, quantity, unit, unit price, total, HS code, origin country.
- **Timeline**: `deal_activity_events` (newest first, cursor pagination) with `summary`, actor company and user, time, link to the resource; plus `deal_status_history` entries.
- **Milestones**: list of `deal_milestones` (type, title, due date, status, responsible company, completed time). Create and edit (`title`, `due_date`, `status`, `completed_at`). Each milestone shows its `deal_milestone_events` history.
- **Documents**: list of `deal_documents` (type, title, status, latest version number). Detail: versions (`version_no`, file link, uploader company and user, `note`, time). Actions: create document (type, title, status), add version (file, note).
- **Shipments**: list of `deal_shipments` (carrier, tracking reference, bill of lading number, ports, etd, eta). Add or edit shipment (etd must not be after eta).
- **Confirmations**: four steps. For each step show each company's confirmation (`confirmed_at`, confirmed by user, `note`). Action: confirm (`deal.confirm`, one per company per step).
- **Cancellation**: current requested cancellation (requester, `reason`, status, responder and time). Actions: request cancellation (`reason`), accept or reject (counterparty only), withdraw (requester only).
- **Disputes**: list of `deal_disputes` (category, status, raised by, time, `resolution`, `resolved_at`). Action: raise dispute (`category`, `description`).
- **Parties**: the two party companies with roles (`buyer`, `seller`). No add action (K.5.9).

#### K.7.4 Support review of a dispute (platform administrators, `support`)

- Dispute detail: `category`, `description`, raised by, deal reference and status.
- Actions: set `status` (`under_review`, `resolved`, `closed`), enter `resolution`. `resolved_at` is set with the resolution (the sources do not state a trigger for it; the UI sets it).
- Not defined in sources: the sequence of these statuses and the fields required for each. Support can also set `status` to `open` (the enum allows it).

#### K.7.5 Cancellation response (counterparty)

- Shown to the company that did not request the cancellation.
- Shows `reason`, requester, request time.
- Actions: accept or reject. Both set the responder fields. After acceptance, the status `cancelled` becomes available to either party (K.5.2).

---

## 8. Quick reference of who can do what (summary)

| Action | Who | Permission | Database rule |
|---|---|---|---|
| Create quotation draft | Supplier | `quotation.create` | Eligibility (0.3) |
| Edit draft revision and its rows | Supplier | `quotation.create` | Only while revision is `draft` |
| Submit revision | Supplier | `quotation.create` | At least one item; total derived |
| Submit quotation (first time) | Supplier | `quotation.submit` | Current revision submitted |
| Revise a live quotation | Supplier | `quotation.submit` + `quotation.create` | Next revision number, submitted |
| Withdraw quotation | Supplier | `quotation.submit` | From `draft`, `submitted`, `under_negotiation` |
| Move to negotiation | Buyer | `quotation.accept` | From `submitted` only |
| Reject quotation | Buyer | `quotation.accept` | From `submitted`, `under_negotiation` |
| Accept quotation | Buyer | `quotation.accept` | RFQ `published`, valid, latest submitted revision, one per RFQ |
| Post negotiation event | Either party | none on insert (RLS: visibility and writable company) | Append-only |
| Create comparison, add or rank entries | Buyer | `rfq.manage` | Buyer company only |
| Create deal | Buyer | `quotation.accept` | Snapshot must match accepted revision |
| Change deal status | Either party | `deal.manage` | Transition table (K.5.2) |
| Record confirmation | Either party | `deal.confirm` | One per company per step |
| Request, withdraw, accept or reject cancellation | Party (role rules, K.5.4) | `deal.manage` | One open request per deal |
| Raise dispute | Either party | `deal.manage` | Starts `open` |
| Review or resolve dispute | Platform support | `is_platform_admin('support')` | No transition rule |
| Manage documents, versions, milestones, shipments | Either party | `deal.manage` | Versions append-only |

---

## 9. Open points in the sources (for the designer to resolve)

1. Acceptance does not close or reject other live quotations for the same RFQ (no trigger does this).
2. The RFQ is not set to `awarded` by the database when a quotation is accepted (`DATABASE_DESIGN.md` item 3). `SYSTEM_ARCHITECTURE.md` section 6 says the RFQ service awards the RFQ and closes it to new quotes on `quotation.accepted.v1`.
3. Deal creation timing: buyer transaction (schema) versus asynchronous creation from `quotation.accepted.v1` (`SYSTEM_ARCHITECTURE.md`). No "deal pending" state exists.
4. `expired` and `superseded` quotation statuses: no rule sets them.
5. Quotation rejection reason: no column; only `negotiation_events.message` with type `decline`.
6. Dispute status order and its link to deal status `disputed`: no rule.
7. Document version numbering: no sequence rule; `superseded` status not linked to versions.
8. Milestone and activity event type lists: not defined (free text).
9. Post-completion behaviour: child rows are not locked by deal status (K.5.11).
10. Agents and observers in deals: allowed by CHECK, but not writable after creation.
11. `quotation_comparison_entries.quotation_id` and `revision_id` are plain foreign keys (no tenant-composite key); the schema does not check that the revision belongs to the quotation. The reference lists them as plain foreign keys.
12. `deals.rfq_id` is checked on insert only (`DATABASE_DESIGN.md` item 8).
13. Quotation headline fields (`total_amount`, `currency_id`, `valid_until`) are copied from the revision on submit and accept, but are editable by the supplier while the quotation is `draft`.
14. Reviews (module M) after a completed deal are outside this document.
