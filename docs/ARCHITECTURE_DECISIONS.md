# Architecture Decisions (platform level)

Status of every decision: **Proposed — pending review** unless marked *Carried over* (already implemented and tested in `backend/`). Individual ADR files go in `docs/ADR/` when a decision is ratified. The earlier single-service decisions remain in `backend/docs/ARCHITECTURE_DECISIONS.md`.

## 1. Decisions

| ID | Decision | Alternatives considered | Rationale | Trade-off |
|---|---|---|---|---|
| ADR-001 | **Express.js** for gateway and every service (Fastify removed) | keep Fastify | Mandated; Express is mature and well supported by Apollo/OpenTelemetry | Slower raw throughput than Fastify; mitigated by measuring, not assuming |
| ADR-002 | **GraphQL gateway with a single gateway-owned SDL schema**; resolvers call typed internal REST clients | Apollo Federation / schema stitching | Federation needs a router and subgraph schemas per team — premature; one schema is simplest to secure (depth/cost/persisted queries) | Gateway is a coupling point; revisit federation if multiple teams own subgraphs |
| ADR-003 | Add a **Document Service** (file metadata, upload negotiation, signed URLs, grants, scan results) | put files in Company Service | Files are used by 8 domains; needs one owner with strict access rules. The brief lists a `document-worker` but no owner | 14 services instead of 13; **needs your approval** |
| ADR-004 | **Reference data as a versioned package** (`packages/reference-data`) seeded read-only into each schema that needs it | shared `reference` schema with cross-schema FKs; a Reference service | Keeps "FKs only inside owned schema"; data is immutable, small | Copies can drift → checksum test + single package version per release |
| ADR-005 | **One PostgreSQL cluster, schema + role per service**; separate clusters later | database per service now | Cost-efficient; isolation by privileges; clear path to split | Shared blast radius (R5) |
| ADR-006 | **Frontend: React 19 + Vite + Module Federation**; TypeScript; Apollo Client; shared design-system | single-spa, Next.js multi-zone | No existing frontend to preserve; Module Federation gives independent builds with shared singletons | Federation version skew (R6); mitigated by manifest + compat tests |
| ADR-007 | **npm workspaces** (existing toolchain: npm 12) with TypeScript project references; no extra build orchestrator initially | pnpm, Turborepo, Nx | Zero new tooling; repo already uses npm | Slower incremental builds; add Turborepo only if measured need |
| ADR-008 | **Tenant context from signed short-lived token claims** (`cid`, perms) re-verified in each service, plus a **local membership projection** in services that need DB-level re-verification; revocation via events + Redis denylist | each service calls Company on every request; shared membership table | Preserves service autonomy and RLS | **Weaker than today** (DB no longer re-verifies membership against the source of truth each statement): staleness bounded by token TTL ≤5 min and projection lag |
| ADR-009 | **Internal REST/JSON (OpenAPI + Zod contracts)** for synchronous service calls; **RabbitMQ** for events | gRPC; Kafka; NATS | Simple, debuggable, same toolchain; RabbitMQ gives routing, DLQ, retries without Kafka's operational weight | Less efficient than gRPC; revisit on measured need |
| ADR-010 | **Transactional outbox + idempotent inbox** in every service; relay runs inside each service (not a central DB reader) | central outbox poller; CDC | A central poller would need access to every schema (violates ownership) | N relays; shared library keeps it uniform |
| ADR-011 | **Sagas via events, no distributed transactions**; invariants that need atomicity stay inside the owning service (e.g. one accepted quotation per RFQ) | 2PC | Brief mandate; avoids coupling | Partial states must be modelled and tested (R3) |
| ADR-012 | **Redis only for**: gateway rate limiting, session denylist, public-data cache, subscription fan-out | Redis everywhere | Each use is justified; no tenant data in shared caches without tenant-aware keys | One more dependency |
| ADR-013 | **OpenTelemetry → collector → Jaeger + Prometheus (+ Grafana)**; logs via Pino to stdout | vendor APM | Open standard, local-friendly | More containers locally |
| ADR-014 | **Reviews and reputation live in Deal Service** | Company Service | A review requires a completed deal; keeps the rule inside one schema | Company profile reads reputation via event/projection |
| ADR-015 | **Audit**: each service keeps an append-only local `audit_log`; Admin Service aggregates via `audit.recorded` events into a read-model | one shared audit table | Preserves ownership; local append-only guarantees carried over | Aggregated view is eventually consistent |
| ADR-016 | **Existing `backend/` is frozen as reference**, then decomposed by the migration map; never deleted without approval | rewrite from scratch | Keeps 71 passing tests and reviewed SQL | Temporary duplication |
| ADR-017 | **Per-service least-privilege DB roles** (`<svc>_svc` app, `<svc>_migrator`), `NOBYPASSRLS`, no access to other schemas | single `saudaro_app` | Brief mandate; limits blast radius | More roles to bootstrap (automated) |
| ADR-018 | **Carried over**: UUID keys, text+CHECK enums, forced RLS with transaction-local context, immutable quotation revisions and deal snapshots, append-only history, no payment/commission logic | — | Implemented, reviewed by security and database reviewers, 71 tests | — |

### Platform foundation decisions (implemented)

