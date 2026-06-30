-- Трекинг "онлайн" в админке. Поле обновляется в hydrateFreshSession
-- (т.е. при любом запросе с валидной cookie), но не чаще раза в 30 сек.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;

CREATE INDEX IF NOT EXISTS users_last_seen_at_idx ON users (last_seen_at);
