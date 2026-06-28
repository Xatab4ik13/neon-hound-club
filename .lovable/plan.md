## Причина бага

Сейчас и клуб (`hhr.pro`), и админка (`hhr.pro/admin`) используют **одну и ту же cookie** `hh_sid` на родительском домене `.hhr.pro`. При логине в админку под `ez4boost@gmail.com` сервер ставит ту же cookie, и фронт клуба через `/api/v1/auth/me` видит того же пользователя — это и есть «аккаунт Hell c 54 билетами» на главной. Никакого второго аккаунта не существует, это просто та же сессия админа, отрисованная в клубной шапке.

Чтобы вход в админку **не светил** админский профиль в клубе, нужны две независимые сессии.

## Что меняем

### Бэк (`server/`)
1. Новые роуты под админку с отдельной cookie `hh_admin_sid`:
   - `POST /api/v1/auth/admin/login` — принимает email/пароль, проверяет `role === "admin"`, ставит `hh_admin_sid` (httpOnly, `Path=/api/v1/admin` + `/api/v1/auth/admin`, SameSite=None+Secure в проде, domain = `.hhr.pro`).
   - `POST /api/v1/auth/admin/logout` — чистит `hh_admin_sid`.
   - `GET /api/v1/auth/admin/me` — возвращает админа из `hh_admin_sid`.
2. `requireAdmin` (в `server/src/lib/auth.ts`) читает **только** `hh_admin_sid`, не клубную cookie. Клубные `requireAuth` / `loadSession` продолжают читать `hh_sid` и игнорируют админскую.
3. Клубный `POST /api/v1/auth/login` запрещает вход админам (или просто не ставит клубную cookie для `role=admin`) — чтобы один и тот же email/пароль не давал клубную сессию админу. Админ для тестов клуба заведёт отдельного юзера.

### Фронт (`src/`)
1. Новый контекст `AdminViewerProvider` (отдельный от `ViewerProvider`) в `src/hooks/use-admin-viewer.tsx`. Свои `signIn` / `signOut` / `me`, ходят на `/api/v1/auth/admin/*`. Свой ключ React Query, чтобы не пересекался с `["auth","me"]`.
2. В `src/routes/admin.tsx` оборачиваем `<Outlet />` в `AdminViewerProvider` и читаем `useAdminViewer()` вместо `useViewer()`. `AdminLogin` использует админский `signIn`.
3. Клубные компоненты продолжают читать `useViewer()` — он видит только клубную cookie. Если админ не залогинен в клубе отдельно, в шапке будет «Войти», как и должно быть.
4. `apiFetch` уже шлёт `credentials: "include"` — обе cookie уедут на api, бэк сам выберет нужную по роуту.

### Чистка «фантомного» аккаунта в браузере
После деплоя пользователю один раз нужно выйти из клуба (или почистить cookie `hh_sid` на `.hhr.pro`) — старая общая cookie перестанет распознаваться клубным `/auth/me` после рестарта, и Hell исчезнет с главной.

## Что НЕ трогаем
- БД и таблицу `users` — данные корректны, дублей нет.
- Логику ролей, JWT-секрет, экономику билетов.
- Регистрацию обычных пользователей.

## Технические детали (cookie scoping)

```text
hh_sid        Path=/   Domain=.hhr.pro   → клубный фронт + клубные API
hh_admin_sid  Path=/   Domain=.hhr.pro   → только админский фронт + админские API
```

Обе cookie уходят на `api.hhr.pro` (браузер не различает path при cross-site fetch), но бэк строго разделяет: клубные хэндлеры читают только `hh_sid`, админские — только `hh_admin_sid`. Логин в одну не создаёт сессию в другой.

## Деплой

После мержа:
```
cd /opt/hhr && git pull && cd server && sudo docker compose up -d --build
```
Миграции не нужны — схема не меняется.