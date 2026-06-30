## Итоговая экономика Hell AI

| Тир | Цена | Лимит | Модель |
|---|---|---|---|
| Free | 0 ₽ | 3 вопроса / 24h | умная (как Platinum) |
| Silver | 490 ₽ | 15 / 24h | умная |
| Gold | 1290 ₽ | 40 / 24h | умная |
| Platinum | 2990 ₽ | безлимит (hard cap 150/24h от спама) | умная |

Pass по-прежнему действует 30 дней с момента оплаты. Лимит — **скользящее окно 24 часа** (а не на весь период пасса). Билеты и цены не трогаем.

## Backend (`server/`)

**1. Миграция `ai_messages`**

- Добавить колонку `pass_id uuid null` с FK → `pass_purchases(id) on delete set null` и индексом `(user_id, created_at) where pass_id is null` + индекс `(pass_id, created_at)`.
- Backfill для существующих сообщений (чтобы не засчитались в free-квоту):

```sql
UPDATE ai_messages m SET pass_id = p.id
FROM pass_purchases p
WHERE m.user_id = p.user_id
  AND p.paid_at IS NOT NULL
  AND m.created_at >= p.paid_at
  AND m.created_at <  p.expires_at;
```

**2. `server/src/db/schema/hell-ai.ts`** — добавить поле `passId` в drizzle-схему `aiMessages`.

**3. `server/src/db/schema/pass.ts` — `PASS_CONFIG`**

```ts
silver:   { priceRub: 490,  tickets: 3,  aiQuestions: 15  },   // в сутки
gold:     { priceRub: 1290, tickets: 10, aiQuestions: 40  },   // в сутки
platinum: { priceRub: 2990, tickets: 30, aiQuestions: 150 },   // hard-cap/сутки
```

Цены и билеты не меняем. Комментарии в схеме поправить: лимит теперь per-24h, не per-30d.

**4. `server/src/lib/hell-ai.ts`**

- `AI_LIMITS_DEFAULT` → `{ silver: 15, gold: 40, platinum: 150 }`.
- Добавить `FREE_PER_DAY = 3`, `FREE_MODEL = TIER_PRIMARY_MODEL.platinum`.
- `TIER_PRIMARY_MODEL` — все три тира уже на умной модели (если silver/gold были на быстрой — поменять на умную).
- Убрать `PLATINUM_FALLBACK_MODEL` (больше не нужен — Platinum просто умная с капом 150).

**5. `server/src/routes/hell-ai.ts`**

`GET /status`:
- staff → как сейчас.
- активный Pass → `used` считаем по `ai_messages` где `pass_id = currentPass.id AND role='user' AND created_at > now() - 24h`. Для Platinum возвращаем `unlimited: true` если `used < 150`, иначе `unlimited: false, left: 0`.
- без Pass → `tier: "free", limit: 3, used` (за 24h с `pass_id IS NULL`), `left`, `resetAt` = `created_at` самого старого free-сообщения в окне + 24h.

`POST /ask`:
- Если активного Pass нет → проверить free-счётчик за 24h, при >=3 → `429 { error: "free_limit_reached" }`. Иначе пишем сообщения с `pass_id = null`, модель = `FREE_MODEL`.
- Если есть активный Pass → проверить per-24h счётчик `where pass_id = pass.id`. При превышении → `429 { error: "limit_reached" }`. Сообщения вставляем с `pass_id = pass.id`. Модель — умная для всех тиров.
- Откат счётчика при ошибке OpenRouter оставляем (удаляется последний user-msg за 10 сек).

Удаляем ветку «после лимита Platinum переключаемся на быструю модель» — Platinum теперь просто кап 150.

## Frontend

**`src/routes/club.hell-ai.tsx`**
- Убрать страницу-заглушку «нет пасса». Чат всегда доступен.
- Бейдж в шапке:
  - Free → «Бесплатно: X из 3 на сегодня. Сбросится через Yч».
  - Silver/Gold → «X из N сегодня».
  - Platinum → «Безлимит» (если приблизился к 150 — показать остаток).
- На `429 free_limit_reached` или `limit_reached` рендерим inline-пейволл с 3 кнопками тиров (ссылки на `/club/hell-pass/silver|gold|platinum` уже есть).

**`src/routes/club.hell-pass.index.tsx` и `src/routes/club.hell-pass.$tier.tsx`**
- Обновить копи лимитов: «15/день», «40/день», «безлимит» вместо старых «30/200/300 за 30 дней».

**`src/routes/admin.settings.tsx` (Hell AI settings)** — лейблы и подсказки полей лимитов: «вопросов в сутки» вместо «за 30 дней». Дефолты в форме обновить.

## Что НЕ трогаем

- Цены Pass, пакеты билетов, длительность 30 дней.
- Логику оплаты, выдачи билетов, квестов, лестницы Hell AI.
- Существующие активные Pass не страдают: их сообщения backfill-нутся с правильным `pass_id`, новый счётчик 15/40/150 в сутки начнёт работать сразу — для большинства это будет щедрее, чем старый месячный лимит.

## Риск

«Умная» модель на всех тирах и free дороже по токенам. Мониторим `ai_messages.tokens_in/out` первые 2 недели. Если течёт — `FREE_MODEL`/`TIER_PRIMARY_MODEL.silver` меняем на быструю одной строкой, без миграций.
