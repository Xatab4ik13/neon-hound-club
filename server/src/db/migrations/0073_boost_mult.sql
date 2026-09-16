-- Капсула с настраиваемым множителем: ×2 из спина, ×3 из календаря активности.
ALTER TABLE users ADD COLUMN IF NOT EXISTS ticket_boost_mult smallint NOT NULL DEFAULT 2;
ALTER TABLE ticket_boosts ADD COLUMN IF NOT EXISTS mult smallint NOT NULL DEFAULT 2;
