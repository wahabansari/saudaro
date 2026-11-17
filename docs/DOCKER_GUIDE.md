# Docker Guide

> **NOT VERIFIED LOCALLY.** Docker is not installed on the development machine. `docker-compose.yml`,
> `infrastructure/docker/Dockerfile` and the CI `docker-build` job were written against the apps' real environment
> schemas and the YAML parses, but nothing has been built or started yet. The first real build will be the CI job.
> Treat any failure there as expected feedback, not a regression.

## What the stack contains

| Service                         | Image / target                    | Port (loopback)  |
| ------------------------------- | --------------------------------- | ---------------- |
| `postgres` (`saudaro-postgres`) | `postgres:18-alpine`              | 5432             |
| `db-init` (one-shot)            | Dockerfile target `tools`         | —                |
| `api-gateway`                   | Dockerfile target `runtime`       | 4000             |
| `identity-service`              | Dockerfile target `runtime`       | 4001             |
| `company-service`               | Dockerfile target `runtime`       | 4002             |
| `otel-collector` → `jaeger`     | contrib collector / Jaeger        | Jaeger UI 16686  |
| `prometheus`                    | `prom/prometheus`                 | 9090             |
| `redis`, `rabbitmq`             | profile `messaging` (opt-in)      | 6379, 5672/15672 |

Only implemented components are listed. There are intentionally **no containers for unimplemented services**.
Redis and RabbitMQ are behind a profile because no code uses them yet.

## Usage

```bash
cp .env.example .env
docker compose config            # validate first
docker compose up --build        # db-init creates roles/schemas, runs migrations, exits; then services start
npm run health-check             # from the host
docker compose down              # add -v to delete the database volume
```

Database: `saudaro_marketplace`, superuser `admin` / `root123` (local only, published on 127.0.0.1 only). Services use
their own least-privilege roles — see `POSTGRESQL_ACCESS.md`.

## Notes

- Containers run `NODE_ENV=development` because production mode requires TLS to PostgreSQL (`DATABASE_SSL`), and the local
  server has none. Production images must set TLS, real secrets, and run as the non-root `node` user (already set).
- The runtime image holds only the bundle plus production `node_modules`; no source, no dev tools.
- Never publish PostgreSQL beyond loopback with the local credentials.
