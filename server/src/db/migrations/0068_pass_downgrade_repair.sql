-- ПОЧИНКА ДАУНГРЕЙДА HELL PASS.
--
-- Баг: HellSpin / календарь активности выдавали Hell Pass Silver и при этом
-- помечали текущий активный пасс юзера как 'superseded'. У владельцев GOLD и
-- PLATINUM тир схлопывался до SILVER (срок при этом продлевался).
--
-- Что делаем: для каждого юзера возвращаем в 'active' самый высокий тир,
-- который был замещён пассом НИЖЕ по тиру, и отдаём ему максимальный
-- expires_at из его собственного и из замещающего (чтобы не потерять
-- оплаченные 60/90 дней). Замещающий silver уходит в 'superseded'.

WITH ranked AS (
  SELECT
    id,
    user_id,
    tier,
    status,
    expires_at,
    CASE tier WHEN 'platinum' THEN 3 WHEN 'gold' THEN 2 ELSE 1 END AS rank
  FROM pass_purchases
  WHERE status IN ('active', 'superseded')
),
-- максимальный expires_at среди активных/замещённых пассов юзера
horizon AS (
  SELECT user_id, MAX(expires_at) AS max_expires
  FROM ranked
  GROUP BY user_id
),
-- топовый тир юзера среди ещё не истёкших пассов
best AS (
  SELECT DISTINCT ON (r.user_id)
    r.id,
    r.user_id,
    r.rank,
    h.max_expires
  FROM ranked r
  JOIN horizon h ON h.user_id = r.user_id
  WHERE h.max_expires > now()
  ORDER BY r.user_id, r.rank DESC, r.expires_at DESC NULLS LAST
),
-- восстанавливаем только тех, у кого сейчас активен тир НИЖЕ их лучшего
victims AS (
  SELECT b.id, b.user_id, b.max_expires
  FROM best b
  WHERE EXISTS (
    SELECT 1 FROM ranked cur
    WHERE cur.user_id = b.user_id
      AND cur.status = 'active'
      AND cur.expires_at > now()
      AND cur.rank < b.rank
  )
)
UPDATE pass_purchases p
SET status = 'active', expires_at = v.max_expires
FROM victims v
WHERE p.id = v.id;

-- Пассы ниже тиром, которые остались активными рядом с восстановленным
-- топовым, помечаем как замещённые — тир юзера считается по топовому.
WITH ranked AS (
  SELECT
    id,
    user_id,
    expires_at,
    CASE tier WHEN 'platinum' THEN 3 WHEN 'gold' THEN 2 ELSE 1 END AS rank
  FROM pass_purchases
  WHERE status = 'active' AND expires_at > now()
),
top AS (
  SELECT user_id, MAX(rank) AS top_rank FROM ranked GROUP BY user_id
)
UPDATE pass_purchases p
SET status = 'superseded'
FROM ranked r
JOIN top t ON t.user_id = r.user_id
WHERE p.id = r.id AND r.rank < t.top_rank;
