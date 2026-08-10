-- Посуточная активность юзеров: сколько реально провели на сайте.
-- Пишется из heartbeat'а сессии (hydrateFreshSession, не чаще раза в 30 сек).
CREATE TABLE IF NOT EXISTS user_activity_days (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day date NOT NULL,
  active_seconds integer NOT NULL DEFAULT 0,
  sessions integer NOT NULL DEFAULT 0,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, day)
);

CREATE INDEX IF NOT EXISTS user_activity_days_day_idx ON user_activity_days (day);
CREATE INDEX IF NOT EXISTS users_last_seen_at_idx ON users (last_seen_at);
