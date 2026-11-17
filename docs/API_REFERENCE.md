# SAUDARO API Reference (client builders)

Audience: a UI/UX designer or a frontend builder who has NO access to the code. Everything here is derived from the
repository at the state dated below. Anything not stated in the sources is omitted or marked as planned.

- Last verified: 2026-11-17
- Status legend: **Available now** = implemented and asserted by an automated test or by the running code path.
  **Planned** = designed in `docs/SYSTEM_ARCHITECTURE.md` or `backend/docs/*`, not implemented; shape may change.
- Maintainer sources: `packages/graphql-contracts/src/index.ts` (SDL, `OPERATIONS`), `packages/api-contracts/src/index.ts`
  (zod input rules), `packages/error-handling/src/*` (codes, envelopes), `packages/authentication/src/*` (tokens, claims),
  `apps/backend/api-gateway/src/*` (limits, CORS, persisted queries, resolvers), `apps/backend/services/identity-service/src/*`
  and `apps/backend/services/company-service/src/*` (behaviour), `tests/e2e/auth-and-company.test.ts` (call sequence).

## 0. Read first (critical facts for the UI)

| # | Fact | Why it matters |
|---|---|---|
| 1 | Only 8 GraphQL operations exist: 3 queries (`health`, `viewer`, `myCompanies`) and 5 mutations (`register`, `login`, `refresh`, `logout`, `createCompany`). | Do not design screens that need any other operation yet. |
| 2 | `refresh` WITHOUT `companyId` returns an access token with NO company (`companyId` null, `permissions` empty). | A background token refresh must always pass the current `companyId`, or the user silently loses the company context. |
| 3 | Switching or creating a company does not change the current access token. | After `createCompany`, call `refresh` with the new `companyId` before showing company data. |
| 4 | Logout and removal do not invalidate an access token immediately. It stays valid until its `exp` (max 300 s). | Discard the access token in the UI at logout; do not rely on the server to cut it off. |
| 5 | Non-null root fields (`login`, `refresh`, `createCompany`, `register`, `logout`, `myCompanies`, `health`) make `data` `null` on error. | Read `errors[].extensions.code` and do not expect partial data. |
| 6 | `myCompanies` returns at most 100 items and has no paging arguments. | Acceptable for now; do not build paging UI yet (see section 6). |
| 7 | Production accepts ONLY persisted queries (SHA-256 hash of the operation text). Development accepts raw query text. | Use the hashes in section 2.2 for production builds. |
| 8 | Token permission keys are the 23 dotted catalog keys (`company.manage`, `members.manage`, ...). An owner's token carries all 23, a member's carries 5, a viewer's carries none. | Gate on these exact strings. See `docs/ROLES_AND_PERMISSIONS.md` section 3.3. |

## 1. Endpoint, transport, headers, CORS (Available now)

| Item | Value |
|---|---|
| GraphQL endpoint | `POST /graphql` on the API gateway. Local default: `http://127.0.0.1:4000/graphql` (gateway `PORT` 4000, `HOST` 127.0.0.1). Production base URL is set by deployment and is not defined in the repository. |
| Methods | `POST` for operations. A `GET /graphql` with query parameters is rejected (400) by CSRF prevention. |
| Content type | `Content-Type: application/json`. Other content types are rejected by CSRF prevention. |
| Body | One JSON object per request. Batched requests (a JSON array) are rejected (status 400 or higher). |
| Request headers | `Authorization: Bearer <accessToken>` (only for protected operations; see section 3). `X-Request-Id` and `X-Correlation-Id` are optional: accepted only if they match `^[A-Za-z0-9._-]{8,64}$`, otherwise the server generates its own. |
| Response headers | `x-request-id` and `x-correlation-id` are always returned. `Retry-After` on HTTP 429. Standard security headers (helmet) are set; `x-powered-by` is removed. Responses may be gzip-compressed. |
| CORS | Exact-origin allowlist from the gateway setting `CORS_ORIGINS` (comma-separated; config default `http://localhost:5173`). Unlisted origins get no `Access-Control-Allow-Origin`. Methods: `GET, POST, OPTIONS`. Allowed request headers: `authorization, content-type, x-request-id, x-correlation-id`. Exposed response headers: `x-request-id, x-correlation-id, retry-after`. Credentials are NOT allowed (no cookies). Preflight cache: 600 s. |
| Cookies | The server sets no cookies. The client stores the refresh token itself. |
| Health (REST, not rate-limited) | `GET /health/live`, `GET /health/ready` on the gateway. Not GraphQL; not for product UI. |
| Internal services | Identity (`/v1/auth/*`) and company (`/v1/companies*`) REST routes are for the gateway only. Browsers must never call them. |

### 1.1 Request pipeline order (per code, first to last)

1. Request id, security headers, compression, 15 s whole-request deadline, access log.
2. JSON body parsing with a 100 kb limit (`PAYLOAD_TOO_LARGE`, `MALFORMED_JSON`).
3. CORS, then rate limit (300 requests per 60 s per client IP, per gateway replica), then the persisted-query gate.
4. Apollo: CSRF check, depth limit, cost limit, field resolution, response-size cap (1 MiB).

## 2. How to call the API

### 2.1 Development: plain query text (raw documents)

Allowed in development only (`GRAPHQL_PERSISTED_ONLY` defaults to off outside production). Introspection and a
GraphiQL landing page are also available in development only.

```json
{
  "operationName": "Viewer",
  "query": "query Viewer { viewer { userId companyId permissions } }",
  "variables": {}
}
```

The raw document text for each operation is listed in section 3 (one line each, for development use).

### 2.2 Production: persisted query (hash only)

