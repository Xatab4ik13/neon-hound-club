-- Промокоды магазина.
-- Один промокод = один пользователь (персональный), одноразовый.
-- Скидка только в процентах и только на товары (доставка СДЭК не скидывается).
CREATE TABLE IF NOT EXISTS promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(32) NOT NULL,
  discount_pct integer NOT NULL DEFAULT 0,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  note varchar(200),
  expires_at timestamptz,
  used_at timestamptz,
  used_order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS promo_codes_code_uniq ON promo_codes (upper(code));
CREATE INDEX IF NOT EXISTS promo_codes_user_idx ON promo_codes (user_id);
CREATE INDEX IF NOT EXISTS promo_codes_expires_idx ON promo_codes (expires_at);

ALTER TABLE orders ADD COLUMN IF NOT EXISTS promo_code_id uuid REFERENCES promo_codes(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS promo_code varchar(32);
