-- 0003: tenant-context helpers, SECURITY DEFINER authorization functions, guard triggers.
--
-- Trust model
--   * Tenant context comes from transaction-local settings (set_config(..., true)):
--       app.current_user_id, app.current_company_id.
--     They are only a REQUEST; app.active_company() re-verifies an ACTIVE membership every time,
--     so a forged/stale company id grants nothing.
--   * Definer functions are owned by saudaro_authz (ownership is assigned in 0005) and pin
--     search_path. Everything they read is schema-qualified.
--   * Guard triggers are SECURITY INVOKER: they run with the caller's RLS. "Trusted" callers
--     (superuser for migrations/fixtures, saudaro_authz inside definer functions) skip them.

-- ------------------------------------------------------------------ context helpers
CREATE OR REPLACE FUNCTION app.setting_uuid(p_name text) RETURNS uuid
LANGUAGE sql STABLE PARALLEL SAFE AS $fn$
  SELECT CASE WHEN v ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN v::uuid END
  FROM (SELECT current_setting(p_name, true) AS v) s
$fn$;--> statement-breakpoint

CREATE OR REPLACE FUNCTION app.uid() RETURNS uuid
LANGUAGE sql STABLE PARALLEL SAFE AS $fn$ SELECT app.setting_uuid('app.current_user_id') $fn$;--> statement-breakpoint

CREATE OR REPLACE FUNCTION app.is_trusted_caller() RETURNS boolean
LANGUAGE sql STABLE AS $fn$
  SELECT current_user IN ('saudaro_authz', 'saudaro_migrator')  -- migrator = deploy-time identity (seeds/migrations)
      OR EXISTS (SELECT 1 FROM pg_catalog.pg_roles r WHERE r.rolname = current_user AND r.rolsuper)
$fn$;--> statement-breakpoint

CREATE OR REPLACE FUNCTION app.is_system_caller() RETURNS boolean
LANGUAGE sql STABLE AS $fn$ SELECT app.is_trusted_caller() OR current_user = 'saudaro_worker' $fn$;--> statement-breakpoint

-- ------------------------------------------------------------------ authorization (definer)
CREATE OR REPLACE FUNCTION app.active_company() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $fn$
  SELECT m.company_id
  FROM public.company_memberships m
  JOIN public.companies c ON c.id = m.company_id
  JOIN public.users u ON u.id = m.user_id
  WHERE m.user_id = app.uid()
    AND m.company_id = app.setting_uuid('app.current_company_id')
    AND m.status = 'active' AND u.status = 'active' AND c.status <> 'closed'
$fn$;--> statement-breakpoint

CREATE OR REPLACE FUNCTION app.writable_company() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $fn$
  SELECT m.company_id
  FROM public.company_memberships m
  JOIN public.companies c ON c.id = m.company_id
  JOIN public.users u ON u.id = m.user_id
  WHERE m.user_id = app.uid()
    AND m.company_id = app.setting_uuid('app.current_company_id')
    AND m.status = 'active' AND u.status = 'active' AND c.status IN ('draft', 'active')
$fn$;--> statement-breakpoint

CREATE OR REPLACE FUNCTION app.is_member(p_company uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $fn$
  SELECT EXISTS (
    SELECT 1 FROM public.company_memberships m JOIN public.users u ON u.id = m.user_id
    WHERE m.company_id = p_company AND m.user_id = app.uid() AND m.status = 'active' AND u.status = 'active')
$fn$;--> statement-breakpoint

CREATE OR REPLACE FUNCTION app.role_level(p_company uuid) RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $fn$
  SELECT r.level::int
  FROM public.company_memberships m JOIN public.company_roles r ON r.id = m.role_id
  JOIN public.users u ON u.id = m.user_id
  WHERE m.company_id = p_company AND m.user_id = app.uid() AND m.status = 'active' AND u.status = 'active'
$fn$;--> statement-breakpoint

CREATE OR REPLACE FUNCTION app.has_perm(p_company uuid, p_perm text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $fn$
  SELECT p_company IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.company_memberships m
    JOIN public.users u ON u.id = m.user_id
    JOIN public.company_role_permissions rp ON rp.role_id = m.role_id
    JOIN public.permissions p ON p.id = rp.permission_id
    WHERE m.company_id = p_company AND m.user_id = app.uid() AND m.status = 'active'
      AND u.status = 'active' AND p.key = p_perm)
$fn$;--> statement-breakpoint

-- Permission check against the ACTIVE, WRITABLE company (suspended/closed companies cannot write).
CREATE OR REPLACE FUNCTION app.can_write(p_perm text) RETURNS boolean
LANGUAGE sql STABLE AS $fn$ SELECT app.has_perm(app.writable_company(), p_perm) $fn$;--> statement-breakpoint

CREATE OR REPLACE FUNCTION app.can_read(p_perm text) RETURNS boolean
LANGUAGE sql STABLE AS $fn$ SELECT app.has_perm(app.active_company(), p_perm) $fn$;--> statement-breakpoint

CREATE OR REPLACE FUNCTION app.is_platform_admin(p_role text DEFAULT NULL) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $fn$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_role_assignments a JOIN public.users u ON u.id = a.user_id
    WHERE a.user_id = app.uid() AND a.revoked_at IS NULL AND u.status = 'active'
      AND (p_role IS NULL OR a.admin_role = p_role OR a.admin_role = 'super_admin'))
$fn$;--> statement-breakpoint

