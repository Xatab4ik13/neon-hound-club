-- Розыгрыши: убираем legacy поле `prize` (есть rafflePrizes), добавляем show_on_home,
-- ticket_cost фиксируем = 1 (поле оставляем, но default 1 и больше не правится из админки).

ALTER TABLE "raffles" ALTER COLUMN "prize" DROP NOT NULL;
ALTER TABLE "raffles" ALTER COLUMN "prize" SET DEFAULT NULL;
ALTER TABLE "raffles" ALTER COLUMN "ticket_cost" SET DEFAULT 1;
ALTER TABLE "raffles" ADD COLUMN IF NOT EXISTS "show_on_home" boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS "raffles_show_home_idx" ON "raffles" ("show_on_home");