Production rejects any request without a hash (`PERSISTED_QUERY_REQUIRED`). The gateway runs ONLY the allowlisted text
for a known hash. Any `query` text sent with a hash is discarded.

Request shape (matches the production test in `tests/e2e/auth-and-company.test.ts`; no `query` field, no `operationName`):

```json
{
  "variables": {
    "input": { "email": "owner@example.com", "password": "correct horse battery staple" }
  },
  "extensions": {
    "persistedQuery": {
      "version": 1,
      "sha256Hash": "fadeba32ed5ffd8cd6ddaec8e02add89174e6589444fbd5147ded63ec8269caf"
    }
  }
}
```

How the hash is defined: SHA-256 over the UTF-8 bytes of the operation text exactly as stored in `OPERATIONS`
(`packages/graphql-contracts`), written as 64 lowercase hex characters. The server lowercases the hash before lookup.
Any change to the operation text (even whitespace) changes the hash. Clients do not recompute hashes: use the table
below. Recompute only if the contract changes (a maintainer must regenerate the table).

| Operation (document name) | Type | `sha256Hash` (production) | Variables |
|---|---|---|---|
| `Health` | query | `f0e5e7c65298abf9966e165a14d7bd57f2fa56ee506bf58dfcb80eeadeb7485e` | none |
| `Viewer` | query | `4e0dd4eeb41bbe9f064f097cd731a5139ce224e0787ad8b3b7327dc361aeef40` | none |
| `MyCompanies` | query | `cc0d80ed30816a3cd6c2012c6cbef4ad791bb16472279efb03b05431b402b72e` | none |
| `Register` | mutation | `fadeba32ed5ffd8cd6ddaec8e02add89174e6589444fbd5147ded63ec8269caf` | `input` (RegisterInput) |
| `Login` | mutation | `4cb14ae47adcfa3d8e7e35eb84ea77fd6343dcd9db9c27b7c882725676435b85` | `input` (LoginInput) |
| `Refresh` | mutation | `9ebe967ccf01fb58a7685aed3f3124b1a9a48622cec6c114cc13b64f40c7b428` | `refreshToken` (String!), `companyId` (ID, optional) |
| `Logout` | mutation | `b4cbd11e608c23932bdfe3f3dc2792c2bb268e4513b7098760e668e0e9234c8f` | `refreshToken` (String!) |
| `CreateCompany` | mutation | `ea1c19023097bfa0f0090a1ffc207a7b6976f423c7a383bbce5f3b1a94e159b3` | `input` (CreateCompanyInput) |

Errors on the persisted path: no hash in production gives `PERSISTED_QUERY_REQUIRED`; an unknown hash gives
`PERSISTED_QUERY_NOT_FOUND` (both are REST-envelope errors, section 4.2). An unknown hash usually means an old build
of the client: prompt the user to reload.

## 3. Schema and operations available now

### 3.1 Complete SDL (the whole current schema)

```graphql
type HealthStatus { status: String! service: String! version: String! time: String! }
type Viewer { userId: ID! companyId: ID permissions: [String!]! }
type AuthPayload { accessToken: String! refreshToken: String! }
type Company { id: ID! legalName: String! countryCode: String! roleKey: String! }

input RegisterInput { email: String! password: String! locale: String }
input LoginInput { email: String! password: String! }
input CreateCompanyInput { id: ID legalName: String! countryCode: String! }

type Query {
  health: HealthStatus!
  viewer: Viewer          # requires authentication
  myCompanies: [Company!]!  # requires authentication
}

type Mutation {
  register(input: RegisterInput!): Boolean!
  login(input: LoginInput!): AuthPayload!
  refresh(refreshToken: String!, companyId: ID): AuthPayload!
  logout(refreshToken: String!): Boolean!
  createCompany(input: CreateCompanyInput!): Company!
}
```

No subscriptions, no file upload, no paging arguments, no Connection types exist in the schema today.

### 3.2 Operation index

| Document name | Kind | Signature | Auth | Section |
|---|---|---|---|---|
| `Health` | query | `health: HealthStatus!` | No | 3.3 |
| `Viewer` | query | `viewer: Viewer` | Yes | 3.4 |
| `MyCompanies` | query | `myCompanies: [Company!]!` | Yes | 3.5 |
| `Register` | mutation | `register(input: RegisterInput!): Boolean!` | No | 3.6 |
| `Login` | mutation | `login(input: LoginInput!): AuthPayload!` | No | 3.7 |
| `Refresh` | mutation | `refresh(refreshToken: String!, companyId: ID): AuthPayload!` | No (the refresh token is the credential) | 3.8 |
| `Logout` | mutation | `logout(refreshToken: String!): Boolean!` | No | 3.9 |
| `CreateCompany` | mutation | `createCompany(input: CreateCompanyInput!): Company!` | Yes | 3.10 |

"Auth Yes" means the access token must be sent. Without a valid token the field returns an error (section 4).
A missing, expired or invalid token never blocks the operations marked "No".

Common error codes for all operations: `DEPENDENCY_ERROR` (any operation that calls a service), `INTERNAL_ERROR`,
`RATE_LIMITED` (REST envelope, section 4.2), `REQUEST_TIMEOUT` (REST envelope), `QUERY_TOO_DEEP`/`QUERY_TOO_COMPLEX`
(only if the client edits the documents; not reachable with the documents below).

### 3.3 `Health`

- Raw dev text: `query Health { health { status service version time } }`
- Production document (hashed) selects `status service version` only.
- Input: none. Output `HealthStatus`: `status` ("ok"), `service` ("api-gateway"), `version` ("0.2.0"), `time` (ISO 8601 UTC; dev only).
- Errors: none expected.

### 3.4 `Viewer`

