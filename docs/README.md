# Documentation

Start with `UI_DESIGN_BRIEF.md` if you are designing or building the interface. Start with `LOCAL_DEVELOPMENT.md` if you
are running the backend.

## Product and data (for design)

| Document                                   | What it answers                                                               |
| ------------------------------------------ | ----------------------------------------------------------------------------- |
| `UI_DESIGN_BRIEF.md`                       | Entry point: product, status, document map, client contract, design questions |
| `API_REFERENCE.md`                         | Calling the GraphQL API, authentication flow, operations, error codes, limits |
| `ROLES_AND_PERMISSIONS.md`                 | Tenant model, roles, the 23 permission keys, UI gating                        |
| `domain/REFERENCE_DATA_AND_CATALOG.md`     | Modules A, F — reference lists and product catalog                            |
| `domain/IDENTITY_AND_COMPANIES.md`         | Modules B, C, D, E — identity, companies, files, verification                 |
| `domain/TRADE_PROFILES_AND_RFQ.md`         | Modules G, H, I — profiles, RFQs, supplier matching                           |
| `domain/QUOTATIONS_AND_DEALS.md`           | Modules J, K — quotations, negotiation, deals                                 |
| `domain/COMMUNICATION_REPUTATION_ADMIN.md` | Modules L, M, N, O — messaging, reviews, notifications, administration        |
| `DATA_DICTIONARY.md`                       | Generated: every column, key, index and policy of the built service schemas   |

The full 155-table column-level dictionary of the designed database is `../backend/docs/DATABASE_REFERENCE.md`
(generated; the ERD and design notes are next to it).

## Architecture and operations

| Document                     | What it answers                                               |
| ---------------------------- | ------------------------------------------------------------- |
| `ARCHITECTURE_ASSESSMENT.md` | Inspection findings, gap analysis, table-to-service ownership |
| `SYSTEM_ARCHITECTURE.md`     | Components, authentication design, events, sagas              |
| `ARCHITECTURE_DECISIONS.md`  | Decisions (ADRs), assumptions, open questions                 |
| `PROJECT_STRUCTURE.md`       | Repository layout and responsibilities                        |
| `GRAPHQL_ARCHITECTURE.md`    | Gateway pipeline and defences                                 |
| `POSTGRESQL_ACCESS.md`       | Roles, schemas, isolation guarantees, connection budget       |
| `DATABASE_MIGRATIONS.md`     | Drizzle workflow and the migration runner                     |
| `ENVIRONMENT_VARIABLES.md`   | Every environment variable per component                      |
| `LOCAL_DEVELOPMENT.md`       | Running, testing and adding a service                         |
| `TESTING_GUIDE.md`           | Test layout and what the tests prove                          |
| `DOCKER_GUIDE.md`            | Compose stack (not yet verified locally)                      |

## Keeping generated documents current

```bash
npm run docs:data-dictionary      # regenerates DATA_DICTIONARY.md from the real migrations
```

The designed database's reference is regenerated with `npm run docs:generate` inside `backend/`.
