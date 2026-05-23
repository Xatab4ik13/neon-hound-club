-- Магазин: вернули поля «Доставка», «Возврат» и список размеров на товаре.
-- shipping_info / return_policy — текст с переносами строк, рендерится в аккордеоне на карточке.
-- sizes — массив строк ("S", "M", "L", "42") в порядке показа. Если пусто — селектора размера нет.

ALTER TABLE "products"
  ADD COLUMN IF NOT EXISTS "shipping_info" text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "return_policy" text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "sizes" jsonb NOT NULL DEFAULT '[]'::jsonb;
