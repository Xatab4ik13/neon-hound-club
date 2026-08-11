ALTER TABLE "support_tickets" ADD COLUMN IF NOT EXISTS "attachments" jsonb DEFAULT '[]'::jsonb NOT NULL;
