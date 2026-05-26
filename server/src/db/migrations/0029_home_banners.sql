-- Баннеры карусели на главной ленте клуба (/club).
-- Управляет админ. На фронте — компонент FeedHeroCarousel.
-- Картинка — фон 16:10, текст рисуется поверх. Если active=false — не показываем.

CREATE TABLE IF NOT EXISTS "home_banners" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "title" varchar(120) NOT NULL,
  "eyebrow" varchar(120) NOT NULL DEFAULT '',
  "cta_label" varchar(40) NOT NULL DEFAULT 'Открыть',
  "cta_href" varchar(300) NOT NULL,
  "image_url" text NOT NULL DEFAULT '',
  "sort" integer NOT NULL DEFAULT 0,
  "active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "home_banners_active_sort_idx"
  ON "home_banners" ("active", "sort");
