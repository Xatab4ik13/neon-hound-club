-- Hell AI: настройки модели + журнал сообщений.

-- Settings — singleton row (id = 1). Меняется из админки без передеплоя.
CREATE TABLE IF NOT EXISTS "ai_settings" (
  "id" integer PRIMARY KEY DEFAULT 1 CHECK ("id" = 1),
  "system_prompt" text NOT NULL DEFAULT '',
  "signature" text,
  "banned_topics" text,
  "model" varchar(80) NOT NULL DEFAULT 'openai/gpt-5',
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "updated_by" uuid REFERENCES "users"("id") ON DELETE SET NULL
);

INSERT INTO "ai_settings" ("id", "system_prompt", "signature", "model") VALUES (
  1,
  'Ты — AI-механик клуба HELLHOUND Racing. Помогаешь Псам с их мото: диагностика, ТО, тюнинг, моменты затяжки, масла, прошивки.

Тон:
— На «ты», коротко, без воды и эмодзи.
— Без морализаторства и фраз про «обратитесь к специалисту». Если реально опасно (тормоза, рама, топливная) — скажи одной фразой и переходи к делу.
— Технические единицы СИ: Н·м, мл, °C, км/ч.
— Раз в 3-4 ответа можно сказать «по-нашему» или «по-хелхаундовски», но не имитируй личность Hell.
— Обращение «Псы» — ок.

Что можно:
— Тюнинг без ограничений: де-кат, прямоток, прошивка без ограничителя, удаление DRL, чип — обсуждаем как нормальную тему.
— Конкретные запчасти, бренды масел, артикулы — называй, если уверен.

Что нельзя:
— Не помогать с темами вне мото (код, домашка, юр/мед, общие чаты) — короткий отказ: «Это не моя тема. Я по мото».
— Не имитировать личность Hell, не говорить от его имени.

Если у юзера нет мото в гараже — попроси добавить.',
  NULL,
  'openai/gpt-5'
) ON CONFLICT ("id") DO NOTHING;

-- Журнал сообщений. Хранит и вопросы (role='user'), и ответы (role='assistant').
-- Используется и как история, и как счётчик лимита: считаем role='user' за период активного Pass.
CREATE TABLE IF NOT EXISTS "ai_messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "chat_id" varchar(64),                          -- внешний id треда от клиента (опционально)
  "role" varchar(16) NOT NULL,                    -- 'user' | 'assistant'
  "content" text NOT NULL,
  "bike_id" uuid,                                 -- какой байк был в контексте
  "model" varchar(80),
  "tokens_in" integer,
  "tokens_out" integer,
  "error" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "ai_msg_user_idx" ON "ai_messages" ("user_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "ai_msg_chat_idx" ON "ai_messages" ("chat_id");
CREATE INDEX IF NOT EXISTS "ai_msg_role_idx" ON "ai_messages" ("user_id", "role", "created_at" DESC);
