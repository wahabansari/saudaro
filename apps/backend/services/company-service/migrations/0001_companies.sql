CREATE TABLE "company"."companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"legal_name" text NOT NULL,
	"country_code" char(2) NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "companies_country_code_check" CHECK ("company"."companies"."country_code" ~ '^[A-Z]{2}$')
);
--> statement-breakpoint
CREATE TABLE "company"."memberships" (
	"company_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role_key" text NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "memberships_company_id_user_id_pk" PRIMARY KEY("company_id","user_id"),
	CONSTRAINT "memberships_status_check" CHECK ("company"."memberships"."status" in ('active','suspended','removed'))
);
--> statement-breakpoint
ALTER TABLE "company"."memberships" ADD CONSTRAINT "memberships_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "company"."companies"("id") ON DELETE no action ON UPDATE no action;