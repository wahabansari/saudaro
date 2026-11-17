# identity-service

Authentication service for the platform: user registration, login, refresh-token rotation, logout, and the public
key set (JWKS) used to verify tokens. It runs on port `4001`. Only the API gateway may call the `/v1/auth/*` routes,
using a service token. The `/.well-known/jwks.json` route is public.

| | |
|---|---|
| Port | `4001` |
| Schema / roles | `identity` · runtime `identity_svc` · migrations `identity_migrator` |
| Endpoints | `POST /v1/auth/register` (gateway only, `202`), `POST /v1/auth/login`, `POST /v1/auth/refresh` (optional `companyId`), `POST /v1/auth/logout` (`204`), `GET /.well-known/jwks.json`, `GET /health/live`, `GET /health/ready`, `GET /metrics` |
| Tables | `users`, `sessions`, `refresh_tokens`, `outbox_events`, `inbox_events`, `audit_log` (append-only) |
| Environment | See `docs/ENVIRONMENT_VARIABLES.md`. Required: `DATABASE_URL`, `AUTH_SIGNING_JWK`, `COMPANY_SERVICE_URL`. |

Refresh tokens are opaque, stored only as SHA-256 hashes, and rotated on every use. Replaying a rotated token revokes
its session, except within a 5-second grace window. When `refresh` receives a `companyId`, identity asks the company
service for the membership and adds the company claim only if the membership is active.

Tests: `npx vitest run apps/backend/services/identity-service` (from the repository root). The tests use an embedded
PostgreSQL and need no setup.

```bash
npm run db:bootstrap        # roles + schemas (root)
npm run db:migrate          # applies migrations as identity_migrator (root)
npm run start -w @saudaro/identity-service
curl http://127.0.0.1:4001/health/ready
```

Readiness returns 503 when the database is unreachable, the role is a superuser, `BYPASSRLS` or the table owner, or
migrations are missing. See `docs/LOCAL_DEVELOPMENT.md`.