- Raw dev text: `query Viewer { viewer { userId companyId permissions } }`
- Input: none (needs `Authorization: Bearer`).
- Output `Viewer`: `userId` (= token `sub`), `companyId` (= token `cid`; `null` until a company is selected), `permissions` (= token `perms`; `[]` when no company).
- Errors: `AUTHENTICATION_REQUIRED` (no token), `TOKEN_EXPIRED`, `TOKEN_INVALID`.

Response examples (consistent with the e2e test):

```json
{"data":{"viewer":{"userId":"5c1d2f0e-0000-4000-8000-000000000001","companyId":null,"permissions":[]}}}
```

```json
{"data":{"viewer":{"userId":"5c1d2f0e-0000-4000-8000-000000000001","companyId":"9a7e4b2c-0000-4000-8000-000000000002","permissions":["company.manage","company.profile.manage","members.manage","roles.manage","invitations.manage","settings.manage","files.manage","verification.submit","catalog.manage","seller_profile.manage","buyer_profile.manage","rfq.create","rfq.manage","quotation.create","quotation.submit","quotation.accept","messages.send","messages.manage","deal.manage","deal.confirm","review.write","review.respond","audit.read"]}}}
```

The example above is an OWNER. A member of the same company would receive `["files.manage","catalog.manage","rfq.create","quotation.create","messages.send"]`; a viewer receives `[]`.

Anonymous call (no header) returns `data.viewer` = `null` and one error with `extensions.code` = `AUTHENTICATION_REQUIRED`.

### 3.5 `MyCompanies`

- Raw dev text: `query MyCompanies { myCompanies { id legalName countryCode roleKey } }`
- Input: none (needs a token).
- Output: `[Company!]!`. Lists ONLY companies where the caller has an ACTIVE membership. Ordered by company creation time. Maximum 100 items (silently truncated beyond that). No paging.
- `Company` fields: `id` (UUID), `legalName`, `countryCode` (ISO alpha-2), `roleKey` (`"owner"` for every company today).
- Errors: `AUTHENTICATION_REQUIRED`, `TOKEN_EXPIRED`, `TOKEN_INVALID`, `DEPENDENCY_ERROR`.

### 3.6 `Register`

- Raw dev text: `mutation Register($input: RegisterInput!) { register(input: $input) }`
- Input `RegisterInput`:

| Field | Type | Required | Server rule (zod, `packages/api-contracts`) |
|---|---|---|---|
| `email` | String | yes | Valid email format (`z.email()`), at most 254 characters. The contract does not trim: send a trimmed value. The server stores a normalised form (Unicode NFKC, lower-case, trimmed), so case differences are the same account. |
| `password` | String | yes | 12 to 128 characters (string length). Normalised with NFKC before hashing. |
| `locale` | String | no | 2 to 10 characters. Default `en` when OMITTED. `null` is rejected: omit the field instead. |

- Output: `true` for every valid request, including an email that is already registered. The response never reveals whether an account exists.
- No email-verification step exists in the code. The account is usable for login right after `register`.
- Errors: `VALIDATION_ERROR` (with `details`), `DEPENDENCY_ERROR`, `RATE_LIMITED`.

### 3.7 `Login`

- Raw dev text: `mutation Login($input: LoginInput!) { login(input: $input) { accessToken refreshToken } }`
- Input `LoginInput`:

| Field | Type | Required | Server rule |
|---|---|---|---|
| `email` | String | yes | Same rule as `RegisterInput.email`. |
| `password` | String | yes | 12 to 128 characters. The same length rule applies at login, so a shorter password returns `VALIDATION_ERROR`, not `INVALID_CREDENTIALS`. |

- Output `AuthPayload`: `accessToken` (JWT, see 3.11), `refreshToken` (opaque string, see 3.12). The access token has no company (`companyId` null).
- Wrong email, wrong password and disabled account all return the same error, `INVALID_CREDENTIALS`, with the same message.
- Errors: `VALIDATION_ERROR`, `INVALID_CREDENTIALS`, `DEPENDENCY_ERROR`, `RATE_LIMITED`.

Response example:

```json
{"data":{"login":{"accessToken":"<JWT>","refreshToken":"<43-character opaque token>"}}}
```

### 3.8 `Refresh`

- Raw dev text: `mutation Refresh($refreshToken: String!, $companyId: ID) { refresh(refreshToken: $refreshToken, companyId: $companyId) { accessToken refreshToken } }`
- Input:

| Field | Type | Required | Server rule |
|---|---|---|---|
| `refreshToken` | String | yes | 20 to 200 characters. |
| `companyId` | ID | no | A UUID (`z.uuid()`). `null` or omitted means "no company". Must be a company where the caller is an ACTIVE member. |

- Output `AuthPayload`: a NEW `refreshToken` (the old one is consumed) and a NEW `accessToken`.
  - With `companyId`: the access token carries `cid` = that company and `perms` = the caller's permissions in it.
  - Without `companyId`: the access token carries NO `cid` and `perms` = `[]`.
- Membership is checked BEFORE the refresh token is consumed, so a refused company switch does not burn the token.
- Errors: `VALIDATION_ERROR`, `INVALID_REFRESH_TOKEN` (see section 3.12 for the exact rules), `NOT_A_MEMBER` (companyId not an active membership), `DEPENDENCY_ERROR`.

### 3.9 `Logout`

- Raw dev text: `mutation Logout($refreshToken: String!) { logout(refreshToken: $refreshToken) }`
- Input: `refreshToken` (String, 20 to 200 characters).
- Output: `true`. Idempotent: an unknown, already-revoked or already-used token also returns `true`.
- Effect: revokes the whole session that the token belongs to. Every refresh token of that session stops working.
- The current access token is NOT revoked (see section 3.12, caveat 4).
- Errors: `VALIDATION_ERROR` (length), `DEPENDENCY_ERROR`.

