-- 0006: supporting indexes for tenant/parent foreign keys that no existing index leads with.
-- Without these, deleting/updating a parent (and cascades) scans the child table. Foreign keys into
-- never-deleted reference tables (currencies, countries, units, ports, ...) and into users (soft-delete only)
-- are deliberately NOT indexed: it would only add write overhead.
CREATE INDEX ix_fk_abuse_reports_reporter_company_id ON public.abuse_reports (reporter_company_id) WHERE reporter_company_id IS NOT NULL;
--> statement-breakpoint
CREATE INDEX ix_fk_company_invitations_role_id ON public.company_invitations (role_id);
--> statement-breakpoint
CREATE INDEX ix_fk_company_verification_levels_granted_case_id_company_id ON public.company_verification_levels (granted_case_id, company_id) WHERE granted_case_id IS NOT NULL;
--> statement-breakpoint
CREATE INDEX ix_fk_deal_activity_events_actor_company_id ON public.deal_activity_events (actor_company_id) WHERE actor_company_id IS NOT NULL;
--> statement-breakpoint
CREATE INDEX ix_fk_deal_cancellations_requested_by_company_id ON public.deal_cancellations (requested_by_company_id);
--> statement-breakpoint
CREATE INDEX ix_fk_deal_cancellations_responded_by_company_id ON public.deal_cancellations (responded_by_company_id) WHERE responded_by_company_id IS NOT NULL;
--> statement-breakpoint
CREATE INDEX ix_fk_deal_confirmations_company_id ON public.deal_confirmations (company_id);
--> statement-breakpoint
CREATE INDEX ix_fk_deal_disputes_raised_by_company_id ON public.deal_disputes (raised_by_company_id);
--> statement-breakpoint
CREATE INDEX ix_fk_deal_document_versions_uploaded_by_company_id ON public.deal_document_versions (uploaded_by_company_id);
--> statement-breakpoint
CREATE INDEX ix_fk_deal_documents_created_by_company_id ON public.deal_documents (created_by_company_id);
--> statement-breakpoint
CREATE INDEX ix_fk_deal_items_rfq_item_id ON public.deal_items (rfq_item_id) WHERE rfq_item_id IS NOT NULL;
--> statement-breakpoint
CREATE INDEX ix_fk_deal_milestone_events_actor_company_id ON public.deal_milestone_events (actor_company_id);
--> statement-breakpoint
CREATE INDEX ix_fk_deal_milestones_responsible_company_id ON public.deal_milestones (responsible_company_id);
--> statement-breakpoint
CREATE INDEX ix_fk_deal_shipments_added_by_company_id ON public.deal_shipments (added_by_company_id);
--> statement-breakpoint
CREATE INDEX ix_fk_deal_status_history_actor_company_id ON public.deal_status_history (actor_company_id) WHERE actor_company_id IS NOT NULL;
--> statement-breakpoint
CREATE INDEX ix_fk_deals_accepted_revision_id_quotation_id ON public.deals (accepted_revision_id, quotation_id);
--> statement-breakpoint
CREATE INDEX ix_fk_idempotency_keys_company_id ON public.idempotency_keys (company_id) WHERE company_id IS NOT NULL;
--> statement-breakpoint
CREATE INDEX ix_fk_message_reports_reporter_company_id ON public.message_reports (reporter_company_id);
--> statement-breakpoint
CREATE INDEX ix_fk_messages_reply_to_id_conversation_id ON public.messages (reply_to_id, conversation_id) WHERE reply_to_id IS NOT NULL;
--> statement-breakpoint
CREATE INDEX ix_fk_messages_sender_company_id ON public.messages (sender_company_id) WHERE sender_company_id IS NOT NULL;
--> statement-breakpoint
CREATE INDEX ix_fk_negotiation_events_actor_company_id ON public.negotiation_events (actor_company_id);
--> statement-breakpoint
CREATE INDEX ix_fk_notifications_company_id ON public.notifications (company_id) WHERE company_id IS NOT NULL;
--> statement-breakpoint
CREATE INDEX ix_fk_outbox_events_company_id ON public.outbox_events (company_id) WHERE company_id IS NOT NULL;
--> statement-breakpoint
CREATE INDEX ix_fk_product_certifications_file_id_company_id ON public.product_certifications (file_id, company_id) WHERE file_id IS NOT NULL;
--> statement-breakpoint
CREATE INDEX ix_fk_product_documents_file_id_company_id ON public.product_documents (file_id, company_id);
--> statement-breakpoint
CREATE INDEX ix_fk_product_images_file_id_company_id ON public.product_images (file_id, company_id);
--> statement-breakpoint
CREATE INDEX ix_fk_products_manufacturer_company_id ON public.products (manufacturer_company_id) WHERE manufacturer_company_id IS NOT NULL;
--> statement-breakpoint
CREATE INDEX ix_fk_quotation_certifications_file_id_company_id ON public.quotation_certifications (file_id, company_id) WHERE file_id IS NOT NULL;
--> statement-breakpoint
CREATE INDEX ix_fk_quotation_comparison_entries_quotation_id ON public.quotation_comparison_entries (quotation_id);
--> statement-breakpoint
CREATE INDEX ix_fk_quotation_comparison_entries_revision_id ON public.quotation_comparison_entries (revision_id);
--> statement-breakpoint
CREATE INDEX ix_fk_quotation_status_history_actor_company_id ON public.quotation_status_history (actor_company_id);
--> statement-breakpoint
CREATE INDEX ix_fk_quotations_accepted_revision_id_id ON public.quotations (accepted_revision_id, id) WHERE accepted_revision_id IS NOT NULL;
--> statement-breakpoint
CREATE INDEX ix_fk_review_reports_reporter_company_id ON public.review_reports (reporter_company_id);
--> statement-breakpoint
CREATE INDEX ix_fk_rfq_certification_requirements_rfq_item_id_company_id ON public.rfq_certification_requirements (rfq_item_id, company_id) WHERE rfq_item_id IS NOT NULL;
--> statement-breakpoint
CREATE INDEX ix_fk_security_events_company_id ON public.security_events (company_id) WHERE company_id IS NOT NULL;
--> statement-breakpoint
CREATE INDEX ix_fk_seller_capacity_records_product_id_company_id ON public.seller_capacity_records (product_id, company_id) WHERE product_id IS NOT NULL;
--> statement-breakpoint
CREATE INDEX ix_fk_seller_certifications_file_id_company_id ON public.seller_certifications (file_id, company_id) WHERE file_id IS NOT NULL;
--> statement-breakpoint
CREATE INDEX ix_fk_seller_lead_times_product_id_company_id ON public.seller_lead_times (product_id, company_id) WHERE product_id IS NOT NULL;
--> statement-breakpoint
CREATE INDEX ix_fk_seller_moq_records_product_id_company_id ON public.seller_moq_records (product_id, company_id) WHERE product_id IS NOT NULL;
--> statement-breakpoint
CREATE INDEX ix_fk_seller_product_capabilities_product_id_company_id ON public.seller_product_capabilities (product_id, company_id) WHERE product_id IS NOT NULL;
--> statement-breakpoint
CREATE INDEX ix_fk_verification_documents_file_id_company_id ON public.verification_documents (file_id, company_id);
--> statement-breakpoint
CREATE INDEX ix_fk_verification_expiry_records_verification_document_id ON public.verification_expiry_records (verification_document_id) WHERE verification_document_id IS NOT NULL;
