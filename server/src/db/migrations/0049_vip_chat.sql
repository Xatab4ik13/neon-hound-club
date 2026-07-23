-- VIP-чат: персональная переписка подписчика с блогером (Hell).
-- Пока — общедоступно для всех авторизованных. В будущем открыт только держателям
-- Platinum Hell Pass (см. TODO в routes/vip-chat.ts). Список тредов — на стороне
-- блогера (аналог входящих Telegram), тред уникален для пары (user, blogger).

CREATE TABLE IF NOT EXISTS "vip_chat_threads" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "blogger_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "last_message_at" timestamptz NOT NULL DEFAULT now(),
  "last_message_preview" varchar(200) NOT NULL DEFAULT '',
  -- кто отправил последнее сообщение: 'user' | 'blogger'
  "last_message_role" varchar(16) NOT NULL DEFAULT 'user',
  -- непрочитанные для каждой стороны (обнуляются при read).
  "user_unread" integer NOT NULL DEFAULT 0,
  "blogger_unread" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "vct_pair_uq"
  ON "vip_chat_threads" ("user_id", "blogger_id");

CREATE INDEX IF NOT EXISTS "vct_blogger_last_idx"
  ON "vip_chat_threads" ("blogger_id", "last_message_at" DESC);

CREATE INDEX IF NOT EXISTS "vct_user_last_idx"
  ON "vip_chat_threads" ("user_id", "last_message_at" DESC);


CREATE TABLE IF NOT EXISTS "vip_chat_messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "thread_id" uuid NOT NULL REFERENCES "vip_chat_threads"("id") ON DELETE CASCADE,
  "sender_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  -- 'user' — фанат пишет блогеру, 'blogger' — блогер отвечает фанату.
  "sender_role" varchar(16) NOT NULL,
  "text" text,
  "sticker" varchar(120),
  "image_url" text,
  -- Проставляется, когда получатель прочитал сообщение (POST .../read).
  "read_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "vcm_thread_created_idx"
  ON "vip_chat_messages" ("thread_id", "created_at");
