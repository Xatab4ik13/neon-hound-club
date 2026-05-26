-- Перевод products.sizes из string[] в Array<{ label: string, stock: number | null }>.
-- stock=null означает «без учёта остатков по этому размеру» (продаётся без лимита).
-- Существующие записи мигрируем: каждый старый размер становится { label, stock: null }.
-- Также добавляем size_snapshot в order_items для атомарности снимка размера на момент заказа.

UPDATE products
SET sizes = COALESCE(
  (SELECT jsonb_agg(jsonb_build_object('label', s, 'stock', NULL))
   FROM jsonb_array_elements_text(sizes) s),
  '[]'::jsonb
)
WHERE jsonb_typeof(sizes) = 'array'
  AND jsonb_array_length(sizes) > 0
  AND jsonb_typeof(sizes->0) = 'string';

ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS size_snapshot varchar(24);
