-- TTL для неоплаченных заказов: 2 часа с момента создания.
-- Воркер на беке каждые 60с сносит просроченные заказы и возвращает остатки.

ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "expires_at" timestamptz;
--> statement-breakpoint
-- Для существующих pending_payment заказов выставляем дедлайн = created_at + 2 часа,
-- чтобы воркер их подобрал и почистил естественным образом.
UPDATE "orders"
SET "expires_at" = "created_at" + interval '2 hours'
WHERE "status" = 'pending_payment' AND "expires_at" IS NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "orders_expires_at_idx" ON "orders" ("expires_at")
  WHERE "status" = 'pending_payment';
