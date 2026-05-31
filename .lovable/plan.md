## Цель
Убрать две кнопки (Карта / СБП) и вернуть одну кнопку «Оплатить». После объединения торговых точек у Райфа карты и СБП будут доступны на одной платёжной форме банка — выбор способа делает сам покупатель уже там.

## Подход
Минимальная правка фронта. Бэк не трогаем (он и так принимает `method`, продолжим слать `"card"` как дефолт — после объединения это окажется единая точка). Когда у тебя в Райфе реально склеят точки, ты просто оставишь в env один `RAIF_PUBLIC_ID` / `RAIF_SECRET_KEY`, а второй (SBP) удалишь — никаких правок кода не понадобится.

## Что меняем

### 1. `src/components/brand/PayButton.tsx`
- Оставляем один компонент `PayButton` (label «Оплатить», лого Visa / MC / Мир / СБП в ряд — показываем все, потому что доступно и то и то).
- `PayCardButton` / `PaySbpButton` экспортируем как алиасы на `PayButton`, чтобы не ловить мёртвые импорты, если что-то проглядим.

### 2. `src/routes/club.checkout.tsx`
- Убираем `usePaymentMethods`, ветку `{sbpEnabled && …}` и вторую форму/кнопку.
- Оставляем одну форму POST на `/api/v1/payments/redirect` с `<input name="method" value="card">` (бэк-совместимо).
- В PWA-ветке `startPayment({ …, method: "card" })`.

### 3. `src/routes/club.hell-pass.$tier.tsx`
- То же самое: одна форма, одна кнопка `PayButton`, `method=card` всегда.

### 4. `src/hooks/use-payment-methods.ts`
- Удаляем файл — больше нигде не используется.
- Из `src/lib/queries.ts` убираем `fetchPaymentMethods` и `qk.paymentMethods` (тоже больше не нужны). `PaymentMethod` тип и параметр `method` у `initOrderPayment` / `initPassPayment` / `purchasePass` оставляем — это контракт с беком, ничего не ломаем.

## Чего НЕ делаем
- Не трогаем бэк (`server/src/routes/payments.ts`, `server/src/lib/raif.ts`, миграции). Поле `method` остаётся, просто фронт всегда шлёт `card`.
- Не трогаем `/pay/go`, `pwa-pay.ts`, `payment-redirect.ts` — они одинаковы для обоих методов.
- Не трогаем env на VPS прямо сейчас. После того как Райф склеит точки — просто удалишь `RAIF_*_SBP` переменные, бэк не заметит.

## Проверка после деплоя фронта
1. Десктоп браузер → `/club/checkout` → одна кнопка «Оплатить» → форма Райфа открывается, на ней выбор карта/СБП.
2. Mobile Safari (обычный) → то же самое, top-level navigation.
3. PWA standalone (iOS добавлен на главный экран) → одна кнопка → `/pay/go` → большая кнопка → открывается Safari с формой Райфа.
4. То же для `/club/hell-pass/silver|gold|platinum`.

## Деплой
Только фронт (Timeweb Apps авто). Бэк не пересобираем.
