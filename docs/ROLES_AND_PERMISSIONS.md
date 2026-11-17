# SAUDARO Roles, Permissions and Data Visibility (for UI builders)

Audience: a UI/UX designer or a frontend builder with NO access to the code. Read `docs/API_REFERENCE.md` first for
the operations and token lifecycle.

- Last verified: 2026-11-17
- Status legend: **Implemented** = running today and used by the API. **Designed** = present in the database design
  (`backend/`, seeds, RLS policies, triggers) or in the security architecture, but not reachable through any API
  operation yet. Shapes may change.
- Sources: `apps/backend/services/company-service/src/domain/roles.ts`, `apps/backend/services/company-service/src/http/routes.ts`,
  `apps/backend/services/company-service/src/infrastructure/repositories/companies.ts`,
  `apps/backend/services/company-service/migrations/0002_rls.sql` and `0003_rls_hardening.sql`,
  `apps/backend/services/identity-service/src/application/auth-service.ts`, `packages/authentication/src/claims.ts`,
  `backend/src/database/seeds/reference-data.ts` and `reference.ts`, `backend/src/database/schema/companies.ts` and `admin.ts`,
  `backend/src/database/policies/spec.ts`, `backend/src/database/migrations/0003_functions_and_triggers.sql`,
  `backend/docs/SECURITY_ARCHITECTURE.md`, `backend/docs/DATABASE_REFERENCE.md` (sections B, C, O),
  `docs/SYSTEM_ARCHITECTURE.md`.

## 0. Read first

| # | Fact | Consequence for the UI |
|---|---|---|
| 1 | Only ONE company role is implemented: `owner`. Every company created through the API gets `owner`. No API can invite people, change roles, remove members or create custom roles. | Design team screens as "designed, not available"; do not expect other roles in data. |
| 2 | The token's permission keys are the dotted catalog keys (section 2.2). An owner's token carries all 23, admin 22, manager 17, member 5, viewer none. | Gate only on the exact strings in `viewer.permissions`. See section 3.3. |
| 3 | No operation checks permission keys today. The only enforced rules are: a valid token, and an active membership for `refresh` with `companyId`. | Permission gating in the UI is cosmetic today. The server is the only real enforcement, and today it does not check keys. |
| 4 | The 23 permissions and 5 system roles are defined in code (`packages/authorization`) and seeded in the designed database (`backend/`). The running company service uses the code catalog for token permissions; it does not read the database role tables. | Treat the catalog as current for token permissions. Roles and memberships beyond owner are not yet creatable through the API. |
| 5 | Data visibility is enforced today only by membership (own memberships, companies you are an active member of). Richer visibility (RFQs, quotations, deals, messages, files) is designed in row-level security policies. | Section 6 separates what the API returns now from the designed rules. |

## 1. Tenant model

### 1.1 Entities

| Entity | Scope | Implemented storage (running services) | Designed storage (`backend/`, DATABASE_REFERENCE) |
|---|---|---|---|
| User | Global (one account per email) | `identity.users`: `id`, `email`, `password_hash`, `locale`, `status` (`active` or `disabled`), `session_version` (default 1) | `users`: `status` one of `pending`, `active`, `suspended`, `deactivated`, `deletion_requested`, `deleted` (default `pending`) |
| Session | Per user | `identity.sessions`: `id`, `user_id`, `revoked_at`, `expires_at` | `user_sessions` (token hash, family id, revocation) |
| Refresh token | Per session | `identity.refresh_tokens`: `token_hash` (SHA-256 only), `session_id`, `used_at` | Same concept |
| Company | Tenant | `company.companies`: `id`, `legal_name`, `country_code`, `created_by`, `created_at`. No status column. | `companies` with `status` (`draft`, `active`, `suspended`, `closed`), verification flag, slug, versioning |
| Membership | One per (company, user) | `company.memberships`: `company_id`, `user_id`, `role_key` (text), `status` (`active`, `suspended`, `removed`), `created_at` | `company_memberships`: `role_id` (foreign key to `company_roles`), `invited_by`, `joined_at`, `removed_at`, `removed_by`, `version` |
| Role | System (company id null) or custom (per company) | None. Only the text `role_key` on membership. | `company_roles` (`key`, `name`, `level` 0 to 100, `is_system`) |
| Role-permission link | Per role | None | `company_role_permissions` |
| Permission | Global catalog | None | `permissions` (`key`, `category`, `description`) |
| Invitation | Per company | None | `company_invitations` (`pending`, `accepted`, `revoked`, `expired`) |
| Platform admin role | Global | None | `admin_role_assignments` (`admin_role`, `granted_at`, `revoked_at`) |

