# Identity, Companies, Files and Verification (modules B, C, D, E)

Snapshot: 2026-11-17. Purpose: a complete brief to design every screen for these four areas without reading code.

Sources: `backend/docs/DATABASE_REFERENCE.md` (sections B–E), `backend/docs/ERD.md`, `backend/docs/DATABASE_DESIGN.md`, `backend/docs/SECURITY_ARCHITECTURE.md`, `backend/src/database/schema/{identity,companies,documents,verification,admin}.ts`, `backend/src/database/migrations/*.sql`, `backend/src/database/seeds/reference-data.ts`, `apps/backend/services/identity-service/**`, `apps/backend/services/company-service/**`, `apps/backend/api-gateway/src/{resolvers,graphql}/**`, `packages/api-contracts`, `packages/authentication`, `packages/event-contracts`, `docs/ARCHITECTURE_ASSESSMENT.md` §4, `docs/ARCHITECTURE_DECISIONS.md` ADR-003 and ADR-023…026.

---

## 0. How to read this

| Tag | Meaning |
|---|---|
| **[IMPL]** | Built and tested in `identity-service` or `company-service` today. Exact shape in §2.3b / §3.3b. |
| **[DESIGN]** | In the 155-table schema (DATABASE_REFERENCE.md) but not built. Behaviour is what the DB enforces. |
| **[IMPL≠DESIGN]** | Built with different names or rules. Listed in §6. Design the UI against the DESIGN column unless the screen is limited to what is built. |

Access legend (used in RLS rules below):

| Term | Meaning |
|---|---|
| `ME` | The caller's user id. |
| `ACTIVE_CO` | A company the caller has an **active** membership in, with the user active and company status not `closed`. |
| `WRITABLE_CO` | As `ACTIVE_CO`, and company status is `draft` or `active` (not `suspended`, not `closed`). |
| `can(x)` | The caller's role in that company holds permission `x`. |
| `admin(r)` | The caller holds an unrevoked platform admin role `r` (or `super_admin`). |
| `is_public_company` | Company status is `active`. |

Admin roles (platform, not company): `super_admin`, `verification_officer`, `moderator`, `support`, `compliance_officer`, `readonly_auditor`.

Enumerations are verbatim from DB CHECK constraints. Column names are verbatim.

---

## 1. Status at a glance

| Module | Tables | Owner (target) | Implemented today | Designed only |
|---|---|---|---|---|
| **B** Identity and authentication | 10 | `identity-service` (schema `identity`, port 4001). `user_notification_preferences` belongs to notification service (ARCHITECTURE_ASSESSMENT §4). | `users` (partial), `sessions` + `refresh_tokens` (≈ `user_sessions`) | `user_auth_identities`, `user_mfa_methods`, `user_security_events`, `email_verification_tokens`, `password_reset_tokens`, `phone_verification_tokens`, `user_preferences`, `user_notification_preferences` |
| **C** Companies, membership, RBAC | 12 | `company-service` (schema `company`, port 4002) | `companies` (partial), `memberships` (≈ `company_memberships`) | `company_addresses`, `company_business_types`, `company_contacts`, `company_invitations`, `company_profiles`, `company_registration_identifiers`, `company_role_permissions`, `company_roles`, `company_settings`, `permissions` |
| **D** Files and documents | 5 | `document` service, **proposed** (ADR-003, decision D-1 pending) | None | `files`, `file_versions`, `file_access_grants`, `file_scan_results`, `company_documents` |
| **E** Verification and compliance | 9 | `verification` service (ARCHITECTURE_ASSESSMENT §4) | None | All 9 |

### Implemented endpoints

| Surface | Endpoint / operation | Result |
|---|---|---|
| Gateway GraphQL | `Mutation.register(input)` | `Boolean!` |
| Gateway GraphQL | `Mutation.login(input)` | `AuthPayload { accessToken, refreshToken }` |
| Gateway GraphQL | `Mutation.refresh(refreshToken, companyId?)` | `AuthPayload` (with `companyId` switches active company) |
| Gateway GraphQL | `Mutation.logout(refreshToken)` | `Boolean!` |
| Gateway GraphQL | `Mutation.createCompany(input { id?, legalName, countryCode })` | `Company` |
| Gateway GraphQL | `Query.viewer` | `Viewer { userId, companyId, permissions }` |
| Gateway GraphQL | `Query.myCompanies` | `[Company!]!` (`id, legalName, countryCode, roleKey`) |
| identity-service (gateway only) | `POST /v1/auth/register` | `202`, empty body |
| identity-service (gateway only) | `POST /v1/auth/login` | `200` tokens |
| identity-service (gateway only) | `POST /v1/auth/refresh` | `200` tokens |
| identity-service (gateway only) | `POST /v1/auth/logout` | `204` |
| identity-service (public) | `GET /.well-known/jwks.json` | key set |
| company-service (gateway) | `POST /v1/companies` | `201` `{ id, legalName, countryCode, roleKey: "owner" }` |
| company-service (gateway) | `GET /v1/companies/mine` | active memberships, max 100 |
| company-service (identity only) | `GET /internal/memberships/:companyId/:userId` | not a UI route |

Gateway-wide rate limit: 300 requests per 60 s per client IP (in-memory). It covers every gateway request, not login alone.

Not built anywhere: MFA, email verification, phone verification, password reset, change password, profile update, session list, invitations, roles, settings, company profile, addresses, contacts, registration identifiers, files, verification, compliance.

---

## 2. Module B: Identity and authentication

### 2.1 Purpose (product language)

A person creates a login (email + password), proves the email (and optionally a phone), may add a second factor (MFA), signs in, stays signed in through short access tokens and long refresh sessions, manages personal details and preferences, and can review their own security history. A user is global. Access to a company comes only from a membership (module C), never from the user record.

### 2.2 Owner and status

- Owner: `identity-service`, schema `identity`, runtime role `identity_svc`.
- Implemented: sign-up, login, refresh (with optional company switch), logout, JWKS.
- Designed only: everything else in §2.3.

### 2.3 Tables (DESIGN, DATABASE_REFERENCE §B)

| Table | What it represents | Key columns (exact names; notable types) | Relations |
|---|---|---|---|
| `users` | **[DESIGN]** The global person account. | `id` uuid PK; `email` citext UNIQUE (`ux_users_email`); `display_name` text NOT NULL, no default; `status` text default `pending`; `locale` text default `en`; `timezone` text default `UTC`; `phone_e164` text (E.164); `email_verified_at`; `phone_verified_at`; `last_login_at`; `suspended_at`; `suspension_reason`; `deletion_requested_at`; `deleted_at`; `version` int default 1; `created_at`; `updated_at` | Parent of every B table (`user_id`, cascade). Referenced by company tables and admin roles. |
| `user_auth_identities` | **[DESIGN]** One login method per user: local password or external provider. | `id` uuid PK; `user_id` uuid; `provider` text; `provider_subject` text (unique with `provider`); `email_at_provider` citext; `password_hash` text (required iff `provider` = `local`); `password_updated_at`; `last_used_at`; `created_at`; `updated_at` | `user_id` → `users` cascade |
| `user_sessions` | **[DESIGN]** Refresh-token sessions, with device metadata. | `id` uuid PK; `user_id` uuid; `token_hash` text; `family_id` uuid; `ip_address` inet; `user_agent` text; `expires_at`; `revoked_at`; `last_seen_at`; `created_at` | `user_id` → `users` cascade |
| `user_mfa_methods` | **[DESIGN]** Enrolled second factors. | `id` uuid PK; `user_id` uuid; `method_type` text; `label` text; `secret_ciphertext` bytea (never displayed); `encryption_key_id` text; `verified_at`; `last_used_at`; `disabled_at`; `created_at`; `updated_at` | `user_id` → `users` cascade |
| `user_security_events` | **[DESIGN]** Append-only log of security events for the user. | `id` uuid PK; `user_id` uuid; `event_type` text (no CHECK); `ip_address` inet; `user_agent` text; `detail` jsonb; `created_at` | `user_id` → `users` cascade. Append-only (no UPDATE/DELETE/TRUNCATE). |
| `email_verification_tokens` | **[DESIGN]** One-time proof that the user controls an email address. | `id` uuid PK; `user_id` uuid; `email` citext; `token_hash` text; `expires_at`; `consumed_at`; `created_at` | `user_id` → `users` cascade |
| `password_reset_tokens` | **[DESIGN]** One-time password reset. | `id` uuid PK; `user_id` uuid; `token_hash` text; `expires_at`; `consumed_at`; `created_at` | `user_id` → `users` cascade |
| `phone_verification_tokens` | **[DESIGN]** One-time proof of a phone number. | `id` uuid PK; `user_id` uuid; `token_hash` text; `phone_e164` text; `attempts` int default 0, CHECK 0–10; `expires_at`; `consumed_at`; `created_at` | `user_id` → `users` cascade |
| `user_preferences` | **[DESIGN]** Personal display settings, one row per user. | `user_id` uuid PK; `language_code` text default `en`; `date_format` text default `YYYY-MM-DD`; `marketing_opt_in` bool default false; `created_at`; `updated_at` | `user_id` → `users` cascade (1:1) |
| `user_notification_preferences` | **[DESIGN]** On/off per category and channel. | `id` uuid PK; `user_id` uuid; `category` text; `channel` text; `enabled` bool default true; `created_at`; `updated_at`; UNIQUE (`user_id`, `category`, `channel`) | `user_id` → `users` cascade |

