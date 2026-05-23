-- Экономика клуба + глобальные настройки.

-- Категории операций (расходы и доходы). Системные нельзя удалить.
CREATE TABLE IF NOT EXISTS "economy_categories" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" varchar(80) NOT NULL UNIQUE,
  "kind" varchar(16) NOT NULL DEFAULT 'expense', -- 'income' | 'expense'
  "is_system" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

-- Партнёры (доли прибыли в процентах).
CREATE TABLE IF NOT EXISTS "economy_partners" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" varchar(120) NOT NULL,
  "share" integer NOT NULL DEFAULT 0,
  "sort" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

-- Операции (доход/расход). Авто-операции имеют ref_type/ref_id (order/pass),
-- ручные — source='manual'. Авто не удаляются вручную.
CREATE TABLE IF NOT EXISTS "economy_operations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "occurred_at" timestamptz NOT NULL DEFAULT now(),
  "type" varchar(16) NOT NULL,                  -- 'income' | 'expense'
  "category" varchar(80) NOT NULL,
  "amount_rub" integer NOT NULL,                -- всегда положительное
  "note" text NOT NULL DEFAULT '',
  "source" varchar(16) NOT NULL DEFAULT 'manual', -- 'manual' | 'auto'
  "ref_type" varchar(32),                       -- 'order' | 'pass_purchase'
  "ref_id" uuid,
  "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "eo_occurred_idx" ON "economy_operations" ("occurred_at" DESC);
CREATE INDEX IF NOT EXISTS "eo_type_idx" ON "economy_operations" ("type");
CREATE UNIQUE INDEX IF NOT EXISTS "eo_ref_uniq" ON "economy_operations" ("ref_type", "ref_id") WHERE "ref_type" IS NOT NULL;

-- KV для глобальных настроек системы.
CREATE TABLE IF NOT EXISTS "system_settings" (
  "key" varchar(64) PRIMARY KEY,
  "value" jsonb NOT NULL,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "updated_by" uuid REFERENCES "users"("id") ON DELETE SET NULL
);

-- Сиды.
INSERT INTO "economy_categories" ("name", "kind", "is_system") VALUES
  ('Магазин',       'income',  true),
  ('Hell Pass',     'income',  true),
  ('Себестоимость', 'expense', false),
  ('Призы',         'expense', false),
  ('Налоги',        'expense', false),
  ('Реклама',       'expense', false),
  ('Эквайринг',     'expense', false),
  ('Продакшн',      'expense', false),
  ('Прочее',        'expense', false)
ON CONFLICT ("name") DO NOTHING;

INSERT INTO "system_settings" ("key", "value") VALUES
  ('maintenance',  '{"enabled": false, "message": ""}'::jsonb),
  ('club',         '{"name": "HELLHOUND Racing", "contact_email": "", "support_url": ""}'::jsonb),
  ('hell_ai',      '{"limit_silver": 20, "limit_gold": 100, "limit_platinum": -1}'::jsonb),
  ('admin_alerts', '{"new_orders": true, "new_users": false}'::jsonb)
ON CONFLICT ("key") DO NOTHING;