The designed database lives in `backend/` (not a workspace of the monorepo). The running services use only their own
`identity` and `company` schemas. Those are the only tables the API reads or writes today.

### 1.2 Active company and the token

- A user may belong to many companies. Each membership is a separate row.
- The "active company" is one company id in the access token claim `cid`. It is chosen when a token is issued:
  `refresh(refreshToken, companyId)` checks an ACTIVE membership first, then puts `cid` and the caller's permissions into the new token.
- The client never sends a tenant id to data operations. The gateway takes the tenant only from the verified token
  (the API reference, section 3.11).
- Without a `cid`, the user has no company context: `viewer.companyId` is `null` and `viewer.permissions` is `[]`.
- Membership changes apply to tokens only when the next token is issued. A removed or suspended member keeps the old `cid`
  and `perms` for up to 300 seconds (ADR-008 trade-off, `docs/ARCHITECTURE_DECISIONS.md`).

### 1.3 What a user can see: row-level security in the implemented company service (Implemented)

Each company request runs in a transaction with `app.current_user_id` set from the verified token subject. Row-level
security is ENABLED and FORCED on `company.companies` and `company.memberships`: the policies apply to every role that
uses the table, including its owner. Without a user context, no rows are visible (the policies compare with null).

| Table | What the caller can read | What the caller can write |
|---|---|---|
| `company.memberships` | Only rows where `user_id` is the caller (any status). | Insert only for themselves, and only into a company that THEY created. |
| `company.companies` | Companies where the caller has an ACTIVE membership, plus companies the caller created (needed for the create flow). | Insert only when `created_by` is the caller. No update or delete policy exists. |
| `identity.*` | No row-level security. These are global identity tables, reached only through the identity service's own internal routes. | Not applicable to clients. |

Consequence: a user can never list or read a company where they have no active membership, and cannot add themselves to
someone else's company. A refresh with a foreign company id returns `NOT_A_MEMBER` without revealing whether the company exists.

### 1.4 Designed tenant rules (Designed, not implemented)

The security architecture (`backend/docs/SECURITY_ARCHITECTURE.md` sections 2 to 4) designs these rules for the full database:

- The "active company" is checked in the database on every statement: the user must have an ACTIVE membership, be an active
  user, and the company must not be closed. A removed or suspended member loses database access on the next statement.
- Writes require a company status of `draft` or `active`. Suspended companies are read-only.
- Permission checks inside the database (`has_perm`, `can_write`) use the permission keys in section 2.2.
- Definer functions own the membership and role tables, so policies cannot recurse.
- Tokens: today the active company is validated only at token issue (section 1.2). The design treats a signed,
  database-verified tenant context as a required hardening step (`backend/docs/SECURITY_ARCHITECTURE.md` decision U-2).

## 2. Company roles and permission catalog (Designed, seeded in `backend/` only)

### 2.1 System roles

Seed values (`backend/src/database/seeds/reference-data.ts`). Labels are the seed `name` values. Level: higher outranks lower.

| Role key | Display name | Level | Permission count | Notes |
|---|---|---|---|---|
| `owner` | Owner | 100 | 23 (all) | Only role with level 100. A company must always keep one active owner (section 2.4). |
| `admin` | Administrator | 80 | 22 (all except `company.manage`) | |
| `manager` | Manager | 60 | 17 | No team management (`members.manage`, `roles.manage`, `invitations.manage`), no settings, no company status, no audit log. |
| `member` | Member | 40 | 5 | `files.manage`, `catalog.manage`, `rfq.create`, `quotation.create`, `messages.send`. |
| `viewer` | Viewer | 20 | 0 | Read-only by design. |

Custom roles (Designed): key pattern `^[a-z][a-z0-9_]{1,40}$`; level 0 to 99 (never 100); name and optional description;
permissions chosen from the catalog, and only ones the editor already holds.

### 2.2 Permission catalog and role matrix (Designed)