### 3.10 `CreateCompany`

- Raw dev text: `mutation CreateCompany($input: CreateCompanyInput!) { createCompany(input: $input) { id legalName countryCode roleKey } }`
- Input `CreateCompanyInput`:

| Field | Type | Required | Server rule |
|---|---|---|---|
| `id` | ID | no | A UUID (`z.uuid()`). Omit it to let the server generate one. `null` is rejected. Clients may generate a UUID v4 themselves. |
| `legalName` | String | yes | Trimmed first, then 2 to 200 characters. |
| `countryCode` | String | yes | Must match `^[A-Z]{2}$` (two uppercase letters, ISO 3166-1 alpha-2 style, e.g. `SA`). The server checks the pattern only, not against a country list. |

- Output `Company`: `id`, `legalName` (trimmed), `countryCode`, `roleKey` = `"owner"`. The caller becomes the active owner.
- Idempotent retry: the same user sending the same `id` again gets the existing company back (no duplicate).
- An `id` already used by a different account returns `CONFLICT` (409) with a generic message that does not reveal the other company.
- The new company is NOT in the current access token. Call `refresh` with its `id` (section 3.12, caveat 3).
- Errors: `AUTHENTICATION_REQUIRED`, `TOKEN_EXPIRED`, `TOKEN_INVALID`, `VALIDATION_ERROR`, `CONFLICT`, `DEPENDENCY_ERROR`, `INTERNAL_ERROR`.

Example success response (shape from the e2e test):

```json
{"data":{"createCompany":{"id":"9a7e4b2c-0000-4000-8000-000000000002","legalName":"Acme Co","countryCode":"SA","roleKey":"owner"}}}
```

### 3.11 Access token (JWT)

| Property | Value |
|---|---|
| Format | JWT, signed with EdDSA (Ed25519). Header `typ` = `at+jwt`, `kid` identifies the signing key. |
| Issuer / audience | Defaults `saudaro-identity` / `saudaro-api` (environment-configurable). |
| Lifetime | 300 seconds (5 minutes). Fixed. |
| Storage | Memory only in the client. Never persist it. |
| Sent as | `Authorization: Bearer <token>`. |
| Verified by | The gateway on every request (signature, algorithm, issuer, audience, expiry). |

### 3.12 Session and token lifecycle (the state machine)

Tokens: the refresh token is an opaque 256-bit random string (43 characters, base64url). The server stores only its
SHA-256 hash. The refresh token belongs to a session. The session lasts 14 days from LOGIN (default `REFRESH_TTL_SECONDS`
= 1,209,600). Refreshing does NOT extend the session.

Lifecycle rules:

1. Login creates a session and returns access + refresh tokens.
2. Each successful `refresh` consumes the presented refresh token and returns a new one. Reuse of a consumed token is covered in the table below.
3. Logout (or theft detection, or session expiry) ends the session. All its refresh tokens stop working.
4. After the session expires (14 days from login), `refresh` fails with `INVALID_REFRESH_TOKEN` and the user must sign in again.

Reuse and race rules (from the identity service and its tests):

| Situation | Result | Server side effect |
|---|---|---|
| Valid, unused refresh token | New pair returned. | Old token consumed. |
| A consumed token replayed within 5 seconds | `INVALID_REFRESH_TOKEN` (401). | None: the session stays alive. This covers lost responses and simultaneous tabs. |
| A consumed token replayed after 5 seconds | `INVALID_REFRESH_TOKEN` (401). | The WHOLE session is revoked and an audit record is written (treated as theft). |
| Two simultaneous refreshes with the same token | One succeeds (200), the other gets `INVALID_REFRESH_TOKEN` (401). | None. The winner's token keeps working. |
| Token after logout, or after session expiry | `INVALID_REFRESH_TOKEN`. | None. |
| Unknown token of valid length (20 to 200 characters) | `INVALID_REFRESH_TOKEN`. | None. |
| Token shorter than 20 or longer than 200 characters | `VALIDATION_ERROR`. | None. |
| Account disabled | `INVALID_REFRESH_TOKEN`. | None. |

Client rules implied by these rules:

- Serialise refreshes: at most one refresh in flight per app instance (and share its result with other waiting requests).
- Never retry a refresh with an old token after a timeout or network failure. The first attempt may have succeeded on the server, so a retry with the consumed token can revoke the session if it happens after 5 seconds. On `INVALID_REFRESH_TOKEN`, treat the session as ended.
- Treat `INVALID_REFRESH_TOKEN` as the end of the session: clear both tokens and show the sign-in screen.

### 3.13 Company switching and creation

| Action | What the client does | Token result |
|---|---|---|
| Enter a company (after login) | `refresh(refreshToken, companyId)` | New access token with `cid` and `perms`. New refresh token. |
| Switch to another company | `refresh(newRefreshToken, otherCompanyId)` | Same as above for the other company. The previous access token is still valid until its `exp`: replace it in memory at once. |
| Leave the company context (no company) | `refresh(refreshToken)` with no `companyId` | Access token with no `cid` and `perms: []`. |
| Create a company | `createCompany`, then `refresh(refreshToken, newCompanyId)` | The new company is NOT in the old token. It appears only after the refresh. |
| Background refresh before expiry | Always pass the CURRENT `companyId` | Keeps the company context. Omitting it drops the company. |

Membership changes take effect in tokens only at the next refresh (or at the next token issue). A removed or suspended
member keeps the old `cid` and `perms` for up to 300 seconds.

### 3.14 Access-token claims and UI gating

The access token is a JWT. The GraphQL API exposes only some claims, through `viewer`:

