-- Common tables (generated from @saudaro/database-utils commonTablesSql)
CREATE TABLE "company".outbox_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregate_type text NOT NULL,
  aggregate_id uuid NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  headers jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','published','dead')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz
);--> statement-breakpoint
CREATE INDEX ix_outbox_pending ON "company".outbox_events (next_attempt_at, created_at) WHERE status = 'pending';--> statement-breakpoint
CREATE TABLE "company".inbox_events (
  consumer text NOT NULL,
  event_id uuid NOT NULL,
  event_type text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (consumer, event_id)
);--> statement-breakpoint
CREATE TABLE "company".audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_type text NOT NULL CHECK (actor_type IN ('user','admin','system','service')),
  actor_user_id uuid,
  company_id uuid,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid,
  request_id text,
  ip_address inet,
  changes jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);--> statement-breakpoint
CREATE INDEX ix_audit_log_company_time ON "company".audit_log (company_id, created_at DESC);--> statement-breakpoint
CREATE INDEX ix_audit_log_resource ON "company".audit_log (resource_type, resource_id, created_at DESC);--> statement-breakpoint
CREATE FUNCTION "company".forbid_modification() RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
  RAISE EXCEPTION '% is append-only (% rejected)', TG_TABLE_NAME, TG_OP USING ERRCODE = '42501';
END $fn$;--> statement-breakpoint
CREATE TRIGGER trg_audit_log_append_only BEFORE UPDATE OR DELETE ON "company".audit_log
  FOR EACH ROW EXECUTE FUNCTION "company".forbid_modification();--> statement-breakpoint
CREATE TRIGGER trg_audit_log_no_truncate BEFORE TRUNCATE ON "company".audit_log
  FOR EACH STATEMENT EXECUTE FUNCTION "company".forbid_modification();
