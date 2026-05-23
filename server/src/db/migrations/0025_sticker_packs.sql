-- Стикер-паки: владение на пользователя + связка с товаром магазина.
-- Покупка товара с непустым sticker_pack_slug разблокирует пак (см. markOrderPaid).

ALTER TABLE "products"
  ADD COLUMN IF NOT EXISTS "sticker_pack_slug" varchar(64);

CREATE INDEX IF NOT EXISTS "products_sticker_pack_slug_idx"
  ON "products" ("sticker_pack_slug");

CREATE TABLE IF NOT EXISTS "user_sticker_packs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "pack_slug" varchar(64) NOT NULL,
  "source" varchar(24) NOT NULL DEFAULT 'purchase',
  "ref_order_id" uuid REFERENCES "orders"("id") ON DELETE SET NULL,
  "acquired_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "user_sticker_packs_uniq"
  ON "user_sticker_packs" ("user_id", "pack_slug");
CREATE INDEX IF NOT EXISTS "user_sticker_packs_user_idx"
  ON "user_sticker_packs" ("user_id");

-- Категория "Цифровые товары" (idempotent по slug).
INSERT INTO "shop_categories" ("slug", "name", "sort")
VALUES ('digital', 'Цифровые товары', 100)
ON CONFLICT ("slug") DO NOTHING;

-- Сам товар Special pack (idempotent по slug).
INSERT INTO "products" (
  "slug", "title", "description",
  "price_rub", "bonus_tickets", "images", "stock", "active",
  "kind", "category_id", "sticker_pack_slug"
)
SELECT
  'stickerpack-special',
  'Стикерпак · Special',
  'Авторский стикерпак HELLHOUND. После оплаты автоматически открывается в комментариях клуба.',
  300, 1, '[]'::jsonb, NULL, true,
  'digital', c.id, 'special'
FROM "shop_categories" c
WHERE c.slug = 'digital'
ON CONFLICT ("slug") DO NOTHING;
