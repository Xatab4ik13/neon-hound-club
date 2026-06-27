ALTER TABLE "post_comments" ADD COLUMN IF NOT EXISTS "image_url" text;--> statement-breakpoint
ALTER TABLE "post_comments" DROP CONSTRAINT IF EXISTS "pc_kind_check";--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "post_comments" ADD CONSTRAINT "pc_kind_check" CHECK ("kind" IN ('text','sticker','image'));
EXCEPTION WHEN duplicate_object THEN null; END $$;