"Y" = the role holds the permission in the seed. "-" = it does not. Column order: owner, admin, manager, member, viewer.
Keys and descriptions are copied from the seed.

| Permission key | Category | Seed description | owner | admin | manager | member | viewer |
|---|---|---|---|---|---|---|---|
| `company.manage` | company | Manage company status and registration identifiers | Y | - | - | - | - |
| `company.profile.manage` | company | Edit public company profile, addresses and contacts | Y | Y | Y | - | - |
| `members.manage` | team | Add, change and remove team members (below own level) | Y | Y | - | - | - |
| `roles.manage` | team | Create and edit custom roles | Y | Y | - | - | - |
| `invitations.manage` | team | Invite people to the company | Y | Y | - | - | - |
| `settings.manage` | company | Edit company settings | Y | Y | - | - | - |
| `files.manage` | files | Upload files and manage file access grants | Y | Y | Y | Y | - |
| `verification.submit` | verification | Submit documents for business verification | Y | Y | Y | - | - |
| `catalog.manage` | catalog | Manage products and listings | Y | Y | Y | Y | - |
| `seller_profile.manage` | trade | Manage the seller trade profile | Y | Y | Y | - | - |
| `buyer_profile.manage` | trade | Manage the buyer profile | Y | Y | Y | - | - |
| `rfq.create` | rfq | Create and edit RFQs | Y | Y | Y | Y | - |
| `rfq.manage` | rfq | Delete drafts, invite suppliers, answer clarifications, compare quotations | Y | Y | Y | - | - |
| `quotation.create` | quotation | Create and edit quotation drafts | Y | Y | Y | Y | - |
| `quotation.submit` | quotation | Submit, revise and withdraw quotations | Y | Y | Y | - | - |
| `quotation.accept` | quotation | Accept or reject quotations and create deals | Y | Y | Y | - | - |
| `messages.send` | messaging | Send messages in conversations | Y | Y | Y | Y | - |
| `messages.manage` | messaging | Add colleagues to conversations | Y | Y | Y | - | - |
| `deal.manage` | deal | Manage deal documents, milestones, shipments and cancellations | Y | Y | Y | - | - |
| `deal.confirm` | deal | Confirm deal steps on behalf of the company | Y | Y | Y | - | - |
| `review.write` | reputation | Write reviews | Y | Y | Y | - | - |
| `review.respond` | reputation | Respond to reviews | Y | Y | Y | - | - |
| `audit.read` | security | Read the company audit log | Y | Y | - | - | - |

Totals: owner 23, admin 22, manager 17, member 5, viewer 0. Key format enforced by the database:
`^[a-z_]+(\.[a-z_]+)+$` (dot-separated, lowercase).

### 2.3 Role hierarchy rules (Designed; enforced by database triggers in `backend/src/database/migrations/0003_functions_and_triggers.sql`)

| Rule | Meaning for the UI |
|---|---|
| R1 Grant a role | A member may grant only roles strictly BELOW their own level. Granting a role at or above your level is refused. |
| R2 Change or remove a member | You may change only members whose current level is below yours, and only to roles below yours. |
| R3 Yourself | You cannot add yourself. You cannot change your own role or status, except to leave the company (status `removed`). |
| R4 Invite | You may invite only into roles below your own level. |
| R5 Custom role definition | You may define a custom role only below your own level. You cannot modify a role at or above your own level. Its key and company are immutable. Custom roles can never reach level 100. |
| R6 System roles | System roles are immutable through the API. |
| R7 Grant a permission to a role | You may add a permission to a custom role only if you hold that permission yourself. |
| R8 Removal records | Removing a member records the time and the actor. |

The hierarchy is numeric: owner (100) > admin (80) > manager (60) > member (40) > viewer (20). Permissions are NOT inherited
by level: a permission is granted only if it appears in the role's own permission list.

### 2.4 Last-owner rule (Designed)

A company that is not closed must always keep at least one ACTIVE membership whose role is the system `owner` role.
The database checks this at commit (so a swap inside one transaction is allowed), and serialises concurrent owner removals.
No API operation can remove or change a membership yet, so the rule cannot be broken through the API today.

## 3. What is implemented today versus designed

### 3.1 Implemented (Available now)

