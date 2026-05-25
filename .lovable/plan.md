
# План: подключение Т-Банк Интернет-эквайринг

Подключаем **Tinkoff Acquiring API** (Init → платёжная страница → Notification webhook) к существующему бэку `server/` на VPS. Сначала DEMO-терминал, потом одной переменной переключим на боевой. Чек по 54-ФЗ пока не формируем — добавим, когда подключишь онлайн-кассу Атол (заложу место в коде, чтобы потом дописать в одну функцию).

## Что уже готово в коде (не трогаем)

- `POST /api/v1/pass/purchase` → создаёт `passPurchases` со статусом `pending_payment`, сейчас возвращает `paymentUrl: null`
- `POST /api/v1/orders` → создаёт `orders` со статусом `pending_payment`, резервирует остатки
- `activatePassPurchase(purchaseId)` и `markOrderPaid(orderId)` — идемпотентные функции активации. Их и будем дёргать из вебхука.

## Что добавляем

### 1. Конфиг и секреты (на VPS)

Новые переменные в `server/.env` (и `.env.example`):
```
TBANK_TERMINAL_KEY=...           # DEMO-терминал
TBANK_PASSWORD=...               # пароль терминала
TBANK_API_URL=https://securepay.tinkoff.ru/v2   # одинаков для demo и prod
TBANK_SUCCESS_URL=https://hhr.pro/pay/success
TBANK_FAIL_URL=https://hhr.pro/pay/fail
TBANK_NOTIFICATION_URL=https://api.hhr.pro/api/v1/payments/tbank/webhook
```
Боевой переезд = просто меняешь `TBANK_TERMINAL_KEY` + `TBANK_PASSWORD` и `docker compose up -d --build api`. Кода не трогаем.

### 2. Клиент Т-Банка `server/src/lib/tbank.ts`

- `initPayment({ orderId, amountRub, description, customerEmail })` — POST `/Init`, считает Token (SHA-256 от отсортированных пар + Password), возвращает `PaymentURL` и `PaymentId`.
- `getState(paymentId)` — POST `/GetState` для сверки на сервере (защита от подделки вебхука).
- `verifyNotification(body)` — пересчитывает Token из тела вебхука, сравнивает с присланным; возвращает true/false. Это и есть подпись Т-Банка.

### 3. Таблица платежей (миграция `0027_payments.sql`)

```
payments (
  id uuid pk,
  provider varchar(16),         -- 'tbank'
  provider_payment_id varchar,  -- PaymentId из Т-Банка, unique
  ref_type varchar(16),         -- 'pass' | 'order'
  ref_id uuid,                  -- passPurchase.id / order.id
  user_id uuid,
  amount_rub integer,
  status varchar(24),           -- 'new' | 'authorized' | 'confirmed' | 'rejected' | 'refunded'
  raw_init jsonb, raw_last_notification jsonb,
  created_at, updated_at
)
+ unique(ref_type, ref_id) WHERE status NOT IN ('rejected')
```
Зачем: дедуп вебхуков, история, ручная сверка через админку.

### 4. Роуты `server/src/routes/payments.ts`

- `POST /api/v1/payments/pass/:purchaseId/init` (auth) — проверяет, что purchase принадлежит юзеру и `pending_payment`, дёргает `initPayment`, сохраняет `payments` row, возвращает `{ paymentUrl }`.
- `POST /api/v1/payments/order/:orderId/init` (auth) — то же для заказа мерча.
- `POST /api/v1/payments/tbank/webhook` (public, без auth) — принимает Notification от Т-Банка:
  1. `verifyNotification` → если false: 403.
  2. Находит `payments` row по `provider_payment_id`.
  3. Для подстраховки дёргает `getState` и сверяет статус (защита от спуфинга подписи при утечке пароля).
  4. Если `Status=CONFIRMED` → `activatePassPurchase` или `markOrderPaid`. Эти функции уже идемпотентны.
  5. Отвечает `OK` (Т-Банк требует именно тело `OK`).
- `GET /api/v1/payments/:id/status` (auth) — для фронта, чтобы поллить статус после редиректа на success-страницу.

И обновляем уже существующие `pass/purchase`, чтобы они сразу возвращали `paymentUrl` (вызывают init внутри, как в TODO).

### 5. Фронт (минимум)

- В `club.hell-pass.$tier.tsx` и `club.checkout.tsx`: при успешном создании purchase/order — `window.location.href = paymentUrl`.
- Новые роуты:
  - `pay.success.tsx` — поллит `GET /payments/:id/status` секунд 15, показывает «оплачено» или «ждём подтверждения банка» и ссылку в личный кабинет.
  - `pay.fail.tsx` — простой экран «не получилось, попробовать снова».

### 6. Тесты на DEMO

После деплоя `docker compose up -d --build api` пройдём вручную:
1. Купить Silver на тестовой карте `4300 0000 0000 0777` (3-DS код `12345678`) → редирект → success → Pass активен.
2. Тест отказа (`4000 0000 0000 0002`) → fail → пасс остаётся `pending_payment`.
3. Тест заказа мерча → статус `paid`, билеты начислены, остатки списаны.
4. Дубликат вебхука Т-Банка → данные не двоятся (idempotent).

## Технические детали

- Подпись Token: конкатенируем все top-level пары `{...body, Password}` (без вложенных Receipt/DATA), сортируем по ключу, склеиваем только **значения**, SHA-256, hex. Это формат Т-Банка.
- Сумма передаётся в копейках (`amountRub * 100`).
- В `Init` обязательно: `TerminalKey`, `Amount`, `OrderId` (наш `payments.id`), `Description`, `NotificationURL`, `SuccessURL`, `FailURL`, `DATA: { userId }`. `Receipt` пока **не передаём** — оставим закомментированный билдер для будущей кассы Атол.
- Webhook должен отвечать строго `OK` текстом, иначе Т-Банк ретраит.
- На фронте `pay.success` поллим именно наш `/payments/:id/status` (источник правды — наш `markOrderPaid`/`activatePassPurchase`), а не доверяем query-параметрам из редиректа.

## Что НЕ делаем сейчас (по твоему ответу)

- 54-ФЗ чек (Атол) — закладываем место в `initPayment`, реальный билдер чека добавим, когда дашь доступ к Атолу.
- Возвраты через API Т-Банка — пока ручные через ЛК Т-Банка; в БД `payments` поле под это уже будет.
- СБП/Т-Касса — не подключаем, договорились на интернет-эквайринг.

## Деплой

Один коммит, затем твоей рукой:
```
cd /opt/hhr/server && git pull && docker compose up -d --build api
```
Перед этим добавишь `TBANK_TERMINAL_KEY` и `TBANK_PASSWORD` (DEMO) в `.env` на VPS.

Скажи «ок» — переключаемся в build и я делаю.
