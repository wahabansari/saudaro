# PostgreSQL Access Model

One cluster, one database (`saudaro_marketplace`), **one schema and two roles per service**.

| Role                | Purpose                                        | Rights                                                                 |
| ------------------- | ---------------------------------------------- | ---------------------------------------------------------------------- |
| `admin` (superuser) | Local bootstrap only (`db:bootstrap`)          | Never used by any service. Local dev password `root123`; rotate/replace in every shared environment |
| `<name>_migrator`   | Owns the schema, runs that service's migrations| DDL inside its own schema only; no database-level CREATE               |
| `<name>_svc`        | Runtime role used by the service               | DML on its schema's tables; owns nothing; not superuser; no BYPASSRLS  |

Why not just use `admin`: a superuser bypasses row-level security and every grant, so a bug or injection in the app
would have unlimited reach. Services therefore refuse to report ready when their role is unsafe
(`assertSafeRuntimeRole`: superuser, BYPASSRLS, or owning tables ⇒ `/health/ready` returns 503). This is covered by
tests.

## Guarantees (each asserted by an automated test or by `npm run database-check`)

- `company_svc` gets SQLSTATE `42501` reading or writing the `identity` schema, and vice versa.
- `<name>_svc` cannot run DDL (`CREATE TABLE` → `42501`).
- `audit_log` is append-only for the runtime role (UPDATE → `42501`) and protected by a trigger.
- Migrations run as the migrator; the runtime role cannot alter its own grants.

## Per-service common tables

Created by every service's `0000_common_tables.sql` (generated from `commonTablesSql(schema)` — single source of truth,
regenerate with `npx tsx scripts/gen-common-migration.ts`): `outbox_events`, `inbox_events`, `audit_log`.

## Connection budget (horizontal scaling)

Every replica holds up to `DB_POOL_MAX` (default 10) connections. Size the cluster as
`replicas × DB_POOL_MAX (+ migrator) ≤ max_connections − reserved` and put a pooler (PgBouncer in transaction mode) in
front once replicas multiply. The runtime role has **no connection cap by default**; set `DB_APP_CONNECTION_LIMIT`
when running `npm run db:bootstrap` to cap each service role. Rolling deploys briefly run old and new replicas
together, so leave headroom for the surge.

## Housekeeping

`npm run db:purge` deletes expired and long-revoked identity sessions and their refresh tokens (run it on a schedule,
e.g. daily). Outbox and inbox tables are unbounded until the message relay exists; add their purge with it.

## Connecting for inspection

```text
postgres://admin:root123@127.0.0.1:5432/saudaro_marketplace     # local superuser, via compose or your own server
```

Inspect as the least-privileged role when reproducing app behaviour:
`postgres://identity_svc:identity_svc_dev_pass@127.0.0.1:5432/saudaro_marketplace`.

Compose publishes PostgreSQL on **127.0.0.1 only**. Never publish it on `0.0.0.0` with these credentials.

## Tenant context (carried over from the first foundation)

Row-level security keys off transaction-local settings applied by `withTenantContext` (`set_config(..., true)` and
`DISCARD ALL` afterwards, so a pooled connection can never leak a tenant). Per ADR-008 the tenant claim arrives in a
short-lived signed token and is cross-checked against the service's membership projection.
