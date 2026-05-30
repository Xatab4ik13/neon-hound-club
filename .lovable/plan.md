## Что делаем

На чекауте магазина и на покупке Hell Pass — две кнопки оплаты: **«Картой»** и **«СБП»**. Каждая создаёт платёж в Райфе через свою торговую точку (свой `publicId` + свой `secretKey`). Внешне для клиента — выбор способа прямо у нас, потом сразу на форму банка.

Если СБП-точка в `.env` не настроена — кнопка СБП просто скрывается, всё продолжает работать как раньше.

---

## Что нужно от тебя в `.env` на VPS (после деплоя)

```
RAIF_PUBLIC_ID_SBP=MB0002844756
RAIF_SECRET_KEY_SBP=<секретный ключ СБП-точки из ЛК Райфа>
```

Где взять ключ: ЛК Райфа → «Настройки» → выбрать точку `MB0002844756` → «Секретные ключи для интеграции» → «Добавить». Скопировать и вставить в `.env`. Webhook URL у СБП-точки указать тот же, что у карточной: `https://api.hhr.pro/api/v1/payments/raif/webhook`.

Имеющиеся `RAIF_PUBLIC_ID` / `RAIF_SECRET_KEY` (карточная точка) остаются как есть.

---

## UI

### Чекаут магазина (`/club/checkout`)

- **Desktop (aside справа):** две одинаковые по ширине кнопки в одну строку под итогом — «Оплатить картой» / «Оплатить через СБП».
- **Mobile sticky bar:** слева цена «К оплате», справа две кнопки рядом, равной ширины. Высота бара та же.
- Кнопка «Картой» — primary fill. Кнопка «СБП» — outline (border + текст в primary). Обе уважают `prefers-reduced-motion`.
- Disabled, пока форма не валидна / нет согласия / нет товаров с `productId`.
- Если СБП не сконфигурирован на бэке — рендерим только кнопку «Картой» (на всю ширину, как сейчас).

### Hell Pass (`/club/hell-pass/$tier`)

- В правом sticky-блоке вместо одной CTA — две кнопки оплаты в одну строку («Картой» / «СБП»), сохраняя текущий стиль карточки тира (gold-градиент для Gold, primary-glow для Platinum применяется к основной кнопке; СБП — outline-вариант).
- Логика выбора способа передаётся в `purchasePass`.

---

## Бэкенд

### Миграция `server/src/db/migrations/0032_payments_method.sql`
```sql
ALTER TABLE "payments"
  ADD COLUMN IF NOT EXISTS "method" varchar(8) NOT NULL DEFAULT 'card';
```
Существующие платежи остаются валидными (`method='card'`).

### `server/src/db/schema/payments.ts`
Добавить `method: varchar("method", { length: 8 }).notNull().default("card")` + тип `PaymentMethod = "card" | "sbp"`.

### `server/src/lib/raif.ts` (переписать конфигурацию)
- Завести внутреннюю мапу аккаунтов:
  ```ts
  type Account = { publicId: string; secretKey: string };
  const ACCOUNTS: Partial<Record<"card" | "sbp", Account>> = { … };
  ```
  Заполняется из env при загрузке модуля:
  - `card` ← `RAIF_PUBLIC_ID` + `RAIF_SECRET_KEY`
  - `sbp` ← `RAIF_PUBLIC_ID_SBP` + `RAIF_SECRET_KEY_SBP`
- `isRaifConfigured(method)` — есть ли аккаунт под этот метод.
- `getConfiguredMethods(): ("card"|"sbp")[]` — для публичного эндпоинта.
- `createOrder({ method, … })` — берёт нужный аккаунт, шлёт `paymentMethods: [method === "sbp" ? "SBP" : "ACQUIRING"]`, авторизуется секретом этого аккаунта.
- `verifyPaymentCallback(body, signature, secretKey)` — теперь принимает секрет параметром, а не читает глобальный.

### `server/src/lib/payments.ts`
- `createPaymentForPass(purchaseId, userId, method)` и `createPaymentForOrder(orderId, userId, method)`:
  - проверяют `isRaifConfigured(method)`;
  - `findActivePayment` фильтрует ещё и по `method` (карточный и СБП-платёж на тот же заказ не конфликтуют — это два разных мерчанта);
  - сохраняют `method` в строке `payments`;
  - вызывают `raif.createOrder({ method, … })`.
