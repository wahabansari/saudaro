# Conversations, Reputation, Notifications and Administration: UI Design Reference

**Last Updated:** 2026-11-17
**Scope:** Modules L (Conversations and messaging, 8 tables), M (Reviews and reputation, 4), N (Notifications, 4), O (Administration, audit, outbox, 10). Related table `user_notification_preferences` (module B) is included in N because the preferences screen needs it.
**Status:** All tables below are **designed, not yet implemented**. The implemented schemas today are `identity-service` and `company-service` (only the platform tables are present there).
**Sources:** `backend/docs/DATABASE_REFERENCE.md` (sections L, M, N, O), `backend/src/database/schema/{messaging,reviews,notifications,admin,identity}.ts`, `backend/src/database/migrations/0001_core_schema.sql` (CHECK constraints), `0003_functions_and_triggers.sql` (guards), `0005_rls_policies_and_grants.sql` (access), `backend/src/database/seeds/reference-data.ts` (permissions and roles), `backend/docs/{DATABASE_DESIGN,SECURITY_ARCHITECTURE,ERD}.md`, `docs/ARCHITECTURE_ASSESSMENT.md` §4, `docs/SYSTEM_ARCHITECTURE.md` §5, `docs/ARCHITECTURE_DECISIONS.md`.

---

## 0. Read first: context that applies to every screen

**Tenant model.** A user is global. A user acts for a company only through an active membership. Every screen runs in one of these contexts:

| Term | Meaning |
|---|---|
| ME | The signed-in user (`users.id`). |
| ACTIVE_CO | The company the user has selected. Valid only if the membership is `active`, the user is `active`, and the company is not `closed`. |
| WRITABLE_CO | ACTIVE_CO only if the company status is `draft` or `active`. A `suspended` company is read-only. A `closed` company is not ACTIVE_CO at all. |
| Public company | Company status `active`. Public company cards and reputation metrics are visible to others. |

**Enumerations used across modules (verbatim):**
- `companies.status`: `draft`, `active`, `suspended`, `closed`
- `company_memberships.status`: `active`, `suspended`, `removed`
- `users.status`: see `USER_STATUS` in `identity.ts` (default `pending`)

**Permissions that gate this document's actions** (seed, `reference-data.ts`):

| Permission key | Gates | owner (100) | admin (80) | manager (60) | member (40) | viewer (20) |
|---|---|---|---|---|---|---|
| `messages.send` | send messages, start conversations | yes | yes | yes | yes | no |
| `messages.manage` | add colleagues to conversations | yes | yes | yes | no | no |
| `review.write` | write reviews | yes | yes | yes | no | no |
| `review.respond` | respond to reviews | yes | yes | yes | no | no |
| `audit.read` | read the company audit log | yes | yes | no | no | no |

Custom company roles can differ from these system roles.

**Platform admin roles** (`admin_role_assignments.admin_role`, verbatim): `super_admin`, `verification_officer`, `moderator`, `support`, `compliance_officer`, `readonly_auditor`. `super_admin` satisfies every other role check (`app.is_platform_admin`). Any active admin role satisfies `admin()`.

**Platform tables.** `audit_logs`, `outbox_events` and `inbox_events` (and `audit_log`, singular, in per-service schemas) exist today in each implemented service schema. See `apps/backend/services/identity-service/migrations/0000_common_tables.sql` and `company-service/migrations/0000_common_tables.sql`. Their `actor_type` set in those schemas is `user`, `admin`, `system`, `service`. The backend reference uses `user`, `admin`, `system`, `worker`, `provider`. This document uses the backend reference.

**Internal-only tables (never shown in any UI):** `outbox_events`, `idempotency_keys`, and the per-service `inbox_events` and `outbox_events` platform tables.

**Data ownership and status rule.** Each module below states its owner service (from `docs/ARCHITECTURE_ASSESSMENT.md` §4) and status.

---

## L. Conversations and messaging (8 tables)

### L.1 Purpose (product language)
Private, participant-only chat between two companies. A conversation is either free-standing (`direct`) or linked to an RFQ, a quotation, or a deal. Only the named participants (user plus company) can read it. Messages are append-only. The sender can edit or soft-delete a message only within the limits in L.4.

### L.2 Owner and status
- **Owner service:** messaging service (`docs/ARCHITECTURE_ASSESSMENT.md` §4 "messaging"). Consumes `deal.created.v1`; publishes `message.created.v1` (`docs/SYSTEM_ARCHITECTURE.md` §5).
- **Status:** designed, not yet implemented. `apps/backend/services/messaging-service` contains only directory scaffolding.

### L.3 Entities

