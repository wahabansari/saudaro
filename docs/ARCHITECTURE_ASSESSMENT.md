# Architecture Assessment

Status: design document. The backend foundation, authentication and company services are implemented; the other services and the frontend are planned.

## 1. Starting point (as inspected)

| Item | Finding |
|---|---|
| Repository root | `.git`, `backend/` only (2 commits). No root `package.json`, no workspaces, no Dockerfile/compose at root, no CI. |
| Frontend | **None exists.** No `index.html`, bundler config or `.tsx`/`.jsx` anywhere. There is no framework to preserve, so the choice is open (ADR-006). |
| `backend/` | A working, tested **modular-monolith foundation**: Node ≥22 (dev on 26), TypeScript strict, **Fastify 5**, Drizzle ORM, Zod, PostgreSQL 18. 57 files, ≈8.9k lines. |
| Database | One database `saudaro_marketplace`, schema `public` (155 tables) + schema `app` (56 helper functions, 5 projection views), 7 reviewed SQL migrations (`0000`–`0006`), forced RLS on all non-reference tables (605 policies), 37 triggers, least-privilege roles (`saudaro_migrator/app/worker/readonly` + NOLOGIN `saudaro_authz/pub`). |
| Tests | 71 Vitest tests against real PostgreSQL (embedded binaries): tenant isolation, RBAC/role-escalation, state machines, concurrency, constraints, query plans, two independent review regression suites. |
| Docs | `backend/docs/` (design, generated table reference, ERD, indexing, security, decisions). |
| Environment | Node 26.13, npm 12.2. **Docker, Redis and RabbitMQ are not installed on this machine** (verified). |

## 2. Gap analysis against the new brief

| Requirement | State | Consequence |
|---|---|---|
| Express.js (Fastify forbidden) | Foundation uses Fastify, but only in 3 small files (`app.ts`, `server.ts`, `modules/health`). DB layer is framework-neutral. | Re-implement the HTTP shell on Express; **reuse** schema, migrations, SQL, tests. |
| GraphQL gateway, DataLoader, depth/complexity limits, persisted queries | Not present | New. |
| Microservices with per-service DB ownership | One shared `public` schema, cross-module FKs, triggers and helper functions that read other modules' tables | **Largest piece of work**: see §3. |
| RabbitMQ, Redis, OpenTelemetry, object storage | Only an `outbox_events` table exists | New; cannot be run locally here without Docker (§5). |
| Inbox / background-job tables | Missing (`outbox_events`, `idempotency_keys` exist) | Add per service. |
| Frontend | No frontend | New; deferred until a design is supplied. |
| Monorepo, CI | None | New. |
| Preserved already | UUID keys, RLS + transaction-local tenant context, immutable quotation revisions and deal snapshots, append-only audit, least-privilege roles, reference seeds, 71 tests | **Carry forward; do not rewrite.** |

## 3. The hard problem: splitting a tightly-integrated schema

The current design enforces several business invariants with **cross-module foreign keys and triggers inside one database transaction**. A per-service schema removes that ability:

| Invariant (today) | Mechanism today | Why it breaks when split | Replacement |
|---|---|---|---|
| Quotation belongs to an RFQ of the stated buyer; supplier is allowed to quote | composite FK to `rfqs`, `can_quote_rfq()` | `rfq` and `quotation` schemas are separate | Quotation Service keeps an `rfq_snapshot` read-model fed by `rfq.*` events and asks RFQ Service `POST /internal/rfqs/{id}/eligibility` at draft and submit |
| One accepted quotation per RFQ, race-safe | partial unique index on `quotations(rfq_id)` + `FOR UPDATE` on the RFQ row | unchanged **inside** Quotation Service (it owns `rfq_id`) | stays a unique index in `quotation`; RFQ is closed by the `quotation.accepted.v1` event (saga) |
| Deal equals accepted revision (items, terms, total) | deferred trigger reads `quotation_items/terms` | Deal Service cannot read the quotation schema | Deal Service fetches the accepted revision snapshot over the Quotation internal API, verifies a content hash carried by the event, stores an immutable copy |
| Membership re-verified by the DB on every statement | `app.active_company()` reads `company_memberships` | memberships live in `company` schema | signed short-lived token claims + a local membership projection (ADR-008) — **weaker, see risks** |
| Role hierarchy / last-owner / invitations | triggers on `company_memberships` | all inside Company Service | unchanged — moves wholesale to `company` schema |
| Files attach only within a tenant | composite FK `(file_id, company_id)` to `files` | files owned by Document Service | Document Service verifies ownership when linking; FK becomes a soft reference + verified at write time |
| Reference data (countries, units, Incoterms…) used everywhere | FKs to shared tables | no cross-schema FKs by rule | versioned `packages/reference-data` seeded **read-only into each service schema that needs it** (ADR-004) |