**ADR-019 — `service-kit` shared Express bootstrap.** Every service is created with `createServiceApp` (request ids,
helmet, compression, request deadline → 504, access log + route-templated metrics, `/health/live`, `/health/ready`,
`/metrics`, body limit, 404 + error envelope) and started with `serve` (keep-alive timeouts, graceful shutdown).
_Why:_ identical operational behaviour across 14 services without copy-paste drift. _Cost:_ a change to the kit touches
all services, so it is covered by its own tests.

**ADR-020 — In-house migration runner over Drizzle's `migrate()`.** Drizzle Kit generates SQL; `runServiceMigrations`
applies it. _Why:_ Drizzle's `migrate()` runs `CREATE SCHEMA IF NOT EXISTS`, requiring database-level CREATE, which
migrator roles must not have. The runner uses a per-schema advisory lock and per-migration transactions. _Found by:_
the identity/company integration tests.

**ADR-021 — Single `graphql` instance; workspace packages ship TypeScript source.** Bundles keep third-party
dependencies external so one copy of `graphql` is loaded; `graphql-query-complexity` was replaced by an in-house
estimator for the same reason. Workspace packages are bundled by esbuild at build time.

**ADR-022 — `overrides` for `@graphql-tools/utils@^13.2.2`.** `npm audit` flagged a high-severity prototype-pollution
advisory in the 12.x line pulled in by `@apollo/server@5.5.2`. The override resolves to the patched 13.x; typecheck, lint,
all 150 tests and the bundle build pass with it. _Revisit_ and remove the override when Apollo ships a patched range.

### Authentication and company decisions (implemented)

**ADR-023 — Company owns membership; Identity asks synchronously at token issue.** Refresh with `companyId` makes
Identity call `GET /internal/memberships/:companyId/:userId` (service token, `aud` company-service) and put `cid`/`perms`
in the access token only for an `active` membership. The event-fed projection is **deferred**: nothing yet needs
DB-level re-checks. Accepted staleness (ADR-008): a removed member keeps access up to the access-token lifetime (5 min).

**ADR-024 — Separate keys per issuer; service keys cannot mint user tokens.** Identity signs user access tokens
(`at+jwt`); the gateway signs service tokens (`svc+jwt`) with its own key. The gateway public JWK carries `"use":"svc"`
(`generateSigningKey(kid, 'svc')`) and `verifyAccess` rejects any token signed by a `use:"svc"` key, so a compromised
gateway cannot forge user tokens. Tokens without a `kid` are rejected. Services bind the caller: identity accepts only
`svc=api-gateway`, company `/v1` only `api-gateway`, company `/internal` only `identity-service`.

**ADR-025 — Refresh tokens: rotation, reuse detection, 5 s grace.** Opaque 256-bit tokens, only the SHA-256 stored;
rotation is a single conditional `UPDATE`. Replaying a rotated token revokes the whole session — except within
`REUSE_GRACE_SECONDS = 5` of the rotation, where it is refused (401) without revoking, so a double-submit or two tabs do
not log the winner out. _Tradeoff:_ a thief replaying within 5 s is refused but does not trigger revocation.

**ADR-026 — Company tenancy via forced RLS with creator-bound inserts.** `memberships` insert requires the company to
exist with `created_by = user_id`; the internal lookup runs under `withTenantContext` as the target user (an earlier
`app.internal_lookup` bypass policy was removed after review: any SQL in the runtime role could have switched it on).

**Deferred on purpose (not built):** RabbitMQ relay, Redis rate-limit/denylist, MFA, email verification, password reset,
event-fed membership projection, cookie-based sessions, revoking access tokens at logout (bounded by the 5-min TTL),
a CHECK constraint on normalised email, revoking the runtime role's access to `__migrations`.

## 2. Assumptions

* A-1 Local development must run **without** Docker for unit/integration tests (embedded PostgreSQL); full-stack Compose needs Docker, which is not installed on the current machine.
* A-2 One accepted quotation per RFQ (unchanged).
* A-3 No monetisation logic; verification is not a quality/financial guarantee (unchanged).
* A-4 Public/private RFQ visibility rules and eligibility are decided by RFQ Service, never by match scores.
* A-5 Users authenticate with first-party credentials + MFA in Identity Service unless an external IdP is chosen later (U-1).
* A-6 Production cloud provider unknown; deployment artefacts are container images + provider-neutral manifests.

## 3. Open questions

| # | Question | Recommended default |
|---|---|---|
| D-1 | Approve the 14th service (**Document Service**, ADR-003)? | Yes |
| D-2 | Keep React + Vite + Module Federation for the frontend (ADR-006)? (no existing frontend) | Yes |
| D-3 | Accept ADR-008 (token claims + membership projection) and its weaker membership guarantee? | Yes, with ≤5-min tokens |
| D-4 | Co-deploy `rfq`, `matching`, `quotation`, `deal` as one process (separate schemas/modules) until saga cost is measured? | Build them as separate services as briefed, but decide when those services are built |
| D-5 | Can Docker Desktop be installed on this machine so Compose, RabbitMQ and Redis can be run and verified locally? | Strongly recommended; otherwise those parts are CI-verified only |
| D-6 | External identity provider vs first-party auth (U-1)? | First-party + MFA now, IdP-ready |

## 4. Review checklist

- [ ] Directory tree (`PROJECT_STRUCTURE.md`) acceptable
- [ ] Service boundaries and DB ownership (`ARCHITECTURE_ASSESSMENT.md` §4) acceptable
- [ ] ADR-001…018 accepted or amended
- [ ] D-1…D-6 answered
