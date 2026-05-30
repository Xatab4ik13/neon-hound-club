# Полный анализ и решение оплаты

## Почему сейчас не работает (корень проблемы)

Сейчас flow такой: **тап → fetch создаёт заказ/покупку → возвращается `paymentUrl` → рисуется кнопка `<a href={paymentUrl}>` → второй тап → переход на Райф**.

Проблемы, которые этот подход НЕ решает:

1. **iOS PWA (standalone)** — тап по `<a href>` на cross-origin URL без `target` ведёт себя непредсказуемо: на iOS 17+ часто открывает в системном Safari, на iOS 16 может молча проигнорировать (особенно если в scope manifest'а только свой домен). Это и есть «нажимаю — ничего не происходит».
2. **Android Chrome PWA** — `<a href>` на cross-origin открывается в Custom Tab, и форма Райфа внутри CCT часто виснет (cookies, 3DS-редиректы, SameSite=Strict у банка).
3. **Сам JS-редирект после `await`** — мобильные браузеры считают это «не пользовательским действием» и режут popup/navigation. Поэтому fallback на `window.location.href` тоже не спасал.

То, как делают **все нормальные интернет-магазины** (Wildberries, Ozon, Lamoda, любой Тильда-сайт): **submit обычной HTML-формы POST на свой бекенд, который отвечает 303 Redirect на банк**. Браузер воспринимает это как **родную top-level навигацию по пользовательскому клику** — никакие блокировки popup, PWA-scope, cross-origin рестрикции на это не действуют. Работает везде одинаково: Safari, Chrome, любой PWA, десктоп.

У нас уже **есть** такой endpoint — `POST /api/v1/payments/redirect`. Но он требует уже созданный `purchase`/`order` (refId), поэтому сейчас не используется — фронт сначала делает fetch, теряет gesture, и весь смысл пропадает.

## Решение

Сделать **один синхронный submit формы** с тапа — без `await` перед ним. Бекенд делает всё сам: создаёт purchase/order, создаёт платёж в Райфе, отдаёт 303 на форму банка.

### Изменения на бекенде (`server/src/routes/payments.ts`)

Расширить `POST /api/v1/payments/redirect`, чтобы он принимал **два режима**:

**Режим A — Hell Pass** (`target=pass`):
```
tier: "silver" | "gold" | "platinum"
method: "card" | "sbp"
```
Внутри: создать `passPurchase` (через существующий `createPassPurchase`) → `createPaymentForPass(purchase.id, ...)` → `reply.redirect(payformUrl, 303)`.

**Режим B — Корзина** (`target=order`):
```
items: JSON-строка [{productId, qty}]
shipping_fio, shipping_phone, shipping_city, shipping_address
method: "card" | "sbp"
```
Внутри: `createOrder(...)` → `createPaymentForOrder(order.id, ...)` → `reply.redirect(payformUrl, 303)`.

При ошибке — 303-редирект обратно на `/club/hell-pass` или `/club/checkout` с `?payment_error=...` (это уже реализовано).

CORS: для POST с `application/x-www-form-urlencoded` cross-subdomain (`hhr.pro` → `api.hhr.pro`) — простой запрос, preflight не нужен. Cookie `hh_sid` на `.hhr.pro` уйдёт автоматически.

### Изменения на фронте

**`src/routes/club.hell-pass.$tier.tsx`** — кнопки оплаты становятся submit-кнопками маленькой hidden-формы:

```text
<form method="POST" action="https://api.hhr.pro/api/v1/payments/redirect">
  <input type="hidden" name="target" value="pass" />
  <input type="hidden" name="tier" value={tier.slug} />
  <input type="hidden" name="method" value="card" /> (меняется по кнопке)
  <button type="submit">Оплатить картой</button>
</form>
```

Никаких `useMutation`, `await`, `payUrl`, `<a href>` — всё это убираем. Кнопка → submit → 303 → Райф. Один тап, нативный gesture.

Перед submit делаем только клиентские проверки (авторизация, downgrade). Если не авторизован — обычная навигация на `/login`.

**`src/routes/club.checkout.tsx`** — то же самое, но форма уже есть на странице. Превращаем существующий `<form onSubmit>` в форму с `method="POST" action="https://api.hhr.pro/api/v1/payments/redirect"`. Кнопки «Картой / СБП» — каждая в своей mini-форме (или одна форма с двумя submit-кнопками, у которых `name="method"` `value="card"`/`value="sbp"` — браузер пошлёт значение нажатой кнопки).

Поля `items`, `shipping_*` — hidden inputs, заполняются из state. Items сериализуем в JSON.

Клиентская валидация (имя/телефон/адрес/чекбокс оферты) — в `onSubmit={e => { if (!valid) e.preventDefault(); }}`. Не блокирует submit, если всё ок.

### Что убираем

- `src/lib/payment-redirect.ts` — больше не нужен.
- `purchasePass()` и `initOrderPayment()` (двухшаговый JSON-flow) — оставляем только если используются где-то ещё; иначе удаляем.
- Все `payUrl` state, `useEffect` со скроллом, кнопка «Перейти к оплате», «Отменить».

### Edge-cases, которые решаются автоматически

- **Двойной тап** → бекенд видит существующий active payment для (refType, refId, method) и возвращает тот же `paymentUrl` (идемпотентность уже есть в `findActivePayment`). Для нового purchase/order — это новая запись, дубля по сути нет.
- **«Бесконечно крутит на Райфе»** — это **отдельная проблема банка**, не наша. После фикса редиректа надо открыть DevTools на проблемном телефоне и смотреть Network на стороне Райфа. Скорее всего у их формы свой issue с 3DS/SameSite cookie — это уже не код нашего сайта, и тут вариантов мало: либо переключиться на другой merchant ID у Райфа, либо на ЮKassa/Tinkoff. Но это после фикса основного flow.

## Технические детали

- **CORS на бекенде**: для `/redirect` ничего менять не нужно — это форма-POST, не fetch. Браузер отправит cookies сам, ответ 303 браузер исполнит сам. Никаких `Access-Control-Allow-*` для этого не требуется (response не читается JS-ом).
- **Cookie `hh_sid`**: должен быть на домене `.hhr.pro` с `SameSite=Lax` (Lax разрешает cookie при top-level POST по нажатию). Если сейчас `SameSite=Strict` — поправить на Lax в `server/src/lib/auth.ts`. Это **критично**, без этого редирект не пройдёт авторизацию.
- **Endpoint**: `https://api.hhr.pro/api/v1/payments/redirect` — уже существует, расширяем.

## План работ

1. Бекенд `server/src/routes/payments.ts`: расширить `/redirect` для обоих режимов (`pass` без refId / `order` с inline-данными). Подтянуть `createPassPurchase` и `createOrder`.
2. Бекенд `server/src/lib/auth.ts`: проверить и при необходимости поставить cookie `SameSite=Lax`, `Domain=.hhr.pro`.
3. Фронт `src/routes/club.hell-pass.$tier.tsx`: убрать useMutation/payUrl, заменить кнопки на submit hidden-форм.
4. Фронт `src/routes/club.checkout.tsx`: то же — `<form action="https://api.hhr.pro/api/v1/payments/redirect" method="POST">`, hidden inputs, две submit-кнопки.
5. Удалить `src/lib/payment-redirect.ts` и неиспользуемые JSON-only функции в `src/lib/queries.ts` (если не нужны больше нигде).

После деплоя — проверить руками: Safari iOS, Chrome Android (оба обычные + PWA), десктоп. Везде должен быть один тап → сразу страница Райфа.

Если на Райфе после этого где-то ещё крутится форма — это уже банковская проблема, и нужно отдельно копать в их Network/Console.
