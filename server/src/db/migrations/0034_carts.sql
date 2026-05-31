-- Серверная корзина для залогиненных юзеров.
-- Unique (user_id, product_id, COALESCE(size, '')) — одна позиция в корзине = один товар+размер.
-- При логине фронт мержит локальную корзину сюда (POST /cart/merge), потом localStorage чистит.

CREATE TABLE IF NOT EXISTS "cart_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "product_id" uuid NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
  "size" varchar(24),
  "qty" integer NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "cart_items_user_idx" ON "cart_items" ("user_id");

-- Uniqueness учитывает NULL у size (одна запись «без размера» на товар).
CREATE UNIQUE INDEX IF NOT EXISTS "cart_items_user_product_size_uniq"
  ON "cart_items" ("user_id", "product_id", COALESCE("size", ''));
