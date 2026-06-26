ALTER TABLE "post_comments" ADD COLUMN IF NOT EXISTS "parent_id" uuid;--> statement-breakpoint
ALTER TABLE "post_comments" ADD COLUMN IF NOT EXISTS "kind" varchar(16) DEFAULT 'text' NOT NULL;--> statement-breakpoint
ALTER TABLE "post_comments" ADD COLUMN IF NOT EXISTS "sticker_id" text;--> statement-breakpoint
ALTER TABLE "post_comments" ADD COLUMN IF NOT EXISTS "edited_at" timestamp with time zone;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "post_comments" ADD CONSTRAINT "pc_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "post_comments"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "post_comments" ADD CONSTRAINT "pc_kind_check" CHECK ("kind" IN ('text','sticker'));
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "post_comments_parent_idx" ON "post_comments" USING btree ("post_id","parent_id","created_at");
