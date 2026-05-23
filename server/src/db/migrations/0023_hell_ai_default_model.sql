-- Меняем дефолтную модель Hell AI на быструю не-reasoning.
-- gpt-5 — reasoning-модель: думает 10+ сек и часто возвращает пустой ответ,
-- т.к. весь бюджет токенов уходит на внутренний reasoning.
UPDATE "ai_settings" SET "model" = 'google/gemini-2.5-flash' WHERE "id" = 1 AND "model" = 'openai/gpt-5';
