# SAUDARO — Database Design

> Companion documents: [`DATABASE_REFERENCE.md`](./DATABASE_REFERENCE.md) (generated: every table, column, key, constraint, index and access rule), [`ERD.md`](./ERD.md), [`SECURITY_ARCHITECTURE.md`](./SECURITY_ARCHITECTURE.md), [`INDEXING_STRATEGY.md`](./INDEXING_STRATEGY.md), [`ARCHITECTURE_DECISIONS.md`](./ARCHITECTURE_DECISIONS.md).

## 1. Scope and shape

PostgreSQL 16+ (developed and tested on 18) is the single transactional primary. The schema has **155 tables** in 15 modules (A–O). It is normalized to roughly 3NF; deliberate denormalization is limited to
`companies.is_business_verified` (trigger-maintained badge), `quotations.total_amount`/`current_revision_no`, generated `tsvector` search columns, and `rfq_supplier_matches.buyer_company_id`.

| Module | Tables | Purpose |
|---|---|---|
| A Reference data | 17 | countries, currencies, units, ports, Incoterms, payment terms, packaging, shipment modes, categories (+closure), HS codes, certifications, languages |
| B Identity | 10 | users, external identities, sessions, MFA, security events, verification tokens, preferences |
| C Companies/RBAC | 12 | companies, profile, addresses, contacts, settings, registration identifiers, roles, permissions, memberships, invitations |
| D Files | 5 | file metadata, versions, access grants, scan results, company documents |
| E Verification | 9 | cases, documents, checks, history, granted levels, compliance flags, sanctions records, expiry |
| F Catalog | 9 | products, categories, images, documents, specifications, certifications, HS codes, listings |
| G Trade profiles | 21 | seller profile + 14 capability tables; buyer profile + 5 preference tables |
| H RFQ | 16 | RFQ, items, specs, destinations, requirements, invitations, views, saved, clarifications, history |
| I Matching | 5 | match runs, supplier matches, explainable reasons, preferences, feedback |
| J Quotations | 11 | quotation, immutable revisions, items, specs, terms, certifications, attachments, history, comparisons, negotiation |
| K Deals | 14 | deal, parties, terms/items snapshot, documents + versions, milestones, activity, confirmations, cancellations, disputes, shipments |
| L Messaging | 8 | conversations, participants, messages, attachments, receipts, delivery events, archives, reports |
| M Reviews | 4 | reviews, responses, reports, reputation metrics |
| N Notifications | 4 | templates, notifications, deliveries, device tokens |
| O Admin/audit | 10 | admin roles, admin actions, audit log, security events, moderation, abuse reports, settings, outbox, idempotency |

## 2. Conventions

