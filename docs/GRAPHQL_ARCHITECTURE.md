# GraphQL Architecture (API Gateway)

Apollo Server 5 on Express 5, mounted at `POST /graphql`. The gateway **owns the SDL** (`@saudaro/graphql-contracts`);
services expose internal REST/events, never GraphQL to browsers (ADR-001).

Implemented operations today: `Query.health` and `Query.viewer`. More arrive with the services that back them.

## Request pipeline

CORS (exact-origin allowlist) → helmet → rate limit → JSON body limit (`MAX_BODY`) → persisted-query gate →
Apollo (depth plugin → complexity plugin → execution → response-size plugin → metrics/error-envelope plugin).

## Defences (each has a test in `apps/backend/api-gateway/tests/`)

| Control               | Behaviour                                                                                  |
| --------------------- | ------------------------------------------------------------------------------------------ |
| Persisted queries     | Production: only SHA-256 hashes in the build-time allowlist run; client query text is discarded; unknown hash → `PERSISTED_QUERY_NOT_FOUND`; no hash → `PERSISTED_QUERY_REQUIRED` |
| Introspection         | Off in production unless `GRAPHQL_INTROSPECTION=true`                                       |
| Depth / complexity    | `GRAPHQL_MAX_DEPTH` (10) and in-house `estimateComplexity` (`GRAPHQL_MAX_COMPLEXITY`, 1000) |
| Response size         | `MAX_RESPONSE_BYTES` cap                                                                    |
| Rate limiting         | `express-rate-limit`, per-process memory store. **Not shared across replicas** — a shared Redis store is planned |
| Errors                | One envelope for REST and GraphQL: `code`, `message`, `retryable`, `requestId`; stacks only outside production |
| Auth                  | EdDSA JWT verified against `AUTH_PUBLIC_JWKS`; `requireAuth` in resolvers |

## Dependency rule: one `graphql` instance

The `graphql` package must be loaded exactly once (ESM and CJS copies break `instanceof` checks). `graphql-query-complexity`
was removed for this reason and replaced with `estimateComplexity`. The production build keeps third-party packages
external so the image contains a single copy.

## Adding an operation

1. Extend the SDL and `OPERATIONS` in `@saudaro/graphql-contracts`; the hash allowlist is derived from `OPERATIONS`.
2. Add the resolver; call the owning service through a typed client (service JWT, `aud` = target service).
3. Add an integration test (success, auth failure, validation failure, limits).
