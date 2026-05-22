CREATE TABLE IF NOT EXISTS "products" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "slug" varchar(64) NOT NULL UNIQUE,
  "title" varchar(200) NOT NULL,
  "description" text NOT NULL DEFAULT '',
  "price_rub" integer NOT NULL,
  "bonus_tickets" integer NOT NULL DEFAULT 0,
  "images" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "stock" integer,
  "active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_active_idx" ON "products" ("active");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "orders" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "status" varchar(24) NOT NULL DEFAULT 'pending_payment',
  "total_rub" integer NOT NULL,
  "bonus_tickets_total" integer NOT NULL DEFAULT 0,
  "shipping" jsonb NOT NULL,
  "comment" text,
  "cdek_track" varchar(64),
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "paid_at" timestamptz,
  "shipped_at" timestamptz
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "orders_user_idx" ON "orders" ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "orders_status_idx" ON "orders" ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "orders_created_idx" ON "orders" ("created_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "order_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "order_id" uuid NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
  "product_id" uuid REFERENCES "products"("id") ON DELETE SET NULL,
  "title_snapshot" varchar(200) NOT NULL,
  "price_rub_snapshot" integer NOT NULL,
  "bonus_tickets_snapshot" integer NOT NULL DEFAULT 0,
  "qty" integer NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "order_items_order_idx" ON "order_items" ("order_id");