| Claim | Meaning | Exposed by GraphQL | UI use |
|---|---|---|---|
| `sub` | User id (UUID). | `viewer.userId` | Identity of the signed-in user. |
| `cid` | Active company id (UUID). Absent until a company is chosen. | `viewer.companyId` (`null` when absent) | Which company context the UI shows. |
| `perms` | Permission keys for the active company, dotted catalog keys (e.g. `rfq.create`). Set from the caller's role in that company: owner 23 keys, admin 22, manager 17, member 5, viewer none (`[]`). Empty without a company. | `viewer.permissions` | Show or hide company features. See `docs/ROLES_AND_PERMISSIONS.md` section 5. |
| `sid` | Session id. | Not exposed | None. The gateway does not check it today. |
| `ver` | Session version, copied from the user record (default 1). Nothing increments it today. | Not exposed | None. |
| `amr` | Authentication methods. `["pwd"]` for login and refresh. | Not exposed | None. No step-up flow exists. |
| `iat`, `exp`, `iss`, `aud`, `jti` | Standard JWT claims. | Not exposed | Read `exp` only to schedule a refresh. |

Rules for gating:

- Use `viewer` (`companyId` and `permissions`) as the source for UI decisions. Do not decode the JWT for decisions.
- Gating is cosmetic: the server is the source of truth. Handle `AUTHORIZATION_ERROR` and `NOT_A_MEMBER` on every action.
- After any company switch or `createCompany` + `refresh`, query `viewer` again before rendering company features.

### 3.15 Recommended call sequence (matches the e2e test)

1. `register` with `{email, password}` returns `true`.
2. `login` returns `{accessToken, refreshToken}`. `viewer.companyId` is `null`.
3. `viewer` (with `Bearer` header): `companyId` `null`, `permissions` `[]`.
4. `createCompany` with `{id, legalName, countryCode}` returns the company with `roleKey` `owner`.
5. `myCompanies` returns that company (as the only item).
6. `refresh` with `{refreshToken, companyId}` returns a new pair. `viewer` now shows `companyId` = company id and the 23 owner permission keys.
7. A second user (no memberships): `myCompanies` returns `[]`. `refresh` with the first user's company id returns `NOT_A_MEMBER`.
8. `refresh` WITHOUT `companyId` returns a token with no company (`viewer.companyId` null). Replaying an old refresh token after 5 seconds returns `INVALID_REFRESH_TOKEN` and revokes the session.
9. `logout` with a refresh token returns `true`. Refreshing with that token afterwards returns `INVALID_REFRESH_TOKEN`.

## 4. Errors

### 4.1 GraphQL error shape (operations and resolver errors)

```json
{
  "data": { "viewer": null },
  "errors": [
    {
      "message": "Authentication is required.",
      "locations": [{ "line": 1, "column": 3 }],
      "path": ["viewer"],
      "extensions": {
        "code": "AUTHENTICATION_REQUIRED",
        "requestId": "req-abcdef12",
        "retryable": false,
        "details": [],
        "http": { "status": 401 }
      }
    }
  ]
}
```

- `extensions.code`: stable machine code (section 4.4). Branch on this, never on `message`.
- `extensions.requestId`: echo it in support messages.
- `extensions.retryable`: boolean.
- `extensions.details`: field errors (see 4.3). Empty for most codes.
- `extensions.http.status`: the status the error class defines. Do not rely on the HTTP status line for GraphQL resolver errors; read the body.
- `extensions.stacktrace`: appears only outside production. Never show it to users.
- For non-null root fields, `data` is `null` (for example `login`, `refresh`, `createCompany`, `myCompanies`, `health`).

### 4.2 REST error envelope (HTTP-layer errors)

