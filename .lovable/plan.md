
# Шаг 1 Школы: студенческий фронт → реальные API

## Проблема, из которой растёт план

Моки в `src/data/instructors.ts` содержат сильно больше данных, чем текущая таблица `school_instructors`:

| Поле | В моке | В БД сейчас |
|---|---|---|
| `bio` абзацы, `specialties`, `tagline` | да | только 1 text-`bio` |
| `skills[]` (10 карточек) | да | нет |
| `courses[]` (форматы + цены) | да | нет |
| `approach[]` | да | нет |
| `location{addr,lat,lng,note}` | да | нет |
| `gallery[]` (5–9 фото) | да | нет |
| `tone`, `experience` | да | нет |

Пока не переложим этот контент в БД, «переход на реальные API» превратится в снос половины страницы инструктора. `schedule` (свободные слоты) — вообще нет ни в бэкенд-плане, ни в таблицах.

## Решение — коротко

1. Расширить `school_instructors` одним JSONB-полем `profile` + добавить `tone`, `experience`, `tagline`. Всё, что не «расписание слотов», влезает сюда без новых таблиц.
2. Засидить 5 инструкторов из текущего `data/instructors.ts` в БД, ассеты (фото/галерея) грузим на MinIO разово.
3. GET `/api/v1/school/instructors[/:slug]` начинает отдавать `profile`.
4. Фронт списка (`club.school.index.tsx`), карточки (`club.school.$instructorId.tsx`) и студенческого чата (`club.my-instructors.index.tsx`, `club.my-instructors.$instructorId.tsx`) — переписаны на API.
5. Секция «Свободные слоты» на карточке инструктора убирается (её нет в бэкенд-плане).
6. `data/instructors.ts` и `data/instructor-chats-mock.ts` в этом шаге остаются на диске — их доедают шаги 2 (инструкторские экраны) и 3 (админка). Ссылки из клубных роутов на них исчезают.

## Что делаем на бэкенде

- Миграция `0051_school_profile.sql`:
  - `ALTER TABLE school_instructors ADD COLUMN profile jsonb NOT NULL DEFAULT '{}'::jsonb`.
  - `ADD COLUMN tone varchar(16) NOT NULL DEFAULT 'primary'`.
  - `ADD COLUMN experience integer NOT NULL DEFAULT 0`.
  - `ADD COLUMN tagline varchar(300) NOT NULL DEFAULT ''`.
- Обновление `server/src/db/schema/school.ts`: типизировать `profile` (specialties, bioParagraphs, skills[], courses[], upcomingCourses[], approach[], location{}, gallery[]).
- Обновление роутов `schoolRoutes` (`GET /instructors`, `GET /instructors/:slug`): начать возвращать `profile`, `tone`, `experience`, `tagline`.
- Сид-скрипт `server/src/db/seed/school-instructors.ts`, идемпотентно вставляющий/апдейтящий 5 инструкторов из текущего мока (stanislav, semen, nikita, pavel, haix). Запускается разово руками админом — не в миграции. Фото/галерея заливаются на MinIO отдельно (скрипт печатает список URL-ов, которые нужно загрузить, — этот кусок админ дожмёт сам).
- В `adminSchoolRoutes` — расширить `POST/PATCH /instructors` возможностью писать `profile/tone/experience/tagline` (пригодится для админки в шаге 3).

## Что делаем на фронте

- `src/lib/api-school.ts` — тонкие обёртки над `apiFetch`: `fetchInstructors`, `fetchInstructor(slug)`, `openChatWith(slug)`, `fetchMyChats`, `fetchChatMessages(chatId)`, `sendChatMessage(chatId, ...)`, `payOrder(orderId, method)`.
- `src/lib/queries.ts` — ключи `qk.schoolInstructors`, `qk.schoolInstructor(slug)`, `qk.myChats`, `qk.chatMessages(chatId)`.
- `club.school.index.tsx` — переезжает на `useQuery(qk.schoolInstructors)`. Тип `Instructor` берём из ответа API (не из `data/instructors.ts`).
- `club.school.$instructorId.tsx`:
  - `useQuery(qk.schoolInstructor(slug))`.
  - Секция «Свободные слоты» удаляется.
  - Кнопка «Связаться» → `openChatWith(slug)` (POST `/school/chats`) → `navigate({ to: "/club/my-instructors/$chatId", params: { chatId } })`. Роут переименовывается с `instructorId` на `chatId`.