- `handleRaifNotification(body, signature)`:
  1. Парсим `data.order.id` → находим `payment` по `providerPaymentId`.
  2. По `payment.method` берём секрет соответствующего аккаунта.
  3. Этим секретом проверяем подпись. Если не сошлась — 400.
  4. Дальше — как было: сверка суммы → активация pass/order.

### `server/src/routes/payments.ts`
- В body `/pass/:id/init` и `/order/:id/init` принимаем `{ method?: "card" | "sbp" }` (Zod, default `"card"`).
- Возвращаем 400, если метод не сконфигурирован.
- Новый `GET /api/v1/payments/methods` (без auth, дешёвый): `{ card: bool, sbp: bool }` — фронт по нему решает, показывать ли кнопку СБП.

### `server/src/routes/pass.ts`
- `POST /pass/purchase` принимает `{ tier, method? }`, передаёт `method` в `createPaymentForPass`.

### `server/src/app.ts` / `server/src/index.ts`
Если требуется регистрация нового публичного `/methods` — проверим, что paymentsRoutes уже без auth для GET (внутри обработчика без `requireAuth`). Никаких новых пакетов.

---

## Фронт

### `src/lib/queries.ts`
- `initOrderPayment(orderId, method: "card" | "sbp" = "card")` — теперь шлёт body `{ method }`.
- `initPassPayment(purchaseId, method = "card")` — то же.
- `purchasePass(tier, method = "card")` — добавляет `method` в body.
- Новый `fetchPaymentMethods(): Promise<{ card: boolean; sbp: boolean }>` → `/api/v1/payments/methods`.
- React Query key: `qk.paymentMethods`.

### `src/hooks/use-payment-methods.ts` (новый, маленький)
Хук `usePaymentMethods()` оборачивает `useQuery(qk.paymentMethods, …, { staleTime: 5 * 60_000 })`. Возвращает `{ card, sbp, isLoading }`, дефолт `{ card: true, sbp: false }`.

### `src/routes/club.checkout.tsx`
- Mutation принимает `method` параметром.
- Заменяем единственный `<button type="submit">` на компонент `PayButtons` — две кнопки (или одна, если sbp недоступен). Раскладка:
  - **Desktop aside**: `flex gap-2` с `flex-1` на каждой кнопке.
  - **Mobile sticky bar**: цена слева (как сейчас), справа `flex-1 flex gap-2` — две кнопки делят пространство поровну.
- Каждая кнопка вызывает `submit(method)` — общий обработчик, который дергает `mutate({ …, method })`.

### `src/routes/club.hell-pass.$tier.tsx`
- Mutation: `purchasePass(tier.slug, method)`. Внутри кнопок — два варианта вызова.
- В sticky-карточке тира: основная кнопка «Картой» сохраняет существующий стиль (gold-градиент / primary-glow). Под ней — кнопка «СБП» в стиле `border border-white/15 bg-transparent` с тем же `tier.color` для акцента. Если sbp недоступен — рендерим только верхнюю кнопку (без изменений к существующему виду).

---

## Что НЕ трогаем
- `/pay/success`, поллинг статуса, webhook-URL, схему `orders`/`pass_purchases`.
- Старые платежи (`method` дефолтится в `'card'`).
- Никаких новых сервисов, пакетов, миграций кроме одной выше.

---

## После мержа (твои шаги)
1. В ЛК Райфа создать секретный ключ для точки `MB0002844756`.
2. На VPS добавить в `.env`:
   ```
   RAIF_PUBLIC_ID_SBP=MB0002844756
   RAIF_SECRET_KEY_SBP=…
   ```
3. У СБП-точки в ЛК Райфа указать webhook URL `https://api.hhr.pro/api/v1/payments/raif/webhook`.
4. `git pull && docker compose up -d --build`.
5. Тестовая покупка → проверить, что «Картой» уходит на форму карточной точки, «СБП» — на форму со сканированием QR.
