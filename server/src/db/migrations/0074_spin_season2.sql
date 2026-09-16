-- HellSpin сезон 2: промокоды фиксированной суммой + личная скидка на Hell Pass.

ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS discount_amount_rub integer NOT NULL DEFAULT 0;
ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS min_order_rub integer NOT NULL DEFAULT 0;

ALTER TABLE users ADD COLUMN IF NOT EXISTS pass_discount_pct smallint NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS pass_discount_until timestamptz;
