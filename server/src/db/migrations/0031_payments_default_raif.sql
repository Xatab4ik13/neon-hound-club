-- Дефолт провайдера платежей: tbank → raif.
ALTER TABLE "payments" ALTER COLUMN "provider" SET DEFAULT 'raif';