| Behaviour | Detail | Source |
|---|---|---|
| Company creation | The creator gets a membership with `role_key` `owner` and status `active`, in the same transaction as the company. | `company-service` repository `createCompany` |
| Idempotent retry | Same user and same company id return the existing company. Another user's id returns `CONFLICT`. | Same |
| Membership lookup (internal) | Returns `permissions` = `permissionsFor(roleKey)` for the caller in a company (owner 23 keys, admin 22, manager 17, member 5, viewer none; section 3.3). Called by identity only when a company-scoped token is issued (`refresh` with `companyId`). | `company-service` `routes.ts`; `packages/authorization/src/index.ts` |
| Token permissions | Copied to `viewer.permissions` (section 3.4 of the API reference). | `identity-service` `auth-service.ts` |
| Membership list | `myCompanies` returns each active membership with its `roleKey`. | Same |
| Stored roles | Only the text `role_key` (`owner`) on membership. No role or permission tables are used at runtime. | `company-service` schema |

Implemented membership statuses in the check constraint: `active`, `suspended`, `removed`. No operation sets `suspended` or `removed`.

### 3.2 Designed, not implemented

| Designed capability | Missing piece |
|---|---|
| Five system roles as stored data | The catalog is code (`packages/authorization`) and drives token permissions, but the database role tables are not used at runtime. |
| Roles beyond owner | No operation creates memberships with other roles. |
| Invitations | No invitation table or operation in the running services. |
| Member role change, suspension, removal | No operation. |
| Custom roles | No table or operation. |
| Company status (`draft`, `active`, `suspended`, `closed`) and suspension | No status column in the running company table. |
| Permission checks on operations | No operation checks any permission key. |
| Last-owner enforcement | Not needed yet; see section 2.4. |
| Platform admin roles and admin operations | Section 4. |
| Admin MFA and step-up | `backend/docs/SECURITY_ARCHITECTURE.md` section 12: not implemented. |

### 3.3 Token permission keys are the catalog keys (Implemented)

The company service's membership lookup returns `permissionsFor(roleKey)` from `packages/authorization` for any role.
The token's `perms` therefore carry the dotted catalog keys of section 2.2. The former colon keys (`company:read`,
`company:update`, `member:manage`) no longer exist anywhere in the code.

| Role in the company | Keys in the token (`viewer.permissions`) |
|---|---|
| owner | All 23 catalog keys (the full list of section 2.2) |
| admin | 22 keys: all except `company.manage` |
| manager | 17 keys: all except `company.manage`, `members.manage`, `roles.manage`, `invitations.manage`, `settings.manage`, `audit.read` |
| member | `files.manage`, `catalog.manage`, `rfq.create`, `quotation.create`, `messages.send` |
| viewer | none (`[]`) |
| any other role key | none (`[]`) |

Owner token example (exact list, catalog order):

```json
["company.manage","company.profile.manage","members.manage","roles.manage","invitations.manage","settings.manage","files.manage","verification.submit","catalog.manage","seller_profile.manage","buyer_profile.manage","rfq.create","rfq.manage","quotation.create","quotation.submit","quotation.accept","messages.send","messages.manage","deal.manage","deal.confirm","review.write","review.respond","audit.read"]
```

Rules for the UI:

- Gate on the exact strings in `viewer.permissions`. Keys are dotted lowercase and match the catalog one-to-one.
- Only owner memberships can be created today (section 3.1), so the owner list above is what every current company token carries.
- Do not infer one key from another. Use the list present in the token.

## 4. Platform (admin) roles (Designed, not implemented)

Admin roles are global, not per company. They are stored in `admin_role_assignments` (one active assignment per user and role).

| Admin role | Designed scope (from the row-level security policies in `spec.ts`) |
|---|---|
| `super_admin` | Grant and revoke admin roles; write system settings; read admin action log. Satisfies every other admin role check. |
| `verification_officer` | Read and write company verification levels; read and work the verification case queue; read registration identifiers; read company documents marked for verifiers. |
| `moderator` | Update company records (including status); work abuse reports; moderate reviews; read reported messages. |
| `support` | Read user records of all users. |
| `compliance_officer` | Read and write compliance flags and sanctions screening; read security events. |

Rules:

