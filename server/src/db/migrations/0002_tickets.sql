CREATE TABLE IF NOT EXISTS "tickets_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"source" varchar(32) NOT NULL,
	"reason" text NOT NULL,
	"ref_type" varchar(32),
	"ref_id" uuid,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tickets_ledger" ADD CONSTRAINT "tl_user_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tickets_ledger" ADD CONSTRAINT "tl_created_by_fk" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tl_user_idx" ON "tickets_ledger" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tl_user_created_idx" ON "tickets_ledger" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tl_ref_idx" ON "tickets_ledger" USING btree ("ref_type","ref_id");