- `club.my-instructors.index.tsx` — `useQuery` над `GET /api/v1/school/chats`. Ссылки на `chatId`.
- `club.my-instructors.$chatId.tsx` (переименование `$instructorId` → `$chatId`):
  - `useQuery` messages+orders через `GET /chats/:id/messages`.
  - `POST /chats/:id/messages` для отправки.
  - Кнопка «Оплатить» на счёте (order.status === "invoiced") → `POST /school/orders/:id/pay` → редирект в райф.
  - Компонент `MockChatRoom` заменяем на честный `SchoolChatRoom` (тот же вид, но реальные данные). Мок-сидинг счёта у Станислава удаляется.
- Публичные `school.index.tsx` / `school.$instructorId.tsx` — тоже переводим на API (это те же данные, глупо иметь два источника). Секция расписания убирается там же.
- `club.quests.tsx` — там `INSTRUCTORS` используется только для аватарок/имён. Прогоняем через тот же `qk.schoolInstructors`.

## Что НЕ делаем в шаге 1

- Инструкторские экраны (`club.school-chats.*`) — шаг 2.
- Админку школы (`admin.school.tsx`, `data/admin-school.ts`) — шаг 3.
- Удаление файлов `data/instructors.ts` и `data/instructor-chats-mock.ts` — они ещё нужны шагам 2–3 (админка сейчас читает `INVOICE_COMMISSION` из мока). Уйдут в шаге 3.
- Секцию «Свободные слоты»: если она нужна в проде, это отдельная задача — таблица `school_slots` + UI бронирования.

## Технические заметки

- `profile` JSONB храним под контрактом `InstructorProfile` в `server/src/db/schema/school.ts` — тот же тип экспортится в клиент через `src/lib/api-school.ts` вручную (проще, чем гонять zod). Валидация на write-путях админки — zod.
- URL-ы фото и галереи после загрузки на MinIO подставляются в сид-скрипт вручную (в моке они `@/assets/... .webp.asset.json`). До первой заливки фото инструкторов может «не быть» на проде — это ожидаемо, лечится одним прогоном сид-скрипта.
- Роут студенческого чата меняет параметр (`$instructorId` → `$chatId`). Все `navigate/Link` пересобираются, `routeTree.gen.ts` обновится авто.
- Никаких изменений в оплату/райф — уже отработано в `createPaymentForSchoolOrder`.

## Порядок реализации в одном заходе

1. Миграция + обновление schema.ts.
2. Роуты бэкенда: GET instructors, GET instructors/:slug, admin write — расширение полей.
3. Сид-скрипт под 5 инструкторов.
4. Фронт: `api-school.ts`, `queries.ts`.
5. `club.school.index.tsx`, `club.school.$instructorId.tsx` (без слотов).
6. Переименование `club.my-instructors.$instructorId.tsx` → `$chatId.tsx`, переписывание на API.
7. `club.my-instructors.index.tsx` → API.
8. `school.index.tsx`, `school.$instructorId.tsx`, `club.quests.tsx` — на тот же `qk.schoolInstructors`.
9. Тайпчек, сборка.

## Точки, где могу пойти не туда — подтверди

- Расширяем схему JSONB-полем `profile`, или ты хочешь дробную реляционную модель (skills/courses/gallery отдельными таблицами)? По ощущениям JSONB тут ок — контент редактируется цельно, отдельно ничего не искать.
- Секция «Свободные слоты» — точно убираем? Или оставить статичный UI с «скоро» до отдельной задачи?
- Публичные `/school` и `/school/:id` переводить в тот же заход, или их не трогать в шаге 1?
