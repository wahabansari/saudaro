# SAUDARO backend

Secure, multi-tenant foundation for a global B2B import-export marketplace: PostgreSQL schema (155 tables) with forced row-level security, guarded business state machines, and a minimal Fastify service. **Business APIs are intentionally not built yet** — the database and security model come first and need review.

| Area | Choice |
|---|---|
| Runtime | Node.js ≥ 22.12 (developed on 26), TypeScript strict, ESM |
| HTTP | Fastify 5, helmet, Pino structured logs (secrets redacted), central error handler |
| Database | PostgreSQL 16+ (tested on 18), Drizzle ORM + Drizzle Kit, hand-reviewed SQL migrations |
| Validation | Zod (environment and, later, requests) |
| Tests | Vitest against a **real** PostgreSQL (embedded binaries — no Docker required) |

## Documentation

[`docs/ARCHITECTURE_DECISIONS.md`](docs/ARCHITECTURE_DECISIONS.md) · [`docs/DATABASE_DESIGN.md`](docs/DATABASE_DESIGN.md) · [`docs/DATABASE_REFERENCE.md`](docs/DATABASE_REFERENCE.md) (generated, every table/column) · [`docs/ERD.md`](docs/ERD.md) · [`docs/SECURITY_ARCHITECTURE.md`](docs/SECURITY_ARCHITECTURE.md) · [`docs/INDEXING_STRATEGY.md`](docs/INDEXING_STRATEGY.md)

## Local setup

```bash
cd backend
npm install
cp .env.example .env            # dev-only values; never commit .env
```

### Database (Docker)

`docker-compose.yml` starts PostgreSQL 18, database **`saudaro_marketplace`**, bootstrap superuser **`admin`** / **`root123`** (local only, bound to 127.0.0.1).

```bash
npm run db:up                   # docker compose up -d postgres
npm run db:bootstrap            # creates least-privilege roles (needs the superuser URL in .env)
npm run db:migrate              # applies migrations as saudaro_migrator
npm run db:seed                 # reference data + RBAC catalog (idempotent)
npm run dev                     # API on http://127.0.0.1:3001
```

```text
Superuser (bootstrap only): postgres://admin:root123@127.0.0.1:5432/saudaro_marketplace
API runtime role:           postgres://saudaro_app:app_dev_pass@127.0.0.1:5432/saudaro_marketplace
```

> **Why the API does not connect as `admin`:** a superuser bypasses row-level security, which would silently disable tenant isolation. The server refuses to start (and `/health/ready` fails) if its role is a superuser, `BYPASSRLS`, or owns tables. `admin`/`root123` is for `db:bootstrap` only.

`npm run db:reset:dev -- --yes` drops and recreates the local database (refuses non-loopback hosts and production).

### Checks

```bash
npm test               # starts its own PostgreSQL (~15 s)
npm run typecheck && npm run lint && npm run format:check
npm run build
npm run db:generate    # drizzle-kit: must report "No schema changes" on a clean tree
npm run db:rls:generate && git diff --exit-code src/database/migrations/0005_rls_policies_and_grants.sql
npm run docs:generate  # regenerates docs/DATABASE_REFERENCE.md and docs/ERD.md
```

## Layout

```
src/
  app.ts, server.ts            Fastify app factory / process entry (graceful shutdown)
  config/env.ts                Zod-validated environment, fail-fast, never echoes values
  common/errors.ts             SQLSTATE → safe HTTP errors
  modules/health/              liveness + readiness (role safety check)
  database/
    client.ts                  pools, withTenantContext() (transaction-local tenant context), role assertion
    schema/*.ts                Drizzle schema, one file per module (A–O)
    migrations/                0000 prereqs · 0001 schema · 0002 integrity · 0003 functions+triggers
                               0004 search indexes · 0005 RLS (generated) · 0006 FK indexes
    policies/spec.ts           declarative RLS/privilege spec  →  generate-rls-migration.ts → 0005
    seeds/                     reference data + RBAC (no demo business data)
    scripts/                   bootstrap roles, migrate, reset-dev, generate-docs
tests/                         security/ · integration/ · database/ (real PostgreSQL)
docs/
```

Business modules (`auth`, `companies`, `rfqs`, `quotations`, …) are added under `src/modules/` after this foundation is approved; each module reaches the database **only** through `withTenantContext`.

## Using the database from code

```ts
import { createPool, withTenantContext } from './database/client.ts';
const pool = createPool(env.DATABASE_URL);               // saudaro_app, RLS enforced

// userId comes from the verified session; companyId is only a REQUEST — the DB verifies membership.
await withTenantContext(pool, { userId, companyId }, async ({ client }) => {
  const rows = await client.query('select id, title from rfqs order by created_at desc limit 20');
  return rows.rows;                                      // only this company's RFQs
});
```

## Status (honest)

Done and tested: schema, RLS, roles, guard triggers, seeds, migrations, tenant-context client, health/error foundation, the 10 mandatory security scenarios, plus regression tests for every confirmed review finding.
Not built: authentication/sessions, object-storage + malware scanning, field-level encryption/KMS, matching engine, notification worker, rate limiting, business APIs. See `docs/SECURITY_ARCHITECTURE.md` §12 and `docs/ARCHITECTURE_DECISIONS.md` §4 for open decisions. `docker-compose.yml` could not be exercised on the authoring machine (no Docker installed); the SQL was verified on real PostgreSQL 18 binaries.