#### 2.3b Implemented shape [IMPL]

| Table | Columns (exact, from `identity/migrations/0000–0002`) | Differences from DESIGN |
|---|---|---|
| `users` | `id` uuid PK; `email` text (stored NFKC, lower-case, trimmed; UNIQUE `ux_users_email`); `password_hash` text NOT NULL; `locale` text nullable; `status` text default `active`, CHECK `active`/`disabled`; `session_version` int default 1; `created_at` | No `display_name`, `timezone`, `email_verified_at`, phone columns, `version`, `updated_at`. Password hash sits here, not in `user_auth_identities`. Default status is `active`, not `pending`. |
| `sessions` | `id` uuid PK; `user_id` uuid FK; `revoked_at`; `expires_at` NOT NULL; `created_at` | No `family_id`, `ip_address`, `user_agent`, `last_seen_at`. Lives in table `identity.sessions`. |
| `refresh_tokens` | `token_hash` text PK (SHA-256 of opaque token); `session_id` uuid FK; `created_at`; `used_at` (set = rotated) | Separate table. Not in DESIGN. |
| `outbox_events`, `inbox_events`, `audit_log` | Infrastructure. `audit_log.actor_type` CHECK: `user`, `admin`, `system`, `service`. `audit_log` is append-only. | Not UI-facing. |

### 2.4 Enumerations (B)

| Field | Allowed values (verbatim) |
|---|---|
| `users.status` **[DESIGN]** | `pending`, `active`, `suspended`, `deactivated`, `deletion_requested`, `deleted` (default `pending`) |
| `users.status` **[IMPL]** | `active`, `disabled` (default `active`) |
| `user_mfa_methods.method_type` | `totp`, `webauthn`, `sms`, `recovery_codes` |
| `user_notification_preferences.category` | `rfq`, `quotation`, `message`, `deal`, `verification`, `invitation`, `security`, `system` |
| `user_notification_preferences.channel` | `in_app`, `email`, `push`, `sms` |
| Rule on the above | Category `security` + channel `in_app` + `enabled = false` is rejected. That toggle must stay on. |
| `user_auth_identities.provider` | Only rule given: `local` ⇔ `password_hash` is not null. Other provider values are not enumerated in sources. |
| `user_security_events.event_type` | No CHECK. Values not enumerated in sources. |
| `audit_log.action` **[IMPL]** | Implemented value: `session.refresh_token_reused`. |
| `audit_log.actor_type` **[IMPL]** | `user`, `admin`, `system`, `service` |
| `user_preferences.date_format` | Default `YYYY-MM-DD`. Allowed list not enumerated in sources. |
| `user_preferences.language_code`, `users.locale` | Free text. Default `en`. API accepts 2–10 characters. |
| `users.phone_e164` | Must match `^\+[1-9][0-9]{6,14}$` (or null). |
| `users.email` | Must contain `@` not at position 1. API: valid email, max 254 characters. |
| `phone_verification_tokens.attempts` | 0 to 10 |
| Password (API) | 12 to 128 characters. Sent as typed; normalised NFKC before hashing. |

### 2.5 Lifecycles

**Account status (DESIGN, `users.status`)**

```
self sign-up ──> pending   (trigger forces: status pending, email_verified_at NULL,
                            phone_verified_at NULL, suspended_at NULL, deleted_at NULL)
pending  ──(email verification: flow not defined in sources)──> active
active   ──(admin / system, sets suspended_at + suspension_reason)──> suspended
suspended ──(reverse path not defined in sources)──> active
active / suspended ──> deactivated | deletion_requested ──> deleted   (flows not defined in sources)
```

- Enforced by: `guard_user` trigger (self sign-up cannot pre-verify or pre-activate), CHECK `users_status_chk`.
- Any status other than `active` removes all tenant access at once: every RLS helper requires `users.status = 'active'`.
- Changing `phone_e164` clears `phone_verified_at` (trigger `guard_user`).
- Account erasure / pseudonymisation job is an open decision (U-3). Not built.

**Account status (IMPL)**

```
register ──> active  (no email step)
active ──> disabled  (value allowed; no endpoint sets it in sources)
```
- Login and refresh refuse any user whose status is not `active`.

**Sign-in and session tokens (IMPL, implemented values)**

| Item | Value | Note |
|---|---|---|
| Access token | JWT, EdDSA, `typ` `at+jwt`, **300 s (5 min)** | Claims: `sub`, `sid`, `ver`, `perms`, `amr`, and `cid` only after a company is chosen. |
| Refresh token | Opaque, 256-bit. Only SHA-256 stored. | Returned at login and on every refresh. |
| Session lifetime | **Absolute 14 days** (`REFRESH_TTL_SECONDS` default 1,209,600; minimum 60) | Fixed at login. Refresh does not extend `sessions.expires_at`. |
| Access token after logout | Still valid until its 5-minute expiry | No deny-list yet (Redis deferred). |
| Internal service token | 60 s | Not UI. |

Refresh-token state machine (IMPL):

```
login ──> session S, refresh R1 (unused)
refresh(R1) ──> R1 used (used_at set), new R2 issued; access token issued
   R1 replayed within 5 s  ──> 401 INVALID_REFRESH_TOKEN, session NOT revoked (double-submit / two tabs)
   R1 replayed after 5 s   ──> session S revoked, audit "session.refresh_token_reused", 401
   concurrent refresh loses the race ──> 401, session NOT revoked
   unknown / expired session / revoked session / inactive user ──> 401 INVALID_REFRESH_TOKEN
logout(R) ──> session S revoked (204); its access token keeps working until expiry
```

Company switch (IMPL): `refresh(refreshToken, companyId)` asks company-service for the membership.
- Active membership: new access token with `cid` and that company's `perms`. Refresh token is rotated as usual.
- Not active or no membership: `NOT_A_MEMBER` and the refresh token is **not** consumed.

Not built: logout-everywhere (the `session_version` / `ver` claim exists but nothing increments it), access-token revocation before expiry.

**MFA enrolment (DESIGN; state derived from columns, no trigger in sources)**

```
enrol   ──> row created: verified_at NULL                 (pending verification)
verify  ──> verified_at set                              (active factor, usable for sign-in)
disable ──> disabled_at set                              (inactive)
```
- The `amr` claim comments name `pwd`, `otp`, `webauthn` as methods; only `pwd` is emitted in the built code.
- `require_mfa_for_admins` (company_settings) is stored; enforcement location is not in sources.

**Email verification (DESIGN)**: a token row (`token_hash`, `expires_at`, `consumed_at`). App role cannot UPDATE token rows (RLS update: none). Setting `users.email_verified_at` is not an app-updatable column. The flow that consumes a token is not defined in sources.

**Password reset (DESIGN)**: a token row, same rules as above. Changing password writes `user_auth_identities.password_hash`, `password_updated_at`, `last_used_at` (the only app-updatable columns of that table).

**Phone verification (DESIGN)**: a token row with `attempts` (0–10). `attempts` at 10 is the limit the CHECK allows; behaviour at the limit is not defined in sources.

### 2.6 Access rules (what a user sees)

