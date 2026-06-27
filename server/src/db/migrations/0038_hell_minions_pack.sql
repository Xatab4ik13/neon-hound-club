-- Стикерпак Hell Minions — платный, 300₽. Открывается после оплаты заказа
-- с товаром, у которого sticker_pack_slug='hell-minions' (см. markOrderPaid).

INSERT INTO "products" (
  "slug", "title", "description",
  "price_rub", "bonus_tickets", "images", "stock", "active",
  "kind", "category_id", "sticker_pack_slug"
)
SELECT
  'stickerpack-hell-minions',
  'Стикерпак · Hell Minions',
  'Анимированные стикеры Hell Minions для комментариев в клубе. После оплаты автоматически открывается.',
  300, 1, '[]'::jsonb, NULL, true,
  'digital', c.id, 'hell-minions'
FROM "shop_categories" c
WHERE c.slug = 'digital'
ON CONFLICT ("slug") DO NOTHING;
