-- Сезон 2 продлён до 6 января 2027 (00:00 МСК); сезон 3 (2026-10-31) сливается в сезон 2.
UPDATE spin_seasons SET ends_at = '2027-01-06 00:00:00+03', active = true
WHERE period_key = '2026-09-16';
--> statement-breakpoint
-- Дни календаря из сезона 3 добавляются к сезону 2 (дни не пересекаются: сезон 3 начался 25.11).
INSERT INTO spin_streaks (user_id, season_id, days_count, last_spin_date, updated_at)
SELECT t3.user_id, s2.id, LEAST(40, t3.days_count), t3.last_spin_date, now()
FROM spin_streaks t3
JOIN spin_seasons s3 ON s3.id = t3.season_id AND s3.period_key = '2026-10-31'
CROSS JOIN (SELECT id FROM spin_seasons WHERE period_key = '2026-09-16') s2
WHERE t3.days_count > 0
ON CONFLICT (user_id, season_id) DO UPDATE SET
  days_count = LEAST(40, spin_streaks.days_count + EXCLUDED.days_count),
  last_spin_date = GREATEST(spin_streaks.last_spin_date, EXCLUDED.last_spin_date),
  updated_at = now();
--> statement-breakpoint
-- Выданные в сезоне 3 лимитные призы учитываются в лимитах сезона 2.
UPDATE spin_prizes p2 SET issued = p2.issued + p3.issued
FROM spin_prizes p3
JOIN spin_seasons s3 ON s3.id = p3.season_id AND s3.period_key = '2026-10-31',
     spin_seasons s2
WHERE s2.period_key = '2026-09-16' AND p2.season_id = s2.id AND p2.code = p3.code AND p3.issued > 0;
--> statement-breakpoint
UPDATE spin_streaks SET days_count = 0
WHERE season_id IN (SELECT id FROM spin_seasons WHERE period_key = '2026-10-31');
--> statement-breakpoint
UPDATE spin_seasons SET active = false WHERE period_key = '2026-10-31';
