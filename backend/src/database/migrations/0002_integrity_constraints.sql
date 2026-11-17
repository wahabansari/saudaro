-- 0002: integrity rules Drizzle cannot express declaratively.

-- The accepted revision must be a revision OF THIS quotation (circular reference, so added after both tables exist).
ALTER TABLE public.quotations
  ADD CONSTRAINT quotations_accepted_revision_fk
  FOREIGN KEY (accepted_revision_id, id) REFERENCES public.quotation_revisions (id, quotation_id) ON DELETE RESTRICT;--> statement-breakpoint

-- At most one outstanding draft revision per quotation (prevents racing editors from forking history).
CREATE UNIQUE INDEX ux_quotation_revisions_one_draft ON public.quotation_revisions (quotation_id) WHERE status = 'draft';--> statement-breakpoint

-- Snapshot arithmetic must be internally consistent.
ALTER TABLE public.deal_items
  ADD CONSTRAINT deal_items_total_chk CHECK (total_price = round(quantity * unit_price, 4));--> statement-breakpoint

-- Hot path of every RLS membership lookup: active memberships by (company, user).
CREATE INDEX ix_company_memberships_company_user_active ON public.company_memberships (company_id, user_id) WHERE status = 'active';
