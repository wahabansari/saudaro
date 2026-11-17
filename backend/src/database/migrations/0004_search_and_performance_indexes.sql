-- 0004: search indexes (full-text + trigram). See docs/INDEXING_STRATEGY.md for the field matrix.
-- Text-search config is 'simple' (no stemming) on purpose: the platform is multilingual, and fuzzy
-- matching is handled by pg_trgm rather than language-specific dictionaries.

-- Full-text (generated tsvector columns defined in the schema).
CREATE INDEX ix_companies_search ON public.companies USING gin (search_vector) WHERE status = 'active';--> statement-breakpoint
CREATE INDEX ix_products_search ON public.products USING gin (search_vector) WHERE status = 'active';--> statement-breakpoint
CREATE INDEX ix_rfqs_search ON public.rfqs USING gin (search_vector) WHERE status = 'published';--> statement-breakpoint

-- Fuzzy / typo-tolerant lookups.
CREATE INDEX ix_companies_display_name_trgm ON public.companies USING gin (display_name gin_trgm_ops) WHERE status = 'active';--> statement-breakpoint
CREATE INDEX ix_companies_legal_name_trgm ON public.companies USING gin (legal_name gin_trgm_ops) WHERE status = 'active';--> statement-breakpoint
CREATE INDEX ix_products_name_trgm ON public.products USING gin (name gin_trgm_ops) WHERE status = 'active';--> statement-breakpoint
CREATE INDEX ix_rfqs_title_trgm ON public.rfqs USING gin (title gin_trgm_ops) WHERE status = 'published';--> statement-breakpoint
CREATE INDEX ix_product_categories_name_trgm ON public.product_categories USING gin (name gin_trgm_ops);--> statement-breakpoint
CREATE INDEX ix_hs_codes_description_trgm ON public.hs_codes USING gin (description gin_trgm_ops);--> statement-breakpoint
CREATE INDEX ix_cities_name_trgm ON public.cities USING gin (name gin_trgm_ops);--> statement-breakpoint

-- Exact / prefix HS-code navigation (WHERE code LIKE '1006%').
CREATE INDEX ix_hs_codes_code_prefix ON public.hs_codes (code text_pattern_ops);
