-- Дополнительные поля мото: пробег, дата покупки, список модов.
ALTER TABLE "bikes" ADD COLUMN IF NOT EXISTS "mileage" varchar(40);
ALTER TABLE "bikes" ADD COLUMN IF NOT EXISTS "purchase_date" date;
ALTER TABLE "bikes" ADD COLUMN IF NOT EXISTS "mods" jsonb NOT NULL DEFAULT '[]'::jsonb;
