# UI Design Brief

Entry document for designing the SAUDARO user interface. It states what the product is, what data and API exist, what
is real today versus planned, and which document answers which question. Read this first, then the documents it links.

## 1. Product

SAUDARO is a global B2B import–export marketplace. Companies (not individuals) trade: **buyers** publish requests for
quotation (RFQs), **sellers** respond with quotations, the two negotiate, and an accepted quotation becomes a **deal**
managed in a deal room with documents, confirmations and messaging. Trust features sit around it: business
verification, reviews and reputation, compliance checks.

One user can belong to several companies and acts for **one active company at a time**; everything a user sees and
does is scoped to that company (see `ROLES_AND_PERMISSIONS.md`).

## 2. Status: what exists

| Layer                                             | State                                                                                          |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Authentication, sessions, company creation        | **Implemented and callable** through the GraphQL gateway (`API_REFERENCE.md`, "Available now") |
| Database for everything else (155 tables)         | **Designed and verified** in a reference database; not yet served by an API                    |
| API for catalog, RFQ, quotations, deals, messages | **Planned** — operation lists in `API_REFERENCE.md`, "Planned"                                 |
| Frontend                                          | **Empty on purpose** — it will be built from the design produced with these documents          |

Design for the **complete** product, but mark in the design which screens depend on planned API so build order is clear.

## 3. Document map

| Question                                                       | Document                                              |
| -------------------------------------------------------------- | ----------------------------------------------------- |
| How does a client authenticate and call the API? Error codes?  | `API_REFERENCE.md`                                    |
| Who can do/see what? How to gate UI by permission?             | `ROLES_AND_PERMISSIONS.md`                            |
| What entities, fields, enums and lifecycles exist, per module? | `domain/*.md` (index below)                           |
| Exact columns/constraints/policies of the built services       | `DATA_DICTIONARY.md` (generated)                      |
| Full column-level dictionary of all 155 designed tables        | `../backend/docs/DATABASE_REFERENCE.md` (generated)   |
| Architecture, decisions, service boundaries                    | `SYSTEM_ARCHITECTURE.md`, `ARCHITECTURE_DECISIONS.md` |

### Domain documents (155 tables, modules A–O)

| Document                                   | Modules                                                                    |
| ------------------------------------------ | -------------------------------------------------------------------------- |
| `domain/REFERENCE_DATA_AND_CATALOG.md`     | A Reference data (17), F Product catalog (9)                               |
| `domain/IDENTITY_AND_COMPANIES.md`         | B Identity (10), C Companies/RBAC (12), D Files (5), E Verification (9)    |
| `domain/TRADE_PROFILES_AND_RFQ.md`         | G Seller/buyer profiles (21), H RFQ (16), I Supplier matching (5)          |
| `domain/QUOTATIONS_AND_DEALS.md`           | J Quotations and negotiation (11), K Deals and deal room (14)              |
| `domain/COMMUNICATION_REPUTATION_ADMIN.md` | L Messaging (8), M Reviews (4), N Notifications (4), O Administration (10) |

Each domain document gives, per module: purpose, entities with exact field names, enumerations, state machines, access
rules, and the screens/data the module implies. Treat their **open points** sections as questions for the product owner:
the design should propose an answer or flag them, not silently assume one.

## 4. Personas

Derived from the data model, not invented: **buyer company** member, **seller company** member (a company can be both),
**company owner/admin** (manages members, roles, settings, verification), **platform administrator** (moderation, abuse
reports, audit). Roles inside a company: owner, admin, manager, member, viewer.

## 5. Client technical contract (fixed by the backend)

- **Single endpoint:** `POST /graphql` on the API gateway (local default `http://localhost:4000/graphql`). No REST for
  the browser. The browser never talks to the services directly.
- **Production runs persisted queries only:** the client sends a SHA-256 hash of an allowed operation, not query text.
  The allowed operations are the ones listed in `API_REFERENCE.md`; a new screen needs a new operation first.
- **Tokens:** a short-lived access token (5 minutes) held **in memory only**, and a rotating refresh token. Refreshing
  without a company id drops the active company; switching company means refreshing with that company id. Logout does
  not invalidate an access token before it expires. Details and exact flow: `API_REFERENCE.md`.
- **Permissions in the token** (`perms`) are for hiding/disabling UI only; the server enforces everything.
- **Errors:** one envelope for every failure with a stable `code`, a user-safe `message`, `retryable`, and `requestId`
  (show the request id on error screens for support). Code table with suggested UI behaviour is in `API_REFERENCE.md`.
- **Limits:** request size, query depth and cost limits, and a per-client rate limit apply (numbers in
  `API_REFERENCE.md`); design list screens for cursor pagination and avoid screens that need unbounded lists.
- **Idempotent create:** creating a company accepts a client-generated UUID; generate one per form submit so a retry
  cannot create a duplicate.
- **Reference data** (countries, currencies, units, Incoterms, ports, languages, HS codes, certifications, categories)
  drives most dropdowns; counts and examples are in `domain/REFERENCE_DATA_AND_CATALOG.md`.

## 6. Design questions to answer explicitly

The data model leaves these to the design. Propose a position for each:

1. Languages and layout direction: a `languages` table exists; decide which locales ship first and whether right-to-left
   layouts are required.
2. Money and units: amounts carry a currency, quantities carry a unit; decide display, rounding and conversion rules.
3. Onboarding: sign-up currently creates an active account without email verification; decide the intended journey
   (verify email, choose buyer/seller, create company, verify business).
4. Company switching: the active company changes the whole app; decide where it lives and how state resets.
5. Empty, loading, error, and permission-denied states for every list and detail screen.
6. Accessibility target and responsive breakpoints (mobile-first is assumed for buyer/seller workflows).
7. How verification level and reputation are shown on company cards and quotations.

## 7. Prompt to give the designing Claude

> Read `docs/UI_DESIGN_BRIEF.md` first, then `API_REFERENCE.md`, `ROLES_AND_PERMISSIONS.md` and every file in
> `docs/domain/`. Design the complete UI for SAUDARO: information architecture, navigation per persona and role, every
> screen (with the fields, states, empty/error/permission-denied variants), key flows (onboarding, RFQ creation,
> quotation and negotiation, deal room), and a design system (tokens, components). Use only entities, fields and
> statuses that exist in these documents; if you need something missing, list it as a data/API request instead of
> inventing it. Mark each screen as "API available now" or "needs planned API". Answer the questions in section 6 of the
> brief and the open points in the domain documents with explicit proposals.
