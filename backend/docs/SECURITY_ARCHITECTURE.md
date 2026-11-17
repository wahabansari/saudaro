# SAUDARO — Security Architecture

Status legend: ✅ implemented and covered by an automated test · 🟡 implemented in the data layer, application layer pending · ⬜ designed, not yet built.

## 1. Principles

1. **The database is the last line of defence.** Authorization is enforced by PostgreSQL row-level security (RLS) *and* triggers, not only by application code or the frontend.
2. **Least privilege everywhere.** No normal connection is a superuser, a table owner, or `BYPASSRLS`.
3. **The client never names its tenant.** The active company is *requested* by the API but *verified by the database* against an active membership on every statement.
4. **Fail closed.** Unknown context ⇒ no rows. Readiness fails if the runtime role is over-privileged.

## 2. Database roles (`src/database/scripts/bootstrap-roles.ts`)

| Role | Login | Purpose | Notes |
|---|---|---|---|
| `saudaro_migrator` | yes | owns the database and all objects; runs migrations and reference seeds | never used at runtime; `saudaro_*` role membership with `SET` only so it can hand ownership of definer objects away |
| `saudaro_app` | yes | API runtime | `NOSUPERUSER NOBYPASSRLS`, owns nothing, per-table/column grants only, `statement_timeout 15s`, `idle_in_transaction_session_timeout 10s`, `lock_timeout 5s`, connection limit 100 |
| `saudaro_worker` | yes | outbox/notification/scan/matching jobs, pre-auth token flows | `NOBYPASSRLS`; has its own narrow permissive policies; 60s timeout |
| `saudaro_readonly` | yes | reporting | `default_transaction_read_only`; reference data only |
| `saudaro_authz` | **no** | owner of all `SECURITY DEFINER` functions | `NOBYPASSRLS`; policies grant it only the reads/writes its functions need |
| `saudaro_pub` | **no** | owner of `app.public_*` projection views | column-level `SELECT` only |

The test `role hardening` asserts no `saudaro_*` role has `SUPERUSER`, `BYPASSRLS` or `CREATEROLE`, and that all definer functions are owned by `saudaro_authz` ✅. The Docker superuser (`admin`) exists only to run `npm run db:bootstrap`.

## 3. Tenant context

```
request → authenticate (IdP/JWT, pending) → userId
        → withTenantContext(pool, {userId, companyId}, fn)
             BEGIN;
             select set_config('app.current_user_id', $1, true),        -- transaction-local
                    set_config('app.current_company_id', $2, true);
             … business queries (RLS evaluated against these) …
             COMMIT/ROLLBACK;                                            -- settings vanish
```

* Values are bound parameters (no string concatenation) and Zod-validated as UUIDs before reaching the database ✅.
* `set_config(…, true)` is the parameterized `SET LOCAL`: it is transaction-scoped, so a pooled connection cannot carry one request's context into the next, including after errors ✅ (tests: *single reused connection*, *40 parallel mixed-tenant requests on a 2-connection pool*).
* `app.active_company()` / `app.writable_company()` return the company only if `app.current_user_id` has an **active membership** in it, the user is `active`, and the company is not `closed` (writes additionally need company status `draft|active`, so suspended companies are read-only) ✅. A forged or stale company id grants nothing ✅; a removed or suspended user loses access on the next statement ✅.
* If the context is missing, every tenant policy evaluates to false ✅ (*raw saudaro_app connection sees nothing*).

## 4. Authorization layers

1. **RBAC** — 23 permissions, 5 system roles with hierarchy levels, optional custom company roles below owner level. Policies call `can_write('rfq.create')` etc. ✅ (viewer cannot create; member cannot delete…).
2. **Row-level security** — policy per table and operation, generated from one declarative spec (`src/database/policies/spec.ts` → `0005_rls_policies_and_grants.sql`). A test fails if the committed SQL drifts from the spec, and another fails if any table lacks RLS (or FORCE) ✅.
3. **Column privileges** — where state is system-managed the app role gets `UPDATE (col, …)` only (e.g. `users` personal fields, `companies.is_business_verified` is writable only by the definer role).
4. **Guard triggers** — state machines and invariants RLS cannot express (§6).
5. **Resource relationships** — e.g. a quotation is visible to its supplier, and to the RFQ's buyer once it is not a draft; a file is visible to its owner, to holders of an unexpired un-revoked grant, or through the owning join row (deal document, message attachment, quotation/RFQ attachment).

### SECURITY DEFINER functions (owner `saudaro_authz`, `search_path` pinned, all names schema-qualified)

