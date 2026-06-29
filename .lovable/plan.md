## Что делаем

Запускаем `club.hhr.pro` как отдельную PWA-зону клуба со своим входом (телефон ИЛИ почта + пароль). Сайт `hhr.pro/club` продолжает работать в обычном браузере — редирект на поддомен срабатывает только когда юзер открыл /club из установленной PWA или standalone-режима.

## Архитектура хостинга

Один репозиторий, один билд фронтенда — но фронт ведёт себя по-разному в зависимости от `window.location.hostname`. Это даёт «полностью отдельное приложение» без второго Timeweb App и без дублирования кода. Если потом захочешь физически разделить — это будет следующий шаг.

На `club.hhr.pro`:
- При заходе на `/` сразу редирект на `/club` (роутером, мгновенно).
- Отдаётся отдельный manifest: `name="HELLHOUND Club"`, `start_url="/club"`, `scope="/"`, свои иконки, `theme_color` под клуб.
- Скрыты роуты лендинга/about/политик — если кто-то откроет `club.hhr.pro/about`, его развернёт обратно на `/club` (или на `https://hhr.pro/about`).
- Заголовок страницы и `<title>` — клубные, без маркетинга.

На `hhr.pro`:
- Всё как сейчас. Лендинг, /club, политики и т.д.
- На `/club` добавляется маленький скрипт: если `display-mode: standalone` (или iOS `navigator.standalone`) — `location.replace("https://club.hhr.pro" + path)`. В обычном браузере на десктопе/мобиле — ничего не делает.
- Старый manifest сайта НЕ трогаем (там лендинг). PWA-установка с лендинга, как и раньше, у нас не делается.

Аутентификация общая: cookie `hh_sid` уже выставляется на `.hhr.pro`, так что сессия видна и на `hhr.pro`, и на `club.hhr.pro` без доп. настройки.

## Вход

Один экран `/login` (на club.hhr.pro он же `start_url` если юзер не залогинен). Поле «Телефон или email» + пароль.

Логика на бэке (`POST /api/v1/auth/login`):
- Если введён email → ищем юзера по email, проверяем пароль. Работает всегда.
- Если введён телефон (по маске `+...`) → ищем юзера по `profiles.phone` среди тех, у кого `phone_verified_at IS NOT NULL`. Если найден и пароль ок — пускаем. Если телефон не подтверждён — ошибка «Подтвердите номер в личном кабинете и войдите по email».
- Номер нормализуем (только цифры + `+`) и сравниваем по нормализованному значению.

Пароль = тот же пароль аккаунта. Никаких SMS-кодов и Telegram-кодов сейчас не делаем — это уже была бы отдельная фича.

Регистрации на club.hhr.pro нет — кнопка «Зарегистрироваться» ведёт на `https://hhr.pro/auth/sign-up` (там флоу с подтверждением email уже есть). Reset password — тоже на основном домене.

## Что меняем в коде

**Фронт (`src/`)**

- `src/lib/host.ts` — новый хелпер: `isClubHost()`, `isStandalone()`.
- `src/routes/__root.tsx` — на club-хосте подменяем `<title>`, подключаем `/club-manifest.webmanifest` вместо основного, скрываем не-клубные роуты.
- `src/routes/index.tsx` — если `isClubHost()` → `redirect to /club` в `beforeLoad`.
- `src/routes/club.index.tsx` — добавить `beforeLoad`: если не залогинен И мы на club-хосте → редирект на `/login`. На обычном `hhr.pro` поведение прежнее (там свой гард).
- `src/routes/login.tsx` — новый экран входа (телефон ИЛИ email + пароль), маленький, в стиле клуба. Скрытые ссылки: «Регистрация» и «Забыл пароль» → ведут на абсолютные урлы основного домена.
- `src/routes/club.index.tsx` (или в layout `/club`) — маленький `useEffect`: если `!isClubHost() && isStandalone()` → `location.replace("https://club.hhr.pro" + pathname + search)`. Один раз, без лагов.
- `public/club-manifest.webmanifest` — новый файл с клубными name/icons/start_url.
- `public/club-icons/*.png` — пара иконок 192/512 для PWA (можем переиспользовать существующий логотип, сделаю отдельный PNG).