* **Keys:** `uuid` primary keys with `gen_random_uuid()`; all timestamps `timestamptz`; money `numeric(20,4)`/`numeric(24,4)`, quantities `numeric(20,6)` — never floats.
* **Naming:** plural snake_case tables; `ix_*` indexes; `ux_*` unique; `*_chk` checks; `*_fk` explicit foreign keys.
* **"Enums"** are `text` + `CHECK (col IN (...))`, not `CREATE TYPE`: adding a value is a plain migration, not an `ALTER TYPE` lock.
* **Deletes:** default `ON DELETE RESTRICT`. `CASCADE` only for owned child rows. Business records are **never hard-deleted**: RFQs are cancelled, quotations withdrawn, users/companies closed. Append-only logs enforce this at the database. Products and listings are archived (the app role has no DELETE); their status follows draft/active/archived (listings add paused), and `suspended` is moderation-only. RFQ visibility `private` means owner-only. Invitation responses (viewed/declined/quoted) come only from the invited company, and `declined` is final. Supplier match rows are visible only while the supplier can see the RFQ.
* **Optimistic concurrency:** every table with an integer `version` bumps it on each `UPDATE` (trigger); callers send `WHERE id = $1 AND version = $2`.
* **`updated_at`** is maintained by trigger on every table that has it.
* **JSONB** appears only where the shape is genuinely open and never queried relationally: `notifications.payload`, `audit_logs.changes`, `security_events.detail`, `user_security_events.detail`, `outbox_events.payload`, `system_settings.value`. Product/RFQ/quotation specifications are **relational** (`product_specification_definitions` + typed value columns, validated by trigger against the definition's data type, allowed values and bounds).

## 3. Tenancy model

The **company is the tenant**. A user is global and reaches companies only through `company_memberships(company_id, user_id, role_id, status)`; a user id is never used as a tenant id. One company can hold both a `seller_trade_profiles` and a `buyer_profiles` row.

Every tenant-owned row carries `company_id`. Child rows reference their parent with a **composite tenant foreign key** `(parent_id, company_id) → parent(id, company_id)`, so a child can never point at a parent owned by another company. Where two companies legitimately share a record (a quotation belongs to the supplier but names the buyer), both ids are columns and both are guarded by composite FKs: `quotations (rfq_id, buyer_company_id) → rfqs (id, company_id)`, `deals (quotation_id, buyer_company_id/supplier_company_id) → quotations`.

## 4. Business integrity guarantees (enforced in the database)

| Rule | Mechanism |
|---|---|
| Roles are hierarchical; nobody grants/modifies at or above their own level; last owner cannot leave | `guard_company_membership`, `guard_invitation`, deferred `ensure_company_has_owner`; system roles immutable |
| RFQ lifecycle `draft → published ⇄ paused → closed/expired/cancelled/awarded`; publish needs ≥1 item, ≥1 destination, future expiry; content locked once live | `guard_rfq`, `guard_rfq_child` |
| Suppliers see only RFQs they are allowed to (public, or invited; country allow/block, minimum verification level, seller type rules) — never a match score | `can_view_rfq`, `app.public_rfq*` views |
| One live quotation per supplier per RFQ; revisions numbered sequentially; **submitted revisions, their items, terms and attachments are immutable** | partial unique indexes, `guard_quotation_revision`, `guard_revision_child` |
| Only the buyer accepts; only the latest submitted revision; not after expiry; **at most one accepted quotation per RFQ** even under races | `guard_quotation` (locks the RFQ row `FOR UPDATE`) + partial unique index `ux_quotations_one_accepted_per_rfq` |
| A deal is created from exactly one accepted revision; terms/items snapshot must equal the revision; exactly one deal per quotation; snapshot rows immutable | `guard_deal`, deferred `verify_deal_snapshot`, `ux_deals_quotation`, append-only guard on `deal_terms`/`deal_items` |
| Deal completion requires both parties' confirmation; cancellation requires the counterparty's acceptance. `completed` never implies payment | `guard_deal` |
| Reviews require a completed deal between the two companies; one review per deal per reviewing company; never self-published | `guard_review`, unique `(deal_id, reviewer_company_id)` |
| A company is "verified" only through an approved verification case of the same level | `guard_verification_level`, `sync_company_verified`; `is_business_verified` not client-writable |
| Files cannot be shared/public/available before a clean malware scan | `files_public_clean_chk`, `files_available_clean_chk` |
| Audit/history tables are append-only for every role including the owner | `forbid_modification` on UPDATE/DELETE/TRUNCATE |
| Specification values match their definition (type, enum, bounds) | `validate_spec_value` |

Reference numbers (`RFQ-2026-00000042`, `QUO-…`, `DEAL-…`) come from sequences and are unique.

## 5. Access model summary

Every table has RLS enabled; every non-reference table has `FORCE ROW LEVEL SECURITY`. The runtime role has only the privileges listed per table in the reference (column-level `UPDATE` where state is system-managed). Public marketplace data (RFQ feed, company cards) is exposed only through `security_barrier` projection views owned by a role that has column-level `SELECT` on exactly the public columns. See [`SECURITY_ARCHITECTURE.md`](./SECURITY_ARCHITECTURE.md).

## 6. Reference data and seeds

`npm run db:seed` (migrator role, idempotent, never deletes) loads: 50 countries, 40 currencies, 24 units (with base-unit conversion), Incoterms® 2020 (11), 10 payment terms, 14 packaging types, 8 shipment modes, 8 business types, 15 languages, 29 categories with transitive closure, 43 sample HS codes (2/4/6-digit hierarchy), 8 certification issuers, 22 certifications, 26 major ports (UN/LOCODE), 23 permissions and 5 system roles (owner 100, admin 80, manager 60, member 40, viewer 20). The lists are a **starter set**; production loads the full ISO 3166 / UN/LOCODE / WCO HS datasets through the same runner. Demo/sample business records are never seeded by this command.

## 7. Data lifecycle

* **Users/companies:** statuses (`suspended`, `deletion_requested`, `deleted`, `closed`) instead of deletion. Suspended users lose all access immediately (the RLS helpers check `users.status`).
* **Retention:** `files.retention_status/retain_until`; deletion of personal data after a closure must be a pseudonymization job (see unresolved decision U-3 — append-only logs reference users).
* **Backups:** see `SECURITY_ARCHITECTURE.md` §10.

## 8. Independent database review (ecc `database-reviewer`) — outcome

Reproduced against the real database; regression tests in `tests/security/db-review-findings.test.ts` and `tests/database/query-plans.test.ts`.

**Fixed**

| Finding | Fix |
|---|---|
| Last-owner trigger raced (two owners leaving in parallel left 0 owners) | trigger takes `FOR NO KEY UPDATE` on the company row; concurrency test |
| Quotation `total_amount/currency/valid_until` not tied to the revision; deal could carry a different total/terms than the accepted revision | headline figures are **derived** from the submitted/accepted revision; acceptance requires the *current* revision; deal total/currency must equal the revision; `verify_deal_snapshot` also compares terms to `quotation_terms` and `sum(deal_items) = total` |
| `*_status_history` forgeable by any member (INVOKER log triggers + INSERT grant) | log triggers are SECURITY DEFINER; INSERT revoked from the app role on all four history tables |
| Child rows written without locking the parent (insert slipping into a revision being frozen) | `FOR SHARE` on the parent in `guard_revision_child` / `guard_rfq_child` |
| Draft revision submittable after the quotation closed | quotation status checked on submit |
| Review author could edit moderation columns | column-level grants + trigger check |
| **Descending indexes were `DESC NULLS LAST`** (could not serve `ORDER BY … DESC`) | all declared `DESC NULLS FIRST`; plan tests assert index use |
| `app.*` functions were `EXECUTE`-able by PUBLIC | revoked at default-privilege level and explicitly |

**Open — scaling roadmap (measured, not yet needed at foundation stage; each needs schema/denormalisation approval)**

1. `app.public_rfqs` evaluates `can_view_rfq` per row (~70 µs/row; 2.2 s for a 20-row page over 30k published RFQs). Mitigation applied: context wrapped as `(select app.active_company())`. Planned: split public-and-rule-free RFQs into a plain predicate (definer call only for `invited`/rule-bearing RFQs) and/or a precomputed eligibility projection maintained by the worker.
2. 36 child-table policies use uncorrelated `IN (select id from parent)`, which scans all visible parents (625 buffers for 300 quotations). Planned: denormalise a tenant column (`buyer_company_id`, `deal_id`) into children so the policy is a direct `company_id = (select …)` predicate, or correlated `EXISTS` with an index probe. Same family: per-row `is_conversation_participant` on `messages`.
3. Accepting a quotation leaves the RFQ `published` until the owner awards it (auto-award + close to new quotes?). The `FOR UPDATE` on the RFQ runs under RLS, so a role with `quotation.accept` but without `rfq.create` gets a misleading error (system roles are unaffected) — move the lock into a definer helper when the acceptance API is built.
4. A paused RFQ can be edited while quotes exist; forbid item/rule edits once any non-draft quotation exists (business decision).
5. `companies.is_business_verified` is recomputed on level insert/update only; level **expiry** needs the worker sweep (`verification_expiry_records`), and revoking a case must downgrade its level.
6. Future migrations: the `touch/version/append-only` triggers and the definer-function ownership/EXECUTE grants cover objects existing when `0003/0005` ran; add a CI check (catalog query) for new tables/functions. `0005` is regenerated in place pre-release; after the first deployment policy changes must ship as new incremental migrations.
7. Expired-but-pending invitations block re-invites until a sweeper flips them; RFQ-owner-initiated conversations do not verify that the counterparty can see the RFQ (the visibility oracle is intentionally restricted to the caller's own company).
8. `deals.rfq_id` is guarded on insert only (no composite FK to the quotation's `rfq_id`).
