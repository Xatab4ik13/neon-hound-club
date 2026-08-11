-- Товарные промокоды: скидка на конкретный товар.
-- Работает только если в корзине ровно этот товар и количество = 1.
-- Билеты за такой заказ НЕ начисляются (см. lib/shop.ts).
ALTER TABLE promo_codes
  ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES products(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS promo_codes_product_idx ON promo_codes (product_id);