Used by the gateway's HTTP layer, before or outside GraphQL execution. Body:

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests. Please try again later.",
    "details": [],
    "retryable": true,
    "requestId": "req-abcdef12",
    "timestamp": "2026-11-17T10:00:00.000Z"
  }
}
```

Which errors use which channel:

| Channel | Codes |
|---|---|
| REST envelope (top-level `error`, HTTP status shown) | `PAYLOAD_TOO_LARGE` (413), `MALFORMED_JSON` (400), `RATE_LIMITED` (429, plus `Retry-After`), `PERSISTED_QUERY_REQUIRED` (400), `PERSISTED_QUERY_NOT_FOUND` (400), `REQUEST_TIMEOUT` (504), `ROUTE_NOT_FOUND` (404) |
| GraphQL `errors[]` (body channel) | Everything raised by resolvers, validation, depth, cost, response size, and downstream services |

### 4.3 Field-level validation details

For `VALIDATION_ERROR`, `details` lists one entry per failing field:

```json
"details": [{ "field": "password", "message": "<zod message, text may change>", "code": "too_small" }]
```

- `field`: the input field path (for example `email`, `password`, `legalName`, `countryCode`, `refreshToken`, `companyId`). Nested paths are joined with dots. `(root)` when no path.
- `code`: the validation rule code (Zod issue code, for example `too_small`, `invalid_format`).
- `message`: text may change. Use your own copy keyed by `field` and `code`.

### 4.4 Error code table (all codes in the sources)

Columns: HTTP status (REST channel) or `extensions.http.status` (GraphQL channel). "Retry" = `retryable` in the envelope.
"Expected from" = the flow where the code is reached today. "Internal" = service-to-service; the UI should never see
it; if it appears, treat as `INTERNAL_ERROR`.

| Code | Status | Meaning | Retry | Expected from | Suggested UI behaviour |
|---|---|---|---|---|---|
| `VALIDATION_ERROR` | 400 | Input breaks a rule. `details` lists fields. Also used for GraphQL parse and validation errors. | No (change the input) | Any operation with input | Inline field errors using `details[].field`. Do not retry unchanged. |
| `MALFORMED_JSON` | 400 | Body is not valid JSON. | No | Any request | Client bug. Generic error with `requestId`. |
| `PAYLOAD_TOO_LARGE` | 413 | Body over 100 kb. | No | Any request | Client bug. Generic error. |
| `ROUTE_NOT_FOUND` | 404 | Unknown HTTP path. | No | Wrong URL | Client bug. Generic error. |
| `PERSISTED_QUERY_REQUIRED` | 400 | Production received a non-hashed request. | No | Raw query in production | Client build issue. Show "update the app" and log `requestId`. |
| `PERSISTED_QUERY_NOT_FOUND` | 400 | The hash is not in the allowlist (old or wrong build). | No | Stale client build | Prompt a reload or an app update. |
| `QUERY_TOO_DEEP` | 400 | Nesting above depth 10. | No | Only with edited documents | Client bug. |
| `QUERY_TOO_COMPLEX` | 400 | Estimated cost above 1000. | No | Only with edited documents | Client bug. Request fewer fields. |
| `RESPONSE_TOO_LARGE` | (GraphQL) | Response above 1 MiB. `data` replaced. | No | Only with large selections | Request fewer fields; show a generic error. |
| `AUTHENTICATION_REQUIRED` | 401 | Protected operation with no access token. | No | `viewer`, `myCompanies`, `createCompany` without a token | Go to sign-in (no session). |
| `TOKEN_EXPIRED` | 401 | Access token past `exp` (5 minutes). | No (but see refresh) | Protected operation with an old token | Call `refresh` with the current `companyId`, retry the operation ONCE. If refresh fails, go to sign-in. |
| `TOKEN_INVALID` | 401 | Token failed signature, issuer, audience, algorithm or claim checks. Reason is never revealed. | No | Tampered or foreign token | Clear tokens and go to sign-in. |
| `INVALID_CREDENTIALS` | 401 | Login failed (wrong email, wrong password, or disabled account; all identical). | No | `login` | Inline message on the login form ("Invalid email or password."). Clear the password field. |
| `INVALID_REFRESH_TOKEN` | 401 | Refresh or logout token unusable: unknown, consumed (after the 5 s window), session revoked or expired, account disabled. | No | `refresh` | End the session: clear tokens, show sign-in with a "session ended" message. |
| `AUTHENTICATION_ERROR` | 401 | Generic authentication failure (mapper default; for example a database-level auth error). | No | Rare | Same as `AUTHENTICATION_REQUIRED`. |
| `AUTHORIZATION_ERROR` | 403 | Authenticated but not allowed (generic; also a database permission denial). | No | Any protected action | Toast ("You do not have permission..."). Hide or disable the action. |
| `NOT_A_MEMBER` | 403 | `refresh` with a `companyId` where the caller is not an ACTIVE member (never a member, suspended or removed). | No | `refresh` with `companyId` | Toast. Re-run `myCompanies`. Keep the current session. |
| `NOT_FOUND` | 404 | Requested item does not exist or must not be revealed. | No | Downstream lookups | Not-found state. |
| `CONFLICT` | 409 | State conflict. For `createCompany`: the `id` belongs to another account. | No | `createCompany` with a foreign `id` | Retry `createCompany` with a NEW id (or omit `id`). Toast. |
| `INVALID_REFERENCE` | 409 | A referenced record is missing or not accessible (database foreign-key mapping). | No | Mapper; not reached by the current operations | Toast; reload the data. |
| `CONCURRENT_MODIFICATION` | 409 | Concurrent update detected (database serialization). | Yes | Mapper; not reached by the current operations | Retry after a short delay. |
| `BUSINESS_RULE_VIOLATION` | 422 | Action not allowed in the current state. | No | Mapper; not reached by the current operations | Toast with the server message. |
| `INVALID_DATA` | 422 | Stored data violates a database rule. | No | Mapper; not reached by the current operations | Toast; this is a bug report. |
| `RATE_LIMITED` | 429 | Too many requests from this IP (300 per 60 s, per replica). `Retry-After` header given (60 by default). | Yes, after `Retry-After` | Any request | Disable submit; show a countdown; retry after the wait. |
| `REQUEST_TIMEOUT` | 504 | Whole request took over 15 s. | Yes | Any request | Retry with backoff for reads. For `refresh`, follow section 3.12 (do not blindly retry). |
| `DEPENDENCY_ERROR` | 502, 503 or 504 | A service is unavailable (503), timed out (504), or answered badly (502). | Yes | Operations that call identity or company | Retry with backoff (up to 2 times), then "temporarily unavailable". |
| `INTERNAL_ERROR` | 500 | Unexpected error. Message is always generic. | No | Any | Generic error with `requestId` for support. |
| `GRAPHQL_PARSE_FAILED`, `GRAPHQL_VALIDATION_FAILED`, `BAD_USER_INPUT`, `BAD_REQUEST` | (mapped) | Raw GraphQL errors; reported as `VALIDATION_ERROR`. | No | Edited documents | Client bug. |
| `SERVICE_AUTH_REQUIRED` | 401 | Internal: service token missing. | No | Internal only | Treat as `INTERNAL_ERROR`. |
| `CALLER_NOT_ALLOWED` | 403 | Internal: wrong service calling an internal route. | No | Internal only | Treat as `INTERNAL_ERROR`. |
| `USER_AUTH_REQUIRED` | 401 | Internal: user token not forwarded to company service. | No | Internal only | Treat as `INTERNAL_ERROR`. |
| `MEMBERSHIP_NOT_FOUND` | 404 | Internal: membership lookup miss. Identity maps it to "no membership". | No | Internal only | Never shown to users. |

The code `COMPANY_ACCESS_DENIED` appears only as an example in a source comment. No code path raises it.

### 4.5 Retry and UI rules (summary)

| Class | Codes | Rule |
|---|---|---|
| Fix the input | `VALIDATION_ERROR`, `MALFORMED_JSON`, `PAYLOAD_TOO_LARGE`, `QUERY_TOO_DEEP`, `QUERY_TOO_COMPLEX` | Inline errors or fix the client. No automatic retry. |
| Session | `AUTHENTICATION_REQUIRED`, `TOKEN_EXPIRED`, `TOKEN_INVALID`, `INVALID_REFRESH_TOKEN` | Refresh once for `TOKEN_EXPIRED`; sign in otherwise. |
| Wait and retry | `RATE_LIMITED`, `CONCURRENT_MODIFICATION`, `REQUEST_TIMEOUT`, `DEPENDENCY_ERROR` | Backoff. Respect `Retry-After`. Cap attempts. |
| Show to user | `AUTHORIZATION_ERROR`, `NOT_A_MEMBER`, `NOT_FOUND`, `CONFLICT`, `BUSINESS_RULE_VIOLATION` | Toast or state view. |
| Support | `INTERNAL_ERROR`, unknown codes | Generic message with `requestId`. |

## 5. Limits the UI must respect

| Limit | Value | Setting | Effect for the UI |
|---|---|---|---|
| Query depth | 10 | `GRAPHQL_MAX_DEPTH` | Current documents are depth 1 to 2. |
| Query cost | 1000 | `GRAPHQL_MAX_COMPLEXITY` | Current operations cost 1 to 5. Field cost is 1 + children; a field with `first: N` costs 1 + N × children (no current operation uses `first`). |
| Operations per request | 1 | fixed | Never batch. |
| Request body | 100 kb | `MAX_BODY` | Operations are small; never send files or large payloads. |
| Response body (data) | 1 MiB | `MAX_RESPONSE_BYTES` | Not reachable by current operations. |
| Whole-request deadline | 15 s | `REQUEST_TIMEOUT_MS` | `REQUEST_TIMEOUT` after 15 s. |
| Service call budget | 13.5 s (90% of the deadline) | fixed | Slow services become `DEPENDENCY_ERROR` with 504. |
| Membership lookup (internal) | 5 s | fixed | Surfaces as `DEPENDENCY_ERROR` on `refresh` with `companyId`. |
| Rate limit | 300 requests per 60 s per client IP, per gateway replica | `RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW_MS` | Applies to all `/graphql` requests, including `Health`. Users behind the same IP share the budget. The memory store is not shared across replicas, so the effective limit can be higher with several replicas. Clients behind a proxy need the proxy hop count set (`TRUST_PROXY`); otherwise all clients share one key. |
| Retry-After | 60 s by default | window | Equals the window length, not the remaining time. |
| Access token lifetime | 300 s | identity default | Refresh before expiry or on `TOKEN_EXPIRED`. |
| Session (refresh) lifetime | 14 days from login | `REFRESH_TTL_SECONDS` (default 1,209,600) | Not extended by refresh. |
| Refresh reuse grace | 5 s | fixed | See section 3.12. |
| `myCompanies` maximum | 100 items | fixed | Silently truncated. No paging. |
| Email | at most 254 characters | contract | Send trimmed. |
| Password | 12 to 128 characters | contract (register and login) | Show the rule in the registration form. |
| Refresh token | 20 to 200 characters | contract | Stored tokens are 43 characters. |
| `legalName` | 2 to 200 characters after trimming | contract | |
| `countryCode` | exactly two uppercase letters | contract | |
| `locale` | 2 to 10 characters, optional | contract | Omit; never `null`. |

Production defaults: persisted queries required, introspection disabled, landing page disabled, stack traces hidden.

## 6. Pagination

### 6.1 Available now

None. No operation takes `first` or `after`, and the schema has no `Connection`, `Edge` or `PageInfo` type. `myCompanies` returns at most 100 items in one response.

### 6.2 Planned (designed, not implemented; shape may change)

Source: `packages/shared-types/src/index.ts` (Relay-style types and helpers), `packages/validation/src/index.ts` (`pageArgs`),
`apps/backend/api-gateway/src/plugins/operations.ts` (cost estimator already prices `first`).

| Element | Planned definition |
|---|---|
| `PageInfo` | `hasNextPage: Boolean!`, `endCursor: String` (`null` when the page is empty) |
| `Edge<T>` | `cursor: String!`, `node: T!` |
| `Connection<T>` | `edges: [Edge<T>!]!`, `pageInfo: PageInfo!` |
| Arguments | `first: Int` (1 to 100, default 20), `after: String` (at most 512 characters) |
| Cursor | Opaque string (base64url of a JSON keyset). Treat as opaque. The server validates it and rejects malformed cursors. |
| Fetch rule | The server fetches `first + 1` rows; the extra row only sets `hasNextPage` and is never returned. |
| Limits | Default page 20; maximum page 100. |

## 7. Planned API surface (not implemented)

Status for everything in this section: **Planned — not implemented, shape may change.** No operation below exists in the
schema. The service folders for these modules exist only as empty placeholders (`.gitkeep` files). Operation names and
signatures are NOT defined in any source, except `acceptQuotation(id, revision)` (named in `docs/SYSTEM_ARCHITECTURE.md`
section 6). Each row states the capability and its permission key (designed permission catalog, see
`docs/ROLES_AND_PERMISSIONS.md` section 2.2) and the source.

### 7.1 Gateway-level (planned)

| Item | Planned behaviour | Source |
|---|---|---|
| Subscriptions | Real-time messaging and notifications over WebSocket, authenticated with the same token. | `docs/SYSTEM_ARCHITECTURE.md` section 8 |
| Shared rate limit | Redis-backed store, per user and company. | `docs/SYSTEM_ARCHITECTURE.md` section 3; `docs/GRAPHQL_ARCHITECTURE.md` |
| Session revocation check | Redis deny-list keyed by session id until token expiry. | `docs/SYSTEM_ARCHITECTURE.md` section 4 |
| File upload negotiation | REST endpoints that return short-lived signed URLs (not GraphQL). | `docs/SYSTEM_ARCHITECTURE.md` section 8 |
| Step-up authentication | MFA (TOTP or WebAuthn) and the `amr` claim for admin and sensitive mutations. | `docs/SYSTEM_ARCHITECTURE.md` section 4 |

### 7.2 Modules (port per `docs/SYSTEM_ARCHITECTURE.md` section 2)

| Module (port) | Planned capability | Permission keys (designed) | Events (`docs/SYSTEM_ARCHITECTURE.md` section 5) |
|---|---|---|---|
| Identity (4001, implemented in part) | Email verification, password reset, MFA enrolment, invitation acceptance. Tables designed in `backend/docs/DATABASE_REFERENCE.md` section B. | none | `user.registered.v1` (emitted by the current register flow) |
| Company (4002, implemented in part) | Invitations, member role changes and removal, custom roles, company settings, public profile, addresses, contacts, suspension and closure. | `invitations.manage`, `members.manage`, `roles.manage`, `settings.manage`, `company.profile.manage`, `company.manage` | `company.created.v1` (emitted today) |
| Verification (4003) | Submit a verification case per level, upload verification documents, admin review queue, sanctions screening. | `verification.submit` | `company.verified.v1` |
| Catalog (4004) | Products, specifications, certifications, HS codes, seller listings. | `catalog.manage` | `product.published.v1` |
| Trade profile (4005) | Seller trade profile (capabilities, markets, ports, Incoterms; MOQ, lead times and payment terms stay private) and buyer profile. | `seller_profile.manage`, `buyer_profile.manage` | none listed |
| RFQ (4006) | Create and edit RFQ drafts, publish, invite suppliers (public, private or invited visibility), clarifications, cancel (no hard delete). | `rfq.create`, `rfq.manage` | `rfq.published.v1` |
| Matching (4007) | Match runs and supplier matches with reasons; supplier feedback. A match score never grants visibility. | none listed | `supplier.match.created.v1` |
| Quotation (4008) | Create, submit, revise and withdraw quotations; buyer comparison; accept one quotation per RFQ (`acceptQuotation(id, revision)`). | `quotation.create`, `quotation.submit`, `quotation.accept`, `rfq.manage` (comparison) | `quotation.submitted.v1`, `quotation.accepted.v1` |
| Messaging (4009) | Conversations, messages (edit window and read rule in the security doc), read receipts, attachments. No message search. | `messages.send`, `messages.manage` | `message.created.v1` |
| Deal (4010) | Deal created from the accepted quotation snapshot; milestones, shipments, documents, confirmations, cancellation requests, disputes. | `deal.manage`, `deal.confirm` | `deal.created.v1`, `deal.completed.v1` |
| Notification (4011) | Notifications, device tokens, preferences, templates. | none listed | consumes most events |
| Search (4012) | Search over public projections only (full-text and trigram). | none | consumes `company.created.v1`, `product.published.v1`, `rfq.published.v1` |
| Admin (4013) | Platform admin roles, moderation cases, abuse reports, compliance flags, admin actions (each with a required reason). | per admin role (see `docs/ROLES_AND_PERMISSIONS.md` section 4) | none listed |
| Document (4014) | File metadata, signed-URL upload and download, file access grants, malware scan status. | `files.manage` | none listed |
| Reviews (no port assigned) | Company reviews and responses. Tables designed in `backend/docs/DATABASE_REFERENCE.md` section M. | `review.write`, `review.respond` | none listed |
| Audit (no port assigned) | Company audit log read. | `audit.read` | none listed |

## 8. Caveats the designer must plan for

| # | Caveat | Source |
|---|---|---|
| 1 | Access tokens are not checked against session revocation or session version. A logged-out, removed or suspended user keeps access for up to 300 seconds. | `packages/authentication/src/tokens.ts`; `apps/backend/api-gateway/src/context/context.ts` |
| 2 | A refresh without `companyId` drops the company context (section 3.13). | `apps/backend/services/identity-service/src/application/auth-service.ts` |
| 3 | Company switch and creation take effect only after a refresh. | Same; and `tests/e2e/auth-and-company.test.ts` |
| 4 | Logout returns `true` even for unknown tokens (idempotent). The access token stays valid until expiry. | Same; identity tests |
| 5 | Permission keys in the token come from `packages/authorization` (`permissionsFor(roleKey)`) and are the designed dotted catalog keys. A role key outside the five system roles gets `[]`. | `packages/authorization/src/index.ts`; `apps/backend/services/company-service/src/http/routes.ts` |
| 6 | Only owner memberships are created today, so every company token currently carries the owner set (23 keys). Non-owner sets exist in the code but no operation can yet create those memberships. | `apps/backend/services/company-service/src/infrastructure/repositories/companies.ts` |
| 7 | `register` gives the same `true` for new and existing emails, and there is no email verification. | `apps/backend/services/identity-service/src/application/auth-service.ts` |
| 8 | Rate limit is per client IP and per replica. | `apps/backend/api-gateway/src/middleware/protection.ts` |
| 9 | `myCompanies` is capped at 100 and has no paging. | `apps/backend/services/company-service/src/infrastructure/repositories/companies.ts` |
