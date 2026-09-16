-- Hell Pass на год: период доступа у покупки.
-- 'monthly' — 30 дней (как было), 'annual' — 365 дней.
ALTER TABLE pass_purchases
  ADD COLUMN IF NOT EXISTS period varchar(16) NOT NULL DEFAULT 'monthly';

CREATE INDEX IF NOT EXISTS pass_period_idx ON pass_purchases (period);