Conclusion: the schema **can** be split, but ≈45 cross-module FKs and ≈12 cross-module triggers must be redesigned as events, internal APIs and local projections. This is an honest cost of the microservice mandate and the main schedule risk.

## 4. Table-to-owner map (from the 155 existing tables)

| Schema / owner | Existing tables moved in | New tables |
|---|---|---|
| `identity` | users, user_auth_identities, user_sessions, user_mfa_methods, user_security_events, password_reset/email/phone tokens, user_preferences | refresh_token_families, outbox/inbox |
| `company` | companies, profiles, addresses, contacts, settings, business types, registration identifiers, roles, permissions, role_permissions, memberships, invitations | outbox/inbox |
| `verification` | verification_cases/documents/checks/status_history/providers, company_verification_levels, compliance_flags, sanctions_screening_records, verification_expiry_records | company_ref projection |
| `catalog` | products and 6 child tables, product_specification_definitions, seller_product_listings, categories, HS codes, certifications + issuers | company_ref projection |
| `trade_profile` | seller_* (14) and buyer_* (6) tables | company_ref projection |
| `rfq` | rfqs + 15 child tables (items, specs, destinations, invitations, views, saved, clarifications, history …) | company_ref, eligibility cache |
| `matching` | rfq_match_runs, rfq_supplier_matches, rfq_match_reasons, supplier_match_preferences/feedback | rfq/supplier projections |
| `quotation` | quotations, revisions, items, specs, terms, certifications, attachments, history, comparisons, negotiation_events | rfq_snapshot |
| `messaging` | conversations, participants, messages, attachments, receipts, delivery events, archives, reports | membership projection |
| `deal` | deals, parties, terms/items snapshot, documents + versions, milestones, activity, confirmations, cancellations, disputes, shipments, **company_reviews + responses + reports + reputation metrics** | quotation_snapshot |
| `notification` | notifications, deliveries, templates, device_tokens, user_notification_preferences | outbox/inbox |
| `search` | — (owns denormalised read projections built from events) | company/product/rfq search documents |
| `admin` | admin_role_assignments, admin_actions, moderation_cases/actions, abuse_reports, system_settings, security_events (aggregate), audit aggregate | audit_events read-model |
| `document` (**proposed 14th service**, ADR-003) | files, file_versions, file_access_grants, file_scan_results, company_documents links | upload_sessions |

Every service additionally owns `outbox_events`, `inbox_events` (idempotent consumers), `jobs`, and `audit_log` (append-only).

## 5. Environment constraints that affect verification

* **No Docker, Redis or RabbitMQ on this machine.** Compose files and container health checks can be *written* but not *run* here. Plan: PostgreSQL integration tests keep using the embedded real PostgreSQL; broker/cache code is tested against in-memory test doubles **and** against real RabbitMQ/Redis in CI (GitHub Actions service containers). Anything not run locally will be labelled "not verified locally" in reports.
* Node 26 is non-LTS; engines stay `>=22.12`, production images pin the current LTS.

## 6. Risks

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| R1 | Distributed-system complexity before product-market fit; 14 services is operationally heavy for a small team | High | Phased delivery; shared build/test tooling; single Postgres cluster; one Dockerfile template; decision gate D-1 (co-deploy rfq/matching/quotation/deal as one process with separate schemas if saga cost is high) |
| R2 | Loss of "DB verifies membership every statement" | High | short-lived tokens (≤5 min), membership projection + revocation events, signed claims verified at gateway **and** service (ADR-008) |
| R3 | Sagas for acceptance → award → deal introduce partial failure states | High | outbox + idempotent consumers, explicit saga state tables, compensation, reliability tests |
| R4 | Contract drift between gateway, services and frontends | Medium | `api-contracts`/`event-contracts` packages, contract tests in CI |
| R5 | Single Postgres cluster = shared blast radius | Medium | per-service roles/schemas, connection limits, documented path to separate clusters |
| R6 | Module Federation version skew (if Module Federation is chosen for the frontend) | Medium | singleton shared deps, versioned remote manifest, compatibility tests |
| R7 | GraphQL abuse (depth/complexity/cost) | Medium | limits, persisted-query allowlist in production, rate limits |
| R8 | Local environment cannot run containers | Medium | CI containers; request that Docker Desktop be installed |
| R9 | Rewrite temptation | Medium | `backend/` frozen as reference; schema/tests ported, never deleted without approval |

## 7. Recommendation

Proceed, in this order: (1) approve this structure; (2) platform foundation (workspaces, shared packages, Express and GraphQL setup, per-service Drizzle and role bootstrap, Compose); (3) gateway, identity and company services (implemented); (4) remaining services in dependency order; the frontend follows once its design is supplied. **Open questions requiring a decision are listed in `ARCHITECTURE_DECISIONS.md` §3.**
