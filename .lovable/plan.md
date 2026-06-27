## Куда сохранять

Да, на наш VPS — в MinIO, который уже стоит рядом с api. У нас уже есть готовый pipeline `POST /api/v1/uploads/direct` (server/src/routes/uploads.ts) с kind = `post` (до 10 МБ, jpg/png/webp). Ничего нового арендовать не нужно, без сторонних S3.

Использую тот же `kind: "post"` (это уже «медиа постов и комментариев») — не плодим новые правила, ключи лягут в `posts/<userId>/...`.

## Что меняем

### Бэк (`server/`)

1. **Миграция `0039_comments_image.sql`**
   - `ALTER TABLE post_comments ADD COLUMN image_url text;`
   - Расширить CHECK: `kind IN ('text','sticker','image')`. Снести старый констрейнт, поставить новый.
2. **`server/src/db/schema/posts.ts`** — добавить `imageUrl` и обновить тип kind.
3. **`server/src/routes/feed.ts`**
   - В POST `/posts/:id/comments` принять `imageUrl?: string` (zod url, наш `S3_PUBLIC_URL`-префикс — мягкая проверка). Если есть `imageUrl` и нет текста/стикера → `kind = 'image'`, `text = ''`. Текст разрешён вместе с картинкой (как подпись).
   - Выдавать `imageUrl` в обоих листингах комментариев и в `latestPreview` показывать «📷 Фото» вместо текста, если изображение без текста.
   - В DELETE коммента — удалить файл из MinIO через `deleteByPublicUrl`.

### Фронт

4. **`src/data/feed-store.ts`** — расширить `addComment` параметром `imageUrl`, прокинуть в POST. Расширить тип `Comment`.
5. **`src/routes/club.index.tsx` → `CommentComposer`**
   - Иконка скрепки/фото слева от ввода → системный `<input type="file" accept="image/*">`.
   - Аплоад через тот же `apiFetch("/api/v1/uploads/direct", FormData { file, kind: "post" })`, что используется для постов.
   - Показ превью с крестиком до отправки. Сабмит шлёт `imageUrl` (+ опциональный текст-подпись).
   - Лимит — 1 фото на коммент. Прогресс — спиннер на кнопке.
6. **Рендер коммента (`CommentItem`)** — если `kind === "image"` (или есть `imageUrl`), показываем картинку (используем существующий `LazyImage`), клик → существующий `ImageViewer` (zoom). Подпись текстом под ней, если есть.

## Что НЕ делаем (явные ограничения по твоему стилю)

- Без альбомов/нескольких фото за раз.
- Без перекодирования/ресайза на бэке — фронт уже сжимает посты, переиспользуем тот же подход (или просто грузим как есть в пределах 10 МБ).
- Без отдельного бакета и отдельного `kind` для комментариев.
- Стикер + фото одновременно — нельзя (один тип на коммент).

## Деплой

После правок в `server/` пришлю команду:
```
cd /opt/hhr && git pull && cd server && sudo docker compose up -d --build
```
