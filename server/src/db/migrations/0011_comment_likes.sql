CREATE TABLE IF NOT EXISTS "comment_likes" (
  "comment_id" uuid NOT NULL REFERENCES "post_comments"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "comment_likes_pk" PRIMARY KEY ("comment_id", "user_id")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "comment_likes_comment_idx" ON "comment_likes" ("comment_id");