`active_company`, `writable_company`, `is_member`, `role_level`, `has_perm`, `is_platform_admin`, `shares_company_with`, `is_conversation_participant`, `is_deal_party`, `is_public_company`, `is_public_seller`, `rfq_owner`, `can_view_rfq`, `can_quote_rfq`, `rfq_item_belongs_to_revision`, `resolve_identity`, `create_company`, `accept_invitation`, `ensure_company_has_owner`, `sync_company_verified`. They exist to read membership/admin tables *without* weakening those tables' own policies (no recursion, no BYPASSRLS). `create_company` and `accept_invitation` re-derive the actor from `app.uid()` and validate everything themselves; the app role has **no** direct `INSERT` on `companies`.

Guard triggers skip their checks only for "trusted callers": superuser (fixtures/emergency), `saudaro_migrator` (deploy), `saudaro_authz` (inside the definer functions above). The runtime role can never `SET ROLE` to them ✅ (test).

## 5. Public data without leaking private data

Suppliers cannot read the `rfqs` table (owner-only RLS). They read `app.public_rfqs`, `public_rfq_items`, `public_rfq_specifications`, `public_rfq_destinations`, `public_companies` — `security_barrier` views owned by `saudaro_pub`, whose column grants exclude `target_unit_price`, `created_by_user_id`, internal rules and visibility settings ✅. Row eligibility lives in `can_view_rfq` (published, not expired, public or invited, country/verification/seller-type rules) and is **never** a function of a match score. Seller capacity, MOQ, lead times, payment terms and buyer profiles are private (owner + worker only); only capabilities/markets/ports/Incoterms/certifications of a *published* seller profile are visible.

## 6. Immutability and integrity as security controls

* Submitted quotation revisions, their items/terms/attachments, and the deal snapshot are immutable even for their owner ✅.
* Quotation acceptance serializes on the RFQ row and is finally protected by a partial unique index ✅ (concurrency test: exactly one of two simultaneous acceptances wins).
* Deal creation verifies at COMMIT that the snapshot equals the accepted revision ✅ (tampered price rejected).
* Audit, history and security-event tables reject `UPDATE/DELETE/TRUNCATE` for every role ✅.
* Role escalation paths closed ✅: self-promotion, granting ≥ own level, modifying ≥ own level, adding oneself, outsiders adding members, inviting at/above one's level, custom roles at owner level, editing system roles, ownerless company.

## 7. Sensitive data

| Data | Handling |
|---|---|
| Passwords | never plaintext; optional `user_auth_identities.password_hash` holds an argon2id PHC string only for self-hosted credentials; external IdP preferred 🟡 |
| Reset / verification / invitation / session tokens | only SHA-256 **hashes** are stored (`token_hash`) ✅ |
| MFA secrets, verification provider payloads | `bytea` ciphertext + `encryption_key_id`; **keys live in KMS/secret manager, never in the DB** 🟡 (encryption service pending) |
| Business registration identifiers | tenant-private + verification officers; a *verified* identifier is globally unique to stop impersonation ✅ |
| Files | metadata only in PostgreSQL; binaries in private object storage; no permanent public URL; short-lived signed URLs minted after an RLS-authorized read; malware-scan gating enforced by constraints ✅ / storage + scanner integration ⬜ |
| Messages | never indexed for search, never logged; participant-only ✅ |
| Logs | structured Pino; `authorization`, `cookie`, `*.password`, `*.token`, `*.secret` redacted; error responses never include SQL/driver detail ✅ |

## 8. Connection & transport

TLS: `DATABASE_SSL=require|verify-full` (production start-up **refuses** `disable`) ✅. Statement/lock/idle-in-transaction timeouts are role defaults and pool options ✅. Pool size is bounded; Docker publishes Postgres on loopback only ✅. Prepared/parameterized statements everywhere; the only dynamic SQL is in migrations/DO blocks on identifiers from catalogs. Readiness (`/health/ready`) fails if the runtime role is superuser, `BYPASSRLS`, or owns tables ✅; the server refuses to start in that state ✅.

## 9. Threat model (condensed)

