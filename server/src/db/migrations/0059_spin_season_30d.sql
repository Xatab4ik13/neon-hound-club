-- Сезоны HellSpin: скользящие окна по 30 дней от 11 августа 2026 (00:00 МСК),
-- а не календарный месяц. Переносим уже созданный августовский сезон.
UPDATE spin_seasons
SET period_key = '2026-08-11',
    starts_at = timestamptz '2026-08-11 00:00:00+03',
    ends_at = timestamptz '2026-09-10 00:00:00+03',
    days_total = 30
WHERE period_key = '2026-08';
