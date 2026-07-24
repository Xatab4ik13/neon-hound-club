-- Расширяем профиль инструктора школы:
--   profile   — JSONB со всеми «богатыми» полями (specialties, bioParagraphs,
--               skills[], courses[], upcomingCourses[], approach[], location{}, gallery[]).
--   tone      — цветовая тема карточки в клубе.
--   experience — стаж (лет).
--   tagline   — короткий подзаголовок.
-- Все поля с дефолтами → на существующих записях изменений нет.

ALTER TABLE "school_instructors"
  ADD COLUMN IF NOT EXISTS "profile" jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE "school_instructors"
  ADD COLUMN IF NOT EXISTS "tone" varchar(16) NOT NULL DEFAULT 'primary';

ALTER TABLE "school_instructors"
  ADD COLUMN IF NOT EXISTS "experience" integer NOT NULL DEFAULT 0;

ALTER TABLE "school_instructors"
  ADD COLUMN IF NOT EXISTS "tagline" varchar(300) NOT NULL DEFAULT '';
