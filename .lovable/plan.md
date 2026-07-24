## Что делаем

Убираем моки Школы, VIP-чата, отмены Hell Pass и переводим всё на настоящий бэк в `server/`. Recurring через Райф (rebill). Пуши — расширяем существующий web-push (VAPID) на новые события. Никаких звонков.

## Что удаляем из фронта

- `src/data/instructor-chats-mock.ts` — переписка инструктор↔ученик
- `src/data/admin-school.ts` — экономика/выплаты
- `src/data/instructor-accounts.ts`, `src/data/instructors.ts` (mock-инструкторы)
- `src/data/pass-cancel-state.ts` — состояние отмены подписки в localStorage
- `localStorage`-стор `pass-state.ts` в местах, где он про подписку (билеты остаются на беке)

Всё это заменяем вызовами `apiFetch(...)` через `src/lib/api.ts`.

## Бэк: новые модули

### 1. Школа

Схемы (`server/src/db/schema/school.ts`):

- `school_instructors` — id (=userId, FK на users), bio, price_from_rub, city, is_active, gallery jsonb, created_at
- `school_chats` — id, instructor_id, student_id, last_message_at, last_message_preview, instructor_unread, student_unread; unique (instructor_id, student_id)
- `school_messages` — id, chat_id, sender_id, sender_role ('instructor'|'student'), text, image_url, read_at, created_at
- `school_orders` — id, chat_id, instructor_id, student_id, **instructor_amount_rub** (то, что видит инструктор), **student_amount_rub** (= instructor_amount × 1.20, что платит ученик), **commission_rub** (= student − instructor), status ('draft'|'awaiting_payment'|'paid'|'cancelled'|'refunded'), payment_id (FK payments), title, description, created_at, paid_at
- `school_payouts` — id, instructor_id, period_start, period_end, gross_rub (сумма instructor_amount за период), tax_rub, net_rub, status ('pending'|'paid'), paid_at, note

Роуты:

- `/api/v1/school/instructors` GET — список активных инструкторов
- `/api/v1/school/instructors/:id` GET — карточка
- `/api/v1/school/chats` GET — свои чаты (для роли инструктора — все входящие; для студента — все его)
- `/api/v1/school/chats/:id/messages` GET/POST — история и отправка (text, image_url)
- `/api/v1/school/chats/:id/read` POST — сброс unread
- `/api/v1/school/orders` POST — инструктор выставляет счёт на **свою** сумму (`instructor_amount_rub`); бек считает `student_amount_rub = round(inst * 1.2)`, `commission_rub = student − inst`
- `/api/v1/school/orders/:id/pay` POST — ученик уходит в Райф (обычная разовая оплата, платит `student_amount_rub`)
- `/api/v1/school/orders/:id` GET — **инструктору отдаём только `instructor_amount_rub`, `status`, `paid_at`; поля student_amount и commission НЕ включаем в ответ роли instructor**. Админ и ученик видят полные суммы

Админка (`/api/v1/admin/school/…`):

- список инструкторов, статистика (GMV, комиссия, выплачено)
- пересчёт выплат за неделю → создаёт `school_payouts` со статусом `pending`
- пометка `paid` вручную после банковского перевода
- отчёт «выручка / комиссия 20% минус налог / чистая прибыль»

Отдельная таблица `admin_school_settings` (одна строка): `commission_pct` (по умолчанию 20), `tax_pct` (напр. 6 для УСН). Все расчёты — от них.

### 2. VIP-чат

Уже есть схема и роут (`vip_chat_threads`, `vip_chat_messages`) — не трогаем структуру. Что доделываем:

- добавить upload картинки в существующее поле `image_url` (используем существующий `/uploads/direct`, тот же путь что и в комментариях)
- отправка пуша `pushToUsers([otherPartyId], ...)` из handler'а `POST /messages`
- фронт `club.vip-chat.tsx` перевожу с mock на реальный API (список тредов у Хелла — уже готов, у юзера — открываем «свой» тред)

### 3. Hell Pass — recurring через Райф

Расширяем схему `pass_purchases` миграцией:

- `is_recurring` boolean default true
- `parent_order_id` text — Райф-orderId первого платежа (нужен для rebill)
- `next_charge_at` timestamptz — когда следующее списание
- `cancelled_at` timestamptz null — если юзер отменил (доступ до `expires_at`, дальше не продлеваем)
- добавляем статус `'cancelling'` (активен, но next charge не будет)

Логика:

