-- Этап 2: расширяем адрес доставки райдера под СДЭК.
--
-- Раньше: свободный текст (city / pickup_point). Теперь:
--   • cdek_city_code   — числовой код города в СДЭК (нужен для расчёта и создания накладной)
--   • cdek_pvz_code    — код выбранного ПВЗ (типа KRR123); пусто = курьерская доставка
--   • cdek_pvz_address — адрес ПВЗ для отображения
--   • street_address   — улица/дом/квартира для курьера
--   • preferred_mode   — 'pvz' | 'courier' (что юзер выбрал по умолчанию)
--   • verified_at      — когда юзер последний раз нажал «Проверил данные» (для бейджа в чекауте)
--
-- Старые поля city/postal_code/pickup_point оставляем — заполняются параллельно для совместимости/админки.

ALTER TABLE "delivery_addresses"
  ADD COLUMN IF NOT EXISTS "cdek_city_code"   integer,
  ADD COLUMN IF NOT EXISTS "cdek_pvz_code"    varchar(32),
  ADD COLUMN IF NOT EXISTS "cdek_pvz_address" text,
  ADD COLUMN IF NOT EXISTS "street_address"   text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "preferred_mode"   varchar(8) NOT NULL DEFAULT 'pvz',
  ADD COLUMN IF NOT EXISTS "verified_at"      timestamptz;
