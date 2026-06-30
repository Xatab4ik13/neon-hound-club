-- Hell AI: связь сообщения с конкретным Pass-ом (NULL = бесплатный режим).
-- Используется для нового счётчика «вопросов за последние 24 часа»:
--   free (без pass)         — 3 / 24h, считаются строки WHERE pass_id IS NULL
--   silver/gold/platinum    — 15/40/150 / 24h, считаются WHERE pass_id = <active pass id>

ALTER TABLE ai_messages
  ADD COLUMN IF NOT EXISTS pass_id uuid
  REFERENCES pass_purchases(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS ai_msg_free_idx
  ON ai_messages (user_id, created_at)
  WHERE pass_id IS NULL;

CREATE INDEX IF NOT EXISTS ai_msg_pass_idx
  ON ai_messages (pass_id, created_at);

-- Backfill: проставляем pass_id существующим сообщениям, отправленным
-- в окно действия какого-либо пасса юзера. Чтобы они НЕ засчитались
-- в новую free-квоту 3/24h.
UPDATE ai_messages m SET pass_id = p.id
FROM pass_purchases p
WHERE m.pass_id IS NULL
  AND m.user_id = p.user_id
  AND p.paid_at IS NOT NULL
  AND p.expires_at IS NOT NULL
  AND m.created_at >= p.paid_at
  AND m.created_at <  p.expires_at;