| Table | What it represents | Key columns (type) | Relations |
|---|---|---|---|
| `conversations` | One conversation thread. | `id` uuid PK; `conversation_type` text; `rfq_id` uuid?; `quotation_id` uuid?; `deal_id` uuid?; `initiator_company_id` uuid; `counterparty_company_id` uuid; `created_by_user_id` uuid; `subject` text?; `status` text (default `active`); `last_message_at` timestamptz?; `created_at` timestamptz | → `rfqs`, `quotations`, `deals` (restrict); → `companies` ×2 (restrict); → `users` (restrict). Parent of `conversation_participants`, `messages`, `conversation_archives`. |
| `conversation_participants` | Who is in a conversation, in which company, with which role. | `id` uuid PK; `conversation_id` uuid; `company_id` uuid; `user_id` uuid; `participant_role` text; `joined_at` timestamptz; `left_at` timestamptz? | `(company_id, user_id)` → `company_memberships` (a participant must be a member of the company). Unique `(conversation_id, user_id)`. |
| `messages` | One message. Append-only apart from body edit and soft delete. | `id` uuid PK; `conversation_id` uuid; `sender_user_id` uuid? (null for system); `sender_company_id` uuid?; `kind` text (default `text`); `body` text? (max 10000 chars); `reply_to_id` uuid? (must be in same conversation); `moderation_status` text (default `visible`); `edited_at` timestamptz?; `deleted_at` timestamptz?; `created_at` timestamptz | → `conversations` (cascade); → `users`, `companies` (restrict); self-reference `reply_to_id` → `messages`. |
| `message_attachments` | Links a stored file to a message. | `id` uuid PK; `message_id` uuid; `company_id` uuid (sender company); `file_id` uuid (unique); `created_at` timestamptz | `message_id` → `messages` (cascade); `(file_id, company_id)` → `files` (the file must belong to the sender company). |
| `message_read_receipts` | Per-user read marker for a message. | `message_id` uuid PK; `user_id` uuid PK; `read_at` timestamptz | → `messages`, `users` (cascade). |
| `message_delivery_events` | Per-recipient, per-channel delivery outcome for a message. Written by the worker. | `id` uuid PK; `message_id` uuid; `recipient_user_id` uuid; `channel` text; `status` text; `occurred_at` timestamptz | → `messages`, `users` (cascade). |
| `conversation_archives` | Personal archive flag for one conversation and one user. | `conversation_id` uuid PK; `user_id` uuid PK; `archived_at` timestamptz | → `conversations`, `users` (cascade). |
| `message_reports` | A user's abuse report against one message. | `id` uuid PK; `message_id` uuid; `reporter_user_id` uuid; `reporter_company_id` uuid; `reason` text; `details` text?; `status` text (default `open`); `resolved_at` timestamptz?; `created_at` timestamptz | → `messages` (cascade); → `users`, `companies` (restrict). Unique `(message_id, reporter_user_id)`. |

### L.4 Enumerations (verbatim)

| Column | Values |
|---|---|
| `conversations.conversation_type` | `direct`, `rfq`, `quotation`, `deal` |
| `conversations.status` | `active`, `closed` |
| `conversation_participants.participant_role` | `buyer`, `supplier`, `observer` |
| `messages.kind` | `text`, `system`, `attachment` |
| `messages.moderation_status` | `visible`, `flagged`, `hidden` |
| `message_delivery_events.channel` | `in_app`, `email`, `push` |
| `message_delivery_events.status` | `queued`, `delivered`, `failed` |
| `message_reports.reason` | `spam`, `harassment`, `fraud`, `inappropriate`, `other` |
| `message_reports.status` | `open`, `reviewing`, `actioned`, `dismissed` |

Link rule (`conversations_link_chk`): `direct` has no `rfq_id`, `quotation_id` or `deal_id`. `rfq` requires `rfq_id`. `quotation` requires `quotation_id`. `deal` requires `deal_id`.

### L.5 Lifecycles

**A. Starting a conversation.** Actor: a user with `messages.send` in WRITABLE_CO. Enforced by RLS on `conversations` insert and by trigger `guard_conversation`.

| Type | Allowed parties (enforced) | Uniqueness (enforced) |
|---|---|---|
| `direct` | initiator = ACTIVE_CO; counterparty must be a public (`active`) company; counterparty ≠ initiator | none |
| `rfq` | one party is the RFQ owner; the other can see the RFQ | one per `(rfq_id, initiator_company_id, counterparty_company_id)` |
| `quotation` | the two parties are the quotation's supplier and buyer | one per `quotation_id` |
| `deal` | the two parties are the deal's buyer and supplier | one per `deal_id` |

**B. Conversation status (`active` ⇄ `closed`).** Any participant can update `status`, `subject` and `last_message_at` (RLS `participant(id)`). No database guard on update is in the sources. Who may close, and whether closure is reversible for everyone, is **not stated** in the sources. A closed conversation rejects new messages (`guard_message`: "conversation is closed").

**C. Participants.**
- Add: the conversation creator (`created_by_user_id = ME`, company is one of the two parties), or a participant whose WRITABLE_CO holds `messages.manage`. The added user must have a membership in that company (composite FK). No consent step by the added user (decision U-10 in `docs/ARCHITECTURE_DECISIONS.md`).
- Leave: the participant sets `left_at` on their own row (`user_id = ME`). Rows are never deleted by the app. A participant is "in" only while `left_at` is null and the membership is `active` (`app.is_conversation_participant`).

**D. Archive (personal).** A user inserts a row in `conversation_archives` to archive and deletes it to unarchive. Rows are never updated.

**E. Message lifecycle: sent → delivered → read.**

| Step | Actor | Rule and enforcement |
|---|---|---|
| Sent | A participant (ME) in WRITABLE_CO | `sender_user_id = ME`, `sender_company_id` must be the participant's company, `kind` cannot be `system` (system messages are written by the system only), conversation must be `active`. `moderation_status` is forced to `visible`. (`guard_message`) |
| Delivered | Worker | One `message_delivery_events` row per recipient and channel: `queued` → `delivered` or `failed`. Channels: `in_app`, `email`, `push` (no `sms` for messages). |
| Read | A recipient (ME) | One `message_read_receipts` row per `(message_id, user_id)`. Rows are never updated or deleted. |
| Edited | Sender only | Body may change only if the message is at most **15 minutes** old AND no user other than the sender has a read receipt for it. Sets `edited_at`. (`guard_message`) |
| Soft-deleted | Sender only | Sets `deleted_at`. No hard delete. |
| Moderation flag | System callers only | `moderation_status` (`visible`, `flagged`, `hidden`) cannot be changed by application users (`guard_message`). The moderator path that sets it is **not stated** in the sources. |

