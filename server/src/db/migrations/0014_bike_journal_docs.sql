-- Журнал обслуживания + поездки + документы для мото.
-- Привязка по bike_id (каскадно к bikes), плюс user_id для быстрых выборок и RLS-логики на уровне приложения.

CREATE TABLE IF NOT EXISTS "bike_service_entries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "bike_id" uuid NOT NULL REFERENCES "bikes"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "type" varchar(20) NOT NULL,
  "date" date NOT NULL,
  "mileage" integer NOT NULL DEFAULT 0,
  "note" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "bike_service_user_idx" ON "bike_service_entries"("user_id");
CREATE INDEX IF NOT EXISTS "bike_service_bike_idx" ON "bike_service_entries"("bike_id");

CREATE TABLE IF NOT EXISTS "bike_rides" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "bike_id" uuid NOT NULL REFERENCES "bikes"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "date" date NOT NULL,
  "km" integer NOT NULL DEFAULT 0,
  "note" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "bike_rides_user_idx" ON "bike_rides"("user_id");
CREATE INDEX IF NOT EXISTS "bike_rides_bike_idx" ON "bike_rides"("bike_id");

CREATE TABLE IF NOT EXISTS "bike_documents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "bike_id" uuid NOT NULL REFERENCES "bikes"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "type" varchar(20) NOT NULL,
  "number" varchar(80),
  "issue_date" date,
  "expiry_date" date,
  "photos" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "note" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "bike_documents_user_idx" ON "bike_documents"("user_id");
CREATE INDEX IF NOT EXISTS "bike_documents_bike_idx" ON "bike_documents"("bike_id");