- Every B table is owner-only (`user_id = ME`), with these exceptions:
  - `users`: readable by `ME`, by users sharing an active company with the caller (`shares_company_with`), and by `admin(support)`.
  - `users`: app can update only `display_name`, `locale`, `timezone`, `phone_e164`. Not `email`, `status`, `email_verified_at`.
- `user_sessions`: owner can read, insert, update (`revoked_at`, `last_seen_at`), delete. Owner can therefore list and revoke their own sessions.
- `user_mfa_methods`: owner can read, insert, update (`label`, `verified_at`, `last_used_at`, `disabled_at`), delete.
- `user_notification_preferences`: owner full CRUD; only `enabled` is updatable.
- `user_preferences`: owner read, insert, update. No delete.
- `user_security_events`: owner read and insert. No update, no delete (append-only).
- Token tables (`email_verification_tokens`, `password_reset_tokens`, `phone_verification_tokens`): owner read and insert. No app update, no delete.
- Suspended or disabled user: no tenant data at all (RLS helpers check status).
- Gateway: tenant identifiers come only from the verified access token (`cid`, `perms`). Client input cannot choose a company.
- IMPL: identity schema has no RLS (global identity data).

### 2.7 Screens and data (B)

**Sign up** [IMPL fields; DESIGN adds one]
- Fields: `email` (required, valid, max 254); `password` (required, 12–128 characters); `locale` (optional, 2–10 characters, default `en`).
- DESIGN also requires `display_name` (NOT NULL in `users`; not collected by built register).
- States: idle; submitting; "check your email" confirmation. Always shown after submit, whether or not the email exists (the built API answers `202` in every case). Never show "email already registered".
- Validation errors: email format, password length.

**Sign in** [IMPL]
- Fields: `email`, `password`.
- States: idle; submitting; failure shows the single message "Invalid email or password." (same for unknown email, wrong password and disabled account); success.
- After success: store access and refresh tokens. Company selection comes next (module C).

**Email verification (DESIGN)**
- Entry from emailed link; token in URL.
- States: verifying; verified; token expired; token already used.

**Forgot password / reset (DESIGN)**
- Fields: `email` (request); `password` new (12–128) on the reset page.
- States: request sent (same message for all emails); reset success; token expired or used.

**Change password (DESIGN)**
- Fields: `password` new (12–128). Current-password requirement is not stated in sources.
- States: saved (`password_updated_at` shown); error.

**Profile (DESIGN)**
- Fields: `display_name` (required), `locale`, `timezone` (default `UTC`), `phone_e164` (E.164).
- Read-only: `email`, email verified badge (`email_verified_at`), phone verified badge (`phone_verified_at`).
- States: saved; phone changed → phone shows "unverified"; invalid phone format.

**Phone verification (DESIGN)**
- Fields: phone number (E.164); one-time code entry (code not described in sources beyond `token_hash`).
- States: code sent; verified; wrong code (attempts counter, max 10); expired.

**Security (DESIGN)**
- Active sessions list. Fields per row: `created_at`, `last_seen_at`, `expires_at`, `ip_address`, `user_agent`, `revoked_at`. Action: revoke (sets `revoked_at`). "Current device" marker: not defined in sources.
- Security events timeline. Fields: `event_type`, `ip_address`, `user_agent`, `created_at`, `detail`.
- MFA methods list. Fields: `method_type` (`totp`, `webauthn`, `sms`, `recovery_codes`), `label`, `verified_at`, `last_used_at`, `disabled_at`.
- Add MFA: choose `method_type`; set `label`; verify; shows recovery codes only if `method_type` = `recovery_codes`.
- States per MFA row: pending verification (`verified_at` empty); active; disabled (`disabled_at` set).

**Preferences (DESIGN)**
- Fields: `language_code` (default `en`), `date_format` (default `YYYY-MM-DD`), `marketing_opt_in` (toggle, default off), `timezone`.
- Notification matrix: rows = `category` (8 values), columns = `channel` (4 values), each cell a toggle (`enabled`, default on). The `security` / `in_app` cell is locked on.

**Company switcher (IMPL)**
- Source: `myCompanies` list (`legalName`, `countryCode`, `roleKey`).
- Choose a company → refresh with `companyId`.
- States: no companies (show "create company"); switching; not a member (`NOT_A_MEMBER`).

**Session expired (IMPL behaviour)**
- Refresh fails with `INVALID_REFRESH_TOKEN` ("Your session is invalid. Please sign in again.") → send user to sign-in.

---

## 3. Module C: Companies, membership and RBAC

### 3.1 Purpose (product language)

A company is the tenant: the business that buys, sells, verifies and publishes. A person joins a company through an invitation or as its creator, gets a role, and acts only inside that company. Roles form a strict hierarchy: you can act only on people and roles below your own level. A company always keeps at least one owner. The company holds its public profile, addresses, contacts, legal identifiers, preferences and team.

### 3.2 Owner and status

- Owner: `company-service`, schema `company`, runtime role `company_svc`.
- Implemented: create company, list my companies, membership lookup for identity.
- Designed only: everything else in §3.3.

### 3.3 Tables (DESIGN, DATABASE_REFERENCE §C)

| Table | What it represents | Key columns (exact names; notable types) | Relations |
|---|---|---|---|
| `companies` | **[DESIGN]** The tenant. | `id` uuid PK; `legal_name` text; `display_name` text; `slug` citext UNIQUE (`ux_companies_slug`); `status` text default `draft`; `country_id` uuid; `created_by_user_id` uuid; `is_business_verified` bool default false (system-maintained); `suspended_at`; `suspension_reason`; `closed_at`; `version` int; `search_vector` tsvector (generated); `created_at`; `updated_at` | `country_id` → `countries` (restrict); `created_by_user_id` → `users` (restrict) |
| `company_addresses` | **[DESIGN]** Registered, operational, factory, warehouse, billing or other addresses. | `id`; `company_id`; `address_type` text; `line1` text; `line2`; `city_id` uuid; `city_name` text; `state_province_id` uuid; `state_name`; `postal_code`; `country_id` uuid; `latitude` numeric(9,6); `longitude` numeric(9,6); `is_public` bool default false; `verified_at`; `created_at`; `updated_at` | `company_id` → `companies` cascade; `city_id` → `cities`; `state_province_id` → `states_provinces`; `country_id` → `countries`. One `registered` address per company (partial unique). |
| `company_business_types` | **[DESIGN]** Business types of the company. | `company_id` + `business_type_id` (PK); `is_primary` bool default false; `created_at` | `company_id` → `companies` cascade; `business_type_id` → `business_types` (reference). One primary per company (partial unique). |
| `company_contacts` | **[DESIGN]** Named people or channels for the company. | `id`; `company_id`; `user_id` uuid (optional link); `full_name` text; `job_title`; `email` citext; `phone_e164`; `contact_type` text default `general`; `is_public` bool default false; `created_at`; `updated_at` | `company_id` → `companies` cascade; `user_id` → `users` (set null). CHECK: email or phone present. |
| `company_invitations` | **[DESIGN]** Pending offer to join at a given role. | `id`; `company_id`; `email` citext; `role_id` uuid; `token_hash` text; `status` text default `pending`; `invited_by_user_id`; `expires_at`; `accepted_by_user_id`; `accepted_at`; `created_at` | `company_id` → `companies` cascade; `role_id` → `company_roles` (restrict); `invited_by_user_id` / `accepted_by_user_id` → `users` (restrict). One `pending` per (`company_id`, `email`). |
| `company_memberships` | **[DESIGN]** The only link between a user and a company. | `id`; `company_id`; `user_id`; `role_id` uuid; `status` text default `active`; `invited_by_user_id` (set null); `joined_at`; `removed_at`; `removed_by_user_id` (set null); `version` int; `created_at`; `updated_at`; UNIQUE (`company_id`, `user_id`) | `company_id` → `companies` cascade; `user_id` → `users` cascade; `role_id` → `company_roles` (restrict) |
| `company_profiles` | **[DESIGN]** Public-facing profile, one row per company. | `company_id` uuid PK; `tagline` text; `description` text; `year_established` smallint; `employee_count_range` text; `website` text; `is_public` bool default false; `published_at`; `created_at`; `updated_at` | `company_id` → `companies` cascade (1:1) |
| `company_registration_identifiers` | **[DESIGN]** Legal and trade identifiers (registration number, tax ID, VAT, EORI …). | `id`; `company_id`; `country_id` uuid; `identifier_type` text; `identifier_value` text; `issued_at`; `expires_at`; `verified_at`; `created_at`; `updated_at`; UNIQUE (`company_id`, `country_id`, `identifier_type`, `identifier_value`) | `company_id` → `companies` cascade; `country_id` → `countries` (restrict). A verified value is unique across all companies per (`country_id`, `identifier_type`, `identifier_value`). |
| `company_roles` | **[DESIGN]** Role definitions: five system roles (`company_id` NULL) and custom roles. | `id`; `company_id` uuid (NULL for system); `key` text; `name` text; `description`; `level` smallint (0–100); `is_system` bool default false; `created_at`; `updated_at` | `company_id` → `companies` cascade. Key unique per scope (partial unique indexes). |
| `company_role_permissions` | **[DESIGN]** Permissions granted by a role. | `role_id` + `permission_id` (PK); `created_at` | `role_id` → `company_roles` cascade; `permission_id` → `permissions` cascade |
| `company_settings` | **[DESIGN]** Company preferences, one row per company. | `company_id` uuid PK; `default_currency_id` uuid; `default_language_id` uuid; `timezone` text default `UTC`; `default_quote_validity_days` smallint default 30; `default_rfq_visibility` text default `public`; `require_mfa_for_admins` bool default false; `created_at`; `updated_at` | `company_id` → `companies` cascade (1:1); `default_currency_id` → `currencies`; `default_language_id` → `languages` |
| `permissions` | **[DESIGN]** Catalogue of permission keys (reference data, 23 rows seeded). | `id`; `key` text (dotted); `category` text; `description` text; `created_at` | Read-only for all roles. Referenced by `company_role_permissions`. |

