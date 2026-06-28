-- Авто-налог УСН 7% (настраиваемая ставка)
-- 1) дефолтная настройка
INSERT INTO system_settings (key, value)
VALUES ('tax', '{"rate_percent": 7}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 2) системная категория для налога
INSERT INTO economy_categories (name, kind, is_system)
VALUES ('Налог УСН', 'expense', true)
ON CONFLICT (name) DO NOTHING;

-- 3) backfill авто-операций по всем уже подтверждённым платежам.
--    Сумма налога = round(amount_rub * rate / 100). Идемпотентно по eo_ref_uniq.
INSERT INTO economy_operations
  (occurred_at, type, category, amount_rub, note, source, ref_type, ref_id)
SELECT
  p.updated_at,
  'expense',
  'Налог УСН',
  GREATEST(1, ROUND(p.amount_rub * COALESCE((s.value->>'rate_percent')::numeric, 7) / 100))::int,
  'Автоналог (backfill) с платежа ' || substr(p.id::text, 1, 8),
  'auto',
  'tax',
  p.id
FROM payments p
LEFT JOIN system_settings s ON s.key = 'tax'
WHERE p.status = 'confirmed'
ON CONFLICT (ref_type, ref_id) WHERE ref_type IS NOT NULL DO NOTHING;
