-- AI-агент новостной ленты: источники, кандидаты, варианты текста, состояние агента.

-- ─── Источники (RSS) ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "news_sources" (
  "id" serial PRIMARY KEY,
  "name" varchar(120) NOT NULL,
  "url" text NOT NULL UNIQUE,
  "site_url" text,
  -- Язык оригинала: ru | en | ja | zh | de | it | es
  "lang" varchar(8) NOT NULL DEFAULT 'en',
  -- hot   — тянем каждые 15 минут (релизы, MotoGP, крупные новостники)
  -- normal— каждые 2 часа (остальное)
  "stream" varchar(10) NOT NULL DEFAULT 'normal',
  -- Вес доверия: прибавка к score при отборе (0..20)
  "weight" integer NOT NULL DEFAULT 0,
  "active" boolean NOT NULL DEFAULT true,
  "last_fetched_at" timestamptz,
  "last_error" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "news_sources_stream_idx" ON "news_sources" ("active", "stream");

-- ─── Кандидаты (найденные новости) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS "news_candidates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "source_id" integer REFERENCES "news_sources"("id") ON DELETE SET NULL,
  "source_name" varchar(120) NOT NULL DEFAULT '',
  "url" text NOT NULL UNIQUE,
  -- нормализованный хеш заголовка — второй уровень дедупа (одна новость на 5 сайтах)
  "title_hash" varchar(64) NOT NULL DEFAULT '',
  "lang" varchar(8) NOT NULL DEFAULT 'en',
  "src_title" text NOT NULL DEFAULT '',
  "src_text" text NOT NULL DEFAULT '',
  "src_image" text,
  "src_published_at" timestamptz,
  "score" integer NOT NULL DEFAULT 0,
  "is_hot" boolean NOT NULL DEFAULT false,
  "topic" varchar(40) NOT NULL DEFAULT '',
  -- new | drafted | rejected | used | failed
  "status" varchar(16) NOT NULL DEFAULT 'new',
  "reject_reason" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "drafted_at" timestamptz
);
CREATE INDEX IF NOT EXISTS "news_cand_status_idx" ON "news_candidates" ("status", "is_hot", "score");
CREATE INDEX IF NOT EXISTS "news_cand_hash_idx" ON "news_candidates" ("title_hash");
CREATE INDEX IF NOT EXISTS "news_cand_created_idx" ON "news_candidates" ("created_at");

-- ─── Варианты текста (2 на кандидата) ──────────────────────────────
CREATE TABLE IF NOT EXISTS "news_variants" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "candidate_id" uuid NOT NULL REFERENCES "news_candidates"("id") ON DELETE CASCADE,
  "idx" integer NOT NULL DEFAULT 0,
  "tone" varchar(20) NOT NULL DEFAULT 'plain',
  "title" text NOT NULL DEFAULT '',
  "text" text NOT NULL DEFAULT '',
  "category" varchar(60) NOT NULL DEFAULT '',
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "news_variants_cand_idx" ON "news_variants" ("candidate_id", "idx");

-- ─── Состояние агента (singleton) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS "news_agent_state" (
  "id" integer PRIMARY KEY DEFAULT 1 CHECK ("id" = 1),
  "enabled" boolean NOT NULL DEFAULT true,
  "paused" boolean NOT NULL DEFAULT false,
  "paused_reason" text,
  -- single-flight lease: пока lease_until в будущем, второй прогон не стартует
  "lease_until" timestamptz,
  "last_hot_run_at" timestamptz,
  "last_normal_run_at" timestamptz,
  "prompt" text NOT NULL DEFAULT '',
  "filter_model" varchar(80) NOT NULL DEFAULT 'google/gemini-2.5-flash-lite',
  "writer_model" varchar(80) NOT NULL DEFAULT 'google/gemini-2.5-pro',
  "min_score" integer NOT NULL DEFAULT 62,
  -- сколько черновиков максимум готовим за один прогон
  "hot_draft_cap" integer NOT NULL DEFAULT 3,
  "normal_draft_cap" integer NOT NULL DEFAULT 6,
  -- интервал между постами из очереди, минут
  "queue_gap_min" integer NOT NULL DEFAULT 100,
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

INSERT INTO "news_agent_state" ("id", "prompt") VALUES (1, '') ON CONFLICT ("id") DO NOTHING;

-- ─── Лог прогонов ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "news_agent_runs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "stream" varchar(10) NOT NULL,
  "started_at" timestamptz NOT NULL DEFAULT now(),
  "finished_at" timestamptz,
  "fetched" integer NOT NULL DEFAULT 0,
  "new_candidates" integer NOT NULL DEFAULT 0,
  "drafted" integer NOT NULL DEFAULT 0,
  "errors" integer NOT NULL DEFAULT 0,
  "note" text
);
CREATE INDEX IF NOT EXISTS "news_runs_idx" ON "news_agent_runs" ("started_at");