- Every admin action needs a stated reason (`admin_actions.reason` is required) and is audited.
- No admin claim is issued in the access token today. No admin operation exists. The admin service has no code yet.
- The design requires MFA for admins. Enforcement is not implemented (`backend/docs/SECURITY_ARCHITECTURE.md` section 12).

## 5. UI gating guide

### 5.1 Principles

1. Source of truth for the UI: `viewer.companyId` and `viewer.permissions` from the `Viewer` query (API reference section 3.4).
   Never decode the JWT to make a gating decision.
2. Compare keys as exact strings. Do not infer one permission from another (owner does not automatically "have" everything
   in your UI; use the keys present). Do not use the numeric role level in the UI.
3. Show the role name from `myCompanies[].roleKey` for each company, not from the permission list.
4. The server decides. A gate only hides or disables UI. Every action can still return `AUTHORIZATION_ERROR` or
   `NOT_A_MEMBER` (API reference section 4). Handle both.
5. Re-read `viewer` after: a company switch, `createCompany` followed by `refresh`, any `NOT_A_MEMBER` or
   `AUTHORIZATION_ERROR`, and every token refresh. The permission list is a snapshot from the moment the token was issued.
6. Expect up to 300 seconds of stale permissions after a membership change (section 1.2).

### 5.2 Gate states

| State | Condition | UI |
|---|---|---|
| No company | `viewer.companyId` is `null` | Show the company picker (from `myCompanies`). Hide all company features. |
| Company, feature not available to this role | Key absent, and the feature is never available to this role | Hide. |
| Company, feature available to other roles | Key absent, and the designed roles include this role | Show disabled, with an explanation ("Your role cannot do this"). |
| Key present | Key in `viewer.permissions` | Enable. Still handle server refusals. |
| Server refusal | `AUTHORIZATION_ERROR` or `NOT_A_MEMBER` after an enabled action | Show a message, reload `viewer` and `myCompanies`, then update the gates. |

### 5.3 Gates usable today (Implemented)

The keys are in the token today, but no operation enforces or consumes them yet. Use them only to decide what the UI shows.

| Role | Keys present in the token | Gate guidance today |
|---|---|---|
| owner | All 23 (section 3.3) | Any feature whose key is listed in section 5.4 may be shown; the operation behind it must still exist before the screen is built. |
| member | `files.manage`, `catalog.manage`, `rfq.create`, `quotation.create`, `messages.send` | Same, limited to these five. |
| viewer, other | none | Hide all permission-gated actions. |

Important: `company.manage`, `members.manage` and similar owner keys have no operation today. Do not build screens for them until the operations exist.

### 5.4 Designed feature to permission key map (Designed)

Use this to plan screens. A feature appears only when the key is present (after the server has implemented it).

| Feature | Permission key |
|---|---|
| Company status, registration identifiers | `company.manage` |
| Public profile, addresses, contacts | `company.profile.manage` |
| Team: list, change role, remove members | `members.manage` |
| Custom roles editor | `roles.manage` |
| Invite people | `invitations.manage` |
| Company settings | `settings.manage` |
| Upload files, file access grants | `files.manage` |
| Submit business verification | `verification.submit` |
| Products and listings | `catalog.manage` |
| Seller trade profile | `seller_profile.manage` |
| Buyer profile | `buyer_profile.manage` |
| Create and edit RFQs | `rfq.create` |
| Delete RFQ drafts, invite suppliers, clarifications, compare quotations | `rfq.manage` |
| Create and edit quotation drafts | `quotation.create` |
| Submit, revise, withdraw quotations | `quotation.submit` |
| Accept or reject quotations, create deals | `quotation.accept` |
| Send messages | `messages.send` |
| Add colleagues to conversations | `messages.manage` |
| Deal documents, milestones, shipments, cancellation | `deal.manage` |
| Confirm deal steps | `deal.confirm` |
| Write reviews | `review.write` |
| Respond to reviews | `review.respond` |
| Company audit log | `audit.read` |

## 6. Data-visibility rules the UI must reflect

### 6.1 Implemented (what the API returns today)

