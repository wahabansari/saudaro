# Environment Variables

All values are validated at startup with Zod (`@saudaro/validation → loadEnv`). Invalid configuration fails fast
and the error message lists variable names only — never the values.

## Every service (identity, company)

| Variable                       | Default / rule                                | Notes                                                 |
| ------------------------------ | --------------------------------------------- | ----------------------------------------------------- |
| `NODE_ENV`                     | `development` (`test`, `production`)          |                                                       |
| `HOST` / `PORT`                | `127.0.0.1` / 4001 identity, 4002 company     | Containers must set `HOST=0.0.0.0`                    |
| `LOG_LEVEL`                    | `info`                                        | `silent` in tests                                     |
| `DATABASE_URL`                 | **required**                                  | The service's **runtime** role only (`<name>_svc`)    |
| `DATABASE_SSL`                 | `disable`; `require` / `verify-full`          | `disable` is **rejected when `NODE_ENV=production`**  |
| `DATABASE_SSL_CA`              | optional                                      |                                                       |
| `DB_POOL_MAX`                  | 10 (1–100)                                    |                                                       |
| `AUTH_PUBLIC_JWKS`             | `{"keys":[]}`                                 | Public keys only                                      |
| `AUTH_ISSUER` / `AUTH_AUDIENCE`| `saudaro-identity` / `saudaro-api`            |                                                       |
| `OTEL_EXPORTER_OTLP_ENDPOINT`  | unset → tracing is a no-op                    | Export path not verified against a collector yet      |

## Identity and company

| Variable                      | Service  | Rule                                                                                  |
| ----------------------------- | -------- | ------------------------------------------------------------------------------------- |
| `AUTH_SIGNING_JWK`            | identity | **Required.** Private Ed25519 JWK (with `kid`) that signs user access tokens          |
| `COMPANY_SERVICE_URL`         | identity | **Required.** Base URL for the membership lookup                                      |
| `REFRESH_TTL_SECONDS`         | identity | Default 1 209 600 (14 days)                                                           |
| `AUTH_PUBLIC_JWKS`            | all      | JSON `{"keys":[...]}` with the identity key and the gateway key (`"use":"svc"`)      |

## API Gateway service calls

| Variable              | Default                   | Notes                                                                       |
| --------------------- | ------------------------- | --------------------------------------------------------------------------- |
| `IDENTITY_SERVICE_URL` | `http://127.0.0.1:4001`  |                                                                             |
| `COMPANY_SERVICE_URL` | `http://127.0.0.1:4002`   |                                                                             |
| `TRUST_PROXY`         | `0`                       | Number of reverse-proxy hops to trust for the client IP (rate-limit key). Set to 1 behind one load balancer |
| `GATEWAY_SIGNING_JWK` | unset                     | Private JWK signing service tokens. Unset ⇒ downstream calls fail with 503; **required in production** |

Generate all three key variables with `npm run keys:generate` (local only; production keys come from a secret manager).

## API Gateway

| Variable                                  | Default                                   |
| ----------------------------------------- | ----------------------------------------- |
| `PORT`                                    | 4000                                      |
| `CORS_ORIGINS`                            | `http://localhost:5173` (exact match list)|
| `GRAPHQL_MAX_DEPTH` / `GRAPHQL_MAX_COMPLEXITY` | 10 / 1000                            |
| `GRAPHQL_PERSISTED_ONLY`                  | `true` in production, else `false`        |
| `GRAPHQL_INTROSPECTION`                   | `false` in production, else `true`        |
| `MAX_BODY` / `MAX_RESPONSE_BYTES`         | `100kb` / 1 048 576                       |
| `REQUEST_TIMEOUT_MS`                      | 15 000                                    |
| `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX` | 60 000 / 300 (in-memory store for now)    |
| `SLOW_OPERATION_MS`                       | 1000                                      |

## Scripts (host-side tooling only)

| Variable                                   | Default (development only)                                           |
| ------------------------------------------ | -------------------------------------------------------------------- |
| `DATABASE_ADMIN_URL`                       | `postgres://admin:root123@127.0.0.1:5432/saudaro_marketplace`        |
| `<NAME>_SVC_PASSWORD`                      | `<name>_svc_dev_pass`                                                |
| `<NAME>_MIGRATOR_PASSWORD`                 | `<name>_migrator_dev_pass`                                           |

When `NODE_ENV=production` the scripts **refuse to use these defaults**: every password and the admin URL must be set.
`admin` / `root123` is a local bootstrap credential only; it must never reach a deployed environment.

See `/.env.example` for a copy-paste template.
