## Что делаем

В iOS-PWA внутри «Настройки» сейчас 4 строки: Профиль и байк / Доставка / Уведомления / Аккаунт. Внешний список выглядит ок, но внутренние подэкраны частично мок (`ME` из `src/data/profile.ts`, хардкод email, тогглы без сохранения, кнопки без эффекта). Делаем каждый подэкран как нормальную iOS-страницу и подключаем к бекенду на `api.hhr.pro`.

## 1. Профиль и байк

**Что показываем (в `IOSListSection`):**
- Аватар (тап → загрузка через `uploadFileToS3('avatar')` → `PATCH /profile/me { avatarUrl }`)
- Ник (read-only с подписью «менять нельзя» — ник смены в бекенде сейчас нет, не выдумываем)
- Город, Bio, Telegram, Instagram, YouTube — `PATCH /profile/me`
- Телефон — `PATCH /profile/me`
- Блок «Основной байк» — берём primary из `useBikes()`. Кнопка «Изменить» открывает существующий `BikeFormModal`. Кнопка «Все байки» → `/club/garage`.

**Источник:** `useMyProfile()` + `useUpdateMyProfile()` + `useBikes()` (всё уже есть).
Сохранение — debounce on blur + явная кнопка «Сохранить» с toast (sonner).

## 2. Доставка (СДЭК)

Сейчас в бекенде нет. Добавляем:

- Таблица `delivery_addresses` (1:1 к юзеру): `fullName`, `phone`, `city`, `postalCode`, `pickupPoint`, `comment`.
- `GET /api/v1/profile/me/address` и `PUT /api/v1/profile/me/address` (Zod-валидация, RLS не нужна — Fastify+JWT cookie).
- Хук `useMyAddress` / `useSaveMyAddress` в `src/lib/garage-api.ts`.
- Подэкран: те же поля что сейчас в моке, но привязанные к стейту + кнопка «Сохранить адрес» → мутация.

## 3. Уведомления

В бекенде нет. Добавляем:

- Таблица `notification_prefs` (1:1 к юзеру): jsonb-флаги `{ emailRaffles, emailOrders, emailNews, pushRaffles, pushOrders, pushNews }`.
- `GET /api/v1/profile/me/notifications` и `PUT /api/v1/profile/me/notifications`.
- Хуки + подэкран на `IOSToggleRow` (уже есть). Тоггл сохраняется сразу (optimistic).
- Push-секцию помечаем «работает в установленной PWA» — без реальной web-push инфры пока (это отдельный большой проект, не в этой задаче).

## 4. Аккаунт

- **Email** — показываем read-only из `me.email` (смена email требует verify-flow, в бекенде нет — не выдумываем, помечаем «обратиться в поддержку»).
- **Пароль** — добавляем `POST /api/v1/auth/change-password { current, next }` (есть `verifyPassword` + `hashPassword`). Подэкран с тремя полями и тостом.
- **Выйти** — уже работает (`POST /auth/logout` + redirect).
- **Удалить аккаунт** — добавляем `DELETE /api/v1/auth/me` (cascade по `users.id`). На клиенте — confirm-модал с вводом ника для подтверждения, потом мутация + logout.

## 5. Iframe / iOS-стиль

Все 4 подэкрана живут внутри того же `SettingsMobile` `IOSSheet` (drill-in, как сейчас), но содержимое полностью переписываем на `IOSListSection` + `IOSListRow` + `IOSField` чтобы выглядело как нативные настройки iOS: серые подложки полей, разделители hairline, описания снизу секций, без рамок и хардкорных бордеров.

## Технические детали

**Файлы бекенда (новые / правки):**
```text
server/src/db/schema/profile.ts        +deliveryAddresses, notificationPrefs
server/src/routes/profile.ts           +GET/PUT /me/address, /me/notifications
server/src/routes/auth.ts              +POST /auth/change-password, DELETE /auth/me
server/drizzle/<timestamp>_settings.sql  миграция (после `pnpm db:generate`)
```

**Файлы фронта:**
```text
src/lib/garage-api.ts                  +useMyAddress, useSaveMyAddress, useMyNotifications, useSaveMyNotifications, useChangePassword, useDeleteAccount
src/components/club/SettingsModal.tsx  переписать 4 *Tab компонента на live-данные
src/data/profile.ts                    оставить только типы; убрать мок ME
```

**Миграция БД** запускается юзером на VPS как обычно:
```bash
cd /opt/hhr/server && git pull && docker compose up -d --build api
```
Drizzle применит миграцию при старте контейнера (entrypoint уже делает `pnpm db:migrate`, проверю).

## Что НЕ делаем в этой итерации

- Реальные Web Push (нужна инфра + VAPID + SW pусk-handler).
- Смену email (нужен verify-flow на новый email).
- Смену ника (нужна проверка занятости + история ников).
- Интеграцию с СДЭК-API (адрес сейчас просто хранится).

Если что-то из этого нужно — добиваем отдельной задачей после.
