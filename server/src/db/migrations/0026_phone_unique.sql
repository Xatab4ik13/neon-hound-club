-- Защита от мультиаккаунтов: телефон обязателен для участия в розыгрышах
-- и должен быть уникален в системе.
--
-- Храним телефон как есть (с маской "+7 (...) ...-..-.."), но валидацию уникальности
-- делаем по нормализованной форме (только цифры, ведущая 8 → 7).
-- Для этого: триггер нормализует и пишет копию в profiles.phone_e164.

ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "phone_e164" varchar(16);

-- Нормализация в формат "7XXXXXXXXXX"
CREATE OR REPLACE FUNCTION public.hh_normalize_phone(raw text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  d text;
BEGIN
  IF raw IS NULL THEN RETURN NULL; END IF;
  d := regexp_replace(raw, '\D', '', 'g');
  IF length(d) = 0 THEN RETURN NULL; END IF;
  IF left(d, 1) = '8' AND length(d) = 11 THEN
    d := '7' || substring(d from 2);
  END IF;
  IF length(d) <> 11 OR left(d, 1) <> '7' THEN
    RETURN NULL;
  END IF;
  RETURN d;
END;
$$;

-- Бэкфилл существующих значений
UPDATE "profiles" SET "phone_e164" = public.hh_normalize_phone("phone") WHERE "phone" IS NOT NULL;

-- Триггер: при вставке/обновлении phone сразу пишем phone_e164
CREATE OR REPLACE FUNCTION public.hh_profiles_phone_sync()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.phone_e164 := public.hh_normalize_phone(NEW.phone);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_phone_sync_trg ON "profiles";
CREATE TRIGGER profiles_phone_sync_trg
BEFORE INSERT OR UPDATE OF phone ON "profiles"
FOR EACH ROW EXECUTE FUNCTION public.hh_profiles_phone_sync();

-- Уникальность по нормализованному телефону (NULL'ы разрешены)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_phone_e164_uniq
  ON "profiles" ("phone_e164")
  WHERE "phone_e164" IS NOT NULL;
