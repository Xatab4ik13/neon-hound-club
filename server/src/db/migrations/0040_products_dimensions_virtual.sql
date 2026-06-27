-- Этап 1: типизация товаров под СДЭК + добавляем kind='virtual' (Hell Pass / билеты / курс Школы).
--
-- Старые kind: physical | digital | preorder. Добавляем 'virtual' (доступ сразу, без доставки и без файла).
-- Для physical/preorder теперь обязательны вес и габариты — нужны для расчёта тарифа СДЭК.
-- Поля nullable, чтобы не сломать старые строки; валидация обязательности — на уровне приложения (admin).

ALTER TABLE "products"
  ADD COLUMN IF NOT EXISTS "weight_g"  integer,
  ADD COLUMN IF NOT EXISTS "length_cm" integer,
  ADD COLUMN IF NOT EXISTS "width_cm"  integer,
  ADD COLUMN IF NOT EXISTS "height_cm" integer;
