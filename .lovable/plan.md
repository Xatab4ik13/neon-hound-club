## Что делаем

1. На бэке — типизация товаров и интеграция СДЭК API (расчёт тарифа, список ПВЗ, создание накладной).
2. В профиле — один дефолтный ПВЗ + ФИО/телефон, плюс «домашний адрес» для курьера. Подставляются в чекаут, можно менять.
3. Новый чекаут с калькулятором СДЭК и витриной с разными бейджами под тип товара.
4. Админка магазина: задаём вес/габариты, флаг `kind` (physical / preorder / virtual / digital), для preorder — дату отгрузки.

Делаем поэтапно, чтобы каждый кусок можно было проверить отдельно.

---

## Этап 1. Типизация товаров (бек + админка)

**Миграция `0035_products_kind_dimensions.sql`:**
- `products.kind` — enum `physical | preorder | virtual | digital`, default `physical`.
- `products.weight_g` int (граммы), `length_cm`, `width_cm`, `height_cm` int — обязательны только для `physical/preorder`.
- `products.preorder_ship_at` timestamptz nullable — для `preorder`, отображается на витрине как «Отгрузка с DD.MM».
- `products.digital_file_url` text nullable — для `digital`, выдаётся в письме после оплаты.

**Где меняется:**
- `server/src/db/schema/shop.ts` — поля.
- `server/src/routes/shop.ts` (`GET /shop/products`, `GET /shop/products/:slug`) — отдаём новые поля.
- `server/src/shop/admin.ts` (на хост-бэке `/opt/hhr/server`) — форма редактирования товара: селект `kind`, инпуты веса/габаритов, дата отгрузки, ссылка на файл. Невалидные комбинации (`physical` без веса) — 400.
- Витрина `src/routes/club.shop.index.tsx` + `src/routes/club.shop.$productSlug.tsx`:
  - бейдж «Предзаказ · с 15.08» (preorder), «Цифровой» (digital), «Доступ сразу» (virtual);
  - блок «Доставка» показывается только для physical/preorder.

## Этап 2. Профиль: дефолтный ПВЗ + адрес

Уже есть `delivery_addresses` (`server/src/db/migrations/0013_settings.sql`). Расширяем:

**Миграция `0036_delivery_address_pvz.sql`:**
- `delivery_addresses.cdek_pvz_code` varchar(32) — код ПВЗ СДЭК (`KRR123`).
- `delivery_addresses.cdek_pvz_address` text — человекочитаемый адрес.
- `delivery_addresses.cdek_city_code` int — код города в СДЭК (нужен для расчёта).
- `delivery_addresses.street_address` text — для курьера (улица, дом, квартира).
- `delivery_addresses.preferred_mode` varchar(8) default `pvz` — `pvz | courier`.

**Экран `/club/me` → «Адрес доставки»:**
- Селектор города (автокомплит через СДЭК `/location/cities`).
- Если режим `pvz`: модалка с картой/списком ПВЗ (СДЭК `/deliverypoints`), юзер тапает — сохраняем code + адрес.
- Если режим `courier`: поле улицы + квартира.
- Кнопка «Проверить адрес» с галкой, чтобы клиент явно подтвердил перед оплатой (как ты просил).
- `updated_at` показываем рядом: «Проверено 12.06.2026».

## Этап 3. СДЭК API на беке

Новый модуль `server/src/lib/cdek.ts`:
- OAuth (client_id/client_secret) с кешем токена в памяти на 50 мин.
- `getCities(query)` — поиск города (для автокомплита).
- `getPickupPoints(cityCode)` — список ПВЗ.
- `calculate({ fromCityCode: KRASNODAR, toCityCode, weightG, dimensions, tariffCode })` — стоимость и срок.
  - Тариф 136 (склад-ПВЗ) для `pvz`, тариф 137 (склад-дверь) для `courier`.
- `createOrder({...})` — создание накладной, возвращает `cdek_uuid` + трек.
- `getOrderStatus(uuid)` — статусы для трекинга.

Секреты на VPS (`.env` бека): `CDEK_CLIENT_ID`, `CDEK_CLIENT_SECRET`, `CDEK_FROM_CITY_CODE=4350` (Краснодар), `CDEK_FROM_PVZ_CODE` (если фиксируем конкретный ПВЗ отправки).

**Публичные ручки фронта:**
- `GET /api/v1/cdek/cities?q=крас` — для автокомплита в профиле/чекауте.
- `GET /api/v1/cdek/pvz?cityCode=4350` — список ПВЗ.
- `POST /api/v1/cdek/calculate` — `{ items: [{productId, qty}], cityCode, mode }` → `{ price, days }`. Считаем суммарный вес/габариты на беке, ничего весового на фронте не доверяем.

