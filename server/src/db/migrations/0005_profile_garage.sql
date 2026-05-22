CREATE TABLE IF NOT EXISTS "profiles" (
  "user_id" uuid PRIMARY KEY REFERENCES "users"("id") ON DELETE CASCADE,
  "phone" varchar(32),
  "city" varchar(80),
  "avatar_url" text,
  "bio" text,
  "instagram" varchar(80),
  "telegram" varchar(80),
  "youtube" varchar(120),
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bikes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "brand" varchar(64) NOT NULL,
  "model" varchar(80) NOT NULL,
  "year" integer,
  "engine_cc" integer,
  "color" varchar(40),
  "nickname" varchar(60),
  "notes" text,
  "photos" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "is_primary" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bikes_user_idx" ON "bikes" ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bikes_primary_idx" ON "bikes" ("user_id", "is_primary");
-- ровно один основной байк на юзера
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "bikes_one_primary_per_user" ON "bikes" ("user_id") WHERE "is_primary" = true;
