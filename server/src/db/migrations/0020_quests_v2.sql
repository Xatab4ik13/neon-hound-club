-- Квесты v2: разделение XP/билеты, типы one_time/monthly/ladder/manual,
-- лестница Hell AI, blogger-only, единые поля action/bonus для UI.
--
-- 1) Расширяем таблицу quests новыми полями.
-- 2) Создаём quest_progress для счётчиков (комментарии, км, ai-вопросы) с period_key.
-- 3) Чистим старый сид (verify_email/first_pass/first_order/first_bike/profile_complete) —
--    он заменяется новой сеткой через seedQuests() на старте.

ALTER TABLE "quests" ADD COLUMN IF NOT EXISTS "xp_reward" integer NOT NULL DEFAULT 0;
ALTER TABLE "quests" ADD COLUMN IF NOT EXISTS "blogger_only" boolean NOT NULL DEFAULT false;
ALTER TABLE "quests" ADD COLUMN IF NOT EXISTS "goal" integer NOT NULL DEFAULT 1;
ALTER TABLE "quests" ADD COLUMN IF NOT EXISTS "unit" varchar(32) NOT NULL DEFAULT '';
ALTER TABLE "quests" ADD COLUMN IF NOT EXISTS "action_label" varchar(64);
ALTER TABLE "quests" ADD COLUMN IF NOT EXISTS "action_to" varchar(128);
ALTER TABLE "quests" ADD COLUMN IF NOT EXISTS "bonus_note" varchar(160);
ALTER TABLE "quests" ADD COLUMN IF NOT EXISTS "ladder" jsonb;
ALTER TABLE "quests" ADD COLUMN IF NOT EXISTS "category" varchar(32) NOT NULL DEFAULT 'onboarding';

-- kind теперь допускает: 'one_time' | 'monthly' | 'ladder' | 'manual'
-- Старые записи (kind='auto') удалим вместе с completions, чтобы seed заново
-- наполнил каталог новой сеткой.
TRUNCATE TABLE "user_quest_completions" CASCADE;
DELETE FROM "quests";

-- Прогресс по квестам со счётчиком (monthly / ladder).
-- period_key = 'YYYY-MM' для monthly, 'all' для ladder/one_time.
CREATE TABLE IF NOT EXISTS "quest_progress" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "quest_id" uuid NOT NULL REFERENCES "quests"("id") ON DELETE CASCADE,
  "period_key" varchar(16) NOT NULL DEFAULT 'all',
  "progress" integer NOT NULL DEFAULT 0,
  "last_ladder_step" integer NOT NULL DEFAULT 0,
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "quest_progress_uniq"
  ON "quest_progress" ("user_id", "quest_id", "period_key");
CREATE INDEX IF NOT EXISTS "quest_progress_user_idx"
  ON "quest_progress" ("user_id");

-- period_key добавляем и в completions, чтобы для monthly можно было
-- зачитывать «ещё раз в следующем месяце».
ALTER TABLE "user_quest_completions" ADD COLUMN IF NOT EXISTS "period_key" varchar(16) NOT NULL DEFAULT 'all';
ALTER TABLE "user_quest_completions" ADD COLUMN IF NOT EXISTS "xp_awarded" integer NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX IF NOT EXISTS "uqc_user_quest_period_uniq"
  ON "user_quest_completions" ("user_id", "quest_id", "period_key");