## Этап 4. Новый чекаут

`src/routes/club.checkout.tsx` переписываем под три сценария по составу корзины:

```text
корзина = только virtual/digital → форма «Получатель» (email уже из профиля), без СДЭК
корзина = только physical/preorder → СДЭК-блок обязателен
корзина = смешанная → две секции: «Доступ сразу» (virtual) + «Доставка» (physical/preorder)
```

**Поток для physical:**
1. Сверху — карточка с подставленным из профиля адресом + бейдж «Проверьте данные» (чекбокс должен быть отмечен, иначе кнопка «Оплатить» неактивна).
2. Тогглер `ПВЗ / Курьер` (если режимы разрешены).
3. Стоимость доставки появляется сразу под адресом — отдельной строкой в итоге. При смене города/режима — пересчёт через `POST /cdek/calculate`.
4. Для preorder — серая плашка «Отгрузка с 15.08, придёт ~20.08» (срок СДЭК + дата).
5. Поле «Комментарий курьеру» — опционально.

**Поток для virtual:**
- Никакого СДЭК. Только email подтверждения, итог = сумма товаров.

**В `orders`:**
- Уже есть `shipping jsonb` — туда снимок адреса на момент оплаты.
- Добавляем в миграции: `shipping_price_rub` int, `cdek_uuid` varchar(64), `cdek_tariff_code` int, `kind_summary` varchar(16) (`physical|virtual|mixed`), `ready_to_ship_at` timestamptz (для preorder).
- В `order_items` уже есть снимки названия/цены — добавим `kind_snapshot`.

## Этап 5. Постоплатные хуки

В webhook оплаты Т-Банка (`server/src/routes/payments.ts`):
- physical/preorder в наличии → `cdek.createOrder()` сразу, сохраняем uuid и трек в `orders`. Preorder — только меняем статус на `awaiting_shipment`, накладную создаст админ кнопкой когда партия готова.
- virtual → активация Hell Pass / зачисление билетов / выдача доступа к курсу — уже работает.
- digital → отправляем письмо со ссылкой на файл (`digital_file_url`).

## Этап 6. Витрина и фронт

- Карточки товара: бейджи по `kind`, для preorder — большая плашка с датой.
- Корзина `/club/cart`: группировка по `kind`, под группой physical — подсказка «Доставка считается на чекауте».
- Список заказов `/club/orders`: фильтр-табы `Все | Физические | Цифровые | Предзаказы`.
- Карточка заказа `/club/orders/$orderId`: для physical — трекинг СДЭК (заменяем мок `src/data/cdek-tracking.ts` на реальный `GET /api/v1/cdek/track/:orderId` → `cdek.getOrderStatus`).

---

## Технические заметки

- Все запросы к СДЭК — только с бека, фронт никогда не видит токен СДЭК.
- Кеш `calculate` в Redis/in-memory на 5 минут по ключу `{cityCode}:{mode}:{itemsHash}` чтобы не дёргать API при каждом ререндере чекаута.
- Для preorder — заказ создаётся со статусом `awaiting_production`, в админке кнопка «Готов к отгрузке» переводит в `awaiting_shipment` и шлёт push клиенту.
- Все денежные значения — копейки/рубли как сейчас (`price_rub int`).
- Калькулятор показывает «~3-5 дней» (диапазон СДЭК), не точную дату.

## Что нужно от тебя перед стартом

- Креды СДЭК API (client_id/client_secret боевой и тестовой среды) — закинешь через `add_secret`.
- Подтверждение, что склад отправки = Краснодар, и нужен ли конкретный ПВЗ отправителя или «любой по адресу X».
- Список 2-3 текущих товаров с реальным весом/габаритами, чтобы я заполнил их в миграции для теста.

---

## Порядок реализации (по комитам)

1. Миграции (`0035` + `0036`) + схемы Drizzle + админка товаров.
2. `lib/cdek.ts` + публичные ручки cities/pvz/calculate.
3. Профиль `/club/me` — новый блок «Адрес доставки» с выбором ПВЗ.
4. Чекаут переписан под типы товаров + СДЭК-калькулятор.
5. Webhook оплаты: создание накладной для physical, разделение veterual/digital.
6. Витрина: бейджи, фильтры заказов, реальный трекинг.

Каждый шаг можно проверить отдельно, прежде чем катить следующий.