-- ─── Привязка постов к источнику + очередь публикации ──────────────
ALTER TABLE "news_posts" ADD COLUMN IF NOT EXISTS "source_url" text;
ALTER TABLE "news_posts" ADD COLUMN IF NOT EXISTS "source_name" varchar(120);
ALTER TABLE "news_posts" ADD COLUMN IF NOT EXISTS "candidate_id" uuid;
-- queued = ждёт автопубликации в момент published_at
ALTER TABLE "news_posts" ADD COLUMN IF NOT EXISTS "queued" boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS "news_posts_queue_idx" ON "news_posts" ("queued", "published_at");

-- ─── Сид источников (все ленты проверены на живость) ───────────────
INSERT INTO "news_sources" ("name", "url", "lang", "stream", "weight") VALUES
  -- HOT: релизы, гонки, быстрые новостники
  ('RideApart',            'https://www.rideapart.com/rss/news/all/',        'en', 'hot', 10),
  ('Visordown',            'https://www.visordown.com/rss',                  'en', 'hot', 8),
  ('Crash.net MotoGP',     'https://www.crash.net/rss/motogp',               'en', 'hot', 10),
  ('Crash.net WorldSBK',   'https://www.crash.net/rss/wsbk',                 'en', 'hot', 8),
  ('Motorsport.com MotoGP','https://www.motorsport.com/rss/motogp/news/',    'en', 'hot', 8),
  ('Asphalt & Rubber',     'https://www.asphaltandrubber.com/feed/',         'en', 'hot', 8),
  ('Young Machine',        'https://young-machine.com/rss',                  'ja', 'hot', 10),
  ('Motorcycle Daily',     'https://www.motorcycledaily.com/feed/',          'en', 'hot', 8),
  ('Roadracing World',     'https://www.roadracingworld.com/feed/',          'en', 'hot', 6),
  ('1000PS',               'https://www.1000ps.de/rss',                      'de', 'hot', 6),
  ('Moto.it',              'https://www.moto.it/rss/news.xml',               'it', 'hot', 6),

  -- NORMAL: кастомы, техника, культура, регионы
  ('BikeEXIF',             'https://www.bikeexif.com/feed',                  'en', 'normal', 10),
  ('Return of the Cafe Racers','https://www.returnofthecaferacers.com/feed/','en', 'normal', 8),
  ('Pipeburn',             'https://www.pipeburn.com/feed',                  'en', 'normal', 6),
  ('Silodrome',            'https://silodrome.com/feed/',                    'en', 'normal', 6),
  ('ADV Pulse',            'https://www.advpulse.com/feed/',                 'en', 'normal', 6),
  ('Webbikeworld',         'https://www.webbikeworld.com/feed/',             'en', 'normal', 4),
  ('Ultimate Motorcycling','https://ultimatemotorcycling.com/feed/',         'en', 'normal', 4),
  ('Webike Japan',         'https://news.webike.net/feed/',                  'ja', 'normal', 6),
  ('Bikebros Japan',       'https://news.bikebros.co.jp/feed',               'ja', 'normal', 6),
  ('MCNews Australia',     'https://www.mcnews.com.au/feed/',                'en', 'normal', 4),
  ('Rider Magazine',       'https://ridermagazine.com/feed/',                'en', 'normal', 4),
  ('Adventure Bike Rider', 'https://www.adventurebikerider.com/feed/',       'en', 'normal', 4),
  ('Kolesa Moto',          'https://www.kolesa.ru/rss',                      'ru', 'normal', 2)
ON CONFLICT ("url") DO NOTHING;
