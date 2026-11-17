# Project Structure

The directories below **exist on disk** (each leaf holds a `.gitkeep`). A directory is *not* an implemented service: the status column is the truth. `backend/` (the existing Fastify/Drizzle foundation, 71 passing tests) is **kept untouched** as the reference implementation until its contents are extracted (§5).

## 1. Directory tree

```
saudaro/
├── apps/
│   ├── frontend/                      # intentionally empty — structure will follow the supplied design
│   └── backend/
│       ├── api-gateway/               # Express + Apollo Server: the ONLY client entry point
│       │   └── src/{config,graphql,resolvers,context,middleware,plugins,security,health}/ , server.ts
│       ├── services/                  # one Express app + one DB schema each
│       │   ├── identity-service/      ├── company-service/        ├── verification-service/
│       │   ├── catalog-service/       ├── trade-profile-service/  ├── rfq-service/
│       │   ├── matching-service/      ├── quotation-service/      ├── messaging-service/
│       │   ├── deal-service/          ├── notification-service/   ├── search-service/
│       │   ├── admin-service/         └── document-service/       # proposed addition, ADR-003
│       │        (each) package.json, tsconfig.json, Dockerfile, drizzle.config.ts, README.md, openapi.yaml
│       │        src/{config,http,domain,application,infrastructure/{db,repositories,messaging,clients}}/ , main.ts, app.ts
│       │        migrations/   tests/{unit,integration,security}/
│       └── workers/
│           ├── notification-worker/   # email/push delivery, retries
│           ├── document-worker/       # malware scan, thumbnails, checksum verification
│           └── event-worker/          # DLQ inspection/replay, saga timers and sweeps
├── packages/                          # shared, versioned, no business logic of any service
│   ├── shared-types/  graphql-contracts/  api-contracts/  event-contracts/
│   ├── error-handling/  validation/  authentication/  authorization/
│   ├── observability/  logger/  database-utils/  testing-utils/
│   ├── design-system/  reference-data/    # reference-data + tooling-config are additions (ADR-004)
│   └── tooling-config/                    # shared tsconfig / eslint / prettier / vitest presets
├── infrastructure/
│   ├── docker/  postgres/  redis/  rabbitmq/  object-storage/  monitoring/  deployment/
├── tests/                             # cross-service suites (service-local tests live in each service)
│   ├── e2e/  contract/  performance/  reliability/  security/  api/postman/
├── docs/                              # architecture + operations documentation, ADR/
├── scripts/                           # dev, build, test, health-check, database-check (TypeScript)
├── .github/workflows/                 # CI/CD
├── backend/                           # EXISTING foundation (Fastify, 155-table schema, 71 tests) — frozen reference
└── root files: package.json (npm workspaces) · tsconfig.base.json · docker-compose.yml · .env.example · README.md
```

## 2. Responsibilities

### apps/backend/api-gateway
| Directory | Responsibility |
|---|---|
| `config/` | Zod-validated env, limits (depth, complexity, body size, timeouts) |
| `graphql/` | schema (SDL, version-controlled), generated types, persisted-query store, validation rules |
| `resolvers/` | thin: validate input → call a typed service client → shape errors. **No SQL, no business rules** |
| `context/` | per-request context: verified token claims, request/correlation ids, DataLoaders, service clients |
| `middleware/` | request id, access log, CORS, body limits, rate limit, auth, error mapping |
| `plugins/` | Apollo plugins: complexity, resolver metrics, slow-resolver log, error formatting |
| `security/` | JWT verification (JWKS), service-token signing, persisted-query allowlist, introspection policy |
| `health/` | `/health/live`, `/health/ready` |

### Service template (identical for all 14)
| Layer | Contents | Rule |
|---|---|---|
| `http/` | health, internal REST routes (service-token only), webhooks | no business logic |
| `application/` | use cases (`CreateCompany`, `InviteMember` …) — the "service layer" GraphQL resolvers call through the gateway client | owns transactions; sets tenant context |
| `domain/` | entities, value objects, rules, domain errors — **pure TypeScript, no I/O** | unit-testable without a DB |
| `infrastructure/db/` | Drizzle schema, pool, tenant-context helper | only this service's schema |
| `infrastructure/repositories/` | Drizzle queries returning domain objects, column-projected | never `select *` |
| `infrastructure/messaging/` | outbox writer + relay, idempotent consumers (inbox) | |
| `infrastructure/clients/` | typed clients for *other* services' internal APIs | the only cross-service coupling |
| `migrations/` | SQL migrations for **this service's schema only** | |

