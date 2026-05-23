-- Hell Pass перки на чекауте магазина.
-- subtotal_rub  — сумма до скидки (snapshot)
-- discount_pct  — % скидки по активному пассу на момент заказа (0/5/10/15)
-- discount_rub  — рублёвая скидка (snapshot)
-- total_rub     — остаётся «к оплате» = subtotal - discount (как и было)

ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "subtotal_rub" integer;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "discount_pct" integer NOT NULL DEFAULT 0;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "discount_rub" integer NOT NULL DEFAULT 0;

-- Старым заказам считаем subtotal = total (скидки не применялись)
UPDATE "orders" SET "subtotal_rub" = "total_rub" WHERE "subtotal_rub" IS NULL;

ALTER TABLE "orders" ALTER COLUMN "subtotal_rub" SET NOT NULL;
