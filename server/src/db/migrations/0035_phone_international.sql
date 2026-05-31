-- Поддержка международных телефонов.
-- Раньше hh_normalize_phone принимала только RU (11 цифр с 7/8).
-- Теперь принимаем любой валидный по длине E.164 номер (8..15 цифр).
-- Легаси: ведущая "8" в 11-значном номере → "7" (для совместимости с RU данными).

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
  -- Легаси: российская "восьмёрка"
  IF left(d, 1) = '8' AND length(d) = 11 THEN
    d := '7' || substring(d from 2);
  END IF;
  -- E.164: от 8 до 15 цифр
  IF length(d) < 8 OR length(d) > 15 THEN
    RETURN NULL;
  END IF;
  RETURN d;
END;
$$;

-- Пересчёт существующих значений (на случай, если раньше что-то отсеялось)
UPDATE "profiles"
   SET "phone_e164" = public.hh_normalize_phone("phone")
 WHERE "phone" IS NOT NULL
   AND ("phone_e164" IS NULL OR "phone_e164" <> public.hh_normalize_phone("phone"));