Other message rules:
- Reply: `reply_to_id` must reference a message in the same conversation (composite FK).
- Body length: maximum 10000 characters. A `text` message must have a body.
- Attachments: added by the message's sender (`message_attachments` insert requires `message_id` sent by ME and `company_id` = WRITABLE_CO). No time window is stated. A file can be attached once (`file_id` unique). The app cannot update or delete attachment rows.

**F. Message report.** Actor: any participant (or any user who can read the message) in WRITABLE_CO. One report per message per user. Status: `open` → `reviewing` → `actioned` or `dismissed`. Moderators update status (RLS `admin(moderator)`). No database trigger enforces the order of transitions; the CHECK only restricts values.

**Who can read a reported message:** participants, and moderators for messages that have at least one `message_reports` row (RLS on `messages`). A moderator therefore sees the body of a reported message even though they are not a participant. The UI must label this case.

### L.6 Screens and data (L)

**Inbox (conversation list)**
- Shows: `conversation_type`, `subject`, counterparty company (from `initiator_company_id` / `counterparty_company_id`, whichever is not ACTIVE_CO), `last_message_at`, `status`, archived flag for ME (`conversation_archives`), linked record (`rfq_id` / `quotation_id` / `deal_id`).
- Filters: `conversation_type` (4 values), `status` (`active`, `closed`), archived yes/no.
- Sort: `last_message_at` descending (`ix_conversations_initiator`, `ix_conversations_counterparty`).
- Unread indicator: derived from messages with no `message_read_receipts` row for ME.

**Conversation view**
- Header: `subject`, `conversation_type`, `status`, link to the linked RFQ / quotation / deal.
- Participants panel: `user_id`, `company_id`, `participant_role` (`buyer`, `supplier`, `observer`), `joined_at`, `left_at`.
- Message feed (paginated by `created_at` then `id`, `ix_messages_conversation_feed`): sender (`sender_user_id`, `sender_company_id`; system messages have none), `kind`, `body`, `reply_to_id` preview, `edited_at` marker, `deleted_at` placeholder, attachments (`message_attachments` → `file_id`), read receipts (`user_id`, `read_at`), delivery status per channel (`message_delivery_events`).
- Composer form: `body` (≤10000 characters), `reply_to_id` (optional), attachment picker (file from the sender company, `file_id`). Disabled when conversation `status` = `closed` or ME lacks `messages.send` in WRITABLE_CO.
- Edit form (own message only, within the 15-minute and no-other-reader limits): `body`.
- Delete action (own message): sets `deleted_at`.
- Report message form: `reason` (`spam`, `harassment`, `fraud`, `inappropriate`, `other`), `details` (optional text). One per message.

**Start conversation form (direct)**
- Fields: counterparty company (must be `active`), `subject` (optional), first `body`.

