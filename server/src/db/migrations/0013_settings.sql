-- Настройки райдера: адрес доставки СДЭК + настройки уведомлений.
-- 1:1 к users (PK = user_id, cascade при удалении аккаунта).

CREATE TABLE IF NOT EXISTS "delivery_addresses" (
  "user_id" uuid PRIMARY KEY REFERENCES "users"("id") ON DELETE CASCADE,
  "full_name" varchar(120) NOT NULL DEFAULT '',
  "phone" varchar(32) NOT NULL DEFAULT '',
  "city" varchar(80) NOT NULL DEFAULT '',
  "postal_code" varchar(16) NOT NULL DEFAULT '',
  "pickup_point" text NOT NULL DEFAULT '',
  "comment" text NOT NULL DEFAULT '',
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "notification_prefs" (
  "user_id" uuid PRIMARY KEY REFERENCES "users"("id") ON DELETE CASCADE,
  "email_raffles" boolean NOT NULL DEFAULT true,
  "email_orders" boolean NOT NULL DEFAULT true,
  "email_news" boolean NOT NULL DEFAULT false,
  "push_raffles" boolean NOT NULL DEFAULT true,
  "push_orders" boolean NOT NULL DEFAULT true,
  "push_news" boolean NOT NULL DEFAULT false,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
