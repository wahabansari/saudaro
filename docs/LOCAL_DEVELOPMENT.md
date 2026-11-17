# Local Development

## Prerequisites

- Node ≥ 22.12 (developed on 26) and npm.
- A PostgreSQL 16+ server **only if** you run the apps; tests need nothing (they start an embedded PostgreSQL).

npm blocks dependency install scripts by default. `package.json → allowScripts` already approves `esbuild` and the
embedded-postgres binaries; do not approve anything else without review.

## Everyday commands

| Command                                       | What it does                                                                 |
| --------------------------------------------- | ---------------------------------------------------------------------------- |
| `npm test`                                    | All Vitest suites (unit + integration against a real embedded PG)            |
| `npm run typecheck` / `lint` / `format:check` | tsc strict, ESLint, Prettier                                                 |
| `npm run build`                               | esbuild bundles → `dist/<service>/main.mjs` (third-party deps stay external) |
| `npm run db:bootstrap` / `db:migrate`         | Roles/schemas, then per-service migrations                                   |
| `npm run database-check`                      | Verifies least privilege and cross-schema denial                             |
| `npm run dev`                                 | Starts gateway + services with tsx, prefixed logs                            |
| `npm run health-check`                        | Calls `/health/ready` of each running component                              |

## Running against your own PostgreSQL

1. Create an empty database and a superuser reachable from your machine. The project's local convention is
   database `saudaro_marketplace`, user `admin`, password `root123` (local only).
2. `export DATABASE_ADMIN_URL=postgres://admin:root123@127.0.0.1:5432/saudaro_marketplace` (default if unset).
3. `npm run keys:generate` and paste the three lines it prints into `.env` (git-ignored; `npm run dev` loads it).
4. `npm run db:bootstrap && npm run db:migrate && npm run database-check`.
5. `npm run dev`, then `npm run health-check`.

The apps never connect as the superuser: each service uses its own `<name>_svc` role (see `POSTGRESQL_ACCESS.md`).

## Adding a service

1. Create `apps/backend/services/<name>-service` from the identity-service layout.
2. Add it to `DB_SERVICES` in `scripts/services.ts` (port, schema) — bootstrap, migrate, build, dev, health-check and
   database-check all read that list.
3. Generate its migrations (`DATABASE_MIGRATIONS.md`) and write integration tests before any business code.
