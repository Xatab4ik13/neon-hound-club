-- HELL HUNT: охота с ставками билетами и тремя призами (3 раунда).
CREATE TABLE IF NOT EXISTS "hunts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "title" varchar(120) DEFAULT 'HELL HUNT' NOT NULL,
  "starts_at" timestamp with time zone NOT NULL,
  "ticket_step" integer DEFAULT 10 NOT NULL,
  "status" varchar(16) DEFAULT 'open' NOT NULL,
  "drawn_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hunts_status_idx" ON "hunts" ("status","starts_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hunt_prizes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "hunt_id" uuid NOT NULL REFERENCES "hunts"("id") ON DELETE CASCADE,
  "place" integer NOT NULL,
  "title" varchar(160) NOT NULL,
  "sub" varchar(120) DEFAULT '' NOT NULL,
  "img_url" text,
  "tickets_reward" integer DEFAULT 0 NOT NULL,
  "forced_winner_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "winner_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hunt_prizes_hunt_idx" ON "hunt_prizes" ("hunt_id","place");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hunt_bets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "hunt_id" uuid NOT NULL REFERENCES "hunts"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "tickets" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "hunt_bets_uniq" ON "hunt_bets" ("hunt_id","user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hunt_bets_hunt_idx" ON "hunt_bets" ("hunt_id");
