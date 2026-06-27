-- Этап 2: заказ хранит итог по СДЭК и снимок типа товаров.
--
-- shipping_price_rub  — стоимость доставки на момент оформления (отдельной строкой в итоге)
-- shipping_mode       — 'pvz' | 'courier' | 'none' (none — заказ без доставки: virtual/digital)
-- cdek_uuid           — id накладной в СДЭК после createOrder
-- cdek_tariff_code    — какой тариф применили (136 склад-ПВЗ, 137 склад-дверь)
-- kind_summary        — 'physical' | 'virtual' | 'digital' | 'preorder' | 'mixed' (для табов в /club/orders)
-- ready_to_ship_at    — для preorder: когда партия готова к отгрузке (заполняется админом)
--
-- В order_items — снимок kind, чтобы фильтровать и показывать иконку даже после правки товара.

ALTER TABLE "orders"
  ADD COLUMN IF NOT EXISTS "shipping_price_rub" integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "shipping_mode"      varchar(8) NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS "cdek_uuid"          varchar(64),
  ADD COLUMN IF NOT EXISTS "cdek_tariff_code"   integer,
  ADD COLUMN IF NOT EXISTS "kind_summary"       varchar(16) NOT NULL DEFAULT 'physical',
  ADD COLUMN IF NOT EXISTS "ready_to_ship_at"   timestamptz;

ALTER TABLE "order_items"
  ADD COLUMN IF NOT EXISTS "kind_snapshot" varchar(16) NOT NULL DEFAULT 'physical';

CREATE INDEX IF NOT EXISTS "orders_kind_summary_idx" ON "orders" ("kind_summary");
