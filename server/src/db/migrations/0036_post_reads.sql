-- Telegram-style: запоминаем, до какого момента юзер прочитал комментарии поста.
-- При открытии модалки бросаем на первый коммент новее last_read_at и рисуем разделитель.

CREATE TABLE IF NOT EXISTS "post_reads" (
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "post_id" uuid NOT NULL REFERENCES "posts"("id") ON DELETE CASCADE,
  "last_read_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("user_id", "post_id")
);

CREATE INDEX IF NOT EXISTS "post_reads_user_idx" ON "post_reads" ("user_id");