#### 3.3b Implemented shape [IMPL]

| Table | Columns (exact, from `company/migrations/0000–0003`) | Differences from DESIGN |
|---|---|---|
| `companies` | `id` uuid PK; `legal_name` text NOT NULL; `country_code` char(2) NOT NULL, CHECK `^[A-Z]{2}$`; `created_by` uuid NOT NULL; `created_at` | No `display_name`, `slug`, `status`, `country_id` FK, `version`, `updated_at`, suspension or closure columns. Creator is set as `created_by`. |
| `memberships` | `company_id` + `user_id` (PK); `role_key` text NOT NULL; `status` text CHECK `active`/`suspended`/`removed`; `created_at` | Table name `memberships` (DESIGN: `company_memberships`). Role is a text key, not `role_id`. No `joined_at`, `removed_at`, `version`. Only role key written: `owner`. |

### 3.4 Enumerations (C)

| Field | Allowed values (verbatim) |
|---|---|
| `companies.status` | `draft`, `active`, `suspended`, `closed` (default `draft`) |
| `company_addresses.address_type` | `registered`, `operational`, `factory`, `warehouse`, `billing`, `other` |
| `company_contacts.contact_type` | `sales`, `export`, `purchasing`, `finance`, `legal`, `general` (default `general`) |
| `company_registration_identifiers.identifier_type` | `business_registration`, `tax_id`, `vat`, `eori`, `import_export_license`, `duns`, `lei`, `other` |
| `company_profiles.employee_count_range` | `1-10`, `11-50`, `51-200`, `201-500`, `501-1000`, `1000+` (or null) |
| `company_profiles.website` | Must match `^https?://` (or null) |
| `company_profiles.year_established` | 1800 to 2200 (or null) |
| `company_settings.default_rfq_visibility` | `public`, `private`, `invited` (default `public`) |
| `company_settings.default_quote_validity_days` | 1 to 365 (default 30) |
| `company_invitations.status` | `pending`, `accepted`, `revoked`, `expired` (default `pending`) |
| `company_memberships.status` | `active`, `suspended`, `removed` (default `active`) |
| `company_roles.key` | Lower-case: starts with a letter, then letters, digits or `_`, 2–41 characters. |
| `company_roles.level` | 0 to 100. Custom roles must be below 100. |
| `companies.slug` | 3–64 characters: lower-case letters, digits, `-`; not starting or ending with `-`. |
| `permissions.key` | Dotted lower-case, e.g. `rfq.create` (pattern `^[a-z_]+(\.[a-z_]+)+$`). |
| `company_contacts` | Must have `email` or `phone_e164`. |

**System roles (seeded, `company_id` NULL, immutable)**

| `key` | Name | `level` |
|---|---|---|
| `owner` | Owner | 100 |
| `admin` | Administrator | 80 |
| `manager` | Manager | 60 |
| `member` | Member | 40 |
| `viewer` | Viewer | 20 |

**Permission catalogue (23 keys, seeded) and which system role holds each** (O = owner, A = admin, M = manager, Me = member, V = viewer; V holds none)

| Key | Category | O | A | M | Me | Description (seed) |
|---|---|---|---|---|---|---|
| `company.manage` | company | Y | | | | Manage company status and registration identifiers |
| `company.profile.manage` | company | Y | Y | Y | | Edit public company profile, addresses and contacts |
| `members.manage` | team | Y | Y | | | Add, change and remove team members (below own level) |
| `roles.manage` | team | Y | Y | | | Create and edit custom roles |
| `invitations.manage` | team | Y | Y | | | Invite people to the company |
| `settings.manage` | company | Y | Y | | | Edit company settings |
| `files.manage` | files | Y | Y | Y | Y | Upload files and manage file access grants |
| `verification.submit` | verification | Y | Y | Y | | Submit documents for business verification |
| `catalog.manage` | catalog | Y | Y | Y | Y | Manage products and listings |
| `seller_profile.manage` | trade | Y | Y | Y | | Manage the seller trade profile |
| `buyer_profile.manage` | trade | Y | Y | Y | | Manage the buyer profile |
| `rfq.create` | rfq | Y | Y | Y | Y | Create and edit RFQs |
| `rfq.manage` | rfq | Y | Y | Y | | Delete drafts, invite suppliers, answer clarifications, compare quotations |
| `quotation.create` | quotation | Y | Y | Y | Y | Create and edit quotation drafts |
| `quotation.submit` | quotation | Y | Y | Y | | Submit, revise and withdraw quotations |
| `quotation.accept` | quotation | Y | Y | Y | | Accept or reject quotations and create deals |
| `messages.send` | messaging | Y | Y | Y | Y | Send messages in conversations |
| `messages.manage` | messaging | Y | Y | Y | | Add colleagues to conversations |
| `deal.manage` | deal | Y | Y | Y | | Manage deal documents, milestones, shipments and cancellations |
| `deal.confirm` | deal | Y | Y | Y | | Confirm deal steps on behalf of the company |
| `review.write` | reputation | Y | Y | Y | | Write reviews |
| `review.respond` | reputation | Y | Y | Y | | Respond to reviews |
| `audit.read` | security | Y | Y | | | Read the company audit log |

Counts: owner 23, admin 22 (all except `company.manage`), manager 17, member 5, viewer 0.

**Platform admin roles** (for admin screens, module O owns the assignment table): `super_admin`, `verification_officer`, `moderator`, `support`, `compliance_officer`, `readonly_auditor`.

### 3.5 Lifecycles

**Company status (DESIGN, `companies.status`)**

```
draft ──(owner: company.manage)──> active
draft ──(owner)──> closed
active ──(owner)──> closed                 (sets closed_at)
active ⇄ suspended                         (moderator only; sets / clears suspended_at and suspension_reason)
any status ──(moderator)──> any status
```
- Enforced by `guard_company_update` (illegal change → error "illegal company status change").
- `draft` and `active` are writable (`WRITABLE_CO`). `suspended`: members can still read, cannot write. `closed`: not an active tenant; tenant rows hidden.
- Clients cannot change `country_id`, `created_by_user_id`, `is_business_verified`, `id`.
- Platform admin `moderator` can change status; admin role `admin` (company) cannot (lacks `company.manage`).

**Membership status (DESIGN, `company_memberships.status`)**