**Бэк (`server/`)**

- `server/src/routes/auth.ts` (или где сейчас лежит login):
  - Принимать `identifier: string` вместо строго `email`.
  - Если `identifier` начинается с `+` или состоит почти из одних цифр → нормализуем и ищем по `profiles.phone` с `phone_verified_at IS NOT NULL`.
  - Иначе → ищем по `users.email` как сейчас.
  - Если телефон найден, но не подтверждён → 400 с понятным текстом.
- На POST лимит rate-limit уже стоит — оставляем.
- Никаких новых миграций не нужно: поля `profiles.phone` и `phone_verified_at` уже есть.

## CORS / cookie

Cookie `hh_sid` уже на `Domain=.hhr.pro`, так что club.hhr.pro её видит. Нужно проверить только CORS на `api.hhr.pro`: добавить `https://club.hhr.pro` в whitelist `ALLOWED_ORIGINS` (env переменная бэка).

## DNS / деплой

Это уже руками:
1. В Timeweb добавить `club.hhr.pro` как второй домен у того же фронт-приложения (CNAME / A на тот же IP).
2. В `.env` бэка на VPS — расширить `ALLOWED_ORIGINS=https://hhr.pro,https://club.hhr.pro`.
3. Пересобрать бэк: `cd /opt/hhr && git pull && cd server && sudo docker compose up -d --build`.

Фронт деплоится автоматом из main.

## Что НЕ делаем сейчас (намеренно)

- SMS-коды, OTP, Telegram-логин — отдельная история, ты выбрал «телефон + пароль».
- Полностью отдельную сборку (отдельный Vite-конфиг с урезанным роутером) — это удвоение работы при том же результате для юзера. Если позже захочешь — вырежем в отдельный пакет.
- Service Worker / офлайн-кэш — у нас по правилам PWA-скилла мы их не добавляем, пока ты явно не попросишь «работает офлайн».

## Технические детали

```text
hhr.pro                       club.hhr.pro
─────────                     ─────────────
/                лендинг      →  redirect /club
/about           есть         →  redirect /club
/club            гард как был →  гард: !auth → /login
/club/*          как было     →  как было
/login           —            →  телефон|email + пароль
/auth/sign-up    регистрация  →  redirect https://hhr.pro/auth/sign-up
manifest.webmanifest          →  /club-manifest.webmanifest
```

Standalone-редирект:
```ts
if (!isClubHost() && isStandalone() && pathname.startsWith("/club")) {
  location.replace("https://club.hhr.pro" + pathname + location.search);
}
```

Бэк-логин (псевдокод):
```ts
const id = body.identifier.trim();
const looksLikePhone = /^[+\d][\d\s()-]{6,}$/.test(id);
let user;
if (looksLikePhone) {
  const phone = normalizePhone(id);
  user = await db.query(`
    SELECT u.* FROM users u
    JOIN profiles p ON p.id = u.id
    WHERE p.phone = $1 AND p.phone_verified_at IS NOT NULL
  `, [phone]);
  if (!user && await userByUnverifiedPhone(phone)) {
    return reply.code(400).send({ error: "phone_not_verified" });
  }
} else {
  user = await userByEmail(id);
}
if (!user || !await verifyPassword(body.password, user.password_hash)) {
  return reply.code(401).send({ error: "invalid_credentials" });
}
// issue cookie as today
```

## После апрува

Сделаю в таком порядке:
1. Бэк: расширяю login, добавляю валидацию.
2. Фронт: `host.ts`, новый `/login`, гарды, standalone-редирект.
3. `club-manifest.webmanifest` + иконки.
4. Скажу тебе, что добавить в Timeweb (DNS) и в `.env` (ALLOWED_ORIGINS), и команду деплоя бэка.

Подтверди — и поехали. Если хочешь иначе по какому-то пункту (например, поддомен другой, или редирект из /club включать всегда, а не только в standalone) — скажи.