-- 0007: fixes from the database review. Additive: 0000-0006 are applied history and are never edited.
-- The final policy state is described by src/database/policies/spec.ts; BASELINE_0005 there keeps the
-- drift test able to verify 0005 byte-for-byte.

-- ------------------------------------------------------------------ matches follow RFQ visibility
-- A supplier saw its match rows (and the RFQ id/score behind them) for RFQs it can no longer see
-- (invited-only, blocked country, expired, revoked invitation). The buyer branch is unchanged.
DROP POLICY rfq_supplier_matches_app_select ON public.rfq_supplier_matches;--> statement-breakpoint
CREATE POLICY rfq_supplier_matches_app_select ON public.rfq_supplier_matches FOR SELECT TO saudaro_app USING (buyer_company_id = (select app.active_company()) OR (supplier_company_id = (select app.active_company()) AND exists (select 1 from app.public_rfqs p where p.id = rfq_id)));--> statement-breakpoint
-- Reasons are gated through the match's own (RLS-filtered) row. The gate is a correlated EXISTS, never
-- `rfq_id IN (SELECT id FROM app.public_rfqs)`: that form is planned as a hash join that scans and
-- evaluates the visibility function for EVERY published RFQ (seconds at 24k rows).
DROP POLICY rfq_match_reasons_app_select ON public.rfq_match_reasons;--> statement-breakpoint
CREATE POLICY rfq_match_reasons_app_select ON public.rfq_match_reasons FOR SELECT TO saudaro_app USING (supplier_company_id = (select app.active_company()) AND exists (select 1 from public.rfq_supplier_matches m where m.id = match_id));--> statement-breakpoint

-- ------------------------------------------------------------------ no hard deletes of catalog records
DROP POLICY products_app_delete ON public.products;--> statement-breakpoint
DROP POLICY seller_product_listings_app_delete ON public.seller_product_listings;--> statement-breakpoint
REVOKE DELETE ON public.products, public.seller_product_listings FROM saudaro_app;--> statement-breakpoint

-- ------------------------------------------------------------------ product / listing status governance
-- products:  draft -> active | archived, active -> archived, archived -> draft.
-- listings: as products, plus active <-> paused and paused -> archived.
-- 'suspended' (products) is moderation-only: only trusted callers may set it or leave it.
CREATE OR REPLACE FUNCTION app.guard_catalog_status() RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
  IF TG_TABLE_NAME = 'products' THEN
    IF NEW.status = 'active' AND NEW.published_at IS NULL THEN NEW.published_at := now(); END IF;
  END IF;
  IF app.is_trusted_caller() THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'suspended' THEN
      RAISE EXCEPTION 'suspension is a moderation action' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.status <> OLD.status THEN
    IF NOT ((OLD.status = 'draft' AND NEW.status IN ('active', 'archived'))
         OR (OLD.status = 'active' AND NEW.status = 'archived')
         OR (OLD.status = 'archived' AND NEW.status = 'draft')
         OR (TG_TABLE_NAME = 'seller_product_listings'
             AND ((OLD.status = 'active' AND NEW.status = 'paused')
               OR (OLD.status = 'paused' AND NEW.status IN ('active', 'archived'))))) THEN
      RAISE EXCEPTION 'illegal % status transition % -> %', TG_TABLE_NAME, OLD.status, NEW.status USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END $fn$;--> statement-breakpoint
CREATE TRIGGER trg_products_status BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION app.guard_catalog_status();--> statement-breakpoint
CREATE TRIGGER trg_seller_product_listings_status BEFORE INSERT OR UPDATE ON public.seller_product_listings
  FOR EACH ROW EXECUTE FUNCTION app.guard_catalog_status();--> statement-breakpoint

