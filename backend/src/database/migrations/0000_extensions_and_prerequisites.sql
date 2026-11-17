-- 0000: extensions, schemas, sequences, schema-level privilege hardening.
-- Runs as the MIGRATOR role (database owner). Roles themselves are created by `npm run db:bootstrap`
-- (needs a superuser) because role creation must never be part of an app-owned migration.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'saudaro_app')
     OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'saudaro_worker')
     OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'saudaro_authz')
     OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'saudaro_pub')
     OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'saudaro_readonly') THEN
    RAISE EXCEPTION 'Required database roles are missing. Run `npm run db:bootstrap` with a superuser first.';
  END IF;
END
$$;--> statement-breakpoint

-- Trusted extensions (installable by the database owner without superuser).
CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS citext;--> statement-breakpoint

CREATE SCHEMA IF NOT EXISTS app;--> statement-breakpoint

-- Nothing is granted implicitly: PUBLIC loses everything on both schemas, then roles get USAGE only.
REVOKE ALL ON SCHEMA public FROM PUBLIC;--> statement-breakpoint
REVOKE ALL ON SCHEMA app FROM PUBLIC;--> statement-breakpoint
GRANT USAGE ON SCHEMA public TO saudaro_app, saudaro_worker, saudaro_readonly, saudaro_authz, saudaro_pub;--> statement-breakpoint
GRANT USAGE ON SCHEMA app TO saudaro_app, saudaro_worker, saudaro_readonly, saudaro_authz, saudaro_pub;--> statement-breakpoint

-- Human-readable, collision-free business reference numbers (RFQ-2026-00000042).
CREATE SEQUENCE IF NOT EXISTS public.rfq_reference_seq AS bigint START 1;--> statement-breakpoint
CREATE SEQUENCE IF NOT EXISTS public.quotation_reference_seq AS bigint START 1;--> statement-breakpoint
CREATE SEQUENCE IF NOT EXISTS public.deal_reference_seq AS bigint START 1;--> statement-breakpoint
GRANT USAGE ON SEQUENCE public.rfq_reference_seq, public.quotation_reference_seq, public.deal_reference_seq TO saudaro_app;--> statement-breakpoint

-- Functions are executable by nobody unless granted explicitly (default is PUBLIC EXECUTE).
-- NOTE: PostgreSQL's built-in default grants EXECUTE to PUBLIC; `IN SCHEMA ... REVOKE` cannot remove that
-- global default, so it is revoked for ALL future functions created by the migrator (and explicitly again in 0005).
ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
