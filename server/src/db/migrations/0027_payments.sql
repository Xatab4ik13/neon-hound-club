-- Платежи через внешнюю платёжку (Т-Банк Acquiring).
-- Один payments row = одна попытка оплаты pass'а или заказа мерча.

CREATE TABLE IF NOT EXISTS "payments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "provider" varchar(16) NOT NULL DEFAULT 'tbank',
  "provider_payment_id" varchar(64),
  "ref_type" varchar(16) NOT NULL,      -- 'pass' | 'order'
  "ref_id" uuid NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "amount_rub" integer NOT NULL,
  "status" varchar(24) NOT NULL DEFAULT 'new',
  "payment_url" varchar(500),
  "raw_init" jsonb,
  "raw_last_notification" jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payments_ref_idx" ON "payments" ("ref_type", "ref_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "payments_provider_payment_id_uniq"
  ON "payments" ("provider_payment_id")
  WHERE "provider_payment_id" IS NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payments_user_idx" ON "payments" ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payments_status_idx" ON "payments" ("status");
