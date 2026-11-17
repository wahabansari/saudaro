# SAUDARO — Indexing and Search Strategy

Principles: index for **actual access paths**, not for every column; every foreign key that is a *tenant/parent* reference has a supporting index (enforced by a test); partial indexes for hot "active/published/pending" subsets; composite order = equality columns first, then range/sort. Reference-table and `users` foreign keys are deliberately **not** indexed (those rows are never deleted, so the index would only add write cost).

## 1. Index families

| Family | Where | Why |
|---|---|---|
| B-tree primary/unique | every table; natural keys on reference data (`iso2`, `code`, `un_locode`, `(code, version_year)`) | identity, upserts, duplicate defence |
| Tenant lists `(company_id, status, created_at DESC)` | `rfqs`, `products`, `seller_product_listings`, `files`, `quotations` (`company_id`/`buyer_company_id`), `deals` (buyer/supplier), `company_memberships` | "my X by status, newest first" |
| Public feeds (partial) | `ix_rfqs_public_feed (published_at DESC, id) WHERE status='published' AND visibility='public'`; `ix_rfqs_category_feed`; `ix_products_category_active`; `ix_products_origin_active` | marketplace discovery, keyset pagination |
| Work queues (partial) | `verification_cases` (submitted/in_review), `moderation_cases`, `abuse_reports`, `message_reports`, `notification_deliveries (next_attempt_at) WHERE status in (pending,failed)`, `outbox_events WHERE published_at IS NULL`, `rfq_match_runs WHERE queued`, `files WHERE scan_status='pending'`, expiry indexes | `FOR UPDATE SKIP LOCKED` workers touch only open work |
| Keyset/activity feeds | `messages (conversation_id, created_at DESC, id DESC)`, `deal_activity_events`, `negotiation_events`, `notifications (recipient_user_id, created_at DESC, id DESC)`, `audit_logs (company_id, created_at DESC)` | cursor pagination, no OFFSET |
| Full-text GIN | `companies`, `products`, `rfqs` — generated `search_vector` (`simple` config, weighted A/B/C/D), partial on active/published | relevance search |
| Trigram GIN (`pg_trgm`) | `companies.display_name/legal_name`, `products.name`, `rfqs.title`, `product_categories.name`, `hs_codes.description`, `cities.name` | typo-tolerant lookup, `ILIKE '%x%'` |
| Prefix B-tree | `hs_codes (code text_pattern_ops)` | `code LIKE '1006%'` |
| Policy-support | `ix_company_memberships_company_user_active` (partial), `(user_id, status)`, unique `(company_id, user_id)` | every RLS membership lookup |
| Tenant FK support | `0006_fk_support_indexes.sql` (42 indexes) | parent delete/update and join performance |

JSONB/GIN is **not** used (no queried JSONB). Arrays: only `product_specification_definitions.allowed_values` (validation, not search).

## 2. Searchable-field matrix

| Entity / field | Exact | Filter | Full-text | Fuzzy | Sort | Visibility |
|---|---|---|---|---|---|---|
| Company `display_name`, `legal_name` | ✔ slug | country, verified | ✔ | ✔ trigram | name | public (active companies, via `public_companies`) |
| Company country, `is_business_verified` | | ✔ | | | | public |
| Product `name`, `brand`, descriptions | | category, origin, status | ✔ weighted | ✔ name | published_at | public when `status='active'` and company active |
| Product category / HS code | ✔ | ✔ (closure for subtrees) | | description trigram | | public |
| Product specifications | | ✔ typed value columns `(definition_id, value_number/text)` | | | | with the product |
| Seller capabilities, export markets, ports, Incoterms, certifications | | ✔ | | | | only if seller profile **published** |
| Seller capacity, MOQ, lead time, payment terms, packaging | | worker/matching only | | | | **private** — never publicly searchable |
| Buyer profile & preferences | | worker only | | | | **private** |
| RFQ `title`, `description` | | status, category, destination, Incoterm | ✔ | ✔ title | published_at, expires_at | via `public_rfqs` only (published, eligible); owner sees all |
| RFQ target price, creator, internal rules | | | | | | **never** searchable/visible to suppliers |
| Quotations | | status, supplier, RFQ | | | created_at | supplier + buyer (non-draft) |
| Messages | — | by conversation | **not indexed** | **no** | created_at | participants only |
| Files | | by owner/resource | | | created_at | RLS-derived |

Search never bypasses tenancy: search runs as `saudaro_app` under RLS, or against the whitelisted projection views.

## 3. Representative query plans

Plans were verified on a PostgreSQL 18 instance with synthetic data (see `tests/database/query-plans.test.ts`, which asserts the plan shape so regressions fail CI).

| Query | Expected plan |
|---|---|
| `SELECT … FROM rfqs WHERE company_id = $1 AND status = $2 ORDER BY created_at DESC LIMIT 20` | Index Scan on `ix_rfqs_company_status_created`, no sort |
| Public feed `WHERE status='published' AND visibility='public' ORDER BY published_at DESC, id LIMIT 20` | Index Scan on `ix_rfqs_public_feed` |
| `companies.search_vector @@ plainto_tsquery('simple','textile')` | Bitmap Index Scan on `ix_companies_search` |
| `products.name ILIKE '%basmti%'` / `similarity()` | Bitmap Index Scan on `ix_products_name_trgm` |
| `messages WHERE conversation_id=$1 AND (created_at,id) < ($2,$3) ORDER BY created_at DESC, id DESC LIMIT 50` | Index Scan on `ix_messages_conversation_feed` |
| `hs_codes WHERE code LIKE '1006%'` | Index/Bitmap Scan on `ix_hs_codes_code_prefix` |

## 4. RLS-aware performance notes

* Policies wrap helper calls as `(select app.active_company())` so PostgreSQL evaluates them once per statement (an InitPlan), not per row.
* Policies reached through a parent (`product_id in (select id from products)`) rely on the parent's index; every such child has an index on its parent id.
* The `files` read policy has several `EXISTS` branches; it is evaluated only for rows a query asks about. If file listing becomes hot, materialize a `file_access` projection.
* Measure with `EXPLAIN (ANALYZE, BUFFERS)` **as `saudaro_app` with a tenant context**; a superuser plan skips RLS and is misleading.

## 5. Scaling path (documented, not built)

Measure first (`pg_stat_statements`, `auto_explain`). Order of escalation: pooled connections (PgBouncer in transaction mode is compatible: all context is transaction-local) → read replica for search/reporting (replication lag tolerated by feeds) → partition `messages`, `audit_logs`, `notifications`, `deal_activity_events` by month (RANGE on `created_at`; keys already include `created_at`) → separate search engine only if trigram/FTS quality or latency demands it. No partitioning or extra infrastructure is introduced until measurements justify it.

## 6. Operations

`REINDEX CONCURRENTLY` for bloat; `CREATE INDEX CONCURRENTLY` for new indexes on large tables (migrations for populated production tables must not use the plain form); autovacuum tuned for `outbox_events`, `notification_deliveries`, `idempotency_keys` (high churn). Drop-candidate check: `pg_stat_user_indexes.idx_scan = 0` after a full business cycle.