```
(insert: owner at company creation, or invitation accepted; trigger forces status active)
active ⇄ suspended                 (members.manage, target below own level)
active | suspended ──> removed     (members.manage below own level, OR self-leave)
removed ──> active                 (re-join via invitation; same row reused)
```
- `guard_company_membership`: nobody adds themselves; no grant at or above own level; no change to a member at or above own level; no self role change; self-service only to `removed` (leave). `removed_at` / `removed_by_user_id` set on removal and cleared otherwise.
- `ensure_company_has_owner` (deferred, checked at commit): a company that is not `closed` must keep at least one active member with the system `owner` role. Leaving or demoting the last owner fails with "a company must keep at least one active owner".
- Re-joining through an invitation when status is `active` or `suspended` fails: "already a member of this company".
- Note: the trigger does not block a direct status update from `removed` to `active` by a member who holds `members.manage`. Invitation is the designed path.

**Invitation status (DESIGN, `company_invitations.status`)**

```
created ──> pending                     (invitations.manage; invited role must be below own level)
pending ──(invitee accepts: accept_invitation)──> accepted
pending ──(inviter: UPDATE status)──> revoked
pending ──(expires_at passes)──> expired    (no sweeper built; accept refuses expired invites anyway)
```
- `accept_invitation` requires: caller authenticated; invitation exists with status `pending` and `expires_at` in the future; caller's user is `active`, `email_verified_at` set, and caller's email equals the invitation email; no active or suspended membership already.
- Only `status` is app-updatable on invitations. Consistency CHECK: `accepted` ⇔ `accepted_at` set.
- Expired pending invitations block a new invite to the same email until a sweeper flips them (DATABASE_DESIGN §8.7). Not built.

**Role hierarchy (DESIGN, enforced by triggers)**
- Act only on lower levels. Each action below requires actor level strictly greater than the target:
  - grant or invite a role: role level < own level;
  - change a member: target's current level < own level, and new role level < own level;
  - define or edit a custom role: new level < own level (and current level < own level on edit).
- Custom roles: level 0–99 (CHECK `company_roles_custom_level_chk`).
- System roles: immutable (no rename, no permission change, no delete).
- Custom role permissions: a user can grant only permissions they hold.
- Owners cannot be created as custom roles (level 100 reserved).

### 3.6 Access rules (what changes what a user sees)

| Data | Read | Write |
|---|---|---|
| `companies` | Members (`is_member`) or any `admin` | Owner or any member with `company.manage` (in `WRITABLE_CO`); moderator |
| `company_profiles` | `ACTIVE_CO`, or public when `is_public` and company `active` | `WRITABLE_CO` and `company.profile.manage` |
| `company_addresses` | `ACTIVE_CO`, or `is_public` and company `active` | `WRITABLE_CO` and `company.profile.manage` |
| `company_contacts` | `ACTIVE_CO`, or `is_public` and company `active` | `WRITABLE_CO` and `company.profile.manage` |
| `company_business_types` | `ACTIVE_CO`, or any company `active` | `WRITABLE_CO` and `company.profile.manage` |
| `company_registration_identifiers` | `ACTIVE_CO`, or `admin(verification_officer)` | `WRITABLE_CO` and `company.manage` (owner only in seed) |
| `company_settings` | `ACTIVE_CO` | `WRITABLE_CO` and `settings.manage` (update only; no insert/delete) |
| `company_memberships` | Own rows (`user_id = ME`) and all rows of `ACTIVE_CO` | Insert: `WRITABLE_CO` and `members.manage`. Update: `WRITABLE_CO` and `members.manage`, or own row (leave only). No delete. |
| `company_invitations` | `ACTIVE_CO` (all members see the list) | Insert and update: `WRITABLE_CO` and `invitations.manage`. No delete. |
| `company_roles` | System roles: everyone. Custom: `ACTIVE_CO`. | Custom roles only: `WRITABLE_CO` and `roles.manage`, level rules above. |
| `company_role_permissions` | Visible roles | Custom roles only; `roles.manage`; holder of the permission |
| `permissions` | Everyone | Migration owner only |

Other access effects:
- Membership status `suspended` or `removed`: no permissions at all.
- `companies.status` `suspended`: members read; no writes.
- `companies.status` `closed`: `ACTIVE_CO` returns nothing; tenant rows hidden.
- Token permissions drive UI gating. Built membership lookup returns the role's permissions for all system roles (see §6 item 6).
- Admin (level 80) can manage members and grant roles only below 80, so never another admin or an owner.

### 3.7 Screens and data (C)

**Create company** [IMPL fields] / [DESIGN additions]
- Fields built: `legalName` (required, 2–200 characters, trimmed); `countryCode` (required, two upper-case letters). Optional `id` (client id; retrying the same id returns the same company).
- DESIGN adds: `display_name` (required), `slug` (required, 3–64 characters, pattern in §3.4), `country_id` (picked from countries), creation limit 25 per creator (`create_company` function).
- States: submitting; created (`201`, `roleKey` `owner`); conflict; limit reached (DESIGN).
- After creation: the company is `draft` in DESIGN (`status` column). Built code has no status; treat as active owner membership.

**My companies / switcher** [IMPL]
- List items: `legalName`, `countryCode`, `roleKey`. Max 100, oldest first.
- States: empty (prompt to create); loaded; switching; not a member.

**Company overview** [DESIGN]
- Shows: `legal_name`, `display_name`, `slug`, status badge (`draft` / `active` / `suspended` / `closed`), verified badge (`is_business_verified`), `suspension_reason` (when suspended), `created_at`.
- Actions by permission: close company or change registration identifiers (`company.manage`, owner only in seed).

**Company profile editor** [DESIGN]
- Fields: `tagline`; `description`; `year_established` (1800–2200); `employee_count_range` (six options); `website` (http or https); `is_public` (toggle, default off); read-only `published_at`.
- States: private (default); public; saved; invalid website; permission missing (read-only view for `viewer` / `member`).

**Addresses** [DESIGN]
- List: `address_type`, `city_name`, `country`, `is_public`, verified badge (`verified_at`).
- Editor fields: `address_type` (six options); `line1` (required); `line2`; city (pick `city_id` or type `city_name`, required); state/province (pick `state_province_id` or `state_name`); `postal_code`; `country_id` (required); `latitude`, `longitude` (6 decimals); `is_public`.
- States: no registered address (prompt); duplicate `registered` (blocked); public or private.

**Business types** [DESIGN]: multi-select of `business_types`; one marked `is_primary`.

**Contacts** [DESIGN]
- Fields: `full_name` (required); `job_title`; `email`; `phone_e164`; `contact_type` (six options, default `general`); optional link to a `user_id`; `is_public`.
- Validation: at least `email` or `phone_e164`.

**Registration identifiers** [DESIGN]
- Fields: `identifier_type` (eight options); `country_id`; `identifier_value` (required); `issued_at`; `expires_at`.
- States: unverified; verified (`verified_at` set, shows globally unique); duplicate value (refused).
- Editable by owner (`company.manage`) only. Verification officers see them read-only.

**Company settings** [DESIGN]
- Fields: `default_currency_id`; `default_language_id`; `timezone` (default `UTC`); `default_quote_validity_days` (1–365, default 30); `default_rfq_visibility` (`public` / `private` / `invited`, default `public`); `require_mfa_for_admins` (toggle, default off; enforcement not located in sources).
- Requires `settings.manage` (owner, admin).

**Team (members)** [DESIGN]
- Table columns: user (`display_name`, `email`), role (`company_roles.name`, `level`), `status` (`active` / `suspended` / `removed`), `joined_at`, `invited_by_user_id`, `removed_at`, `removed_by_user_id`.
- Row actions shown only where the hierarchy allows: change role (lower roles only), suspend / reactivate, remove. Rows at or above the viewer's level: read-only.
- Own row: "Leave company" only.
- States per row: active; suspended (no permissions); removed (history, can be re-invited).
- Leave refused for last owner: "a company must keep at least one active owner".