### Packages
| Package | Responsibility |
|---|---|
| `shared-types` | branded ids (`CompanyId`), pagination types, result types |
| `graphql-contracts` | SDL + generated operation types/hooks consumed by the gateway and, later, the frontend |
| `api-contracts` | Zod schemas + OpenAPI for internal REST between services |
| `event-contracts` | versioned event envelopes and payload schemas (`*.v1`) |
| `error-handling` | `AppError` hierarchy, REST + GraphQL error mappers, retryability |
| `validation` | shared Zod primitives (uuid, email, money, ISO codes) |
| `authentication` | JWT sign/verify (asymmetric), JWKS, service tokens, password hashing |
| `authorization` | permission model, policy helpers, GraphQL field guards |
| `observability` | OpenTelemetry bootstrap, metrics, trace propagation |
| `logger` | Pino factory with redaction |
| `database-utils` | pool factory, tenant-context transaction, migration runner, outbox/inbox primitives |
| `testing-utils` | embedded PostgreSQL harness, fixtures, in-memory broker/redis doubles |
| `design-system` | tokens, accessible components |
| `reference-data` | versioned reference seeds (countries, currencies, units, Incoterms, HS, ports…) |
| `tooling-config` | tsconfig/eslint/prettier/vitest presets |

## 3. Service boundaries and database ownership

Every service owns **one PostgreSQL schema** and **one login role** that can use only that schema; no service has privileges on another's schema. Cross-service reads go through internal REST (synchronous) or events (asynchronous). Full ownership table: `ARCHITECTURE_ASSESSMENT.md` §4 (later `DATABASE_OWNERSHIP.md`).

| Service | Port | Schema / role | Status today |
|---|---|---|---|
| api-gateway | 4000 | — (stateless) | implemented |
| identity-service | 4001 | `identity` / `identity_svc` | implemented (authentication) |
| company-service | 4002 | `company` / `company_svc` | implemented (companies, memberships) |
| verification-service | 4003 | `verification` | not started |
| catalog-service | 4004 | `catalog` | not started |
| trade-profile-service | 4005 | `trade_profile` | not started |
| rfq-service | 4006 | `rfq` | not started |
| matching-service | 4007 | `matching` | not started |
| quotation-service | 4008 | `quotation` | not started |
| messaging-service | 4009 | `messaging` | not started |
| deal-service | 4010 | `deal` | not started |
| notification-service | 4011 | `notification` | not started |
| search-service | 4012 | `search` | not started |
| admin-service | 4013 | `admin` | not started |
| document-service | 4014 | `document` | not started (proposed) |

Infrastructure ports (proposed): PostgreSQL `5432` (container `saudaro-postgres`, db `saudaro_marketplace`, superuser `admin`/`root123` local-only — kept from the existing setup), Redis `6379`, RabbitMQ `5672` + management `15672`, MinIO (private object storage) `9000`/console `9001`, OpenTelemetry collector `4317`/`4318`, Jaeger UI `16686`, Prometheus `9090`, Grafana `3100`, Drizzle Studio `4983`.

## 4. Communication rules

* Client → **gateway only** (GraphQL for data, REST for upload negotiation/webhooks/health). The frontend never calls services or the database.
* Gateway → service: HTTPS/JSON internal REST with a short-lived **service token** plus the end-user claims; batch endpoints for DataLoader.
* Service → service: internal REST only for queries needing an immediate answer; otherwise RabbitMQ events (`event-contracts`).
* No cross-schema FKs or joins. No shared tables. No distributed transactions (sagas).

## 5. Migration map from the existing `backend/`

| Existing | Destination |
|---|---|
| `backend/src/database/schema/*.ts` (15 module files) | split by owner into each service's `infrastructure/db/schema` (see assessment §4) |
| `backend/src/database/migrations/0001–0006` | re-generated **per service schema**; SQL for triggers/policies carried over, cross-module parts redesigned |
| `backend/src/database/policies/{spec,generate-rls-migration}.ts` | `packages/database-utils` (generator) + per-service `rls.spec.ts` |
| `backend/src/database/client.ts` (`withTenantContext`, role assertion) | `packages/database-utils` |
| `backend/src/database/scripts/*` (bootstrap, migrate, seed, reset) | `packages/database-utils` + `infrastructure/postgres` |
| `backend/src/database/seeds/reference*.ts` | `packages/reference-data` |
| `backend/src/common/errors.ts`, `config/env.ts` | `packages/error-handling`, `packages/validation` |
| `backend/src/app.ts`, `server.ts`, `modules/health` (**Fastify**) | replaced by Express in each service/gateway |
| `backend/tests/**` (71 tests) | ported alongside the code they test; `backend/` stays green until the last test is ported |
| `backend/docs/**` | merged into root `docs/` as each topic is re-written for the distributed design |

Nothing in `backend/` is deleted without explicit approval.
