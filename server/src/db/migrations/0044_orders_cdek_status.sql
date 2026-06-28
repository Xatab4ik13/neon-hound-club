-- СДЭК: храним последний полученный статус накладной (для админки и /club/orders).
ALTER TABLE "orders"
  ADD COLUMN IF NOT EXISTS "cdek_status_code" varchar(32),
  ADD COLUMN IF NOT EXISTS "cdek_status_name" varchar(120),
  ADD COLUMN IF NOT EXISTS "cdek_status_at"   timestamptz;
