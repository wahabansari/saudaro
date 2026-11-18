# SAUDARO

Global B2B import–export marketplace. Monorepo (npm workspaces, Node ≥ 22.12, TypeScript strict, Express 5,
Apollo GraphQL, PostgreSQL, Drizzle).

## Status (verified vs. not verified)

| Area                                                                                                                                           | State                                                                                              |
| ---------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Shared packages (logger, errors, validation, auth/JWT, database-utils, observability, event/api/graphql contracts, service-kit, …)             | Implemented and tested (part of the 245-test suite)                                                |
| API Gateway (Express + Apollo; health, viewer, auth and company operations; persisted queries, depth/complexity/size limits, CORS, rate limit) | Implemented, tested, bundled build run locally                                                     |
| Database tooling (role bootstrap, migrator, `database-check`)                                                                                  | Run end to end against real PostgreSQL 18                                                          |
| Docker Compose, Dockerfile, CI workflow                                                                                                        | Written, YAML parses — **NOT executed** (no Docker on dev machine)                                 |
| RabbitMQ relay, Redis, OpenTelemetry export to a collector                                                                                     | **Not wired / not verified** (tracing only tested in its no-op path)                               |
| Authentication and companies: identity (register/login/refresh/logout/JWKS), company (create, membership, forced RLS), gateway operations      | Implemented; 245 tests incl. a real-HTTP end-to-end test; live run of the bundled processes passed |
| Frontend                                                                                                                                       | Intentionally empty — design pending                                                               |
| Other 12 services                                                                                                                              | Not started                                                                                        |

`backend/` holds the complete 155-table database design (forced row-level security, 8 migrations, 79 tests). It is the
reference for tables not yet served by a service and changes only through new additive migrations; see
`docs/PROJECT_STRUCTURE.md` §5 for the migration map.

## Quick start (no Docker)

```bash
npm install
npm test                 # 245 tests; starts an embedded real PostgreSQL, no setup
npm run typecheck && npm run lint
```

Run the stack against a PostgreSQL you provide (see `docs/LOCAL_DEVELOPMENT.md`):

```bash
npm run db:bootstrap     # roles + schemas (superuser URL from DATABASE_ADMIN_URL)
npm run db:migrate
npm run database-check   # proves least privilege + schema isolation
npm run dev              # gateway :4000, identity :4001, company :4002
npm run health-check
```

GraphQL: `POST http://localhost:4000/graphql` with `{ health { status } }`.

## Documentation

The full index is `docs/README.md`. To design or build the interface, start with `docs/UI_DESIGN_BRIEF.md`; to run the
backend, start with `docs/LOCAL_DEVELOPMENT.md`.
