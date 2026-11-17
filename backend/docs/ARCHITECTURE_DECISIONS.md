# SAUDARO — Architecture Decisions, Assumptions and Open Questions

## 1. System architecture (overview)

```
                    ┌───────────────────────────── backend/ (Node.js, TypeScript strict) ─────────────────────────────┐
 client ──HTTPS──►  Fastify app (helmet, request ids, central errors, health)                                         │
                       │  withTenantContext(userId, companyId)  ── one transaction per request ──►                    │
                       ▼                                                                                              │
                 pg Pool (saudaro_app, NOBYPASSRLS) ──TLS──► PostgreSQL 16+ primary                                    │
 worker (future) ─ pg Pool (saudaro_worker) ───────────────►   RLS FORCE · definer helpers · guard triggers · outbox   │
 migrations ───── saudaro_migrator (owner) ────────────────►   Drizzle SQL migrations 0000–0006                       │
                    └────────────────────────────────────────────────────────────────────────────────────────────────┘
 object storage (private, signed URLs)  ·  IdP (external identities)  ·  KMS  — integration points, not yet built
```

A **modular monolith**: one deployable, module boundaries by folder (`src/modules/<domain>`), one PostgreSQL primary. Only `health` exists; business modules follow once this foundation is approved. `src/modules/README` deliberately omitted — empty placeholder folders add noise; the schema modules A–O already define the boundaries.

## 2. Decisions

| # | Decision | Why | Consequence |
|---|---|---|---|
| D1 | **Modular monolith, single PostgreSQL primary** | Avoid premature distribution; transactions across RFQ→quotation→deal are the core | Scale path documented (§INDEXING 5); extract services only with measured need |
| D2 | **Fastify + Drizzle ORM + SQL migrations, Zod for env/input** | Fast, typed, schema-as-code; Drizzle generates DDL while RLS/triggers are hand-reviewed SQL | RLS policies are *generated from one declarative spec* (`policies/spec.ts`) and diffed in tests |
| D3 | **Company = tenant; membership table; user ≠ tenant** | Users belong to many companies; one company is buyer *and* seller | Active company is a per-request context re-verified by the DB |
| D4 | **RLS FORCE on every non-reference table** (reference: ENABLE) | Owner is subject to policies; no hidden bypass | Seeds on FORCE tables need explicit `migrator` policies (3 tables) |
| D5 | **SECURITY DEFINER helpers owned by a NOLOGIN, non-BYPASSRLS role (`saudaro_authz`) with its own narrow policies** | Membership/admin lookups must not recurse or weaken policies, and without BYPASSRLS | Every helper is audited as a unit; oracle functions restrict answers to the caller's own company |
| D6 | **Projection views owned by `saudaro_pub` with column grants** for public RFQ/company data | Row-level policies cannot hide columns; a view with a restricted owner can, without a second table | Suppliers never see base `rfqs`; adding a public field = explicit column grant + view column |
| D7 | **Composite tenant foreign keys** `(parent_id, company_id)` | Structural impossibility of cross-tenant child rows, independent of RLS | Parents carry `unique(id, company_id)`; nullable composite FKs (MATCH SIMPLE) skip the check when the child key is null — child columns that must be tenant-consistent are NOT NULL |
| D8 | **text + CHECK instead of PG enums** | Evolving a value list = ordinary migration | Values live in TS constants and CHECKs (same source) |
| D9 | **uuid (v4, `gen_random_uuid()`) primary keys** | Non-guessable, portable, required by the brief | PostgreSQL 18 `uuidv7()` is a future option for index locality on high-insert tables (messages/audit) |
| D10 | **Immutable revisions + snapshots** (quotation revisions, deal terms/items) | Commercial terms must never be silently overwritten | Edits create revisions; accepted revision id is a composite FK |
| D11 | **One accepted quotation per RFQ** (A-9) enforced by partial unique index + RFQ row lock | Prevents conflicting acceptances under races | Split awards would need a schema change (`allow_multiple_awards` / per-item acceptance) |
| D12 | **No hard deletes of business records; append-only audit/history enforced by triggers** | Evidence, dispute handling, compliance | Erasure requests require a pseudonymization job (U-3) |
| D13 | **Transactional outbox + worker role** | Reliable async notifications/matching without distributed transactions | The app can only *append* outbox rows (no read); only the worker consumes them |
| D14 | **JSONB only for open, non-relational payloads** | The brief forbids JSONB as a modelling shortcut | Six columns total, all documented |
| D15 | **`simple` text-search config + pg_trgm** | Multilingual catalogue; no stemming bias | Language-specific analyzers can be added per column later |
| D16 | **Merged tables**: `notification_preferences` into `user_notification_preferences`; `company_permissions` into `permissions` + `company_role_permissions` | One model per concept | Per-member permission overrides are not supported (custom roles instead) |
| D17 | **Notifications are created by the worker only** | A tenant must not be able to inject rows into another user's inbox | API publishes outbox events; worker materialises notifications |
| D18 | **Local tests use real PostgreSQL 18 binaries (`embedded-postgres`)** | Docker is not available on every developer machine; RLS/trigger behaviour must be tested on a real server, never mocked | CI should additionally run against the Docker image used in production |
| D19 | **Node ≥ 22.12 (developed on 26), npm, `.ts` import specifiers with `rewriteRelativeImportExtensions`** | Works unchanged with tsx, vitest, drizzle-kit and `tsc` builds | Production should pin the current LTS |
| D20 | **Superuser never at runtime; `db:bootstrap` creates roles** | Roles need a superuser; app and migrations must not | Local Docker uses `admin`/`root123` for bootstrap only |

