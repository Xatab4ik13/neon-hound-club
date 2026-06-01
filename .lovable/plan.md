## Что делаем

Новый раздел **«Помощь»** в клубной части PWA, где юзер может отправить тикет, дождаться ответа админа и посмотреть закрытые в архиве. В админке — отдельная страница со списком и просмотром тикетов.

Логика «один вопрос → один ответ»: после ответа админа юзер может только прочитать. Если нужно ещё — создаёт новый тикет.

## Категории тикетов

- `bug` — Баг
- `feature` — Предложение
- `question` — Вопрос

## Статусы тикета

- `open` — отправлен, ждёт ответа
- `answered` — админ ответил
- `closed` — админ закрыл (попадает в архив, юзер видит read-only)

## Бэкенд (`server/`)

Всё по существующей архитектуре Fastify + Drizzle + Postgres. Без Supabase.

**Миграция** `0XXX_tickets.sql`:
```
tickets
  id uuid pk
  user_id uuid fk users
  category varchar(16) — bug | feature | question
  subject varchar(120)
  body text
  status varchar(16) default 'open'
  admin_reply text null
  answered_by uuid null fk users
  answered_at timestamptz null
  closed_at timestamptz null
  created_at timestamptz default now()
  updated_at timestamptz default now()
  -- индексы: (user_id, created_at desc), (status, created_at desc)
```

**Схема** `server/src/db/schema/tickets.ts` + регистрация в общем экспорте.

**Роуты** `server/src/routes/support-tickets.ts`:
- `GET /api/v1/support/tickets?status=active|closed` — список тикетов юзера (active = open+answered)
- `POST /api/v1/support/tickets` — создать (zod: category enum, subject 3–120, body 5–4000)
- `GET /api/v1/support/tickets/:id` — детали одного тикета (только свой)

**Админ-роуты** в том же файле через `requireAdmin`:
- `GET /api/v1/admin/support/tickets?status=&category=&page=&pageSize=` — постраничный список с ником юзера (через `parsePagination`, аналогично `admin-tickets`)
- `GET /api/v1/admin/support/tickets/:id`
- `POST /api/v1/admin/support/tickets/:id/reply` — body: `{ reply: string, close?: boolean }`. Ставит `status='answered'` (или `closed` если `close=true`), сохраняет `answered_by`, `answered_at`, шлёт push юзеру
- `POST /api/v1/admin/support/tickets/:id/close` — просто закрыть без ответа

**Push-уведомление** при ответе:
- Используем существующий `server/src/lib/push.ts` (как для других событий)
- Title: «Ответ на ваш тикет», body: первые 80 символов ответа, deep-link: `/club/help/:id`

**Rate limit**: 1 тикет в минуту на юзера (защита от спама) — простая проверка по `created_at` последнего.

## Фронт (PWA)

### Гейтинг «только PWA»
В `src/components/club/MobileMoreSheet.tsx` пункт «Помощь» показываем только при `isPwa()` (хелпер `src/lib/is-pwa.ts` уже есть). На вебе пункта в меню нет.

### Маршруты
- `src/routes/club.help.index.tsx` — список своих тикетов (табы «Активные» / «Архив») + кнопка «+ Новый тикет»
- `src/routes/club.help.new.tsx` — форма создания
- `src/routes/club.help.$ticketId.tsx` — детальная карточка тикета

### Дизайн (iOS-стиль, уже принятый в проекте)
Используем существующие iOS-компоненты:
- `IOSList` для списков тикетов (группами по дате)
- `IOSSheet` для выбора категории (segmented control / wheel picker)
- `IOSFullScreenModal` или обычная страница для формы
- `PageHeader` из `club/PageHeader.tsx` с back-кнопкой
- Цветовые токены из `src/styles.css`, без хардкода

**Карточка тикета в списке**: иконка категории слева (Bug / Lightbulb / HelpCircle из lucide), сабжект, статус-чип (`open` — серый, `answered` — primary с точкой, `closed` — мьютед), дата справа.

**Детальная страница**: блок «Ваш вопрос» (категория + сабжект + текст + дата) → если есть ответ, блок «Ответ команды» с ником админа и датой → если статус `answered` и не закрыт, подсказка «Если вопрос исчерпан — создайте новый тикет для нового вопроса». Никаких полей для ответа со стороны юзера.

**Форма нового тикета**:
- Выбор категории (3 опции, segmented)
- Тема (`Input`, лимит 120)
- Описание (`Textarea`, лимит 4000, счётчик символов)
- Кнопка «Отправить» — primary, после успеха toast «Тикет отправлен» и редирект на детальную

### API-клиент
В `src/lib/api.ts` уже есть `apiFetch`. Добавить тонкий слой `src/lib/support-api.ts` с типами и функциями: `listMyTickets`, `getTicket`, `createTicket`. Для админки — в `src/lib/admin-queries.ts` добавить `fetchAdminSupportTickets`, `fetchAdminSupportTicket`, `replyToTicket`, `closeTicket`.

### Push deep-link
Существующий обработчик пушей (в `src/lib/push.ts` или service worker) уже умеет роутить по url из payload. Используем `/club/help/:id`.

## Админка

### Маршрут
`src/routes/admin.support.tsx` (по образцу `admin.tickets.tsx`):
- `PageHeader` «Помощь»
- Фильтр-чипы по статусу (Все / Открытые / Отвеченные / Закрытые) и категории
- `DataTable`: Дата · Юзер · Категория · Тема · Статус
- Клик по строке → `Modal` с полным текстом + textarea для ответа + кнопки «Отправить ответ», «Отправить и закрыть», «Закрыть без ответа»

### Навигация админки
Добавить пункт «Помощь» в боковое меню админки (там, где сейчас «Билеты», «Заказы» и т.д. — найти и расширить компонент навигации).

### Бейдж количества открытых
В пункте меню админки показывать число `open + answered_without_reply` — отдельный запрос `GET /api/v1/admin/support/tickets/unread-count` каждые 30 сек через `useQuery`.

## Что НЕ делаем (важно)

- Не делаем чат-тред (по выбору юзера: один вопрос → один ответ)
- Не делаем email-уведомления (только push)
- Не показываем пункт «Помощь» в вебе и в iOS-сборке Rork (для iOS этот эндпоинт скрывается через `X-Client-Platform: ios` в `/api/v1/config`, как для розыгрышей)
- Не даём юзеру редактировать или удалять тикет
- Не даём прикладывать файлы/скриншоты в MVP (можно добавить позже)

## Технические детали

- Все суммы и поля валидируем через zod на бэке (как в существующих роутах)
- В админ-ответе разрешаем переносы строк, без HTML/markdown (рендерим как `whitespace-pre-wrap`)
- Регистрация роутов в `server/src/app.ts`: публичные под `/api/v1/support`, админские под `/api/v1/admin/support`
- Деплой бэка после миграции: `cd /opt/hhr && git pull && cd server && docker compose up -d --build`

## Открытый вопрос

В ответе про уведомления ты выбрал «Push» + «Other», но текст «Other» не пришёл. По умолчанию делаю **только push**. Если хочется ещё бейдж-точку на иконке «Ещё» в табе или email — скажи, добавлю.
