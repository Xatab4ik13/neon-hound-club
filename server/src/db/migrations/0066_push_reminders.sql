-- Лог отправленных напоминаний-пушей. Нужен, чтобы не долбить юзера
-- одним и тем же напоминанием (пасс истекает, капсула истекает, спины).
CREATE TABLE IF NOT EXISTS push_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind varchar(32) NOT NULL,
  ref_key varchar(120) NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS push_reminders_uniq ON push_reminders (user_id, kind, ref_key);