-- ------------------------------------------------------------------ RFQ invitation responses
-- pending -> viewed | declined, viewed -> declined | quoted; declined and quoted are final.
-- Only the invited company responds (the buyer cannot answer on its behalf or revive a decline).
CREATE OR REPLACE FUNCTION app.guard_rfq_invitation_status() RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
  IF app.is_system_caller() THEN RETURN NEW; END IF;
  IF NEW.status IS NOT DISTINCT FROM OLD.status AND NEW.responded_at IS NOT DISTINCT FROM OLD.responded_at THEN
    RETURN NEW;
  END IF;
  IF NEW.status <> OLD.status AND NOT ((OLD.status = 'pending' AND NEW.status IN ('viewed', 'declined'))
                                    OR (OLD.status = 'viewed' AND NEW.status IN ('declined', 'quoted'))) THEN
    RAISE EXCEPTION 'illegal invitation status transition % -> %', OLD.status, NEW.status USING ERRCODE = '42501';
  END IF;
  IF app.active_company() IS DISTINCT FROM OLD.invited_company_id THEN
    RAISE EXCEPTION 'only the invited company can respond to an invitation' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $fn$;--> statement-breakpoint
CREATE TRIGGER trg_rfq_invitations_status BEFORE UPDATE ON public.rfq_invitations
  FOR EACH ROW EXECUTE FUNCTION app.guard_rfq_invitation_status();--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION app.guard_catalog_status(), app.guard_rfq_invitation_status() FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app.guard_catalog_status(), app.guard_rfq_invitation_status() TO saudaro_app, saudaro_worker, saudaro_pub, saudaro_authz;--> statement-breakpoint
-- The invitee branch now also needs the permission to quote (same helper the quotation policies use).
DROP POLICY rfq_invitations_app_update ON public.rfq_invitations;--> statement-breakpoint
CREATE POLICY rfq_invitations_app_update ON public.rfq_invitations FOR UPDATE TO saudaro_app USING (company_id = (select app.writable_company()) AND (select app.can_write('rfq.manage')) OR (invited_company_id = (select app.writable_company()) AND (select app.can_write('quotation.create')))) WITH CHECK (company_id = (select app.writable_company()) AND (select app.can_write('rfq.manage')) OR (invited_company_id = (select app.writable_company()) AND (select app.can_write('quotation.create'))));--> statement-breakpoint

-- ------------------------------------------------------------------ suppliers see what a public RFQ requires
-- Visibility rules and payment/origin preferences stay private to the buyer.
DROP POLICY rfq_required_documents_app_select ON public.rfq_required_documents;--> statement-breakpoint
CREATE POLICY rfq_required_documents_app_select ON public.rfq_required_documents FOR SELECT TO saudaro_app USING (company_id = (select app.active_company()) OR (exists (select 1 from app.public_rfqs p where p.id = rfq_id)));--> statement-breakpoint
DROP POLICY rfq_certification_requirements_app_select ON public.rfq_certification_requirements;--> statement-breakpoint
CREATE POLICY rfq_certification_requirements_app_select ON public.rfq_certification_requirements FOR SELECT TO saudaro_app USING (company_id = (select app.active_company()) OR (exists (select 1 from app.public_rfqs p where p.id = rfq_id)));--> statement-breakpoint
DROP POLICY rfq_trade_requirements_app_select ON public.rfq_trade_requirements;--> statement-breakpoint
CREATE POLICY rfq_trade_requirements_app_select ON public.rfq_trade_requirements FOR SELECT TO saudaro_app USING (company_id = (select app.active_company()) OR (exists (select 1 from app.public_rfqs p where p.id = rfq_id)));--> statement-breakpoint

-- ------------------------------------------------------------------ documentation of intent
COMMENT ON TABLE public.rfq_views IS 'One row per supplier view of an RFQ. company_id is the viewing supplier. The viewer sees its own rows; the RFQ owner sees the full rows (who viewed, when), not just aggregates.';--> statement-breakpoint
COMMENT ON COLUMN public.rfqs.visibility IS 'public = any eligible supplier; invited = only invited suppliers; private = owner-only, there is deliberately no supplier access path (not listed, not matched, not invitable).';