**Invite member** [DESIGN]
- Fields: `email` (required); `role_id` (only roles below viewer's level); `expires_at`.
- States: pending created; duplicate pending email (refused); invalid role.
- Invitations list: `email`, role, `status` (`pending` / `accepted` / `revoked` / `expired`), `invited_by_user_id`, `expires_at`, `accepted_at`. Action on `pending`: revoke.

**Accept invitation** [DESIGN]
- Requires signing in with the invited email, and that email verified.
- States: invitation invalid or expired; signed-in email does not match; email not verified; already a member; joined (shows company and role).

**Roles and permissions** [DESIGN]
- System roles: five cards (`name`, `key`, `level`, permission list). Read-only.
- Custom roles editor: `key` (lower-case, 2–41), `name`, `description`, `level` (0–99, below own level), permission checklist limited to permissions the editor holds.
- States: role read-only (system); saved; level at or above own (refused); permission not held (refused).

**Create / leave company actions** covered above.

**Audit log** (`audit.read`): module O, not in this brief.

---

## 4. Module D: Files and documents

### 4.1 Purpose (product language)

A company uploads files (certificates, licences, catalogues, logos, brochures), each file is malware-scanned before anyone can use it, and the company decides who can see it: the public, verification officers, or specific companies or people it grants access to. Company-level documents (logo, licence, certificate …) are a typed layer on top of files.

### 4.2 Owner and status

- Owner: `document` service, **proposed** (ADR-003; decision D-1 "approve 14th service" pending). Also listed as owning `company_documents` links (ARCHITECTURE_ASSESSMENT §4).
- Implemented: none. Object storage client, signed URLs and malware-scan worker are not built (SECURITY_ARCHITECTURE §12).
- Upload negotiation (`upload_sessions`) is proposed for this service in ARCHITECTURE_ASSESSMENT §4; not in the 155 tables.

### 4.3 Tables (DESIGN, DATABASE_REFERENCE §D)

| Table | What it represents | Key columns (exact names; notable types) | Relations |
|---|---|---|---|
| `files` | A stored file: one object plus its state. | `id` uuid PK; `company_id`; `uploaded_by_user_id`; `storage_provider` text; `bucket` text; `storage_key` text; `original_filename` text; `mime_type` text; `size_bytes` bigint; `sha256` char(64); `access_level` text default `private`; `status` text default `pending_upload`; `scan_status` text default `pending`; `resource_type` text; `resource_id` uuid; `retention_status` text default `active`; `retain_until`; `created_at`; `deleted_at` | `company_id` → `companies` (restrict); `uploaded_by_user_id` → `users` (restrict). UNIQUE (`id`, `company_id`) for composite FKs. `resource_type` / `resource_id` link the file to one owning record (no FK). |
| `file_versions` | Each version of a file. | `id`; `file_id`; `company_id`; `version_no` integer (≥ 1); `storage_key` text; `size_bytes` bigint; `sha256` char(64); `uploaded_by_user_id`; `scan_status` text default `pending`; `created_at` | `(file_id, company_id)` → `files` cascade; `uploaded_by_user_id` → `users` (restrict). UNIQUE (`file_id`, `version_no`). No UPDATE or DELETE by app. |
| `file_access_grants` | Permission for one other company or one user to see a file. | `id`; `file_id`; `company_id`; `grantee_company_id` uuid; `grantee_user_id` uuid; `reason` text; `granted_by_user_id`; `expires_at`; `revoked_at`; `created_at` | `(file_id, company_id)` → `files` cascade; `grantee_company_id` → `companies` cascade; `grantee_user_id` → `users` cascade; `granted_by_user_id` → `users` (restrict). Exactly one grantee. |
| `file_scan_results` | Result of each malware scan. Append-only. | `id`; `file_id`; `company_id`; `scanner` text; `scanner_version` text; `result` text; `signature` text; `scanned_at` | `(file_id, company_id)` → `files` cascade. Append-only. |
| `company_documents` | A file given a business meaning (logo, licence …) and a visibility. | `id`; `company_id`; `file_id` uuid UNIQUE; `document_type` text; `title` text; `visibility` text default `private`; `expires_at`; `created_by_user_id`; `created_at` | `(file_id, company_id)` → `files` cascade; `created_by_user_id` → `users` (restrict). No `updated_at` or `version`. |

### 4.4 Enumerations (D)

| Field | Allowed values (verbatim) |
|---|---|
| `files.status` | `pending_upload` (default), `available`, `quarantined`, `deleted` |
| `files.scan_status` | `pending` (default), `clean`, `infected`, `failed` |
| `files.access_level` | `private` (default), `public` |
| `files.retention_status` | `active` (default), `legal_hold`, `scheduled_deletion`, `deleted` |
| `file_scan_results.result` | `clean`, `infected`, `error` |
| `company_documents.document_type` | `logo`, `business_license`, `certificate_of_incorporation`, `tax_certificate`, `export_license`, `catalog`, `brochure`, `other` |
| `company_documents.visibility` | `private` (default), `verifiers`, `public` |
| `file_versions.scan_status` | No CHECK in migrations. Values not enumerated in sources. |
| `files.size_bytes` | Greater than 0 and at most 524,288,000 (500 MiB) |
| `files.mime_type` | Pattern `^[a-z0-9.+-]+/[a-z0-9.+-]+$` (lower-case type/subtype) |
| `files.original_filename` | 1–255 characters; no `/` or `\` |
| `files.sha256`, `file_versions.sha256` | 64 lower-case hex characters |
| `file_versions.version_no` | ≥ 1 |

### 4.5 Lifecycles

**File state (DESIGN; no transition trigger in sources, only CHECK constraints)**

```
pending_upload ──(upload completes, scan runs)──> available     requires scan_status = clean
scan_status: pending ──> clean | infected | failed
available / quarantined / deleted: values only; the rule that moves a file to quarantined is not in sources
retention_status: active ⇄ legal_hold; active → scheduled_deletion → deleted (flow not in sources)
```

Hard rules enforced by CHECK:
- `status` = `available` requires `scan_status` = `clean`.
- `access_level` = `public` requires `scan_status` = `clean`. A public file cannot be shared before a clean scan.
- Scan results are append-only: each scan adds a `file_scan_results` row.

**Scan states as the UI shows them** (UI guidance; sources define the values and the CHECK rules, not the transition from scan result to status)

| `files.status` | `files.scan_status` | Show |
|---|---|---|
| `pending_upload` | any | "Uploading or awaiting scan" |
| any | `pending` | "Scanning" |
| any | `infected` | "Blocked: malware found" |
| any | `failed` | "Scan failed, try again" |
| `available` | `clean` | "Ready" |
| `quarantined` | any | "Quarantined" |
| `deleted` | any | "Deleted" |

**Access grant (DESIGN)**: active when `revoked_at` is null and (`expires_at` is null or in the future). Revoke sets `revoked_at` (only updatable column).

### 4.6 Access rules

- `files` read: owner company (`ACTIVE_CO`); or any company / anyone when `access_level` = `public`, `status` = `available` and `scan_status` = `clean`; or an active grant (`file_access_grants`); or the file is linked from deal documents, messages, quotation attachments, RFQ attachments or verification documents (cross-module).
- `files` insert: `WRITABLE_CO`, `files.manage`, and `uploaded_by_user_id` = `ME`. Update: `WRITABLE_CO` and `files.manage`, only `status` and `deleted_at`. No delete.
- `file_versions` read: visible when the parent file is visible. Insert: `WRITABLE_CO` and `files.manage`. No update, no delete.
- `file_scan_results` read: visible when the parent file is visible. Written by worker only.
- `file_access_grants` read: owner company, grantee company (`ACTIVE_CO`), or the grantee user. Insert: `WRITABLE_CO`, `files.manage`, `granted_by_user_id` = `ME`. Update (revoke): `WRITABLE_CO` and `files.manage`. No delete.
- `company_documents` read: `ACTIVE_CO`; or `public` and company `active`; or `verifiers` for `admin(verification_officer)`. Insert, update, delete: `WRITABLE_CO` and `company.profile.manage`.
- Holders of `files.manage` (seed): owner, admin, manager, member. Viewer: none.

### 4.7 Screens and data (D)

**Upload document** [DESIGN]
- Fields: file (required, ≤ 500 MiB, > 0 bytes); `original_filename` (≤ 255, no slashes); `mime_type` (derived from file); `document_type` (eight options, required); `title` (required); `visibility` (`private` default, `verifiers`, `public`); `expires_at` (optional).
- States: selected; uploading (`pending_upload`); scanning (`scan_status` pending); ready (`available`, clean); blocked (`quarantined`, infected); failed (scan `failed`).
- Public choice is available only after a clean scan (`access_level` rule).

**Document library** [DESIGN]
- Table: `title`, `document_type`, `visibility`, `expires_at` (expiry badge), file status and scan badge, `created_at`, `created_by_user_id`.
- Filters: `document_type`, `visibility`, expiry state.

**Document detail and versions** [DESIGN]
- Versions table: `version_no`, `size_bytes`, `sha256` (shown truncated), `uploaded_by_user_id`, `scan_status`, `created_at`. Upload a new version.
- Scan history: `scanner`, `scanner_version`, `result` (`clean` / `infected` / `error`), `scanned_at`, `signature`.
- Retention: `retention_status`, `retain_until`.

**Access grants** [DESIGN]
- Grant form: grantee type (company or person; exactly one), `reason`, `expires_at` (optional).
- Grants list: grantee, `reason`, `granted_by_user_id`, `expires_at`, `revoked_at`. Status: active / expired / revoked (derived).
- Action: revoke.

---

## 5. Module E: Verification and compliance

### 5.1 Purpose (product language)

A company asks the platform to check its business. It picks a verification level, uploads evidence, and a verification officer reviews the case. An approved case grants a level to the company. Levels show as badges to buyers and filter who may see some RFQs. Compliance staff keep their own flags and sanctions screening records, which companies cannot see.

### 5.2 Owner and status

- Owner: `verification` service (ARCHITECTURE_ASSESSMENT §4). Event producer name `verification-service` (event-contracts `company.verified.v1`).
- Implemented: none. DESIGN only.
- Companion rule on the company table: `companies.is_business_verified` is recomputed by trigger, not by the client.

### 5.3 Tables (DESIGN, DATABASE_REFERENCE §E)

| Table | What it represents | Key columns (exact names; notable types) | Relations |
|---|---|---|---|
| `verification_cases` | One review request for one company and one level. | `id`; `company_id`; `level` text; `status` text default `draft`; `submitted_by_user_id`; `assigned_admin_user_id`; `submitted_at`; `decided_at`; `decided_by_user_id`; `decision_reason` text; `expires_at`; `version` int; `created_at`; `updated_at` | `company_id` → `companies` (restrict); `submitted_by_user_id`, `assigned_admin_user_id`, `decided_by_user_id` → `users` (restrict). UNIQUE (`id`, `company_id`). At most one open case per (`company_id`, `level`). |
| `verification_documents` | Evidence attached to a case. | `id`; `case_id`; `company_id`; `file_id`; `document_type` text; `issuer_country_id`; `issued_at`; `expires_at`; `review_status` text default `pending`; `reviewed_by_user_id`; `reviewed_at`; `review_note` text; `created_at` | `(case_id, company_id)` → `verification_cases` cascade; `(file_id, company_id)` → `files` (restrict); `issuer_country_id` → `countries`; `reviewed_by_user_id` → `users` |
| `verification_checks` | Automated or manual checks performed on a case. Officer-only. | `id`; `case_id`; `company_id`; `check_type` text; `provider_id`; `result` text default `pending`; `external_reference` text; `details_ciphertext` bytea (never displayed); `encryption_key_id`; `performed_by_user_id`; `checked_at`; `created_at` | `(case_id, company_id)` → `verification_cases` cascade; `provider_id` → `verification_providers`; `performed_by_user_id` → `users` |
| `verification_status_history` | Append-only timeline of case status changes. | `id`; `case_id`; `company_id`; `from_status`; `to_status`; `actor_type` text; `actor_user_id`; `reason`; `created_at` | `(case_id, company_id)` → `verification_cases` cascade; `actor_user_id` → `users` (restrict). Append-only. |
| `company_verification_levels` | A level currently held by the company. | `id`; `company_id`; `level` text; `status` text default `verified`; `granted_case_id`; `granted_at`; `expires_at`; `revoked_at`; `revoked_reason` text; `created_at`; `updated_at`; UNIQUE (`company_id`, `level`) | `company_id` → `companies` (restrict); `(granted_case_id, company_id)` → `verification_cases` (restrict) |
| `verification_expiry_records` | Upcoming expiry tracking for a level or document. | `id`; `company_id`; `case_id`; `verification_document_id`; `expires_at`; `status` text default `upcoming`; `notified_at`; `created_at` | `company_id` → `companies` (restrict); `verification_document_id` → `verification_documents` (set null) |
| `verification_providers` | Catalogue of external or manual check providers (reference data). | `id`; `key` text; `name` text; `provider_type` text; `is_active` bool default true; `created_at`; `updated_at` | Read-only for all roles. |
| `compliance_flags` | A compliance concern raised on a company. Compliance staff only. | `id`; `company_id`; `flag_type` text; `severity` text; `status` text default `open`; `raised_by_user_id`; `notes` text; `resolved_at`; `created_at`; `updated_at` | `company_id` → `companies` (restrict); `raised_by_user_id` → `users` (restrict) |
| `sanctions_screening_records` | Result of a sanctions screening run for a company. Compliance staff only. | `id`; `company_id`; `provider_id`; `result` text; `reference_no` text; `reviewed_by_user_id`; `screened_at`; `next_screening_due_at` | `company_id` → `companies` (restrict); `provider_id` → `verification_providers` (restrict); `reviewed_by_user_id` → `users` (restrict) |

### 5.4 Enumerations (E)

| Field | Allowed values (verbatim) |
|---|---|
| `verification_cases.level` and `company_verification_levels.level` | `email`, `phone`, `business_registration`, `business_address`, `authorized_representative`, `documents_reviewed`, `independent_check` |
| `verification_cases.status` | `draft` (default), `submitted`, `in_review`, `needs_info`, `approved`, `rejected`, `expired`, `revoked` |
| `company_verification_levels.status` | `verified` (default), `expired`, `revoked` |
| `verification_documents.review_status` | `pending` (default), `accepted`, `rejected` |
| `verification_checks.result` | `pending` (default), `pass`, `fail`, `inconclusive` |
| `verification_status_history.actor_type` | `user`, `admin`, `system`, `provider` |
| `verification_expiry_records.status` | `upcoming` (default), `notified`, `expired`, `renewed` |
| `verification_providers.provider_type` | `manual`, `third_party` |
| `compliance_flags.severity` | `low`, `medium`, `high`, `critical` |
| `compliance_flags.status` | `open` (default), `under_review`, `resolved`, `dismissed` |
| `sanctions_screening_records.result` | `clear`, `potential_match`, `confirmed_match`, `error` |
| `verification_documents.document_type`, `verification_checks.check_type`, `compliance_flags.flag_type` | No CHECK. Values not enumerated in sources. |

Rules tied to values:
- Level `email` and `phone` need no approved case; the trigger exempts them. All other levels need an approved case of the same company and level.
- Case `approved`, `rejected`, `revoked` each require `decision_reason`.

### 5.5 Lifecycles

**Verification case (DESIGN; enforced by `guard_verification_case`)**

```
COMPANY SIDE
  insert as draft or submitted (company may not pre-decide; submitted_at set on submitted)
  draft ──(company submits)──> submitted
  needs_info ──(company resubmits)──> submitted
  company may change nothing else on a case

OFFICER SIDE (verification_officer)
  submitted ──> in_review | needs_info | rejected
  in_review ──> approved | rejected | needs_info
  approved  ──> revoked | expired
  needs_info ──> (no officer transition; only company resubmits)
  decision: approved / rejected / revoked require decision_reason; sets decided_at and decided_by_user_id

NOT ENFORCED BY TRIGGER: an approved case moving to expired needs no reason; no sweeper moves cases to expired.
```

Open cases: `draft`, `submitted`, `in_review`, `needs_info`. A new case for the same level is refused while one is open. After `approved`, `rejected`, `revoked` or `expired`, a new case may be opened.

History: every insert and every status change writes `verification_status_history` (`from_status`, `to_status`, `actor_type`, `actor_user_id`, `reason` = decision reason). `actor_type` is `admin` when the actor holds any platform admin role, `system` when there is no user context, otherwise `user`.

**Company verification level (DESIGN)**

```
case approved ──(officer inserts / updates company_verification_levels)──> level verified (granted_case_id set, granted_at set)
verified ──(officer)──> revoked (revoked_at and revoked_reason set)
verified ──(expires_at passes)──> expired    (sweeper not built)
```
- A `verified` level (except `email`, `phone`) needs `granted_case_id` pointing to an **approved** case of the same company and level.
- Revoking a case does not automatically downgrade its level (open item, DATABASE_DESIGN §8.5).
- Level expiry needs the worker sweep (`verification_expiry_records`); not built.

**Business verified badge (DESIGN)**
- `companies.is_business_verified` = true when a `business_registration` level is `verified` and not expired. Recomputed by trigger on level insert or update only. Not client-writable.

**Document review (DESIGN)**: `verification_documents.review_status` `pending` → `accepted` | `rejected`, with `reviewed_by_user_id`, `reviewed_at`, `review_note`. Transition rule is not enforced by trigger; only the value CHECK exists.

**Expiry record (DESIGN)**: `upcoming` → `notified` → `expired` | `renewed`. Set by worker. Not built.

### 5.6 Access rules

- `company_verification_levels`: read by `ACTIVE_CO` and `admin(verification_officer)`. Write by `admin(verification_officer)` only. No delete.
- `verification_cases`: read by `ACTIVE_CO` and `admin(verification_officer)`. Insert and update by `WRITABLE_CO` with `verification.submit` (company side, limited to §5.5) or `admin(verification_officer)`. No delete.
- `verification_documents`: read by `ACTIVE_CO` and officer. Insert by `WRITABLE_CO` with `verification.submit`. Update by officer only (review fields).
- `verification_status_history`: read by `ACTIVE_CO` and officer. Written by trigger only.
- `verification_checks`: officer only (read, write). Not visible to the company.
- `verification_expiry_records`: read by `ACTIVE_CO` and officer. Write by officer.
- `compliance_flags` and `sanctions_screening_records`: `admin(compliance_officer)` only. Companies never see them.
- `verification_providers`: read by all; reference data.
- `companies.is_business_verified`: set by trigger only.
- Roles that can submit (`verification.submit`, seed): owner, admin, manager.

### 5.7 Screens and data (E)

**Company verification overview** [DESIGN]
- Seven level rows: `level`, `status` (`verified` / `expired` / `revoked`), `granted_at`, `expires_at`, `revoked_reason` (if revoked). Missing levels shown as "not started".
- Header badge: business verified (from `is_business_verified`).
- Actions: start a case for a level with no open case.

**Start case / submit evidence** [DESIGN]
- Fields: `level` (fixed by choice); evidence rows: document (from module D file), `document_type`, `issuer_country_id`, `issued_at`, `expires_at`.
- Actions: save as draft (`draft`); submit (`submitted`, `submitted_at` set).
- Not required by DB: attaching at least one document before submit (no rule in sources).
- States: draft (editable); submitted (read-only, awaiting review); needs info (editable, resubmit).

**Case status page** [DESIGN]
- Header: `level`, `status` badge, `submitted_at`, `decided_at`, `expires_at`.
- Decision block when `approved` / `rejected` / `revoked`: `decision_reason`, `decided_at`.
- Timeline from `verification_status_history`: `from_status` → `to_status`, `actor_type`, `reason`, `created_at`.
- Per evidence row: `review_status` (`pending` / `accepted` / `rejected`), `review_note`.
- For `needs_info`: show the officer's latest history reason and an "Edit and resubmit" action.

**Expiry and renewal** [DESIGN]
- Table: `expires_at`, `status` (`upcoming` / `notified` / `expired` / `renewed`), `notified_at`, tied to level or document. Renewal flow is not defined in sources.

**Officer queue** [DESIGN, admin console]
- Cases in `submitted` or `in_review`, ordered by `submitted_at`. Filters: `level`, `assigned_admin_user_id`.
- Columns: company, `level`, `status`, `submitted_at`, assigned officer.

**Officer case review** [DESIGN, admin console]
- Per evidence row: `review_status` select (`accepted` / `rejected`), `review_note`.
- Checks panel: `check_type`, provider (`verification_providers`), `result` (`pending` / `pass` / `fail` / `inconclusive`), `external_reference`, `checked_at`.
- Transition buttons: only the moves in §5.5 for the current status. Approve / reject / revoke require `decision_reason`.
- Assign: `assigned_admin_user_id`.

**Compliance console** [DESIGN, `compliance_officer` only]
- Flags table: `flag_type`, `severity` (`low` / `medium` / `high` / `critical`), `status` (`open` / `under_review` / `resolved` / `dismissed`), `notes`, `resolved_at`.
- Sanctions records: `result` (`clear` / `potential_match` / `confirmed_match` / `error`), `reference_no`, `screened_at`, `next_screening_due_at`, `reviewed_by_user_id`.

---

## 6. Implemented vs DESIGN: differences the UI must respect

| # | Area | Built today [IMPL] | DESIGN (reference) | UI consequence |
|---|---|---|---|---|
| 1 | Sign-up activation | `users.status` defaults to `active`; login works immediately; no email step | Self sign-up is `pending`; email verification expected | Built flow has no "verify your email" step. Design it as DESIGN unless scope is the built flow. |
| 2 | Name on account | No `display_name` | `display_name` NOT NULL | Sign-up needs a name field under DESIGN. |
| 3 | Password location | `users.password_hash` | `user_auth_identities.password_hash` | Internal only. |
| 4 | Sessions | `sessions` (`id`, `user_id`, `revoked_at`, `expires_at`, `created_at`) + `refresh_tokens` | `user_sessions` with `ip_address`, `user_agent`, `last_seen_at`, `family_id` | Session list screen needs DESIGN columns; built data lacks them. |
| 5 | Session lifetime | Absolute 14 days, fixed at login | DESIGN has `expires_at` and `last_seen_at` but no sliding rule | Show absolute expiry. |
| 6 | Permission keys in token | Membership lookup returns `permissionsFor(roleKey)` from `packages/authorization`, the single source of the 23 dotted keys and 5 system roles: owner 23 keys, admin 22, manager 17, member 5, viewer none | Same 23 dotted keys and 5 system roles | Keys match DESIGN. Gate UI on the dotted keys in §3.4. |
| 7 | Role | `memberships.role_key` text; only `owner` written | `company_memberships.role_id` → `company_roles` (5 system roles + custom) | No role screens built. Member role lists come from DESIGN. |
| 8 | Company creation fields | `legalName`, `countryCode` (+ optional `id`) | `legal_name`, `display_name`, `slug`, `country_id`, status `draft` | Create-company form under DESIGN needs name, display name, slug, country. |
| 9 | Company status | No status, no `version`, no suspension | `companies.status` (`draft` / `active` / `suspended` / `closed`) | Status badges only under DESIGN. |
| 10 | Membership table | `memberships` | `company_memberships` | Name only. |
| 11 | Identity audit | `audit_log` table, one action built: `session.refresh_token_reused` | `user_security_events` (owner-visible) | Security timeline is DESIGN. |
| 12 | Gateway viewer | `viewer.permissions` mirrors token (role-based: owner 23, member 5, viewer none) | Permissions from membership role | Role-based gating is available for system roles. Custom roles are not built. |
| 13 | MFA claim | `amr` = `pwd` only | `amr` comment lists `pwd`, `otp`, `webauthn` | Step-up not built. |
| 14 | Logout | Session revoked; access token valid until 5 min | Same (deny-list deferred) | Logout is not instant for in-flight access tokens. |

---

## 7. Open design items (from sources; do not invent flows)

- Email verification, password reset, phone verification, MFA: tables designed, flows not built, consumption path not defined in sources.
- Invitation expiry sweeper: not built (`expired` status is not set automatically).
- Verification level downgrade on case revoke: not automatic.
- Verification level expiry: sweeper not built.
- `require_mfa_for_admins` enforcement: location not defined in sources.
- Encryption service for `secret_ciphertext`, `details_ciphertext`: pending (keys in KMS, not in DB).
- Account erasure and pseudonymisation: open (U-3).
- Membership projection for other services: deferred (ADR-008); a removed member keeps access up to the 5-minute token lifetime.
- Login-specific rate limit: not built (only gateway-wide 300 per 60 s).
- Document upload negotiation, signed URLs, object storage, malware scan worker: not built.
- Admin audit screens and platform admin role management: module O, not in this brief.

---

## 8. Related

- `backend/docs/DATABASE_REFERENCE.md`: column-level truth for all 155 tables.
- `backend/docs/DATABASE_DESIGN.md` §3–§8: tenancy, integrity rules, open scaling items.
- `backend/docs/SECURITY_ARCHITECTURE.md`: roles, RLS helpers, token storage.
- `docs/ARCHITECTURE_ASSESSMENT.md` §4: table-to-service ownership.
- `docs/ARCHITECTURE_DECISIONS.md` ADR-023…026: membership at token issue, key separation, refresh rotation, company tenancy.
