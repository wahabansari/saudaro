# Testing Guide

Vitest 5 + Supertest. **The database is never mocked**: RLS, grants, triggers and migrations only mean something
against a real PostgreSQL, so integration tests start an embedded PostgreSQL 18 (no Docker required).

```bash
npm test                              # everything
npx vitest run packages/database-utils   # one package
```

Current result (last run, twice in a row): **21 test files, 245 tests, all passing**; `tsc --noEmit`, ESLint and Prettier
clean. `tests/e2e/auth-and-company.test.ts` runs real identity + company services behind real gateways over HTTP on one
embedded database.
Coverage percentage has **not been measured** yet — no figure is claimed.

## Layout

| Kind        | Where                                   | Notes                                                          |
| ----------- | --------------------------------------- | -------------------------------------------------------------- |
| Unit        | `packages/*/tests`, `*/tests/unit`      | Pure logic: errors, tokens, validation, cursors, complexity    |
| Integration | `*/tests/integration`                   | Real PG: role bootstrap → migrate → app → HTTP via Supertest   |
| Security    | `api-gateway/tests/security`            | CORS, persisted queries, limits, error envelope                |

`vitest-global-setup.ts` starts one embedded server and `provide`s `pgAdminUrl`; each suite calls
`createTestDatabase(inject('pgAdminUrl'))` for an isolated database and `drop()`s it afterwards.

## What the service integration tests prove

- readiness is 200 with migrations applied and a least-privilege role;
- readiness is **503** before migrations run and when the process connects as a superuser (fail closed);
- the runtime role cannot run DDL, cannot touch another service's schema, and cannot UPDATE the audit log;
- an event enqueued in a transaction is relayed by the outbox relay;
- configuration fails fast and never echoes secret values.

## Not covered yet (be honest in reviews)

RabbitMQ publish/consume against a real broker, Redis, OTLP export to a collector, container builds, and any
browser/e2e flow — none of these exist or can run on the current machine. CI builds the images but does not run them.
