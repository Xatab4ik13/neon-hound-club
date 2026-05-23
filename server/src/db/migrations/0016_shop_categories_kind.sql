-- Магазин: категории/подкатегории, типы товара (physical|digital|preorder),
-- цифровой файл, дата ожидания предзаказа, ручная витрина (showcase).

CREATE TABLE IF NOT EXISTS "shop_categories" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "slug" varchar(64) NOT NULL UNIQUE,
  "name" varchar(120) NOT NULL,
  "sort" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "shop_subcategories" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "category_id" uuid NOT NULL REFERENCES "shop_categories"("id") ON DELETE CASCADE,
  "slug" varchar(64) NOT NULL,
  "name" varchar(120) NOT NULL,
  "sort" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "shop_subcategories_cat_idx" ON "shop_subcategories" ("category_id");
CREATE UNIQUE INDEX IF NOT EXISTS "shop_subcategories_cat_slug_uniq"
  ON "shop_subcategories" ("category_id", "slug");

ALTER TABLE "products"
  ADD COLUMN IF NOT EXISTS "kind" varchar(16) NOT NULL DEFAULT 'physical';
ALTER TABLE "products"
  ADD COLUMN IF NOT EXISTS "category_id" uuid
  REFERENCES "shop_categories"("id") ON DELETE SET NULL;
ALTER TABLE "products"
  ADD COLUMN IF NOT EXISTS "subcategory_id" uuid
  REFERENCES "shop_subcategories"("id") ON DELETE SET NULL;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "digital_file_url" text;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "digital_file_name" varchar(200);
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "preorder_expected_at" timestamptz;

CREATE INDEX IF NOT EXISTS "products_category_idx" ON "products" ("category_id");
CREATE INDEX IF NOT EXISTS "products_kind_idx" ON "products" ("kind");

CREATE TABLE IF NOT EXISTS "shop_showcase" (
  "product_id" uuid PRIMARY KEY REFERENCES "products"("id") ON DELETE CASCADE,
  "sort" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "shop_showcase_sort_idx" ON "shop_showcase" ("sort");
