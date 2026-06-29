-- Подтверждение номера через Telegram Gateway.
--
-- profiles.phone_verified_at — момент успешной верификации (NULL = не подтверждён).
-- phone_verifications        — журнал отправленных кодов (request_id от Telegram).
-- phone_send_log             — счётчик отправок для rate-limit (по номеру и по IP).
--
-- Существующие phone / phone_e164 остаются как есть, но раз они выставлялись
-- без проверки (ручной ввод), флаг phone_verified_at пуст для всех старых юзеров.
-- Допуск в розыгрыш теперь проверяется по phone_verified_at, не по phone_e164.

ALTER TABLE "profiles"
  ADD COLUMN IF NOT EXISTS "phone_verified_at" timestamptz;

CREATE TABLE IF NOT EXISTS "phone_verifications" (
  "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"     uuid REFERENCES "users"("id") ON DELETE CASCADE,
  "phone_e164"  varchar(16) NOT NULL,
  "purpose"     text NOT NULL,           -- 'verify' | 'recovery'
  "request_id"  text NOT NULL,           -- от Telegram Gateway
  "sent_at"     timestamptz NOT NULL DEFAULT now(),
  "expires_at"  timestamptz NOT NULL,
  "consumed_at" timestamptz,
  "attempts"    integer NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS "pv_user_idx"    ON "phone_verifications" ("user_id");
CREATE INDEX IF NOT EXISTS "pv_phone_idx"   ON "phone_verifications" ("phone_e164");
CREATE INDEX IF NOT EXISTS "pv_request_idx" ON "phone_verifications" ("request_id");

CREATE TABLE IF NOT EXISTS "phone_send_log" (
  "id"         bigserial PRIMARY KEY,
  "phone_e164" varchar(16) NOT NULL,
  "ip"         inet,
  "purpose"    text NOT NULL,
  "sent_at"    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "psl_phone_idx" ON "phone_send_log" ("phone_e164", "sent_at" DESC);
CREATE INDEX IF NOT EXISTS "psl_ip_idx"    ON "phone_send_log" ("ip", "sent_at" DESC);
