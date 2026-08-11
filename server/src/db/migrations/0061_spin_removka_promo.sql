-- Бэкфилл: тем, у кого в рулетке уже выпала ремувка, выдаём персональный
-- промокод на 100% скидку на товар «ремувка». Юзер оплачивает только доставку.
-- Идемпотентно: если у юзера уже есть неиспользованный промокод на этот товар — пропускаем.
DO $$
DECLARE
  removka_id uuid;
  w RECORD;
  new_code varchar(32);
BEGIN
  SELECT id INTO removka_id
  FROM products
  WHERE title ILIKE '%ремувк%' AND active = true
  ORDER BY created_at
  LIMIT 1;

  IF removka_id IS NULL THEN
    RAISE NOTICE 'removka product not found, skipping backfill';
    RETURN;
  END IF;

  FOR w IN
    SELECT DISTINCT sw.user_id, sw.id AS winner_id
    FROM spin_winners sw
    WHERE sw.prize_code = 'sticker'
      AND NOT EXISTS (
        SELECT 1 FROM promo_codes pc
        WHERE pc.user_id = sw.user_id
          AND pc.product_id = removka_id
          AND pc.used_at IS NULL
      )
  LOOP
    LOOP
      new_code := 'REM-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
      EXIT WHEN NOT EXISTS (SELECT 1 FROM promo_codes WHERE upper(code) = new_code);
    END LOOP;

    INSERT INTO promo_codes (code, discount_pct, user_id, product_id, note, expires_at)
    VALUES (new_code, 100, w.user_id, removka_id, 'HellSpin: ремувка (бэкфилл)', now() + interval '60 days');

    UPDATE spin_winners
    SET status = CASE WHEN status = 'pending' THEN 'contacted' ELSE status END,
        admin_note = COALESCE(admin_note, '') ||
          CASE WHEN COALESCE(admin_note, '') = '' THEN '' ELSE ' | ' END ||
          'Промокод ' || new_code || ' — 100% на ремувку, юзер оплачивает только доставку',
        updated_at = now()
    WHERE id = w.winner_id;
  END LOOP;
END $$;
