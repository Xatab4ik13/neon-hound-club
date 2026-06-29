## Цель
Юзер один раз подтверждает свой номер телефона через Telegram Gateway в профиле. После этого:
- может входить по email **или** по телефону (с паролем — как сейчас email);
- может восстановить пароль через код в Telegram (fallback на email через 60 сек);
- допускается к участию в розыгрышах.

Существующие участники розыгрышей не теряют свои билеты, но **до следующего участия** обязаны подтвердить телефон.

---

## 1. Переменная окружения (вручную на VPS)

В `/opt/hhr/server/.env`:
```
TELEGRAM_GATEWAY_API_TOKEN=AAGbRAAAspDGipJcWjM_FTEz_UunBSUiPlfKwlLyRd2kPw
```
Затем стандартный деплой:
```
cd /opt/hhr && git pull && cd server && sudo docker compose up -d --build
```

---

## 2. Схема БД (новая миграция)

`profile` таблица:
- `phone_e164` (уже есть) — нормализованный E.164 номер. **Уникальный индекс**, частичный (`WHERE phone_verified_at IS NOT NULL`), чтобы один телефон = один аккаунт после подтверждения.
- `phone_verified_at TIMESTAMPTZ NULL` — момент успешной верификации. NULL = не подтверждён.

Новая таблица `phone_verifications`:
```
id                uuid pk
user_id           uuid fk users(id) on delete cascade   -- кто запросил (если залогинен)
phone_e164        varchar(16) not null                  -- куда отправили
purpose           text not null    -- 'verify' | 'login' | 'recovery'
request_id        text not null    -- от Telegram Gateway
code_hash         text             -- sha256(code), если используем callback-проверку через checkVerificationStatus достаточно request_id
sent_at           timestamptz not null default now()
expires_at        timestamptz not null
consumed_at       timestamptz
attempts          int not null default 0
```

Таблица `phone_send_log` (для rate-limit, append-only):
```
phone_e164 text, ip inet, sent_at timestamptz
index по (phone_e164, sent_at desc) и (ip, sent_at desc)
```

---

## 3. Хелпер `server/src/lib/telegram-gateway.ts`

Тонкая обёртка над `https://gatewayapi.telegram.org/`:
- `sendVerificationMessage({ phone, code?, ttl, payload })` → `request_id`
- `checkVerificationStatus({ request_id, code })` → `{ verification_status: 'code_valid' | 'code_invalid' | 'code_max_attempts_exceeded' | ... }`
- `checkSendAbility({ phone })` (опц.) — узнать заранее, сколько спишется.

Авторизация: `Authorization: Bearer ${TELEGRAM_GATEWAY_API_TOKEN}`. Генерим 6-значный код сами (`crypto.randomInt`) и передаём в `code` — тогда Telegram проверит код на своей стороне через `checkVerificationStatus`. Это самый дешёвый и надёжный путь.

---

## 4. Эндпоинты (`server/src/routes/auth.ts` + `routes/profile.ts`)

Все принимают JSON, валидация через zod, нормализация номера через простую функцию `toE164(raw, defaultCountry='RU')`.

### A) Подтверждение телефона в профиле (auth required)

`POST /profile/phone/send-code`
- Body: `{ phone: string }`
- Проверки:
  - юзер залогинен;
  - rate-limit: не больше 1 раза в 60 сек на номер, 5 в час на IP, 10 в сутки на номер;
  - номер ещё не подтверждён другим юзером.
- Действия: генерим код, пишем `phone_verifications(purpose='verify')`, дёргаем Telegram Gateway, возвращаем `{ request_id, expires_in: 300 }`.

`POST /profile/phone/verify`
- Body: `{ request_id, code }`
- Дёргаем `checkVerificationStatus`. Если `code_valid`:
  - **транзакция**: проверяем, что этот `phone_e164` не подтверждён у другого user_id; апдейтим `profile.phone_e164 = …, phone_verified_at = now()`; помечаем запись consumed.
- Ошибки: `code_invalid`, `code_max_attempts_exceeded`, `expired`.

`POST /profile/phone/change` — то же, что подтверждение, но если у юзера уже есть подтверждённый номер: новый перезаписывает старый только после успешной верификации нового.

### B) Логин по телефону + пароль

`POST /auth/login-by-phone`
- Body: `{ phone, password }`
- Ищем юзера по `profile.phone_e164` **с** `phone_verified_at IS NOT NULL`. Дальше — `verifyPassword`, `setSessionCookie`. Логика идентична существующему `/auth/login`.

### C) Восстановление пароля через Telegram

`POST /auth/recovery/phone/send-code`
- Body: `{ phone }`
- Ищем подтверждённого юзера по номеру. Если нет — отвечаем «если номер существует, код отправлен» (anti-enumeration), но реально шлём только если найден.
- Rate-limit: 1/60s на номер, 5/час на IP.
- Создаём `phone_verifications(purpose='recovery')`, шлём код.

`POST /auth/recovery/phone/verify`
- Body: `{ phone, request_id, code }`
- Проверяем код через Telegram. При успехе генерим короткоживущий `recovery_token` (jwt, ttl 10 мин, scope=password_reset, user_id=…), возвращаем его.

`POST /auth/recovery/reset-password`
- Body: `{ recovery_token, new_password }`
- Меняем пароль, инвалидируем сессии.

Фронт сам показывает кнопку «не пришёл код — восстановить через email» через 60 сек.

### D) Гейтинг розыгрышей

В `server/src/routes/raffles.ts` (и/или `lib/raffles.ts`) перед операцией **участия / траты билетов** добавить проверку `profile.phone_verified_at IS NOT NULL`. Если нет — 403 `{ error: 'phone_verification_required' }`. Фронт по этому коду откроет модалку «подтверди телефон в профиле».

Существующие активные участия не трогаем (исторические записи остаются), просто следующая попытка участия требует подтверждения.

---

## 5. Безопасность и rate-limit

- Все коды — 6 цифр, `crypto.randomInt(100000, 1000000)`.
- TTL кода: 5 минут.
- Лимит попыток ввода кода: 3 (отслеживаем `attempts` в `phone_verifications`).
- Один `request_id` одноразовый — после `consumed_at` любая повторная верификация = `409`.
- Rate-limit реализуем простой таблицей `phone_send_log`, без Redis (минимум инфры).
- Anti-enumeration в recovery: всегда отвечаем 200 c одинаковым телом.
- Логи: никогда не логируем `code`, только `request_id` и `phone_e164` (для аудита).

---

## 6. Что НЕ делаем сейчас
- Не переписываем страницу логина (это следующий этап).
- Не делаем UI в профиле для ввода телефона (следующий этап — ты сказал «потом фронт»).
- Не трогаем мобильную нативку.

---

## 7. Технические замечания
- Telegram Gateway API: `https://gatewayapi.telegram.org/sendVerificationMessage` и `/checkVerificationStatus`. Доки: https://core.telegram.org/gateway/api.
- Стоимость: ~0.01 € за подтверждённый код (платим только если юзер получил). `checkSendAbility` позволяет предварительно узнать цену — пока не используем, чтобы не тратить лишний запрос.
- При первом запросе Telegram может вернуть `FLOOD_WAIT_X` — пробрасываем 429 на фронт.
- IP-whitelist уже стоит на `89.169.145.210` — токен работает только с VPS.

После апрува плана пишу миграцию, `lib/telegram-gateway.ts`, эндпоинты, гейт в розыгрышах.