CREATE OR REPLACE FUNCTION app.shares_company_with(p_user uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $fn$
  SELECT EXISTS (
    SELECT 1 FROM public.company_memberships a JOIN public.company_memberships b ON b.company_id = a.company_id
    WHERE a.user_id = app.uid() AND a.status = 'active' AND b.user_id = p_user AND b.status = 'active')
$fn$;--> statement-breakpoint

CREATE OR REPLACE FUNCTION app.is_conversation_participant(p_conversation uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $fn$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_participants p
    JOIN public.company_memberships m ON m.company_id = p.company_id AND m.user_id = p.user_id AND m.status = 'active'
    JOIN public.users u ON u.id = p.user_id AND u.status = 'active'
    WHERE p.conversation_id = p_conversation AND p.user_id = app.uid() AND p.left_at IS NULL)
$fn$;--> statement-breakpoint

CREATE OR REPLACE FUNCTION app.is_deal_party(p_deal uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $fn$
  SELECT EXISTS (SELECT 1 FROM public.deal_parties dp
                 WHERE dp.deal_id = p_deal AND dp.company_id = app.active_company())
$fn$;--> statement-breakpoint

CREATE OR REPLACE FUNCTION app.is_public_company(p_company uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $fn$
  SELECT EXISTS (SELECT 1 FROM public.companies c WHERE c.id = p_company AND c.status = 'active')
$fn$;--> statement-breakpoint

CREATE OR REPLACE FUNCTION app.is_public_seller(p_company uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $fn$
  SELECT EXISTS (SELECT 1 FROM public.seller_trade_profiles s JOIN public.companies c ON c.id = s.company_id
                 WHERE s.company_id = p_company AND s.is_published AND c.status = 'active')
$fn$;--> statement-breakpoint

CREATE OR REPLACE FUNCTION app.rfq_owner(p_rfq uuid) RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $fn$
  SELECT company_id FROM public.rfqs WHERE id = p_rfq
$fn$;--> statement-breakpoint

-- Can company p_company SEE rfq p_rfq (published, open, visibility + rules satisfied)? Never a score.
CREATE OR REPLACE FUNCTION app.can_view_rfq(p_rfq uuid, p_company uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $fn$
  SELECT p_company IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.rfqs r
    JOIN public.companies c ON c.id = p_company AND c.status = 'active'
    WHERE r.id = p_rfq AND r.status = 'published' AND r.expires_at > now() AND r.company_id <> p_company
      AND (r.visibility = 'public'
           OR (r.visibility = 'invited' AND EXISTS (
                 SELECT 1 FROM public.rfq_invitations i WHERE i.rfq_id = r.id AND i.invited_company_id = p_company)))
      AND NOT EXISTS (SELECT 1 FROM public.rfq_visibility_rules v
                      WHERE v.rfq_id = r.id AND v.rule_type = 'block_country' AND v.country_id = c.country_id)
      AND (NOT EXISTS (SELECT 1 FROM public.rfq_visibility_rules v WHERE v.rfq_id = r.id AND v.rule_type = 'allow_country')
           OR EXISTS (SELECT 1 FROM public.rfq_visibility_rules v
                      WHERE v.rfq_id = r.id AND v.rule_type = 'allow_country' AND v.country_id = c.country_id))
      AND NOT EXISTS (SELECT 1 FROM public.rfq_visibility_rules v
                      WHERE v.rfq_id = r.id AND v.rule_type = 'min_verification'
                        AND NOT EXISTS (SELECT 1 FROM public.company_verification_levels l
                                        WHERE l.company_id = p_company AND l.level = v.verification_level
                                          AND l.status = 'verified' AND (l.expires_at IS NULL OR l.expires_at > now())))
      AND (NOT EXISTS (SELECT 1 FROM public.rfq_visibility_rules v WHERE v.rfq_id = r.id AND v.rule_type = 'seller_type')
           OR EXISTS (SELECT 1 FROM public.rfq_visibility_rules v
                      JOIN public.seller_trade_profiles s ON s.company_id = p_company AND s.seller_type = v.seller_type
                      WHERE v.rfq_id = r.id AND v.rule_type = 'seller_type')))
$fn$;--> statement-breakpoint

CREATE OR REPLACE FUNCTION app.can_quote_rfq(p_rfq uuid, p_company uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $fn$
  SELECT app.can_view_rfq(p_rfq, p_company)
     AND EXISTS (SELECT 1 FROM public.rfqs r WHERE r.id = p_rfq AND (r.quote_deadline_at IS NULL OR r.quote_deadline_at > now()))
$fn$;--> statement-breakpoint

CREATE OR REPLACE FUNCTION app.rfq_item_belongs_to_revision(p_item uuid, p_revision uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $fn$
  SELECT EXISTS (
    SELECT 1 FROM public.rfq_items i
    JOIN public.quotation_revisions r ON r.id = p_revision
    JOIN public.quotations q ON q.id = r.quotation_id AND q.rfq_id = i.rfq_id
    WHERE i.id = p_item)
$fn$;--> statement-breakpoint

-- Pre-authentication lookup: external identity -> user id. Reveals nothing but the id.
CREATE OR REPLACE FUNCTION app.resolve_identity(p_provider text, p_subject text) RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $fn$
  SELECT i.user_id FROM public.user_auth_identities i JOIN public.users u ON u.id = i.user_id
  WHERE i.provider = p_provider AND i.provider_subject = p_subject AND u.status NOT IN ('deleted')
$fn$;--> statement-breakpoint

-- Company creation is a definer function: the creator becomes the (only) owner atomically, and
-- the application role has NO direct INSERT on companies.
CREATE OR REPLACE FUNCTION app.create_company(p_legal_name text, p_display_name text, p_slug text, p_country uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $fn$
DECLARE
  v_uid uuid := app.uid();
  v_company uuid;
  v_owner_role uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = '28000'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = v_uid AND status = 'active') THEN
    RAISE EXCEPTION 'user is not active' USING ERRCODE = '42501';
  END IF;
  IF (SELECT count(*) FROM public.companies WHERE created_by_user_id = v_uid) >= 25 THEN
    RAISE EXCEPTION 'company creation limit reached' USING ERRCODE = '54000';
  END IF;
  SELECT id INTO v_owner_role FROM public.company_roles WHERE company_id IS NULL AND key = 'owner';
  IF v_owner_role IS NULL THEN RAISE EXCEPTION 'system role owner is not seeded'; END IF;
  INSERT INTO public.companies (legal_name, display_name, slug, country_id, created_by_user_id, status)
  VALUES (p_legal_name, p_display_name, p_slug, p_country, v_uid, 'draft') RETURNING id INTO v_company;
  INSERT INTO public.company_memberships (company_id, user_id, role_id, status) VALUES (v_company, v_uid, v_owner_role, 'active');
  INSERT INTO public.company_settings (company_id) VALUES (v_company);
  INSERT INTO public.company_profiles (company_id) VALUES (v_company);
  RETURN v_company;
END
$fn$;--> statement-breakpoint

CREATE OR REPLACE FUNCTION app.accept_invitation(p_token_hash text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $fn$
DECLARE
  v_uid uuid := app.uid();
  v_inv public.company_invitations%ROWTYPE;
  v_user public.users%ROWTYPE;
  v_membership uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = '28000'; END IF;
  SELECT * INTO v_inv FROM public.company_invitations WHERE token_hash = p_token_hash FOR UPDATE;
  IF NOT FOUND OR v_inv.status <> 'pending' OR v_inv.expires_at <= now() THEN
    RAISE EXCEPTION 'invitation is invalid or expired' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_user FROM public.users WHERE id = v_uid;
  IF v_user.status <> 'active' OR v_user.email_verified_at IS NULL OR v_user.email <> v_inv.email THEN
    RAISE EXCEPTION 'invitation does not belong to this verified account' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.company_memberships AS m (company_id, user_id, role_id, status, invited_by_user_id)
  VALUES (v_inv.company_id, v_uid, v_inv.role_id, 'active', v_inv.invited_by_user_id)
  ON CONFLICT (company_id, user_id) DO UPDATE
    SET status = 'active', role_id = EXCLUDED.role_id, removed_at = NULL, removed_by_user_id = NULL,
        invited_by_user_id = EXCLUDED.invited_by_user_id, joined_at = now()
    WHERE m.status = 'removed'
  RETURNING m.id INTO v_membership;
  IF v_membership IS NULL THEN RAISE EXCEPTION 'already a member of this company' USING ERRCODE = '23505'; END IF;
  UPDATE public.company_invitations SET status = 'accepted', accepted_by_user_id = v_uid, accepted_at = now()
  WHERE id = v_inv.id;
  RETURN v_membership;
END
$fn$;--> statement-breakpoint

-- ------------------------------------------------------------------ generic row triggers
CREATE OR REPLACE FUNCTION app.touch_updated_at() RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN NEW.updated_at := now(); RETURN NEW; END $fn$;--> statement-breakpoint

-- Optimistic concurrency: every UPDATE bumps `version`; callers send WHERE id = $1 AND version = $2.
CREATE OR REPLACE FUNCTION app.bump_version() RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN NEW.version := OLD.version + 1; RETURN NEW; END $fn$;--> statement-breakpoint

CREATE OR REPLACE FUNCTION app.forbid_modification() RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
  RAISE EXCEPTION '% is append-only (% rejected)', TG_TABLE_NAME, TG_OP USING ERRCODE = '42501';
END $fn$;--> statement-breakpoint

DO $do$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT c.table_name FROM information_schema.columns c
    JOIN information_schema.tables t ON t.table_schema = c.table_schema AND t.table_name = c.table_name AND t.table_type = 'BASE TABLE'
    WHERE c.table_schema = 'public' AND c.column_name = 'updated_at' ORDER BY 1
  LOOP
    EXECUTE format('CREATE TRIGGER trg_%1$s_touch BEFORE UPDATE ON public.%1$I FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at()', r.table_name);
  END LOOP;
  FOR r IN
    SELECT c.table_name FROM information_schema.columns c
    JOIN information_schema.tables t ON t.table_schema = c.table_schema AND t.table_name = c.table_name AND t.table_type = 'BASE TABLE'
    WHERE c.table_schema = 'public' AND c.column_name = 'version' AND c.data_type = 'integer' ORDER BY 1
  LOOP
    EXECUTE format('CREATE TRIGGER trg_%1$s_version BEFORE UPDATE ON public.%1$I FOR EACH ROW EXECUTE FUNCTION app.bump_version()', r.table_name);
  END LOOP;
  -- Append-only / immutable tables: UPDATE and DELETE are rejected for EVERY role (owner included).
  FOR r IN
    SELECT unnest(ARRAY['audit_logs','security_events','admin_actions','user_security_events',
      'verification_status_history','rfq_status_history','quotation_status_history','deal_status_history',
      'deal_activity_events','negotiation_events','deal_milestone_events','deal_document_versions',
      'moderation_actions','file_scan_results','deal_terms','deal_items']) AS table_name
  LOOP
    EXECUTE format('CREATE TRIGGER trg_%1$s_append_only BEFORE UPDATE OR DELETE ON public.%1$I FOR EACH ROW EXECUTE FUNCTION app.forbid_modification()', r.table_name);
    EXECUTE format('CREATE TRIGGER trg_%1$s_no_truncate BEFORE TRUNCATE ON public.%1$I FOR EACH STATEMENT EXECUTE FUNCTION app.forbid_modification()', r.table_name);
  END LOOP;
END
$do$;--> statement-breakpoint

-- ------------------------------------------------------------------ users
CREATE OR REPLACE FUNCTION app.guard_user() RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NOT app.is_system_caller() THEN
      -- Self-registration can never pre-verify or pre-activate an account.
      NEW.status := 'pending'; NEW.email_verified_at := NULL; NEW.phone_verified_at := NULL;
      NEW.suspended_at := NULL; NEW.deleted_at := NULL;
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.phone_e164 IS DISTINCT FROM OLD.phone_e164 THEN NEW.phone_verified_at := NULL; END IF;
  RETURN NEW;
END $fn$;--> statement-breakpoint
CREATE TRIGGER trg_users_guard BEFORE INSERT OR UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION app.guard_user();--> statement-breakpoint

-- ------------------------------------------------------------------ companies & memberships
CREATE OR REPLACE FUNCTION app.guard_company_update() RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
  IF app.is_trusted_caller() THEN RETURN NEW; END IF;
  IF NEW.id <> OLD.id OR NEW.created_by_user_id <> OLD.created_by_user_id OR NEW.country_id <> OLD.country_id
     OR NEW.is_business_verified <> OLD.is_business_verified THEN
    RAISE EXCEPTION 'immutable or system-managed company column' USING ERRCODE = '42501';
  END IF;
  IF NEW.status <> OLD.status OR NEW.suspended_at IS DISTINCT FROM OLD.suspended_at
     OR NEW.suspension_reason IS DISTINCT FROM OLD.suspension_reason THEN
    IF app.is_platform_admin('moderator') THEN
      IF NEW.status = 'suspended' AND OLD.status <> 'suspended' THEN NEW.suspended_at := now(); END IF;
      IF NEW.status <> 'suspended' THEN NEW.suspended_at := NULL; NEW.suspension_reason := NULL; END IF;
    ELSIF NOT ((OLD.status = 'draft' AND NEW.status IN ('active', 'closed')) OR (OLD.status = 'active' AND NEW.status = 'closed'))
       OR NEW.suspended_at IS DISTINCT FROM OLD.suspended_at OR NEW.suspension_reason IS DISTINCT FROM OLD.suspension_reason THEN
      RAISE EXCEPTION 'illegal company status change % -> %', OLD.status, NEW.status USING ERRCODE = '42501';
    END IF;
    IF NEW.status = 'closed' THEN NEW.closed_at := COALESCE(NEW.closed_at, now()); END IF;
  END IF;
  RETURN NEW;
END $fn$;--> statement-breakpoint
CREATE TRIGGER trg_companies_guard BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION app.guard_company_update();--> statement-breakpoint

CREATE OR REPLACE FUNCTION app.guard_company_membership() RETURNS trigger LANGUAGE plpgsql AS $fn$
DECLARE
  v_actor uuid := app.uid();
  v_actor_level int; v_new_level int; v_old_level int; v_role_company uuid;
BEGIN
  IF app.is_trusted_caller() THEN RETURN NEW; END IF;
  IF v_actor IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = '28000'; END IF;
  SELECT level, company_id INTO v_new_level, v_role_company FROM public.company_roles WHERE id = NEW.role_id;
  IF v_new_level IS NULL THEN RAISE EXCEPTION 'unknown role' USING ERRCODE = '42501'; END IF;
  IF v_role_company IS NOT NULL AND v_role_company <> NEW.company_id THEN
    RAISE EXCEPTION 'role belongs to another company' USING ERRCODE = '42501';
  END IF;
  v_actor_level := app.role_level(NEW.company_id);
  IF v_actor_level IS NULL THEN RAISE EXCEPTION 'not a member of this company' USING ERRCODE = '42501'; END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.user_id = v_actor THEN RAISE EXCEPTION 'cannot add yourself' USING ERRCODE = '42501'; END IF;
    IF v_new_level >= v_actor_level THEN
      RAISE EXCEPTION 'cannot grant a role at or above your own level' USING ERRCODE = '42501';
    END IF;
    NEW.status := 'active'; NEW.removed_at := NULL; NEW.removed_by_user_id := NULL;
    RETURN NEW;
  END IF;

  IF NEW.company_id <> OLD.company_id OR NEW.user_id <> OLD.user_id THEN
    RAISE EXCEPTION 'membership company/user are immutable' USING ERRCODE = '42501';
  END IF;
  SELECT level INTO v_old_level FROM public.company_roles WHERE id = OLD.role_id;
  IF NEW.user_id = v_actor THEN
    -- Self-service is limited to leaving the company; never role or status escalation.
    IF NEW.role_id <> OLD.role_id OR (NEW.status <> OLD.status AND NEW.status <> 'removed') THEN
      RAISE EXCEPTION 'cannot change your own role or status' USING ERRCODE = '42501';
    END IF;
  ELSE
    IF v_old_level >= v_actor_level THEN
      RAISE EXCEPTION 'cannot modify a member at or above your level' USING ERRCODE = '42501';
    END IF;
    IF v_new_level >= v_actor_level THEN
      RAISE EXCEPTION 'cannot grant a role at or above your own level' USING ERRCODE = '42501';
    END IF;
  END IF;
  IF NEW.status = 'removed' AND OLD.status <> 'removed' THEN
    NEW.removed_at := now(); NEW.removed_by_user_id := v_actor;
  ELSIF NEW.status <> 'removed' THEN
    NEW.removed_at := NULL; NEW.removed_by_user_id := NULL;
  END IF;
  RETURN NEW;
END $fn$;--> statement-breakpoint
CREATE TRIGGER trg_company_memberships_guard BEFORE INSERT OR UPDATE ON public.company_memberships
  FOR EACH ROW EXECUTE FUNCTION app.guard_company_membership();--> statement-breakpoint

-- A live company can never be left ownerless (checked at COMMIT, so swaps inside a transaction work).
CREATE OR REPLACE FUNCTION app.ensure_company_has_owner() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $fn$
BEGIN
  IF EXISTS (SELECT 1 FROM public.companies c WHERE c.id = OLD.company_id AND c.status <> 'closed')
     AND NOT EXISTS (
       SELECT 1 FROM public.company_memberships m JOIN public.company_roles r ON r.id = m.role_id
       WHERE m.company_id = OLD.company_id AND m.status = 'active' AND r.company_id IS NULL AND r.key = 'owner') THEN
    RAISE EXCEPTION 'a company must keep at least one active owner' USING ERRCODE = '23514';
  END IF;
  RETURN NULL;
END $fn$;--> statement-breakpoint
CREATE CONSTRAINT TRIGGER trg_company_memberships_owner AFTER UPDATE OR DELETE ON public.company_memberships
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION app.ensure_company_has_owner();--> statement-breakpoint

-- Role definitions: system roles are immutable; custom roles stay below owner level (CHECK) and
-- cannot be granted permissions the editing user does not hold themselves.
CREATE OR REPLACE FUNCTION app.guard_role_permission() RETURNS trigger LANGUAGE plpgsql AS $fn$
DECLARE v_perm_key text; v_role record;
BEGIN
  IF app.is_trusted_caller() THEN RETURN COALESCE(NEW, OLD); END IF;
  SELECT * INTO v_role FROM public.company_roles WHERE id = COALESCE(NEW.role_id, OLD.role_id);
  IF v_role.is_system THEN RAISE EXCEPTION 'system roles are immutable' USING ERRCODE = '42501'; END IF;
  IF TG_OP <> 'DELETE' THEN
    SELECT key INTO v_perm_key FROM public.permissions WHERE id = NEW.permission_id;
    IF NOT app.has_perm(v_role.company_id, v_perm_key) THEN
      RAISE EXCEPTION 'cannot grant a permission you do not hold' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END $fn$;--> statement-breakpoint
CREATE TRIGGER trg_company_role_permissions_guard BEFORE INSERT OR UPDATE OR DELETE ON public.company_role_permissions
  FOR EACH ROW EXECUTE FUNCTION app.guard_role_permission();--> statement-breakpoint

-- ------------------------------------------------------------------ verification
CREATE OR REPLACE FUNCTION app.guard_verification_case() RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
  IF app.is_trusted_caller() THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    IF NOT app.is_platform_admin('verification_officer') THEN
      IF NEW.status NOT IN ('draft', 'submitted') OR NEW.decided_at IS NOT NULL OR NEW.decided_by_user_id IS NOT NULL
         OR NEW.assigned_admin_user_id IS NOT NULL OR NEW.expires_at IS NOT NULL THEN
        RAISE EXCEPTION 'companies cannot pre-decide verification cases' USING ERRCODE = '42501';
      END IF;
      NEW.submitted_by_user_id := app.uid();
    END IF;
    IF NEW.status = 'submitted' THEN NEW.submitted_at := now(); END IF;
    RETURN NEW;
  END IF;
  IF NEW.company_id <> OLD.company_id OR NEW.level <> OLD.level THEN
    RAISE EXCEPTION 'company/level are immutable' USING ERRCODE = '42501';
  END IF;
  IF app.is_platform_admin('verification_officer') THEN
    IF NEW.status <> OLD.status THEN
      IF NOT ((OLD.status = 'submitted' AND NEW.status IN ('in_review', 'needs_info', 'rejected'))
           OR (OLD.status = 'in_review' AND NEW.status IN ('approved', 'rejected', 'needs_info'))
           OR (OLD.status = 'approved' AND NEW.status IN ('revoked', 'expired'))) THEN
        RAISE EXCEPTION 'illegal verification transition % -> %', OLD.status, NEW.status USING ERRCODE = '42501';
      END IF;
      IF NEW.status IN ('approved', 'rejected', 'revoked') THEN
        IF NEW.decision_reason IS NULL THEN RAISE EXCEPTION 'a decision reason is required' USING ERRCODE = '23514'; END IF;
        NEW.decided_at := now(); NEW.decided_by_user_id := app.uid();
      END IF;
    END IF;
    RETURN NEW;
  END IF;
  -- Company side: only draft/needs_info -> submitted; nothing else may change.
  IF NOT (OLD.status IN ('draft', 'needs_info') AND NEW.status = 'submitted')
     OR NEW.decided_at IS DISTINCT FROM OLD.decided_at OR NEW.decided_by_user_id IS DISTINCT FROM OLD.decided_by_user_id
     OR NEW.decision_reason IS DISTINCT FROM OLD.decision_reason
     OR NEW.assigned_admin_user_id IS DISTINCT FROM OLD.assigned_admin_user_id
     OR NEW.expires_at IS DISTINCT FROM OLD.expires_at THEN
    RAISE EXCEPTION 'only submission is allowed for company users' USING ERRCODE = '42501';
  END IF;
  NEW.submitted_at := now();
  RETURN NEW;
END $fn$;--> statement-breakpoint
CREATE TRIGGER trg_verification_cases_guard BEFORE INSERT OR UPDATE ON public.verification_cases
  FOR EACH ROW EXECUTE FUNCTION app.guard_verification_case();--> statement-breakpoint

CREATE OR REPLACE FUNCTION app.log_verification_status() RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.verification_status_history (case_id, company_id, from_status, to_status, actor_type, actor_user_id, reason)
    VALUES (NEW.id, NEW.company_id, CASE WHEN TG_OP = 'UPDATE' THEN OLD.status END, NEW.status,
            CASE WHEN app.is_platform_admin() THEN 'admin' WHEN app.uid() IS NULL THEN 'system' ELSE 'user' END,
            app.uid(), NEW.decision_reason);
  END IF;
  RETURN NULL;
END $fn$;--> statement-breakpoint
CREATE TRIGGER trg_verification_cases_history AFTER INSERT OR UPDATE ON public.verification_cases
  FOR EACH ROW EXECUTE FUNCTION app.log_verification_status();--> statement-breakpoint

-- A verified level can only exist because an APPROVED case of the same level and company says so.
CREATE OR REPLACE FUNCTION app.guard_verification_level() RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
  IF app.is_trusted_caller() THEN RETURN NEW; END IF;
  IF NEW.status = 'verified' AND NEW.level NOT IN ('email', 'phone') THEN
    IF NEW.granted_case_id IS NULL OR NOT EXISTS (
         SELECT 1 FROM public.verification_cases c
         WHERE c.id = NEW.granted_case_id AND c.company_id = NEW.company_id AND c.level = NEW.level AND c.status = 'approved') THEN
      RAISE EXCEPTION 'a verified level requires an approved verification case' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END $fn$;--> statement-breakpoint
CREATE TRIGGER trg_company_verification_levels_guard BEFORE INSERT OR UPDATE ON public.company_verification_levels
  FOR EACH ROW EXECUTE FUNCTION app.guard_verification_level();--> statement-breakpoint

CREATE OR REPLACE FUNCTION app.sync_company_verified() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $fn$
BEGIN
  UPDATE public.companies c SET is_business_verified = EXISTS (
    SELECT 1 FROM public.company_verification_levels l
    WHERE l.company_id = NEW.company_id AND l.level = 'business_registration' AND l.status = 'verified'
      AND (l.expires_at IS NULL OR l.expires_at > now()))
  WHERE c.id = NEW.company_id;
  RETURN NULL;
END $fn$;--> statement-breakpoint
CREATE TRIGGER trg_company_verification_levels_sync AFTER INSERT OR UPDATE ON public.company_verification_levels
  FOR EACH ROW EXECUTE FUNCTION app.sync_company_verified();--> statement-breakpoint

-- ------------------------------------------------------------------ specification value validation
CREATE OR REPLACE FUNCTION app.validate_spec_value() RETURNS trigger LANGUAGE plpgsql AS $fn$
DECLARE d record;
BEGIN
  IF NEW.definition_id IS NULL THEN RETURN NEW; END IF;
  SELECT data_type, allowed_values, min_value, max_value INTO d
  FROM public.product_specification_definitions WHERE id = NEW.definition_id AND is_active;
  IF NOT FOUND THEN RAISE EXCEPTION 'unknown or inactive specification definition' USING ERRCODE = '23503'; END IF;
  IF d.data_type = 'text' AND NEW.value_text IS NULL THEN RAISE EXCEPTION 'text value required' USING ERRCODE = '23514'; END IF;
  IF d.data_type = 'enum' AND (NEW.value_text IS NULL OR NOT (NEW.value_text = ANY (d.allowed_values))) THEN
    RAISE EXCEPTION 'value is not one of the allowed values' USING ERRCODE = '23514';
  END IF;
  IF d.data_type = 'boolean' AND NEW.value_boolean IS NULL THEN RAISE EXCEPTION 'boolean value required' USING ERRCODE = '23514'; END IF;
  IF d.data_type = 'number' THEN
    IF NEW.value_number IS NULL THEN RAISE EXCEPTION 'numeric value required' USING ERRCODE = '23514'; END IF;
    IF (d.min_value IS NOT NULL AND NEW.value_number < d.min_value) OR (d.max_value IS NOT NULL AND NEW.value_number > d.max_value) THEN
      RAISE EXCEPTION 'numeric value out of bounds' USING ERRCODE = '23514';
    END IF;
  END IF;
  IF d.data_type = 'range' THEN
    IF NEW.value_min IS NULL AND NEW.value_max IS NULL THEN RAISE EXCEPTION 'range value required' USING ERRCODE = '23514'; END IF;
    IF (d.min_value IS NOT NULL AND COALESCE(NEW.value_min, NEW.value_max) < d.min_value)
       OR (d.max_value IS NOT NULL AND COALESCE(NEW.value_max, NEW.value_min) > d.max_value) THEN
      RAISE EXCEPTION 'range out of bounds' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END $fn$;--> statement-breakpoint
CREATE TRIGGER trg_product_specifications_validate BEFORE INSERT OR UPDATE ON public.product_specifications
  FOR EACH ROW EXECUTE FUNCTION app.validate_spec_value();--> statement-breakpoint
CREATE TRIGGER trg_rfq_specifications_validate BEFORE INSERT OR UPDATE ON public.rfq_specifications
  FOR EACH ROW EXECUTE FUNCTION app.validate_spec_value();--> statement-breakpoint
CREATE TRIGGER trg_quotation_specifications_validate BEFORE INSERT OR UPDATE ON public.quotation_specifications
  FOR EACH ROW EXECUTE FUNCTION app.validate_spec_value();--> statement-breakpoint

-- ------------------------------------------------------------------ RFQ lifecycle
CREATE OR REPLACE FUNCTION app.guard_rfq() RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NOT app.is_trusted_caller() AND NEW.status <> 'draft' THEN
      RAISE EXCEPTION 'an RFQ must be created as a draft' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;
  IF app.is_trusted_caller() THEN RETURN NEW; END IF;
  IF NEW.company_id <> OLD.company_id OR NEW.reference_no <> OLD.reference_no OR NEW.created_by_user_id <> OLD.created_by_user_id THEN
    RAISE EXCEPTION 'immutable RFQ column' USING ERRCODE = '42501';
  END IF;
  IF NEW.status <> OLD.status THEN
    IF NOT ((OLD.status = 'draft' AND NEW.status IN ('published', 'cancelled'))
         OR (OLD.status = 'published' AND NEW.status IN ('paused', 'closed', 'expired', 'cancelled', 'awarded'))
         OR (OLD.status = 'paused' AND NEW.status IN ('published', 'closed', 'cancelled'))) THEN
      RAISE EXCEPTION 'illegal RFQ status transition % -> %', OLD.status, NEW.status USING ERRCODE = '42501';
    END IF;
    IF NEW.status = 'published' THEN
      IF NOT EXISTS (SELECT 1 FROM public.rfq_items WHERE rfq_id = NEW.id) THEN
        RAISE EXCEPTION 'publishing requires at least one item' USING ERRCODE = '23514'; END IF;
      IF NOT EXISTS (SELECT 1 FROM public.rfq_destinations WHERE rfq_id = NEW.id) THEN
        RAISE EXCEPTION 'publishing requires a destination' USING ERRCODE = '23514'; END IF;
      IF NEW.expires_at IS NULL OR NEW.expires_at <= now() THEN
        RAISE EXCEPTION 'publishing requires a future expiry' USING ERRCODE = '23514'; END IF;
      IF OLD.status = 'draft' THEN NEW.published_at := now(); END IF;
    ELSIF NEW.status = 'expired' AND (NEW.expires_at IS NULL OR NEW.expires_at > now()) THEN
      RAISE EXCEPTION 'cannot expire before expires_at' USING ERRCODE = '42501';
    ELSIF NEW.status = 'awarded' AND NOT EXISTS (SELECT 1 FROM public.quotations q WHERE q.rfq_id = NEW.id AND q.status = 'accepted') THEN
      RAISE EXCEPTION 'awarding requires an accepted quotation' USING ERRCODE = '42501';
    END IF;
    IF NEW.status IN ('closed', 'cancelled', 'expired', 'awarded') THEN NEW.closed_at := COALESCE(NEW.closed_at, now()); END IF;
  ELSIF OLD.status NOT IN ('draft', 'paused') THEN
    IF NEW.title <> OLD.title OR NEW.primary_category_id <> OLD.primary_category_id OR NEW.visibility <> OLD.visibility
       OR NEW.currency_id IS DISTINCT FROM OLD.currency_id THEN
      RAISE EXCEPTION 'core RFQ fields are locked once published' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END $fn$;--> statement-breakpoint
CREATE TRIGGER trg_rfqs_guard BEFORE INSERT OR UPDATE ON public.rfqs FOR EACH ROW EXECUTE FUNCTION app.guard_rfq();--> statement-breakpoint

CREATE OR REPLACE FUNCTION app.log_rfq_status() RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.rfq_status_history (rfq_id, company_id, from_status, to_status, actor_user_id)
    VALUES (NEW.id, NEW.company_id, CASE WHEN TG_OP = 'UPDATE' THEN OLD.status END, NEW.status, app.uid());
  END IF;
  RETURN NULL;
END $fn$;--> statement-breakpoint
CREATE TRIGGER trg_rfqs_history AFTER INSERT OR UPDATE ON public.rfqs FOR EACH ROW EXECUTE FUNCTION app.log_rfq_status();--> statement-breakpoint

CREATE OR REPLACE FUNCTION app.guard_rfq_child() RETURNS trigger LANGUAGE plpgsql AS $fn$
DECLARE v_status text;
BEGIN
  IF app.is_trusted_caller() THEN RETURN COALESCE(NEW, OLD); END IF;
  SELECT status INTO v_status FROM public.rfqs WHERE id = COALESCE(NEW.rfq_id, OLD.rfq_id);
  IF v_status IS NULL OR v_status NOT IN ('draft', 'paused') THEN
    RAISE EXCEPTION 'RFQ content is locked (status %)', v_status USING ERRCODE = '42501';
  END IF;
  RETURN COALESCE(NEW, OLD);
END $fn$;--> statement-breakpoint

DO $do$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['rfq_items','rfq_destinations','rfq_trade_requirements','rfq_payment_preferences',
    'rfq_origin_preferences','rfq_required_documents','rfq_certification_requirements','rfq_visibility_rules','rfq_attachments']
  LOOP
    EXECUTE format('CREATE TRIGGER trg_%1$s_rfq_lock BEFORE INSERT OR UPDATE OR DELETE ON public.%1$I FOR EACH ROW EXECUTE FUNCTION app.guard_rfq_child()', t);
  END LOOP;
END
$do$;--> statement-breakpoint

CREATE OR REPLACE FUNCTION app.guard_rfq_specification() RETURNS trigger LANGUAGE plpgsql AS $fn$
DECLARE v_status text;
BEGIN
  IF app.is_trusted_caller() THEN RETURN COALESCE(NEW, OLD); END IF;
  SELECT r.status INTO v_status FROM public.rfq_items i JOIN public.rfqs r ON r.id = i.rfq_id
  WHERE i.id = COALESCE(NEW.rfq_item_id, OLD.rfq_item_id);
  IF v_status IS NULL OR v_status NOT IN ('draft', 'paused') THEN
    RAISE EXCEPTION 'RFQ content is locked (status %)', v_status USING ERRCODE = '42501';
  END IF;
  RETURN COALESCE(NEW, OLD);
END $fn$;--> statement-breakpoint
CREATE TRIGGER trg_rfq_specifications_rfq_lock BEFORE INSERT OR UPDATE OR DELETE ON public.rfq_specifications
  FOR EACH ROW EXECUTE FUNCTION app.guard_rfq_specification();--> statement-breakpoint

-- ------------------------------------------------------------------ quotations
CREATE OR REPLACE FUNCTION app.guard_quotation() RETURNS trigger LANGUAGE plpgsql AS $fn$
DECLARE
  v_actor uuid; v_is_supplier boolean; v_is_buyer boolean; v_latest uuid; v_rfq_status text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF app.is_trusted_caller() THEN RETURN NEW; END IF;
    IF NEW.status <> 'draft' OR NEW.accepted_revision_id IS NOT NULL THEN
      RAISE EXCEPTION 'a quotation starts as a draft' USING ERRCODE = '42501'; END IF;
    IF NOT app.can_quote_rfq(NEW.rfq_id, NEW.company_id) THEN
      RAISE EXCEPTION 'this RFQ is not open to your company' USING ERRCODE = '42501'; END IF;
    NEW.created_by_user_id := app.uid();
    RETURN NEW;
  END IF;

  IF app.is_system_caller() THEN RETURN NEW; END IF;
  IF NEW.company_id <> OLD.company_id OR NEW.rfq_id <> OLD.rfq_id OR NEW.buyer_company_id <> OLD.buyer_company_id
     OR NEW.reference_no <> OLD.reference_no OR NEW.created_by_user_id <> OLD.created_by_user_id THEN
    RAISE EXCEPTION 'immutable quotation column' USING ERRCODE = '42501';
  END IF;
  IF OLD.status IN ('accepted', 'rejected', 'withdrawn', 'expired', 'superseded') THEN
    RAISE EXCEPTION 'quotation is final (%)', OLD.status USING ERRCODE = '42501';
  END IF;

  v_actor := app.active_company();
  v_is_supplier := v_actor = OLD.company_id;
  v_is_buyer := v_actor = OLD.buyer_company_id;

  IF NEW.status <> OLD.status THEN
    IF v_is_supplier AND OLD.status = 'draft' AND NEW.status = 'submitted' THEN
      IF NOT EXISTS (SELECT 1 FROM public.quotation_revisions r WHERE r.quotation_id = OLD.id AND r.revision_no = OLD.current_revision_no AND r.status = 'submitted') THEN
        RAISE EXCEPTION 'submit the current revision first' USING ERRCODE = '23514'; END IF;
      IF NOT app.can_quote_rfq(OLD.rfq_id, OLD.company_id) THEN
        RAISE EXCEPTION 'this RFQ is no longer open for quotations' USING ERRCODE = '42501'; END IF;
      NEW.submitted_at := now();
    ELSIF v_is_supplier AND NEW.status = 'withdrawn' AND OLD.status IN ('draft', 'submitted', 'under_negotiation') THEN
      NEW.closed_at := now();
    ELSIF v_is_buyer AND OLD.status = 'submitted' AND NEW.status = 'under_negotiation' THEN
      NULL;
    ELSIF v_is_buyer AND NEW.status = 'rejected' AND OLD.status IN ('submitted', 'under_negotiation') THEN
      NEW.closed_at := now();
    ELSIF v_is_buyer AND NEW.status = 'accepted' AND OLD.status IN ('submitted', 'under_negotiation') THEN
      -- Serialize concurrent acceptances on the same RFQ; the partial unique index is the final guard.
      SELECT status INTO v_rfq_status FROM public.rfqs WHERE id = OLD.rfq_id FOR UPDATE;
      IF v_rfq_status IS DISTINCT FROM 'published' THEN
        RAISE EXCEPTION 'the RFQ is not open for acceptance (status %)', v_rfq_status USING ERRCODE = '42501'; END IF;
      IF OLD.valid_until IS NOT NULL AND OLD.valid_until <= now() THEN
        RAISE EXCEPTION 'the quotation validity has expired' USING ERRCODE = '42501'; END IF;
      SELECT r.id INTO v_latest FROM public.quotation_revisions r
        WHERE r.quotation_id = OLD.id AND r.status = 'submitted' ORDER BY r.revision_no DESC LIMIT 1;
      IF v_latest IS NULL OR NEW.accepted_revision_id IS DISTINCT FROM v_latest THEN
        RAISE EXCEPTION 'only the latest submitted revision can be accepted' USING ERRCODE = '23514'; END IF;
      NEW.accepted_at := now(); NEW.closed_at := now();
    ELSE
      RAISE EXCEPTION 'illegal quotation transition % -> % for this party', OLD.status, NEW.status USING ERRCODE = '42501';
    END IF;
  ELSE
    IF NEW.accepted_revision_id IS DISTINCT FROM OLD.accepted_revision_id THEN
      RAISE EXCEPTION 'accepted revision can only be set by acceptance' USING ERRCODE = '42501'; END IF;
    IF NEW.currency_id <> OLD.currency_id OR NEW.total_amount IS DISTINCT FROM OLD.total_amount
       OR NEW.valid_until IS DISTINCT FROM OLD.valid_until OR NEW.current_revision_no <> OLD.current_revision_no THEN
      IF NOT v_is_supplier THEN RAISE EXCEPTION 'only the supplier changes commercial terms' USING ERRCODE = '42501'; END IF;
      IF OLD.status <> 'draft' THEN
        -- Live quotation: terms move only by submitting the NEXT revision.
        IF NEW.current_revision_no <> OLD.current_revision_no + 1 OR NOT EXISTS (
             SELECT 1 FROM public.quotation_revisions r WHERE r.quotation_id = OLD.id AND r.revision_no = NEW.current_revision_no AND r.status = 'submitted') THEN
          RAISE EXCEPTION 'commercial terms of a live quotation change only through a submitted revision' USING ERRCODE = '42501'; END IF;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END $fn$;--> statement-breakpoint
CREATE TRIGGER trg_quotations_guard BEFORE INSERT OR UPDATE ON public.quotations FOR EACH ROW EXECUTE FUNCTION app.guard_quotation();--> statement-breakpoint

CREATE OR REPLACE FUNCTION app.log_quotation_status() RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.quotation_status_history (quotation_id, company_id, from_status, to_status, actor_company_id, actor_user_id)
    VALUES (NEW.id, NEW.company_id, CASE WHEN TG_OP = 'UPDATE' THEN OLD.status END, NEW.status,
            COALESCE(app.active_company(), NEW.company_id), app.uid());
  END IF;
  RETURN NULL;
END $fn$;--> statement-breakpoint
CREATE TRIGGER trg_quotations_history AFTER INSERT OR UPDATE ON public.quotations FOR EACH ROW EXECUTE FUNCTION app.log_quotation_status();--> statement-breakpoint

-- Revisions: append-only history of commercial terms. Submitted revisions are frozen forever.
CREATE OR REPLACE FUNCTION app.guard_quotation_revision() RETURNS trigger LANGUAGE plpgsql AS $fn$
DECLARE v_max int; v_total numeric; v_qstatus text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status = 'submitted' THEN RAISE EXCEPTION 'submitted revisions are immutable' USING ERRCODE = '42501'; END IF;
    RETURN OLD;
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF app.is_trusted_caller() THEN RETURN NEW; END IF;
    IF NEW.status <> 'draft' THEN RAISE EXCEPTION 'a revision starts as a draft' USING ERRCODE = '42501'; END IF;
    SELECT COALESCE(max(revision_no), 0) INTO v_max FROM public.quotation_revisions WHERE quotation_id = NEW.quotation_id;
    IF NEW.revision_no <> v_max + 1 THEN RAISE EXCEPTION 'revision numbers must be sequential' USING ERRCODE = '23514'; END IF;
    SELECT status INTO v_qstatus FROM public.quotations WHERE id = NEW.quotation_id;
    IF v_qstatus NOT IN ('draft', 'submitted', 'under_negotiation') THEN
      RAISE EXCEPTION 'quotation is closed for new revisions' USING ERRCODE = '42501'; END IF;
    NEW.created_by_user_id := app.uid();
    RETURN NEW;
  END IF;
  IF OLD.status = 'submitted' THEN
    RAISE EXCEPTION 'submitted revisions are immutable' USING ERRCODE = '42501'; END IF;
  IF NEW.quotation_id <> OLD.quotation_id OR NEW.revision_no <> OLD.revision_no OR NEW.company_id <> OLD.company_id THEN
    RAISE EXCEPTION 'immutable revision column' USING ERRCODE = '42501'; END IF;
  IF NEW.status = 'submitted' THEN
    IF NOT EXISTS (SELECT 1 FROM public.quotation_items WHERE revision_id = OLD.id) THEN
      RAISE EXCEPTION 'a revision needs at least one item' USING ERRCODE = '23514'; END IF;
    SELECT COALESCE(sum(total_price), 0) INTO v_total FROM public.quotation_items WHERE revision_id = OLD.id;
    NEW.total_amount := v_total; NEW.submitted_at := now();
  END IF;
  RETURN NEW;
END $fn$;--> statement-breakpoint
CREATE TRIGGER trg_quotation_revisions_guard BEFORE INSERT OR UPDATE OR DELETE ON public.quotation_revisions
  FOR EACH ROW EXECUTE FUNCTION app.guard_quotation_revision();--> statement-breakpoint

CREATE OR REPLACE FUNCTION app.guard_revision_child() RETURNS trigger LANGUAGE plpgsql AS $fn$
DECLARE v_status text;
BEGIN
  IF app.is_trusted_caller() THEN RETURN COALESCE(NEW, OLD); END IF;
  SELECT status INTO v_status FROM public.quotation_revisions WHERE id = COALESCE(NEW.revision_id, OLD.revision_id);
  IF v_status IS DISTINCT FROM 'draft' THEN
    RAISE EXCEPTION 'submitted revisions are immutable' USING ERRCODE = '42501'; END IF;
  IF TG_TABLE_NAME = 'quotation_items' AND TG_OP <> 'DELETE'
     AND NOT app.rfq_item_belongs_to_revision(NEW.rfq_item_id, NEW.revision_id) THEN
    RAISE EXCEPTION 'rfq item does not belong to this quotation''s RFQ' USING ERRCODE = '23503'; END IF;
  RETURN COALESCE(NEW, OLD);
END $fn$;--> statement-breakpoint

DO $do$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['quotation_items','quotation_terms','quotation_certifications','quotation_attachments']
  LOOP
    EXECUTE format('CREATE TRIGGER trg_%1$s_revision_lock BEFORE INSERT OR UPDATE OR DELETE ON public.%1$I FOR EACH ROW EXECUTE FUNCTION app.guard_revision_child()', t);
  END LOOP;
END
$do$;--> statement-breakpoint

CREATE OR REPLACE FUNCTION app.guard_quotation_specification() RETURNS trigger LANGUAGE plpgsql AS $fn$
DECLARE v_status text;
BEGIN
  IF app.is_trusted_caller() THEN RETURN COALESCE(NEW, OLD); END IF;
  SELECT r.status INTO v_status FROM public.quotation_items i JOIN public.quotation_revisions r ON r.id = i.revision_id
  WHERE i.id = COALESCE(NEW.quotation_item_id, OLD.quotation_item_id);
  IF v_status IS DISTINCT FROM 'draft' THEN
    RAISE EXCEPTION 'submitted revisions are immutable' USING ERRCODE = '42501'; END IF;
  RETURN COALESCE(NEW, OLD);
END $fn$;--> statement-breakpoint
CREATE TRIGGER trg_quotation_specifications_revision_lock BEFORE INSERT OR UPDATE OR DELETE ON public.quotation_specifications
  FOR EACH ROW EXECUTE FUNCTION app.guard_quotation_specification();--> statement-breakpoint

-- ------------------------------------------------------------------ deals
CREATE OR REPLACE FUNCTION app.guard_deal() RETURNS trigger LANGUAGE plpgsql AS $fn$
DECLARE q record; v_conf int;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF app.is_trusted_caller() THEN RETURN NEW; END IF;
    SELECT id, rfq_id, status, accepted_revision_id, currency_id, total_amount, company_id, buyer_company_id INTO q
    FROM public.quotations WHERE id = NEW.quotation_id;
    IF NOT FOUND OR q.status <> 'accepted' THEN
      RAISE EXCEPTION 'a deal requires an accepted quotation' USING ERRCODE = '42501'; END IF;
    IF NEW.buyer_company_id <> app.active_company() THEN
      RAISE EXCEPTION 'only the buyer creates the deal' USING ERRCODE = '42501'; END IF;
    IF NEW.accepted_revision_id <> q.accepted_revision_id OR NEW.rfq_id <> q.rfq_id OR NEW.currency_id <> q.currency_id
       OR NEW.total_amount <> q.total_amount OR NEW.supplier_company_id <> q.company_id OR NEW.buyer_company_id <> q.buyer_company_id THEN
      RAISE EXCEPTION 'deal does not match the accepted quotation snapshot' USING ERRCODE = '23514'; END IF;
    NEW.status := 'active'; NEW.agreed_at := now();
    RETURN NEW;
  END IF;
  IF app.is_system_caller() THEN RETURN NEW; END IF;
  IF NEW.quotation_id <> OLD.quotation_id OR NEW.accepted_revision_id <> OLD.accepted_revision_id OR NEW.rfq_id <> OLD.rfq_id
     OR NEW.buyer_company_id <> OLD.buyer_company_id OR NEW.supplier_company_id <> OLD.supplier_company_id
     OR NEW.currency_id <> OLD.currency_id OR NEW.total_amount <> OLD.total_amount
     OR NEW.reference_no <> OLD.reference_no OR NEW.agreed_at <> OLD.agreed_at THEN
    RAISE EXCEPTION 'agreed deal terms are immutable' USING ERRCODE = '42501'; END IF;
  IF NEW.status <> OLD.status THEN
    IF OLD.status IN ('completed', 'cancelled') THEN RAISE EXCEPTION 'deal is final' USING ERRCODE = '42501'; END IF;
    IF NOT ((OLD.status = 'active' AND NEW.status IN ('in_production', 'shipped', 'disputed', 'cancelled'))
         OR (OLD.status = 'in_production' AND NEW.status IN ('shipped', 'disputed', 'cancelled'))
         OR (OLD.status = 'shipped' AND NEW.status IN ('delivered', 'disputed', 'cancelled'))
         OR (OLD.status = 'delivered' AND NEW.status IN ('completed', 'disputed'))
         OR (OLD.status = 'disputed' AND NEW.status IN ('active', 'in_production', 'shipped', 'delivered', 'cancelled'))) THEN
      RAISE EXCEPTION 'illegal deal status transition % -> %', OLD.status, NEW.status USING ERRCODE = '42501'; END IF;
    IF NEW.status = 'completed' THEN
      SELECT count(DISTINCT company_id) INTO v_conf FROM public.deal_confirmations
        WHERE deal_id = OLD.id AND confirmation_type = 'completion' AND company_id IN (OLD.buyer_company_id, OLD.supplier_company_id);
      IF v_conf < 2 THEN RAISE EXCEPTION 'completion requires confirmation from both parties' USING ERRCODE = '23514'; END IF;
      NEW.completed_at := now();
    ELSIF NEW.status = 'cancelled' THEN
      IF NOT EXISTS (SELECT 1 FROM public.deal_cancellations WHERE deal_id = OLD.id AND status = 'accepted') THEN
        RAISE EXCEPTION 'cancellation requires acceptance by the counterparty' USING ERRCODE = '23514'; END IF;
      NEW.cancelled_at := now();
    END IF;
  END IF;
  RETURN NEW;
END $fn$;--> statement-breakpoint
CREATE TRIGGER trg_deals_guard BEFORE INSERT OR UPDATE ON public.deals FOR EACH ROW EXECUTE FUNCTION app.guard_deal();--> statement-breakpoint

CREATE OR REPLACE FUNCTION app.log_deal_status() RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.deal_status_history (deal_id, from_status, to_status, actor_company_id, actor_user_id)
    VALUES (NEW.id, CASE WHEN TG_OP = 'UPDATE' THEN OLD.status END, NEW.status, app.active_company(), app.uid());
  END IF;
  RETURN NULL;
END $fn$;--> statement-breakpoint
CREATE TRIGGER trg_deals_history AFTER INSERT OR UPDATE ON public.deals FOR EACH ROW EXECUTE FUNCTION app.log_deal_status();--> statement-breakpoint

-- Snapshot rows (terms/items) may only be written in the same transaction as the deal.
CREATE OR REPLACE FUNCTION app.guard_deal_snapshot_write() RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
  IF app.is_trusted_caller() THEN RETURN NEW; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.deals d WHERE d.id = NEW.deal_id AND d.agreed_at = now()) THEN
    RAISE EXCEPTION 'agreed terms can only be written when the deal is created' USING ERRCODE = '42501'; END IF;
  RETURN NEW;
END $fn$;--> statement-breakpoint
CREATE TRIGGER trg_deal_terms_snapshot BEFORE INSERT ON public.deal_terms FOR EACH ROW EXECUTE FUNCTION app.guard_deal_snapshot_write();--> statement-breakpoint
CREATE TRIGGER trg_deal_items_snapshot BEFORE INSERT ON public.deal_items FOR EACH ROW EXECUTE FUNCTION app.guard_deal_snapshot_write();--> statement-breakpoint

-- At COMMIT: the deal must carry a faithful snapshot of the accepted revision and both parties.
CREATE OR REPLACE FUNCTION app.verify_deal_snapshot() RETURNS trigger LANGUAGE plpgsql AS $fn$
DECLARE v_missing int; v_extra int;
BEGIN
  IF app.is_trusted_caller() THEN RETURN NULL; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.deal_terms WHERE deal_id = NEW.id) THEN
    RAISE EXCEPTION 'deal is missing its terms snapshot' USING ERRCODE = '23514'; END IF;
  IF (SELECT count(*) FROM public.deal_parties WHERE deal_id = NEW.id AND
        ((party_role = 'buyer' AND company_id = NEW.buyer_company_id) OR (party_role = 'seller' AND company_id = NEW.supplier_company_id))) <> 2 THEN
    RAISE EXCEPTION 'deal must list exactly its buyer and seller parties' USING ERRCODE = '23514'; END IF;
  SELECT count(*) INTO v_missing FROM (
    SELECT rfq_item_id, quantity, uom_id, unit_price FROM public.quotation_items WHERE revision_id = NEW.accepted_revision_id
    EXCEPT SELECT rfq_item_id, quantity, uom_id, unit_price FROM public.deal_items WHERE deal_id = NEW.id) x;
  SELECT count(*) INTO v_extra FROM (
    SELECT rfq_item_id, quantity, uom_id, unit_price FROM public.deal_items WHERE deal_id = NEW.id
    EXCEPT SELECT rfq_item_id, quantity, uom_id, unit_price FROM public.quotation_items WHERE revision_id = NEW.accepted_revision_id) x;
  IF v_missing + v_extra > 0 OR NOT EXISTS (SELECT 1 FROM public.deal_items WHERE deal_id = NEW.id) THEN
    RAISE EXCEPTION 'deal items do not match the accepted revision' USING ERRCODE = '23514'; END IF;
  RETURN NULL;
END $fn$;--> statement-breakpoint
CREATE CONSTRAINT TRIGGER trg_deals_snapshot_verify AFTER INSERT ON public.deals
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION app.verify_deal_snapshot();--> statement-breakpoint

-- ------------------------------------------------------------------ reviews
CREATE OR REPLACE FUNCTION app.guard_review() RETURNS trigger LANGUAGE plpgsql AS $fn$
DECLARE d record;
BEGIN
  IF app.is_trusted_caller() THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    SELECT status, buyer_company_id, supplier_company_id INTO d FROM public.deals WHERE id = NEW.deal_id;
    IF NOT FOUND OR d.status <> 'completed' THEN
      RAISE EXCEPTION 'reviews require a completed platform deal' USING ERRCODE = '42501'; END IF;
    IF NOT ((NEW.reviewer_company_id = d.buyer_company_id AND NEW.reviewed_company_id = d.supplier_company_id)
         OR (NEW.reviewer_company_id = d.supplier_company_id AND NEW.reviewed_company_id = d.buyer_company_id)) THEN
      RAISE EXCEPTION 'reviewer and reviewed company must be the two deal parties' USING ERRCODE = '42501'; END IF;
    IF NEW.reviewer_company_id <> app.active_company() OR NEW.reviewer_user_id <> app.uid() THEN
      RAISE EXCEPTION 'reviews are written as the acting user and company' USING ERRCODE = '42501'; END IF;
    IF NOT app.is_platform_admin('moderator') THEN
      NEW.status := 'pending'; NEW.published_at := NULL; NEW.moderated_at := NULL; NEW.moderated_by_user_id := NULL;
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.deal_id <> OLD.deal_id OR NEW.reviewer_company_id <> OLD.reviewer_company_id OR NEW.reviewed_company_id <> OLD.reviewed_company_id THEN
    RAISE EXCEPTION 'immutable review column' USING ERRCODE = '42501'; END IF;
  IF app.is_platform_admin('moderator') THEN
    IF NEW.status <> OLD.status THEN
      NEW.moderated_at := now(); NEW.moderated_by_user_id := app.uid();
      NEW.published_at := CASE WHEN NEW.status = 'published' THEN COALESCE(OLD.published_at, now()) END;
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.status <> OLD.status OR OLD.status <> 'pending' OR OLD.reviewer_company_id <> app.active_company() THEN
    RAISE EXCEPTION 'reviews can only be edited by their author while pending' USING ERRCODE = '42501'; END IF;
  RETURN NEW;
END $fn$;--> statement-breakpoint
CREATE TRIGGER trg_company_reviews_guard BEFORE INSERT OR UPDATE ON public.company_reviews FOR EACH ROW EXECUTE FUNCTION app.guard_review();--> statement-breakpoint

-- ------------------------------------------------------------------ conversations & messages
CREATE OR REPLACE FUNCTION app.guard_conversation() RETURNS trigger LANGUAGE plpgsql AS $fn$
DECLARE q record; d record; v_owner uuid;
BEGIN
  IF app.is_trusted_caller() THEN RETURN NEW; END IF;
  IF NEW.initiator_company_id <> app.active_company() OR NEW.created_by_user_id <> app.uid() THEN
    RAISE EXCEPTION 'conversations start from the acting company' USING ERRCODE = '42501'; END IF;
  IF NOT app.is_public_company(NEW.counterparty_company_id) THEN
    RAISE EXCEPTION 'counterparty is not available' USING ERRCODE = '42501'; END IF;
  IF NEW.conversation_type = 'quotation' THEN
    SELECT company_id, buyer_company_id INTO q FROM public.quotations WHERE id = NEW.quotation_id;
    IF NOT FOUND OR NOT ((NEW.initiator_company_id = q.company_id AND NEW.counterparty_company_id = q.buyer_company_id)
                      OR (NEW.initiator_company_id = q.buyer_company_id AND NEW.counterparty_company_id = q.company_id)) THEN
      RAISE EXCEPTION 'conversation parties must be the quotation parties' USING ERRCODE = '42501'; END IF;
  ELSIF NEW.conversation_type = 'deal' THEN
    SELECT buyer_company_id, supplier_company_id INTO d FROM public.deals WHERE id = NEW.deal_id;
    IF NOT FOUND OR NOT ((NEW.initiator_company_id = d.buyer_company_id AND NEW.counterparty_company_id = d.supplier_company_id)
                      OR (NEW.initiator_company_id = d.supplier_company_id AND NEW.counterparty_company_id = d.buyer_company_id)) THEN
      RAISE EXCEPTION 'conversation parties must be the deal parties' USING ERRCODE = '42501'; END IF;
  ELSIF NEW.conversation_type = 'rfq' THEN
    v_owner := app.rfq_owner(NEW.rfq_id);
    IF v_owner IS NULL OR NOT (
         (v_owner = NEW.initiator_company_id)
         OR (v_owner = NEW.counterparty_company_id AND app.can_view_rfq(NEW.rfq_id, NEW.initiator_company_id))) THEN
      RAISE EXCEPTION 'conversation must be between the RFQ owner and a company that can see the RFQ' USING ERRCODE = '42501'; END IF;
  END IF;
  RETURN NEW;
END $fn$;--> statement-breakpoint
CREATE TRIGGER trg_conversations_guard BEFORE INSERT ON public.conversations FOR EACH ROW EXECUTE FUNCTION app.guard_conversation();--> statement-breakpoint

CREATE OR REPLACE FUNCTION app.guard_message() RETURNS trigger LANGUAGE plpgsql AS $fn$
DECLARE v_status text;
BEGIN
  IF app.is_system_caller() THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.sender_user_id IS DISTINCT FROM app.uid() OR NEW.kind = 'system' THEN
      RAISE EXCEPTION 'messages are sent as the acting user' USING ERRCODE = '42501'; END IF;
    IF NOT app.is_conversation_participant(NEW.conversation_id) THEN
      RAISE EXCEPTION 'not a participant of this conversation' USING ERRCODE = '42501'; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.conversation_participants p WHERE p.conversation_id = NEW.conversation_id
                   AND p.user_id = app.uid() AND p.company_id = NEW.sender_company_id) THEN
      RAISE EXCEPTION 'sender company must be the participant company' USING ERRCODE = '42501'; END IF;
    SELECT status INTO v_status FROM public.conversations WHERE id = NEW.conversation_id;
    IF v_status <> 'active' THEN RAISE EXCEPTION 'conversation is closed' USING ERRCODE = '42501'; END IF;
    NEW.moderation_status := 'visible'; NEW.edited_at := NULL; NEW.deleted_at := NULL;
    RETURN NEW;
  END IF;
  IF NEW.conversation_id <> OLD.conversation_id OR NEW.sender_user_id IS DISTINCT FROM OLD.sender_user_id
     OR NEW.sender_company_id IS DISTINCT FROM OLD.sender_company_id OR NEW.kind <> OLD.kind
     OR NEW.created_at <> OLD.created_at OR NEW.moderation_status <> OLD.moderation_status THEN
    RAISE EXCEPTION 'immutable message column' USING ERRCODE = '42501'; END IF;
  IF NEW.body IS DISTINCT FROM OLD.body THEN NEW.edited_at := now(); END IF;
  RETURN NEW;
END $fn$;--> statement-breakpoint
CREATE TRIGGER trg_messages_guard BEFORE INSERT OR UPDATE ON public.messages FOR EACH ROW EXECUTE FUNCTION app.guard_message();
