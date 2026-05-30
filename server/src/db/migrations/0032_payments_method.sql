-- Метод оплаты: 'card' | 'sbp'. Райф у нас оформлен двумя торговыми точками
-- (своя пара publicId/secretKey под карты и под СБП). По этому полю выбираем
-- нужный аккаунт при создании платежа и при проверке подписи вебхука.
ALTER TABLE "payments"
  ADD COLUMN IF NOT EXISTS "method" varchar(8) NOT NULL DEFAULT 'card';
