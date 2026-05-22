CREATE TABLE IF NOT EXISTS "quests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "code" varchar(64) NOT NULL UNIQUE,
  "title" varchar(200) NOT NULL,
  "description" text NOT NULL DEFAULT '',
  "tickets_reward" integer NOT NULL,
  "kind" varchar(16) NOT NULL DEFAULT 'auto',
  "repeatable" boolean NOT NULL DEFAULT false,
  "active" boolean NOT NULL DEFAULT true,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "q_active_idx" ON "quests" ("active", "sort_order");

CREATE TABLE IF NOT EXISTS "user_quest_completions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "quest_id" uuid NOT NULL REFERENCES "quests"("id") ON DELETE CASCADE,
  "tickets_awarded" integer NOT NULL,
  "completed_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "uqc_user_idx" ON "user_quest_completions" ("user_id");
CREATE INDEX IF NOT EXISTS "uqc_user_quest_idx" ON "user_quest_completions" ("user_id", "quest_id");
