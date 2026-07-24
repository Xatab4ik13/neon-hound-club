
## Что делаем

Убираем все моки последних дней и переводим фичи на реальный бэк. Разбиваем на 3 фазы, чтобы каждая фаза ставилась и проверялась отдельно, а фронт не оставался сломанным на промежуточных этапах.

Все правила из подтверждённого разговора уважаем:
- 20% наценка от инструктора скрыта: инструктор видит свой чек, ученик — с +20%. В экономике: сначала минус налог на общую выручку от урока, потом 20% — наша маржа.
- На Школу скидка Hell Pass **не** распространяется.
- Hell Pass — настоящая ежемесячная подписка через Райф-ребиллинг (токен-платежи). Пользователь может отменить, можно возобновить до конца оплаченного периода.
- Пуши идут через существующий web-push (VAPID + `push_subscriptions`).

## Фаза 1 — Школа (backend)

Миграция `0050_school.sql` + Drizzle-схема + роуты. Фронтовые файлы `admin.school.tsx`, `club.school.*`, инструкторские экраны остаются на месте — подключаем реальные эндпойнты вместо мок-данных внутри тех же компонентов.

Таблицы:
- `school_instructors` — профиль инструктора (bio, city, moto, hourly_rate_rub, active).
- `school_chats` — чат ученик ↔ инструктор (unique пара), unread-счётчики как в vip_chat.
- `school_messages` — сообщения, `image_url`, `read_at`.
- `school_orders` — счета от инструктора: `instructor_amount_rub` (что видит инструктор), `student_amount_rub = instructor_amount_rub * 1.2` (что видит ученик), статусы `draft → invoiced → paid → cancelled/refunded`, ссылка на `payments.id`. Hell Pass discount **не применяется**.
- `school_payouts` — недельная пачка выплат инструктору: `period_start`, `period_end`, `gross_rub`, `tax_rub`, `commission_rub` (20%), `payout_rub`, `status: pending/paid`.

Роуты:
- `GET /api/v1/school/instructors` — публичный список.
- `POST /api/v1/school/chats` — открыть/получить чат с инструктором.
- `GET|POST /api/v1/school/chats/:id/messages` — история/отправка (+ push инструктору).
- `POST /api/v1/school/orders` — инструктор выставляет счёт (сумма инструктора), сервер сам считает student_amount и создаёт `payments` через существующий `createPaymentForOrder`-стиль.
- `POST /api/v1/school/orders/:id/pay` — ученик получает paymentUrl.
- Админ: `GET /api/v1/admin/school/kpi`, `GET /api/v1/admin/school/payouts`, `POST /api/v1/admin/school/payouts/:id/mark-paid`.

Push: при новом сообщении и при выставлении счёта — существующий `sendPushToUser(userId, { title, body, url })`.

## Фаза 2 — Hell Pass рекуррент

Миграция `0051_pass_recurring.sql`:
- В `pass_purchases`: `is_recurring boolean`, `parent_purchase_id uuid`, `next_charge_at timestamptz`, `cancelled_at timestamptz`.
- Новая `pass_billing_tokens` — токен от Райфа на юзера/метод (id, user_id, provider_token, method, last4, exp_month, exp_year, created_at). Один активный токен.

Логика:
- Первая оплата подписки создаёт `payments` с флагом `save_token=true`. В `handleRaifNotification` при `confirmed` сохраняем `provider_token` в `pass_billing_tokens`.
- Cron `server/src/jobs/pass-rebill.ts` (раз в час): для всех `is_recurring=true, status=active, next_charge_at <= now()+1h, cancelled_at is null` — списывает через `raif.rebill(token, amount)`. Успех → новый `passPurchases` (`parent_purchase_id`), `activatePassPurchase` продлевает срок; провал → шлём push «Не удалось списать, обнови карту», не отменяем сразу, ретрай через сутки (3 попытки, затем `is_recurring=false`).
- Роуты: `POST /api/v1/pass/subscription/cancel` (ставит `cancelled_at`, доступ остаётся до `expires_at`), `POST /api/v1/pass/subscription/resume` (снимает `cancelled_at`, если ещё в оплаченном периоде).
- Фронт `src/routes/club.hell-pass.$tier.tsx` уходит с `pass-cancel-state.ts` мока на реальные эндпойнты.

Прим.: у Райфа рекуррент — это Init → `Recurrent=Y` + RebillId в последующих. Обёртка добавит `saveCard/recurrent` флаг в `createOrder` и новый `rebill(rebillId, amount)`.

## Фаза 3 — VIP-чат и push-события

VIP-чат уже на бэке. Что доделываем:
- Ограничить создание тредов держателями активного Platinum.
- Пуш блогеру на новое сообщение и юзеру на ответ (используем текущий web-push).
- Загрузка фото сообщения — через существующий `/uploads/direct`.
- Фронт `src/routes/club.vip-chat.tsx` уходит с моков.

Также в этой фазе:
- Хук пуша при новом сообщении школы (уже описано в Фазе 1, интегрируем окончательно).
- Пуш при выставлении инструктором счёта и при успешной оплате.
- Пуш при неуспешном ребиллинге Pass (см. Фаза 2).

## Что удаляем из фронта

По ходу каждой фазы:
- `src/data/pass-cancel-state.ts` — моки отмены Pass (Фаза 2).
- Инлайновые массивы инструкторов/чатов/сообщений/заказов/выплат в `admin.school.tsx`, `club.school.*`, инструкторских экранах — заменяем на `useQuery`/`useMutation` через новый `src/lib/school-queries.ts` (Фаза 1).
- Мок-массив тредов/сообщений VIP-чата (Фаза 3).

## Порядок выкатки

1. **Фаза 1** — 1 миграция, ~8 бэк-файлов, ~4 фронт-файла. После этого школа реальна.
2. **Фаза 2** — 1 миграция, обёртка Райфа + cron + 2 роута + фронт-подписка.
3. **Фаза 3** — доступ Platinum + пуш-хуки + фронт VIP-чата на бэке.

Начинаю с Фазы 1 сразу после апрува.
