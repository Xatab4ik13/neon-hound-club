-- Блокировка юзеров (для admin.users)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "blocked" boolean NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "blocked_at" timestamp with time zone;