| Threat | Control | Residual risk |
|---|---|---|
| Cross-tenant read/write via API bug | RLS FORCE + composite tenant FKs + tests | none known; keep tests in CI |
| Forged company id | membership re-verified per statement | — |
| Pool context leak | transaction-local settings; error-path test | custom code bypassing `withTenantContext` must be banned by review/lint |
| SQL injection | parameters only; least-privilege role; no DDL, no `SET ROLE`, no writes to reference/audit | **an attacker who can run arbitrary SQL as `saudaro_app` can `SET app.current_user_id` to any user id** (GUC is not signed). Mitigation roadmap: signed/HMAC context (`app.context_sig`) verified by `app.uid()`, or per-tenant roles with `SET LOCAL ROLE` |
| Privilege escalation inside a company | hierarchy triggers; definer functions | admin MFA enforcement is application-level 🟡 |
| Malicious admin | admin actions need a stated reason and are audited; admin powers split by role | `super_admin` is powerful: require MFA + dual control operationally |
| Tampering with history | append-only triggers (even owner) | a superuser can drop triggers: restrict superuser access, ship WAL/audit to immutable storage |
| Enumeration via unique-constraint errors | verified identifiers/slugs are global by design | accepted |
| Data exfiltration through search | tenant policies apply to every query; no message search; public views whitelist columns | review every new search projection |
| Stolen backup | encrypted storage + TLS; app-level encryption for the most sensitive fields | key custody process ⬜ |

## 10. Backup and recovery (operational requirements)

Continuous WAL archiving to object storage with **point-in-time recovery**, daily base backups, retention ≥ 30 days, restore drills at least quarterly (target RPO ≤ 5 min, RTO ≤ 1 h), backups encrypted at rest with keys outside the database. Migrations are reviewed (generated RLS SQL is diffed in CI) and applied only by `saudaro_migrator`. Never change production schema manually.

## 11. Test evidence

`tests/security/rls-isolation.test.ts` (27 assertions) proves the ten mandatory scenarios: cross-tenant RFQ isolation, supplier quotation isolation, private documents/grants, removed-member loss of access, private conversations, supplier profile isolation, public RFQ field whitelist, pooled-connection context isolation, role-escalation prevention, and direct `saudaro_app` access under RLS. `tests/integration/workflows.test.ts` and `tests/database/schema-integrity.test.ts` cover RBAC, lifecycle state machines, concurrency, deal snapshots, constraints, seeds idempotency and the HTTP foundation. Run `npm test`.

## 11a. Independent security review (ecc `security-reviewer`) — outcome

The reviewer exercised the system as `saudaro_app` and confirmed the findings below. All are fixed and pinned by `tests/security/review-findings.test.ts`.

| # | Finding | Fix |
|---|---|---|
| F1 HIGH | buyer could cancel a deal unilaterally by inserting an `accepted` cancellation | `guard_deal_cancellation`: insert forced to `requested`; only the counterparty may accept/reject; requester may only withdraw |
| F2 HIGH | buyer could plant any company as a deal party (then read/change the deal) | `deal_parties` writable only in the deal-creation transaction |
| F3 HIGH | role manager could raise their custom role's level and outrank superiors | `guard_company_role`: level must stay below the actor's own; key/company immutable |
| F4 MED | session-level `set_config` survived on pooled connections | `DISCARD ALL` before every `release()` |
| F6 MED | definer functions were oracles for arbitrary ids; **`EXECUTE` was PUBLIC by default** | `PUBLIC` execute revoked on all `app.*` functions (default privileges and explicit); oracles answer only about the caller's own company; `resolve_identity` moved to the worker/auth pool |
| F7 MED | a file could be attached to another tenant's deal/message by UUID | composite tenant FKs `(file_id, company_id)` on `deal_document_versions` and `message_attachments` |
| F8 MED | sent messages editable forever | edits allowed ≤ 15 min and only until another participant read it |
| low | raw driver errors (with `detail`) logged; `ssl=require` did not verify the certificate; no rate limiting; participant add without consent | error logs scrubbed; TLS modes always verify (optional `DATABASE_SSL_CA`); rate limiting and consent flow remain **open** (app layer / U-10) |

**Accepted / open:** F5 — a SQL-injection attacker running arbitrary SQL as `saudaro_app` can still impersonate any user id by setting the context GUC. The recommended fix (HMAC-signed context verified inside `app.uid()` against a key readable only by `saudaro_authz`) is decision U-2 and should be done before production.

A second finding surfaced by the query-plan work: Drizzle emitted `DESC NULLS LAST`, which cannot serve `ORDER BY … DESC` (PostgreSQL's default is `NULLS FIRST`). All descending index columns are now declared `DESC NULLS FIRST`; a plan test guards this.

## 12. Not yet implemented (be explicit)

Authentication provider integration and session issuance; field-level encryption service/KMS client; object-storage client, signed URLs and malware-scan worker; rate limiting and WAF; matching engine; notification delivery worker; admin MFA enforcement; GDPR-style erasure/pseudonymization job; signed tenant-context (see §9).
