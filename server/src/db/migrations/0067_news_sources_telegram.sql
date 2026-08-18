-- Telegram-каналы как источники агента. RSS у них нет — читаем публичную
-- веб-версию t.me/s/<channel> (см. lib/news-agent/fetch.ts).
-- Поток hot: сводки ДТП живут сутки.

INSERT INTO "news_sources" ("name", "url", "lang", "stream", "weight") VALUES
  ('МотоМосква.ДТП',      'https://t.me/motomskdtp', 'ru', 'hot', 8),
  ('Мото Новости | Аварии','https://t.me/mymotonews','ru', 'hot', 6),
  ('PostMoto',            'https://t.me/postmoto',   'ru', 'hot', 4),
  ('Мото ДТП',            'https://t.me/moto_dtp',   'ru', 'hot', 4)
ON CONFLICT ("url") DO NOTHING;
