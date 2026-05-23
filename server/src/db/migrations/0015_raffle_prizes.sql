-- Многопризовая модель розыгрышей.
-- Старое поле raffles.prize оставляем для совместимости (можно потом удалить).
-- Каждый приз — отдельная строка с qty. Победители фиксируются в raffle_prize_winners
-- (одна строка на один разыгранный слот). entry_id уникален в рамках раффла:
-- одна заявка-билет может выиграть только один раз.

CREATE TABLE IF NOT EXISTS "raffle_prizes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "raffle_id" uuid NOT NULL REFERENCES "raffles"("id") ON DELETE CASCADE,
  "name" varchar(200) NOT NULL,
  "qty" integer NOT NULL DEFAULT 1,
  "position" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "raffle_prizes_raffle_idx" ON "raffle_prizes" ("raffle_id");

CREATE TABLE IF NOT EXISTS "raffle_prize_winners" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "raffle_id" uuid NOT NULL REFERENCES "raffles"("id") ON DELETE CASCADE,
  "prize_id" uuid NOT NULL REFERENCES "raffle_prizes"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "entry_id" uuid NOT NULL REFERENCES "raffle_entries"("id") ON DELETE CASCADE,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "raffle_prize_winners_entry_unique"
  ON "raffle_prize_winners" ("entry_id");
CREATE INDEX IF NOT EXISTS "raffle_prize_winners_raffle_idx"
  ON "raffle_prize_winners" ("raffle_id");
CREATE INDEX IF NOT EXISTS "raffle_prize_winners_prize_idx"
  ON "raffle_prize_winners" ("prize_id");