- Первый платёж: `createOrder(..., saveCard=true)` в Райф → юзер платит на форме → вебхук приходит → активируем пасс, сохраняем `parent_order_id`, ставим `next_charge_at = expires_at − 1 day`
- Cron `server/src/jobs/pass-rebill.ts` каждый час: берёт пассы где `next_charge_at <= now()` и `status='active'` и `cancelled_at IS NULL`; вызывает Райф `rebill(parent_order_id, amount)`; при успехе создаёт новый `pass_purchases` со статусом `active`, продлевает `expires_at += 30d`; при ошибке — 3 ретрая с backoff, потом переводит в `expired` и шлёт пуш «не смогли продлить»
- Отмена: `POST /api/v1/pass/cancel` → `cancelled_at=now()`, доступ до `expires_at` сохраняется
- Возобновление до истечения: `POST /api/v1/pass/resume` → сбрасывает `cancelled_at`

В `server/src/lib/raif.ts` добавляем метод `rebill(parentOrderId, newOrderId, amount, comment)` — POST `/api/v1/orders/{parentId}/rebill`. Требует включённой у Райфа услуги «Автоплатежи» — юзер подтвердит перед мержем.

**Правило «скидка не распространяется на Hell Pass и на Школу с Hell Pass»**: в расчёте цены в `POST /pass/checkout` и `POST /school/orders/:id/pay` игнорируем любые promo/скидочные модификаторы. Промокоды применимы только к магазину физмерча. Явный тест в коде + комментарий.

### 4. Пуши — новые события

Всё через существующий `pushToUsers`. Добавляем вызовы:


| Событие                                              | Кому            | Заголовок                          |
| ---------------------------------------------------- | --------------- | ---------------------------------- |
| Новое сообщение в чате Школы                         | второй участник | `{Имя отправителя}` / текст-превью |
| Инструктор выставил счёт                             | ученик          | `Счёт на {amount}₽`                |
| Оплата счёта прошла                                  | инструктор      | `Ученик оплатил урок`              |
| Новое сообщение в VIP-чате от Хелла                  | ученик          | `HELL`                             |
| Новое сообщение в VIP-чате от подписчика             | Хелл            | `{ник}`                            |
| Hell Pass продлён автоматически                      | владелец        | `Hell Pass продлён`                |
| Rebill упал                                          | владелец        | `Не смогли продлить Hell Pass`     |
| Пасс истечёт через 3 дня (не-recurring / cancelling) | владелец        | `Осталось 3 дня`                   |


Дедуп по `tag`: `school-chat-{chatId}`, `pass-rebill-ok-{purchaseId}` и т.д. — второй пуш с тем же тегом заменит первый в трее.

Cron `pass-expiry-warn.ts` раз в сутки: шлёт пуш за 3 дня.

Фронт SW (`public/sw.js` / firebase-messaging — что уже есть) не трогаем, формат payload прежний (`{title, body, url, tag}`).

### 5. Медиа

Фото в чатах — тот же путь, что и в комментариях: `POST /uploads/direct` → MinIO → возвращает public URL → фронт кладёт в `image_url` сообщения. Лимит 5 МБ, только image/*.

## Фронт

Заменяем импорты моков на TanStack Query-хуки в `src/lib/school-queries.ts` (новый файл) и `src/lib/vip-chat-queries.ts` (обновить). Compos и роуты не переписываем — только источник данных.

Экраны, которые ходят на новые эндпоинты:

- `club.school.index.tsx` — GET `/school/instructors`
- `club.school.$instructorId.tsx` — POST `/school/chats` (создать/получить)
- `club.school-chats.index.tsx` + `club.school-chats.$studentId.tsx` — реальные чаты
- `admin.school.tsx` — реальная экономика, кнопки «пересчитать выплаты» и «отметить оплаченным»
- `club.hell-pass.$tier.tsx` — `/pass/cancel` и `/pass/resume` вместо localStorage
- `club.vip-chat.tsx` — уже почти реальный, добавить upload картинки

## Порядок мержа

1. Миграции (`school_*`, расширение `pass_purchases`, +таблица `school_payouts`, `admin_school_settings`) + GRANTы — одной миграцией
2. Бек-роуты Школы + VIP-чат upload + пуш-хуки — деплой на VPS
3. Фронт: удаление моков, подключение real API
4. Cron pass-rebill + pass-expiry-warn — включить последним, когда Райф-rebill проверен вручную на одной подписке

## Что нужно от тебя перед мержем

1. Подтверди, что услуга «Автоплатежи» у Райфа подключена в договоре (без неё rebill не поедет). Если ещё нет — оставим первый платёж как есть, а cron включим когда включат.
2. Ставки: комиссия 20% от суммы которую вводит учетель. Прибовляем 20%
  &nbsp;