## 3. Assumptions (document, change by decision)

* **A-1** Buyers/sellers settle payment outside the platform; `deal.status = completed` never implies payment.
* **A-2** Verification does not assert solvency, quality or delivery performance; "verified" derives only from approved cases.
* **A-3** No commission, fee, subscription or escrow logic exists anywhere in the schema (monetisation undecided).
* **A-4** A user may belong to many companies; the client chooses the active company per request.
* **A-5** Public products/active listings (incl. price ranges) are visible to all authenticated users; private supplier data (capacity, MOQ, lead times, payment terms) is not.
* **A-6** Reviews require a completed deal between the two companies and start as `pending` (moderated).
* **A-7** Buyer profiles are private to the buyer company.
* **A-8** Messages are participant-based (user + company), not visible to all company members.
* **A-9** At most one quotation may be accepted per RFQ.
* **A-10** RFQ content is editable only in `draft`/`paused`; later changes go through clarifications.
* **A-11** Reference datasets are a starter set; full ISO/UN/WCO imports are a deployment task.
* **A-12** Matching scores are advisory/explainable and never decide eligibility.

## 4. Unresolved decisions requiring approval

| # | Question | Default taken |
|---|---|---|
| U-1 | Authentication: external IdP (which?) vs self-hosted passwords | External IdP; local password column kept optional |
| U-2 | Signed tenant context (HMAC) to bound SQL-injection blast radius (see SECURITY §9) | Not implemented; recommended before production |
| U-3 | Data-erasure/retention policy (GDPR-style) vs append-only audit | Pseudonymization job to be designed |
| U-4 | Split awards (several accepted quotations per RFQ)? | No (A-9) |
| U-5 | Platform-admin model: separate admin console DB role vs RLS admin policies on the app role | RLS admin policies on the app role (admin role assignments + MFA at app level) |
| U-6 | Monetisation (commission/subscription) | Deliberately unmodelled |
| U-7 | Partitioning thresholds for messages/audit/notifications | Deferred until measured |
| U-8 | Search engine beyond PostgreSQL FTS/trigram | Deferred |
| U-9 | Production hosting, PgBouncer, backup tooling, KMS provider | Requirements documented only |
| U-10 | Do `conversation_participants` need explicit consent/accept by added users? | Creator can add colleagues of either party (membership-validated) |

## 5. Migration policy

Forward-only, deterministic, reviewed SQL (`0000` extensions/prereqs → `0001` generated schema → `0002` integrity → `0003` functions/triggers → `0004` search indexes → `0005` generated RLS → `0006` FK support indexes). A *down* path for populated production data is intentionally not generated (destructive); recovery is by point-in-time restore or a compensating forward migration. Migrations never delete data. For populated tables use `CREATE INDEX CONCURRENTLY` in separate non-transactional migrations. `npm run db:reset:dev` (local only) recreates a dev database.
