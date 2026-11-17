CREATE INDEX "ix_companies_created_by" ON "company"."companies" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "ix_memberships_user_status" ON "company"."memberships" USING btree ("user_id","status");--> statement-breakpoint
-- The internal lookup now runs under the target user's own context, so the blanket lookup policy is dropped.
DROP POLICY memberships_internal_lookup ON "company"."memberships";
--> statement-breakpoint
-- A creator must be able to see the company they just inserted (needed by the membership insert check below).
CREATE POLICY companies_creator_select ON "company"."companies" FOR SELECT
  USING (created_by = nullif(current_setting('app.current_user_id', true), '')::uuid);
--> statement-breakpoint
-- A user may only create a membership for themselves in a company THEY created: stops joining someone else's company.
DROP POLICY memberships_own_insert ON "company"."memberships";
--> statement-breakpoint
CREATE POLICY memberships_creator_insert ON "company"."memberships" FOR INSERT
  WITH CHECK (
    user_id = nullif(current_setting('app.current_user_id', true), '')::uuid
    AND EXISTS (SELECT 1 FROM "company"."companies" c WHERE c.id = company_id AND c.created_by = user_id)
  );
