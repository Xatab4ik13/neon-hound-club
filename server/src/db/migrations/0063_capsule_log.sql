-- Лог капсул ×2: кто выбил, до когда действует, потратил ли и на какой заказ.
-- Нужен для админки: фильтр «Активированные» показывает реально израсходованные капсулы.

CREATE TABLE IF NOT EXISTS ticket_boosts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source varchar(16) NOT NULL DEFAULT 'spin',
  granted_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  used_order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  bonus_tickets integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS ticket_boosts_user_idx ON ticket_boosts (user_id, granted_at);
CREATE INDEX IF NOT EXISTS ticket_boosts_used_idx ON ticket_boosts (used_at);