| Data | Who gets it | Notes |
|---|---|---|
| Own user id, active company id, permissions | The caller (`viewer`) | From the token. |
| Companies | Only companies where the caller has an ACTIVE membership (`myCompanies`) | Maximum 100, no paging. |
| Membership rows | Only the caller's own (database policy) | Not exposed by any operation today. |
| Existence of a company | Not revealed to non-members | `refresh` with a foreign company id returns `NOT_A_MEMBER` whether the company exists, is suspended or is removed. `createCompany` with a foreign id returns a generic `CONFLICT` with no company details. |
| Existence of an account | Not revealed | `register` returns `true` for new and existing emails. `login` returns the same `INVALID_CREDENTIALS` for wrong password, unknown email and disabled account. |
| Other users' data | Not exposed by any operation | |

### 6.2 Designed visibility (database policies; no operation exposes these yet)

Company data:

| Data | Who may read (designed) |
|---|---|
| Company core record | Active members, and any platform admin (any admin role). Moderators may update it (for example status). |
| Public profile fields | Active members always; any signed-in caller only when the profile is public AND the company is public. |
| Addresses and contacts | Active members; items flagged public for public companies. |
| Registration identifiers | Active members and verification officers only. |
| Company documents | Active members; `public` documents for public companies; `verifiers` documents for verification officers. |
| Company settings | Active members. Writes need `settings.manage`. |
| Invitations | Members of the inviting company. |
| User records | The user's own record; users who share a company with you; `support` admins (all users). |

RFQs (public or invited):

| Rule | Detail |
|---|---|
| Owner-only base record | Only the owning company reads the RFQ base table. Suppliers never query it. |
| Supplier view of a published RFQ | A limited view with only: `id`, `reference_no`, `company_id`, `title`, `description`, `primary_category_id`, `status`, `visibility`, `currency_id`, `allow_partial_quotes`, `quote_deadline_at`, `published_at`, `expires_at`. The target unit price and the creator user id are never exposed. |
| Who can view a published RFQ | The RFQ is published and not expired; the viewer company is ACTIVE and is not the owner; visibility is `public`, or the company has an invitation; country allow and block rules pass; minimum verification levels are met; seller-type rules pass. |
| Who can quote | Can view AND the quote deadline has not passed. |
| Invitations | Visible to the RFQ owner company and to the invited company. |
| Match scores | Never change eligibility (`docs/ARCHITECTURE_DECISIONS.md`, A-4). |

Quotations:

| Rule | Detail |
|---|---|
| Supplier | Always sees its own quotations and all their revisions. |
| Buyer | Sees a quotation only when it is NOT `draft`. Sees a revision only when the revision is `submitted`. |
| Submitted content | Submitted revisions and their items, terms and attachments are immutable, even for their owner. |
| One accepted per RFQ | Enforced by a unique index. Accepting needs `quotation.accept` on the buyer side. |
| Status history | Visible to the parties of the quotation. |

The sources define no "sealed" or blind-bid rule. Do not promise one; the rules above are the only visibility rules for
quotations.

Deals:

| Rule | Detail |
|---|---|
| Who sees a deal | The buyer company, the supplier company, and listed deal parties. |
| Deal creation | Requires `quotation.accept` on the buyer side. The deal snapshot must equal the accepted revision (verified at commit). |
| Changes | Require `deal.manage` (and `deal.confirm` for confirmations). Cancellation: only the counterparty can accept or reject a cancellation request; the requester can only withdraw. |

Messaging:

| Rule | Detail |
|---|---|
| Conversations and messages | Participants only. Moderators can read a message only when it has been reported. |
| Search | Messages are never indexed for search and never logged. |
| Editing | Editable for at most 15 minutes after sending, and only until another participant has read it. |
| Sending | Requires `messages.send`; adding participants requires `messages.manage`. |

Files:

| Rule | Detail |
|---|---|
| Who sees a file | The owning company; grantees (company or user) with an unexpired, unrevoked grant; public files that are `available` and malware-scan `clean`; files attached to a deal, message, quotation, RFQ or verification document (the visibility follows the parent). |
| Downloads | Designed as short-lived signed URLs minted after an authorised read. Object storage is not integrated yet. |

Admin-only visibility: see section 4.

### 6.3 Checklist for designing data screens

- Show only what the operation returns. Do not infer hidden data from empty states.
- Treat "not found" and "not a member" the same way in the UI (no existence hints).
- Show quotation and RFQ states to the buyer and supplier according to section 6.2; do not show drafts to the buyer.
- Do not offer search over messages.
- Do not render raw file URLs as permanent; use the signed-URL flow when it exists.
