-- Капсула ×2: на 24 часа включает двойное начисление билетов за цифровые товары.
-- Активируется выпадением приза boost_x2 в HellSpin, расходуется одной цифровой
-- покупкой (или гаснет по истечении 24 часов).
ALTER TABLE users ADD COLUMN IF NOT EXISTS ticket_boost_until timestamptz;
