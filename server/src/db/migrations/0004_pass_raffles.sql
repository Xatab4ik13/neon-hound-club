CREATE TABLE IF NOT EXISTS "pass_purchases" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "tier" varchar(16) NOT NULL,
  "price_rub" integer NOT NULL,
  "tickets_granted" integer NOT NULL,
  "status" varchar(24) NOT NULL DEFAULT 'pending_payment',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "paid_at" timestamptz,
  "expires_at" timestamptz
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pass_user_idx" ON "pass_purchases" ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pass_expires_idx" ON "pass_purchases" ("expires_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pass_status_idx" ON "pass_purchases" ("status");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "raffles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "title" varchar(200) NOT NULL,
  "description" text NOT NULL DEFAULT '',
  "image_url" text,
  "prize" varchar(200) NOT NULL,
  "ticket_cost" integer NOT NULL,
  "max_entries_per_user" integer,
  "starts_at" timestamptz NOT NULL,
  "ends_at" timestamptz NOT NULL,
  "status" varchar(16) NOT NULL DEFAULT 'draft',
  "winner_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "winner_entry_id" uuid,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "raffles_status_idx" ON "raffles" ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "raffles_ends_idx" ON "raffles" ("ends_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "raffle_entries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "raffle_id" uuid NOT NULL REFERENCES "raffles"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "ticket_cost_snapshot" integer NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "raffle_entries_raffle_idx" ON "raffle_entries" ("raffle_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "raffle_entries_user_idx" ON "raffle_entries" ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "raffle_entries_raffle_user_idx" ON "raffle_entries" ("raffle_id", "user_id");
