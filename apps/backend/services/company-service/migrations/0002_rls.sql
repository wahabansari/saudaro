-- Row-level security keyed on the transaction-local settings set by withTenantContext (app.current_user_id).
-- FORCE applies the policies to the table owner as well; the runtime role (company_svc) is never an owner.
ALTER TABLE "company"."memberships" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "company"."memberships" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "company"."companies" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "company"."companies" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY memberships_own_select ON "company"."memberships" FOR SELECT
  USING (user_id = nullif(current_setting('app.current_user_id', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY memberships_own_insert ON "company"."memberships" FOR INSERT
  WITH CHECK (user_id = nullif(current_setting('app.current_user_id', true), '')::uuid);
--> statement-breakpoint
-- Narrowest policy for GET /internal/memberships/:companyId/:userId, which runs without a user context
-- (the caller is another service, authenticated by service token). Read-only, and only inside a transaction
-- that explicitly sets app.internal_lookup = 'on'.
CREATE POLICY memberships_internal_lookup ON "company"."memberships" FOR SELECT
  USING (current_setting('app.internal_lookup', true) = 'on');
--> statement-breakpoint
CREATE POLICY companies_member_select ON "company"."companies" FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM "company"."memberships" m
    WHERE m.company_id = companies.id
      AND m.user_id = nullif(current_setting('app.current_user_id', true), '')::uuid
      AND m.status = 'active'
  ));
--> statement-breakpoint
CREATE POLICY companies_creator_insert ON "company"."companies" FOR INSERT
  WITH CHECK (created_by = nullif(current_setting('app.current_user_id', true), '')::uuid);
