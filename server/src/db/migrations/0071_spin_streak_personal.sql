-- Календарь активности HellSpin больше не привязан к сезону: это личные 30 дней
-- с первого спина. Раньше на смене сезона (скользящее окно 30 дней от 11.08.2026)
-- прогресс обнулялся — юзер, начавший не в первый день сезона, не мог дойти до 30/30.
--
-- Схлопываем историю: у каждого юзера самая свежая строка получает суммарное
-- число дней и все уже забранные вехи, старые строки обнуляем, чтобы не
-- удваивать статистику в админке.

WITH agg AS (
  SELECT
    user_id,
    SUM(days_count)::int      AS total_days,
    MAX(claimed_10_at)        AS c10,
    MAX(claimed_20_at)        AS c20,
    MAX(claimed_30_at)        AS c30,
    MAX(last_spin_date)       AS lsd
  FROM spin_streaks
  GROUP BY user_id
  HAVING COUNT(*) > 1
),
newest AS (
  SELECT DISTINCT ON (user_id) id, user_id
  FROM spin_streaks
  ORDER BY user_id, updated_at DESC, days_count DESC
)
UPDATE spin_streaks s
SET days_count    = agg.total_days,
    claimed_10_at = agg.c10,
    claimed_20_at = agg.c20,
    claimed_30_at = agg.c30,
    last_spin_date = agg.lsd,
    updated_at    = now()
FROM agg, newest
WHERE newest.user_id = agg.user_id
  AND s.id = newest.id;

-- Старые (не самые свежие) строки больше не участвуют в подсчёте.
WITH newest AS (
  SELECT DISTINCT ON (user_id) id
  FROM spin_streaks
  ORDER BY user_id, updated_at DESC, days_count DESC
)
UPDATE spin_streaks
SET days_count = 0,
    claimed_10_at = NULL,
    claimed_20_at = NULL,
    claimed_30_at = NULL
WHERE id NOT IN (SELECT id FROM newest);
