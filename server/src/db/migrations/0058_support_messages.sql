CREATE TABLE IF NOT EXISTS "support_ticket_messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "ticket_id" uuid NOT NULL REFERENCES "support_tickets"("id") ON DELETE CASCADE,
  "author_role" varchar(8) NOT NULL,
  "author_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "body" text NOT NULL,
  "attachments" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stm_ticket_created_idx" ON "support_ticket_messages" ("ticket_id","created_at");
--> statement-breakpoint
ALTER TABLE "support_tickets" ADD COLUMN IF NOT EXISTS "last_message_at" timestamp with time zone;
--> statement-breakpoint
-- Бэкфилл: первое сообщение юзера из body.
INSERT INTO "support_ticket_messages" ("ticket_id","author_role","author_id","body","attachments","created_at")
SELECT t."id", 'user', t."user_id", t."body", COALESCE(t."attachments", '[]'::jsonb), t."created_at"
FROM "support_tickets" t
WHERE NOT EXISTS (
  SELECT 1 FROM "support_ticket_messages" m WHERE m."ticket_id" = t."id"
);
--> statement-breakpoint
-- Бэкфилл: ответ админа.
INSERT INTO "support_ticket_messages" ("ticket_id","author_role","author_id","body","attachments","created_at")
SELECT t."id", 'admin', t."answered_by", t."admin_reply", '[]'::jsonb, COALESCE(t."answered_at", t."updated_at")
FROM "support_tickets" t
WHERE t."admin_reply" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "support_ticket_messages" m WHERE m."ticket_id" = t."id" AND m."author_role" = 'admin'
  );
--> statement-breakpoint
UPDATE "support_tickets" t
SET "last_message_at" = COALESCE(
  (SELECT MAX(m."created_at") FROM "support_ticket_messages" m WHERE m."ticket_id" = t."id"),
  t."created_at"
)
WHERE t."last_message_at" IS NULL;