**Start conversation from RFQ / quotation / deal (linked)**
- Fields: linked record ID (`rfq_id`, `quotation_id` or `deal_id`), counterparty (derived from the record's parties), `subject`, first `body`.
- The UI must not offer a counterparty other than the record's parties (DB rejects it anyway).

**Participants management**
- Add colleague form: user, company (must be ACTIVE_CO or the other party), `participant_role`. Requires `messages.manage`.
- Leave conversation action: sets `left_at`.

**Conversation settings**
- Archive / unarchive toggle (personal).
- Close / reopen conversation (status), shown to participants. Confirmation text is a UI choice; the rule for who may close is open (see §L.7).

---

## M. Reviews and reputation (4 tables)

### M.1 Purpose
After a completed platform deal, each party can review the other. Reviews are moderated before publication. The reviewed company can respond once. Published reviews and metrics summarise each company's trade record on its public profile. Reviews describe the trade relationship, not payment performance.

### M.2 Owner and status
- **Owner service:** deal service. `docs/ARCHITECTURE_ASSESSMENT.md` §4 lists `company_reviews`, responses, reports and reputation metrics under `deal`. ADR-014 places reviews in Deal Service.
- **Status:** designed, not yet implemented. `apps/backend/services/deal-service` has scaffolding only. Reputation is read by company profile via event or projection (ADR-014).

### M.3 Entities

| Table | What it represents | Key columns (type) | Relations |
|---|---|---|---|
| `company_reviews` | One review by one company of the other company in one deal. | `id` uuid PK; `deal_id` uuid; `reviewer_company_id` uuid; `reviewed_company_id` uuid; `reviewer_user_id` uuid; `rating` smallint (1–5); `title` text?; `body` text? (max 5000); `status` text (default `pending`); `moderated_by_user_id` uuid?; `moderated_at` timestamptz?; `moderation_note` text?; `published_at` timestamptz?; `created_at` timestamptz; `updated_at` timestamptz | → `deals`, `companies` ×2, `users` ×2 (restrict). Unique `(deal_id, reviewer_company_id)`. Parent of `review_responses` and `review_reports`. |
| `review_responses` | The reviewed company's single reply to a review. | `id` uuid PK; `review_id` uuid (unique); `responding_company_id` uuid; `responded_by_user_id` uuid; `body` text (1–3000 chars); `status` text (default `published`); `created_at` timestamptz; `updated_at` timestamptz | `(review_id, responding_company_id)` → `company_reviews(id, reviewed_company_id)`: only the reviewed company can respond. → `users` (restrict). |
| `review_reports` | A user's report against a review. | `id` uuid PK; `review_id` uuid; `reporter_user_id` uuid; `reporter_company_id` uuid; `reason` text; `details` text?; `status` text (default `open`); `created_at` timestamptz; `resolved_at` timestamptz? | → `company_reviews` (cascade); → `users`, `companies` (restrict). Unique `(review_id, reporter_user_id)`. |
| `company_reputation_metrics` | Derived summary of a company's trade record. Written by the worker only. | `company_id` uuid PK; `review_count` integer (default 0, ≥0); `average_rating` numeric(3,2)? (1–5 or null); `completed_deals` integer (default 0, ≥0); `avg_response_hours` numeric(8,2)?; `computed_at` timestamptz | → `companies` (cascade). |

### M.4 Enumerations (verbatim)

| Column | Values |
|---|---|
| `company_reviews.rating` | integer 1 to 5 (`company_reviews_rating_chk`, `smallint`) |
| `company_reviews.status` | `pending`, `published`, `rejected`, `removed` |
| `review_reports.reason` | `fake`, `abusive`, `conflict_of_interest`, `privacy`, `other` |
| `review_reports.status` | `open`, `reviewing`, `actioned`, `dismissed` |
| `review_responses.status` | `published`, `removed` |

Note: `hidden` is **not** a review status. Messages have `hidden` (`messages.moderation_status`). A review that is not public has status `pending`, `rejected` or `removed`. "Reported" is not a status: a review is reported when a `review_reports` row exists. "Responded" is not a status: a review has a response when a `review_responses` row exists.

### M.5 Lifecycles

**A. Eligibility to review.** Actor: a user with `review.write` in WRITABLE_CO.
- The deal's `status` must be `completed` (`guard_review`).
- Reviewer company and reviewed company must be the two parties of the deal (in either direction).
- `reviewer_company_id` must be ACTIVE_CO and `reviewer_user_id` must be ME.
- One review per `(deal_id, reviewer_company_id)`.
- `completed` means commercially closed; it does not mean payment was made (`deals.ts` comment).

**B. Review status.**

| From | To | Actor | Enforced by |
|---|---|---|---|
| (new) | `pending` | Reviewer (on submit) | `guard_review` forces `pending` for any non-moderator insert. |
| `pending` | `pending` (edit) | Author | Author may change `rating`, `title`, `body` only while `pending`; cannot change status, moderation fields or parties (`guard_review`). |
| `pending` | `published` | Moderator | RLS `admin(moderator)`; trigger sets `moderated_by_user_id`, `moderated_at`, `published_at`. |
| `pending` | `rejected` | Moderator | Same. `published_at` cleared. |
| `published` | `removed` or `rejected` | Moderator | Same. `published_at` cleared (CHECK `company_reviews_published_chk`: published iff `published_at` is set). |
| any | `published` | Moderator | `published_at` set to first publication time. |

Visibility (`company_reviews` RLS): `published` rows are visible to everyone with access. Non-published rows are visible to the reviewer company (ACTIVE_CO), the reviewed company (ACTIVE_CO) and moderators. Column-level visibility of `moderation_note` and `reviewer_user_id` is **not stated** in the sources.

**C. Response.** Actor: a user with `review.respond` in WRITABLE_CO of the reviewed company. One response per review. Only `body` can be updated (`review_responses` column grant). The app cannot delete a response. No database rule ties a response to the review's status. Who sets a response to `removed` is **not stated** in the sources.

**D. Review report.** Actor: a user in WRITABLE_CO who can see the review. One per review per user. Status `open` → `reviewing` → `actioned` or `dismissed`, updated by moderators (RLS `admin(moderator)`). No trigger enforces transition order.

**E. Reputation metrics.** Written by the worker from published reviews and completed deals (schema comment in `reviews.ts`). Read by ACTIVE_CO or by anyone when the company is public (`status = 'active'`). The meaning of `avg_response_hours` and the rounding rule for `average_rating` are **not stated**.

### M.6 Screens and data (M)

**Write review (from a completed deal)**
- Shows: deal reference, the other party (fixed from deal parties), current own review state if any (`company_reviews.status`).
- Fields: `rating` (required, integer 1–5), `title` (optional), `body` (optional, ≤5000 characters).
- After submit, shows status "pending" (review awaiting moderation).
- While `pending`: edit form with the same fields.

**My reviews (reviewer side)**
- Lists: `company_reviews` where `reviewer_company_id` = ACTIVE_CO.
- Shows per row: `deal_id`, `reviewed_company_id`, `rating`, `title`, `status`, `created_at`, `published_at`.
- Shows `moderation_note` only if the team confirms it may be shown to the author (visibility not stated).

**Reviews received (reviewed company side)**
- Lists: `company_reviews` where `reviewed_company_id` = ACTIVE_CO, with status.
- Action: respond (if no response exists and ME holds `review.respond`).

**Respond to review form**
- Fields: `body` (required, 1–3000 characters).
- Shows: existing response (`body`, `status`, `updated_at`) and its edit action (body only).

**Report review form**
- Fields: `reason` (`fake`, `abusive`, `conflict_of_interest`, `privacy`, `other`), `details` (optional).
- Shows, after submit: report status.

**Company public profile: reputation panel**
- Fields from `company_reputation_metrics`: `average_rating` (2 decimals), `review_count`, `completed_deals`, `avg_response_hours`, `computed_at` (label as "as of").
- Shows a list of published reviews (`status = published`, ordered by `published_at` descending): `rating`, `title`, `body`, reviewer company (`reviewer_company_id`), `published_at`, and the response (`review_responses.body`) if one exists.
- Empty state: when `review_count` is 0 or `average_rating` is null.

**Deal page: review status**
- Shows whether the viewer's company can review (deal `completed`, no review yet for `(deal_id, reviewer_company_id)`) and the review's current status.

---

## N. Notifications (4 tables + 1 related)

### N.1 Purpose
An in-app inbox per user, plus email, push and SMS delivery, with per-user preferences for each category and channel. Push tokens are registered per device. Notifications are created by the worker from platform events; no tenant can create notifications for another user (ADR D17).

### N.2 Owner and status
- **Owner service:** notification service (`docs/ARCHITECTURE_ASSESSMENT.md` §4). `user_notification_preferences` is listed under notification in §4, but it sits in module B of the reference.
- **Status:** designed, not yet implemented. `apps/backend/services/notification-service` contains scaffolding only.
- **Events consumed** (`docs/SYSTEM_ARCHITECTURE.md` §5): `user.registered.v1`, `company.verified.v1`, `rfq.published.v1`, `supplier.match.created.v1`, `quotation.submitted.v1`, `quotation.accepted.v1`, `deal.created.v1`, `message.created.v1`, `deal.completed.v1`. The mapping from each event to a `notifications.category` is **not stated**.

### N.3 Entities

| Table | What it represents | Key columns (type) | Relations |
|---|---|---|---|
| `notifications` | One in-app notification for one user. | `id` uuid PK; `recipient_user_id` uuid; `company_id` uuid? (company context); `category` text; `notification_type` text (free text, no enum in sources); `title` text; `body` text?; `resource_type` text?; `resource_id` uuid?; `payload` jsonb? (small, non-sensitive render hints: string, number, boolean or null values); `read_at` timestamptz?; `created_at` timestamptz | → `users` (cascade); → `companies` (set null). |
| `notification_deliveries` | Delivery attempt state for one notification on one channel. Written by the worker. | `id` uuid PK; `notification_id` uuid; `channel` text; `status` text (default `pending`); `attempts` integer (default 0, 0–20); `next_attempt_at` timestamptz; `last_error` text?; `provider_message_id` text?; `sent_at` timestamptz?; `created_at` timestamptz | → `notifications` (cascade). Unique `(notification_id, channel)`. |
| `notification_templates` | Message template per key, channel and locale. | `id` uuid PK; `template_key` text; `channel` text; `locale` text (default `en`); `subject_template` text?; `body_template` text; `is_active` boolean (default true); `created_at` timestamptz; `updated_at` timestamptz | Unique `(template_key, channel, locale)`. |
| `device_tokens` | A registered push device for one user. | `id` uuid PK; `user_id` uuid; `platform` text; `token` text (unique; treat as a secret); `last_seen_at` timestamptz?; `revoked_at` timestamptz?; `created_at` timestamptz | → `users` (cascade). |
| `user_notification_preferences` (module B, related) | Per-user on/off switch per category and channel. | `id` uuid PK; `user_id` uuid; `category` text; `channel` text; `enabled` boolean (default true); `created_at` timestamptz; `updated_at` timestamptz | → `users` (cascade). Unique `(user_id, category, channel)`. |

### N.4 Enumerations (verbatim)

| Column | Values |
|---|---|
| `notifications.category` (and `user_notification_preferences.category`) | `rfq`, `quotation`, `message`, `deal`, `verification`, `invitation`, `security`, `system` |
| `notification_deliveries.channel`, `notification_templates.channel`, `user_notification_preferences.channel` | `in_app`, `email`, `push`, `sms` |
| `notification_deliveries.status` | `pending`, `processing`, `sent`, `failed`, `suppressed` |
| `device_tokens.platform` | `ios`, `android`, `web` |

Rules: `attempts` is 0 to 20. `security` + `in_app` cannot be disabled (`user_notification_preferences_security_chk`).

### N.5 Lifecycles

**A. Notification creation.** Actor: worker only. Application users cannot insert rows (`notifications` insert: none).

**B. Delivery per channel.**

| From | To | Actor | Rule |
|---|---|---|---|
| (new) | `pending` | Worker | One row per `(notification_id, channel)`. `next_attempt_at` defaults to now. |
| `pending` or `failed` | `processing` | Worker | Queue index covers `pending` and `failed` rows ordered by `next_attempt_at` (`ix_notification_deliveries_queue`). |
| `processing` | `sent` | Worker | Sets `sent_at` and `provider_message_id`. |
| `processing` | `failed` | Worker | Sets `last_error`, increments `attempts`. |
| `pending` / `processing` / `failed` | `suppressed` | Worker | Reason **not stated** in sources. |

The worker is the only writer. The recipient can read delivery rows through `notifications` (RLS `notification_id in (select id from notifications)`).

**C. In-app read state.** Actor: recipient. Updates only `read_at`. Unread = `read_at` is null (`ix_notifications_unread`). Recipient can delete their own notifications (RLS delete `recipient_user_id = ME`). Notification rows are otherwise immutable.

**D. Device tokens.** Actor: owner (`user_id = ME`).
- Register: insert (token unique across the table).
- Update: `last_seen_at`, `revoked_at` only.
- Revoke: sets `revoked_at`. Revoked tokens fall out of the active index (`ix_device_tokens_user` where `revoked_at` is null).
- Delete: allowed for owner.

**E. Preferences.** Actor: owner (`user_id = ME`): insert, update `enabled`, delete. Default `enabled` = true (column default). Whether a missing row means enabled is not stated. Whether preferences cause `suppressed` deliveries is not stated.

**F. Templates.** Actor: any admin role reads (`admin()`); `super_admin` inserts and updates; no deletes. `is_active` flags a template. Placeholder syntax for `subject_template` and `body_template` is **not stated**.

### N.6 Screens and data (N)

**Notification center (inbox)**
- Lists: `notifications` where `recipient_user_id` = ME, ordered by `created_at` descending.
- Shows per row: `category`, `title`, `body`, `created_at`, `read_at` (read/unread), `company_id` (context label if set), `resource_type` and `resource_id` (deep-link target; the mapping from `resource_type` to a screen is a design task, `resource_type` has no enum in sources).
- Filters: `category` (8 values), unread only.
- Actions: mark read (sets `read_at`), delete.
- Badge: count of unread rows.

**Notification detail (optional drawer)**
- Shows per channel, from `notification_deliveries`: `channel`, `status`, `attempts`, `sent_at`.
- `last_error` and `provider_message_id` are readable by the recipient through RLS. Whether end users should see them is **not stated**; the design should keep them out of end-user views unless decided otherwise.

**Notification preferences**
- Matrix of `category` (8 rows) by `channel` (4 columns: `in_app`, `email`, `push`, `sms`), each cell a toggle for `enabled`.
- `security` / `in_app` cell is locked on.
- Saves one row per cell (`user_id`, `category`, `channel`, `enabled`).

**Devices (push)**
- Lists: `device_tokens` where `user_id` = ME.
- Shows per device: `platform` (`ios`, `android`, `web`), `last_seen_at`, `created_at`, status (active when `revoked_at` is null, else revoked).
- Actions: revoke (sets `revoked_at`), remove.
- Never show `token`. It is treated as a secret.

**Admin: notification template editor (see O.6 for access)**
- Fields: `template_key`, `channel` (4 values), `locale` (default `en`), `subject_template` (optional), `body_template` (required), `is_active`.
- Lists: all templates with `template_key`, `channel`, `locale`, `is_active`, `updated_at`.

---

## O. Administration, audit, outbox (10 tables)

### O.1 Purpose
Platform operations for admin staff: who holds which admin role, moderation of content and companies, abuse reports, the audit trail (platform and company views), security events, and platform settings. Outbox and idempotency tables are internal plumbing.

### O.2 Owner and status
- **Owner service:** admin service. `docs/ARCHITECTURE_ASSESSMENT.md` §4 lists `admin_role_assignments`, `admin_actions`, `moderation_cases`, `moderation_actions`, `abuse_reports`, `system_settings`, `security_events` (aggregate) and the audit aggregate under `admin`. `audit_logs` is an aggregate read model built from `audit.recorded` events (ADR-015). `idempotency_keys` is not assigned to an owner in §4. `outbox_events` is owned by each service (ADR-010).
- **Status:** designed, not yet implemented. `apps/backend/services/admin-service` contains scaffolding only.

### O.3 Entities

| Table | What it represents | Key columns (type) | Relations |
|---|---|---|---|
| `admin_role_assignments` | A platform admin role granted to a user. | `id` uuid PK; `user_id` uuid; `admin_role` text; `granted_by_user_id` uuid?; `granted_at` timestamptz; `revoked_at` timestamptz? | → `users` ×2 (restrict). Unique active `(user_id, admin_role)` where `revoked_at` is null. |
| `admin_actions` | Log of an admin's action. Reason is mandatory. Append-only. | `id` uuid PK; `admin_user_id` uuid; `action` text (free text); `target_type` text (free text); `target_id` uuid?; `reason` text (required); `request_id` text?; `created_at` timestamptz | → `users` (restrict). |
| `audit_logs` | Platform audit trail of changes. Append-only. | `id` uuid PK; `actor_type` text; `actor_user_id` uuid?; `company_id` uuid?; `action` text; `resource_type` text; `resource_id` uuid?; `request_id` text?; `ip_address` inet?; `user_agent` text?; `changes` jsonb? (redacted before/after, safe fields only); `created_at` timestamptz | → `users`, `companies` (restrict). |
| `security_events` | Security-relevant event (for example `rls_denied`, `brute_force_suspected`, from the column comment). Append-only. | `id` uuid PK; `event_type` text (free text); `severity` text (default `info`); `user_id` uuid?; `company_id` uuid?; `ip_address` inet?; `request_id` text?; `detail` jsonb?; `created_at` timestamptz | → `users`, `companies` (restrict). |
| `moderation_cases` | A case about a piece of content or an entity under review. | `id` uuid PK; `subject_type` text; `subject_id` uuid (no FK: polymorphic, resolve by `subject_type`); `status` text (default `open`); `assigned_admin_user_id` uuid?; `summary` text?; `resolved_at` timestamptz?; `created_at` timestamptz; `updated_at` timestamptz | → `users` (restrict). Parent of `moderation_actions`. |
| `moderation_actions` | One decision or note on a case. Append-only. | `id` uuid PK; `case_id` uuid; `admin_user_id` uuid; `action` text; `note` text (required); `created_at` timestamptz | → `moderation_cases`, `users` (restrict). |
| `abuse_reports` | Report from a user or company about a subject that is not a message or a review. | `id` uuid PK; `reporter_user_id` uuid; `reporter_company_id` uuid?; `subject_type` text; `subject_id` uuid?; `reason` text (free text); `details` text?; `status` text (default `open`); `created_at` timestamptz; `resolved_at` timestamptz? | → `users`, `companies` (restrict). |
| `system_settings` | Platform business rules and feature flags, as key and JSON value. | `id` uuid PK; `key` text (unique; pattern `^[a-z][a-z0-9_.]{1,100}$`); `value` jsonb; `description` text?; `is_public` boolean (default false); `updated_by_user_id` uuid?; `created_at` timestamptz; `updated_at` timestamptz | → `users` (restrict). Commission, fee and subscription policy is deliberately not modelled here. |
| `outbox_events` **(internal-only)** | Transactional outbox: event written with the business change, then published by the worker. | `id` uuid PK; `company_id` uuid?; `aggregate_type` text; `aggregate_id` uuid; `event_type` text; `payload` jsonb (flat values); `created_at` timestamptz; `published_at` timestamptz?; `attempts` integer (default 0, 0–50); `locked_until` timestamptz? | → `companies` (restrict). |
| `idempotency_keys` **(internal-only)** | Replay protection for retried writes that are not naturally idempotent (for example accept quotation, create deal). | `id` uuid PK; `user_id` uuid; `company_id` uuid?; `scope` text; `key` text; `request_hash` text; `response_status` integer?; `resource_id` uuid?; `created_at` timestamptz; `expires_at` timestamptz | → `users`, `companies` (cascade). Unique `(user_id, scope, key)`. |

### O.4 Enumerations (verbatim)

| Column | Values |
|---|---|
| `admin_role_assignments.admin_role` | `super_admin`, `verification_officer`, `moderator`, `support`, `compliance_officer`, `readonly_auditor` |
| `audit_logs.actor_type` | `user`, `admin`, `system`, `worker`, `provider` |
| `security_events.severity` | `info`, `warning`, `critical` |
| `moderation_cases.subject_type` | `message`, `review`, `product`, `rfq`, `company`, `file` |
| `moderation_cases.status` | `open`, `in_review`, `actioned`, `dismissed` |
| `moderation_actions.action` | `warn`, `hide_content`, `remove_content`, `suspend_company`, `suspend_user`, `dismiss`, `restore` |
| `abuse_reports.subject_type` | `company`, `product`, `rfq`, `quotation`, `user`, `other` |
| `abuse_reports.status` | `open`, `reviewing`, `actioned`, `dismissed` |

### O.5 Lifecycles and access

**A. Admin roles.**
- Grant: `super_admin` only (insert a row with `granted_by_user_id`).
- Revoke: `super_admin` only (set `revoked_at`). Rows are never deleted.
- Enforcement: `app.is_platform_admin` requires `revoked_at` null and an `active` user. Access is lost on the next statement.
- Duplicate active grant of the same role to the same user is rejected (unique index).
- Whether a grant also writes an `admin_actions` row is **not stated**.
- Read: a user sees their own assignments; any admin sees all.

**B. Admin actions.** Insert by any admin role (`admin_user_id = ME AND admin()`). Reason is required (NOT NULL). Read: own rows, or all rows for `super_admin`. No update, no delete.

**C. Moderation case status.** Insert, read and update: `moderator` (and `super_admin`).
- Status: `open` → `in_review` → `actioned` or `dismissed`. Values are enforced by CHECK. No transition trigger exists in the sources.
- Queue index covers `open` and `in_review`.
- How cases are created (manually or from reports) is **not stated**. No foreign key links a case to a `message_reports`, `review_reports` or `abuse_reports` row.
- `resolved_at` is set when the case is closed (column exists; the rule is **not stated**).

**D. Moderation actions.** Insert by moderator (`admin_user_id = ME AND admin(moderator)`). Read by moderator. Append-only (no update, no delete; trigger rejects both for every role). `note` required.
- **Effects are not wired in the sources:** no trigger or function reads `moderation_actions`. The effect of `hide_content`, `remove_content`, `suspend_company` and `suspend_user` on `messages.moderation_status`, `company_reviews.status`, `companies.status` or `users.status` is **not stated**.
- `messages.moderation_status` can only be changed by system callers (`guard_message`).

**E. Abuse reports.**
- Insert: the reporter (`reporter_user_id = ME`). `reporter_company_id` is optional, or must be WRITABLE_CO.
- `subject_id` is optional (null allowed). `reason` is free text (no enum in the sources).
- Read: reporter, or moderator. Update: moderator only. No delete.
- Status: `open` → `reviewing` → `actioned` or `dismissed`. No transition trigger.
- Queue index covers `open` and `reviewing`.

**F. Audit log (`audit_logs`).**
- Append-only: UPDATE, DELETE and TRUNCATE are rejected for every role, including the table owner.
- Application insert: `actor_user_id = ME` and `company_id` is null, or ACTIVE_CO, or the user is an admin.
- Read (company view): rows where `company_id` = ACTIVE_CO and the user has `audit.read` (owner and admin in the seed).
- Read (platform view): `compliance_officer`, `readonly_auditor` (and `super_admin`) see all rows.
- The worker may insert.

**G. Security events (`security_events`).**
- Append-only. Application insert only with `user_id = ME`. Worker may insert.
- Read: `compliance_officer` (and `super_admin`).

**H. System settings (`system_settings`).**
- Insert and update: `super_admin` only. No delete.
- Read: any admin, and any session for rows where `is_public` is true.
- `key` must match the CHECK pattern.

**I. Outbox (internal-only).** Written by the application in the same transaction as the business change, with `company_id` null or WRITABLE_CO. The worker reads and updates it. `published_at` null = pending. `locked_until` is a worker lease. Application users have no read access. Never shown in UI.

**J. Idempotency keys (internal-only).** Owned by `user_id`, unique by `(user_id, scope, key)`. Expires at `expires_at`. Worker reads and deletes expired rows. Never shown in UI.

### O.6 Screens and data (O)

**Admin console: navigation gate**
- Each screen below is shown only to the admin roles listed. `super_admin` sees all.

**Admin roles page** (`super_admin`)
- Lists: `admin_role_assignments` with `user_id`, `admin_role`, `granted_by_user_id`, `granted_at`, `revoked_at`, status (active when `revoked_at` is null).
- Grant form: `user_id`, `admin_role` (6 values). Submit creates a row.
- Revoke action: sets `revoked_at`.

**Moderation queue** (`moderator`)
- Lists: `moderation_cases` where `status` is `open` or `in_review`.
- Shows per row: `subject_type`, `subject_id` (resolve the subject by type), `status`, `assigned_admin_user_id`, `summary`, `created_at`, `updated_at`.
- Filters: `subject_type` (6 values), `status`, assignee.
- Actions: assign (`assigned_admin_user_id`), change status, add a decision.

**Moderation case detail** (`moderator`)
- Header: `subject_type`, `subject_id`, `status`, `summary`, `resolved_at`.
- Subject preview by `subject_type`:
  - `message`: message body and `moderation_status` (moderator can see the body of reported messages only, per RLS), plus the matching `message_reports` (`reason`, `details`, `status`, `reporter_company_id`).
  - `review`: review fields, plus `review_reports`.
  - `product`, `rfq`, `company`, `file`: shown by subject ID (no table is named in the sources for these screens beyond the subject ID).
- Decision history: `moderation_actions` ordered by `created_at` descending: `action`, `note`, `admin_user_id`, `created_at`.
- Decision form: `action` (7 values), `note` (required). Submit appends a row.
- Resolve form: `status` (`actioned` or `dismissed`).

**Review moderation queue** (`moderator`)
- Lists: `company_reviews` where `status` = `pending`, oldest first (`ix_company_reviews_queue`).
- Shows: `rating`, `title`, `body`, `deal_id`, parties (`reviewer_company_id`, `reviewed_company_id`), `created_at`.
- Actions: set `status` to `published`, `rejected` or `removed`; enter `moderation_note`.

**Abuse reports** (`moderator`; reporter sees own)
- Lists: `abuse_reports` where `status` is `open` or `reviewing`, or all for filters.
- Shows: `subject_type`, `subject_id`, `reason`, `details`, `reporter_user_id`, `reporter_company_id`, `status`, `created_at`, `resolved_at`.
- Filters: `subject_type` (6 values), `status` (4 values).
- Action: change `status`.
- Reporter form (any user): `subject_type` (6 values), `subject_id` (optional), `reason` (free text), `details` (optional), `reporter_company_id` (optional, must be WRITABLE_CO).

**Audit log viewer** (`compliance_officer`, `readonly_auditor`, `super_admin`; read-only)
- Table columns: `created_at`, `actor_type`, `actor_user_id`, `company_id`, `action`, `resource_type`, `resource_id`, `request_id`, `ip_address`, `user_agent`.
- Detail: `changes` (before and after, already redacted).
- Filters: `actor_type` (5 values), `actor_user_id`, `company_id`, `resource_type`, `resource_id`, `action`, `request_id`, date range.

**Company audit log** (owner, admin; read-only)
- Same columns as the platform viewer, filtered to `company_id` = ACTIVE_CO.

**Security events** (`compliance_officer`, `super_admin`; read-only)
- Table columns: `created_at`, `severity` (`info`, `warning`, `critical`), `event_type`, `user_id`, `company_id`, `ip_address`, `request_id`.
- Detail: `detail` (jsonb, render as key and value).
- Filters: `severity`, `event_type`, `user_id`, `company_id`, date range.

**Admin actions log** (any admin sees own; `super_admin` sees all; read-only)
- Columns: `created_at`, `admin_user_id`, `action`, `target_type`, `target_id`, `reason`, `request_id`.
- Filters: admin, `target_type`, `target_id`.
- Entry form (any admin): `action`, `target_type`, `target_id` (optional), `reason` (required).

**System settings** (`super_admin` edits; any admin views; `is_public` settings visible to all sessions)
- Table columns: `key`, `value`, `description`, `is_public`, `updated_by_user_id`, `updated_at`.
- Create or edit form: `key` (must match `^[a-z][a-z0-9_.]{1,100}$`), `value` (JSON), `description`, `is_public`.

**Notification templates** (any admin reads; `super_admin` edits)
- See N.6.

**Not shown in any UI (internal-only):** `outbox_events`, `idempotency_keys`, and the per-service `inbox_events` and `outbox_events` platform tables.

---

## Discrepancies and open items (resolve before finalising screens)

1. **Review states:** the brief's `hidden` does not exist for reviews. Use `pending`, `published`, `rejected`, `removed`. "Reported" and "responded" are derived from `review_reports` and `review_responses` rows.
2. **Moderation effects are not wired.** `moderation_actions` has no trigger or function consumer. Effects on messages, reviews, companies and users must be defined.
3. **Message `moderation_status` changer** is not stated for application or moderator users (only system callers).
4. **Who may close a conversation** is not stated. No update guard exists.
5. **Response status:** `review_responses.status = removed` has no defined setter (only `body` is updatable). Responses are not tied to review status.
6. **Reviewer identity and `moderation_note` visibility** on non-published reviews are not stated.
7. **Notification category mapping** from events, and the meaning of `notification_type` values, are not stated. `resource_type` has no enum.
8. **`suppressed` reason** is not stated.
9. **`last_error` and `provider_message_id`** are readable by the recipient through RLS. Visibility to end users is a product decision.
10. **Abuse and message reports to cases:** no link exists between report tables and `moderation_cases`. Case creation source is not stated.
11. **Report status transitions** are not enforced by the database for `message_reports`, `review_reports`, `abuse_reports`, or `moderation_cases`.
12. **`avg_response_hours` definition** and the rounding rule for `average_rating` are not stated.
13. **Audit actor types differ** between the backend reference (`user`, `admin`, `system`, `worker`, `provider`) and the identity and company service schemas (`user`, `admin`, `system`, `service`). Table names also differ (`audit_logs` vs `audit_log`).
14. **Channel sets differ:** messages (`in_app`, `email`, `push`), notifications (`in_app`, `email`, `push`, `sms`).
15. **Deal conversation creation** on `deal.created.v1` is listed as a messaging consumer; the creation behaviour is not detailed.
16. **Grant reason:** admin role grants do not carry a reason column. Whether they also write an `admin_actions` row is not stated.
