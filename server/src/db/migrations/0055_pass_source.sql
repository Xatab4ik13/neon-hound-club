-- Hell Pass: откуда взялся пасс (покупка / рулетка / календарь активности / выдал админ)
ALTER TABLE "pass_purchases" ADD COLUMN IF NOT EXISTS "source" varchar(24) NOT NULL DEFAULT 'purchase';
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pass_source_idx" ON "pass_purchases" ("source");
--> statement-breakpoint
-- Бесплатные пассы (0₽) исторически выдавались рулеткой/календарём — помечаем как 'grant'.
UPDATE "pass_purchases" SET "source" = 'grant' WHERE "price_rub" = 0 AND "source" = 'purchase';
--> statement-breakpoint
-- Чистим старый мусор: неоплаченные заявки живут 1 час.
DELETE FROM "pass_purchases" WHERE "status" = 'pending_payment' AND "created_at" < now() - interval '1 hour';
