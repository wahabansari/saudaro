# company-service

Company service for the platform: company creation, the list of a user's companies, and membership lookups used by
identity. It runs on port `4002`. The `/v1/companies*` routes are called by the API gateway and need a service token
plus a user token. The `/internal/memberships/:companyId/:userId` route may be called only by identity-service.

| | |
|---|---|
| Port | `4002` |
| Schema / roles | `company` · runtime `company_svc` · migrations `company_migrator` |
| Endpoints | `POST /v1/companies` (creates the company; the creator becomes its active owner, `201`), `GET /v1/companies/mine`, `GET /internal/memberships/:companyId/:userId`, `GET /health/live`, `GET /health/ready`, `GET /metrics` |
| Tables | `companies`, `memberships`, `outbox_events`, `inbox_events`, `audit_log` (append-only) |
| Environment | See `docs/ENVIRONMENT_VARIABLES.md`. Required: `DATABASE_URL`. |

Row-level security is forced on `companies` and `memberships`. Each request runs in a transaction with the tenant
context set, and a membership can be created only for a company that the same user created.

Tests: `npx vitest run apps/backend/services/company-service` (from the repository root). The tests use an embedded
PostgreSQL and need no setup.

```bash
npm run db:bootstrap        # roles + schemas (root)
npm run db:migrate          # applies migrations as company_migrator (root)
npm run start -w @saudaro/company-service
curl http://127.0.0.1:4002/health/ready
```

Readiness returns 503 when the database is unreachable, the role is a superuser, `BYPASSRLS` or the table owner, or
migrations are missing. See `docs/LOCAL_DEVELOPMENT.md`.
