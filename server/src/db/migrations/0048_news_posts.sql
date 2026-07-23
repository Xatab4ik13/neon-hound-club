-- Новостной таб (NEWS) в /club. Создаются админом/AI-агентом.
-- Отдельная сущность от `posts` (HELLHOUND-лента): title/category,
-- нет автора-юзера, свои лайки. Комментарии — отдельной миграцией позже.

CREATE TABLE IF NOT EXISTS "news_posts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "category" varchar(60) NOT NULL DEFAULT '',
  "title" varchar(240) NOT NULL,
  "text" text NOT NULL DEFAULT '',
  "image_url" text,
  "published" boolean NOT NULL DEFAULT false,
  "pinned" boolean NOT NULL DEFAULT false,
  "likes_count" integer NOT NULL DEFAULT 0,
  "comments_count" integer NOT NULL DEFAULT 0,
  "published_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "deleted_at" timestamptz
);

CREATE INDEX IF NOT EXISTS "news_posts_feed_idx"
  ON "news_posts" ("deleted_at", "published", "pinned", "published_at");

CREATE TABLE IF NOT EXISTS "news_post_likes" (
  "post_id" uuid NOT NULL REFERENCES "news_posts"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("post_id", "user_id")
);

CREATE INDEX IF NOT EXISTS "news_post_likes_user_idx"
  ON "news_post_likes" ("user_id");
