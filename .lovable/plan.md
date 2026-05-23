## Цель

Привести бэкенд квестов в полное соответствие с зафиксированной сеткой:

| Код | Заголовок | Тип | XP | Билеты | Триггер |
|---|---|---|---|---|---|
| `profile_and_bike` | Заполнить профиль + добавить мото | one-time | 300 | 0 | profile_complete && first_bike |
| `ride_500km` | Накатать 500 км | monthly | 200 | 0 | сумма км из bike-journal за месяц ≥ 500 |
| `comments_5` | 5 комментариев в ленте | monthly | 100 | 0 | счётчик комментариев за месяц ≥ 5 |
| `posts_5_blogger` | 5 постов в ленту | monthly, bloggerOnly | 100 | 0 | счётчик постов автора за месяц ≥ 5 |
| `shop_order` | Заказ из магазина | monthly | 250 | 1 | оплаченный заказ в текущем месяце |
| `invite_friend` | Пригласи друга | one-time | 400 | 1 (+1 другу) | реферал друг зарегистрирован И активен |
| `pwa_install` | Установи приложение | one-time | 200 | 1 | beforeinstallprompt принят (или iOS — ручное подтверждение фронтом) |
| `hell_ai_ladder` | Общайся с Hell AI | ladder | до 600 (50/100/150/150/150) | 0 | количество вопросов к AI: ступени 5/10/20/35/50 |

Итого по всем разовым+первая итерация ежемесячных+полная лестница ≈ **2050 XP** → ровно порог **Road Captain**.

## Что меняется на бэке

### 1. Schema (`server/src/db/schema/quests.ts`)

Добавить поля в `quests`:
- `xpReward integer NOT NULL DEFAULT 0` — XP за выполнение (или сумма по всей лестнице).
- `kind` расширить значениями: `auto` → заменить на `one_time | monthly | ladder | manual`.
- `bloggerOnly boolean NOT NULL DEFAULT false`.
- `goal integer NOT NULL DEFAULT 1` — цель (км, шт, заказов).
- `unit varchar(32) NOT NULL DEFAULT ''` — для UI («км», «комментариев»…).
- `actionLabel varchar(64)` / `actionTo varchar(128)` — кнопка-CTA.
- `bonusNote varchar(120)` — например «+1 билет другу».
- `ladder jsonb` — массив `[{at, xp}]` для `kind=ladder` (NULL для остальных).

Новая таблица `quest_progress` для ежемесячных и ladder:
```
id, user_id, quest_id, period_key text NOT NULL,  -- '2026-05' для monthly, 'all' для ladder/one-time
progress int NOT NULL DEFAULT 0,
last_ladder_step int NOT NULL DEFAULT 0,  -- индекс последней зачтённой ступени
updated_at timestamptz
UNIQUE (user_id, quest_id, period_key)
```

Таблица `user_quest_completions` остаётся (лог), но смысл «уже зачтено» теперь:
- one-time: запись существует.
- monthly: запись существует за текущий `period_key` (YYYY-MM).
- ladder: количество записей = пройденные ступени.

### 2. Lib (`server/src/lib/quests.ts`)

Переписать SEED под таблицу выше. Переписать `completeQuest`:
- Берёт XP из `quest.xpReward`, билеты из `quest.ticketsReward` — убрать формулу `max(25, tickets*10)`.
- Для `monthly` — period_key = текущий месяц UTC; повторное прохождение разрешено в следующем месяце.
- Для `ladder` — принимает `progress: number`, начисляет XP за каждую новую пройденную ступень и пишет по completion на ступень.
- Для `one_time` — старая логика.

Новые хелперы:
- `addQuestProgress(userId, code, delta)` — для счётчиков (комментарии, км, AI-вопросы, посты блогера). Атомарно обновляет `quest_progress`, если цель достигнута — вызывает `completeQuest`.
- `addAiLadderProgress(userId, delta=1)` — отдельный для лестницы Hell AI.

### 3. Триггеры в существующих роутах

- `auth.ts` (register с реферальным кодом) → после создания юзера и привязки реферала вызвать `tryCompleteQuest(referrerUserId, "invite_friend")`. (`+1 билет другу` уже идёт через существующую логику рефералов — проверить, не задвоится.)
- `profile.ts` после `PATCH /profile/me` и `POST /garage` → если профиль полный И есть хотя бы один байк → `tryCompleteQuest(userId, "profile_and_bike")`. (Удалить старые `profile_complete` и `first_bike`.)
- `shop.ts` при переводе заказа в `paid` → `tryCompleteQuest(userId, "shop_order")` (теперь monthly, не first_order).
- `bike-journal.ts` при добавлении записи о поездке → `addQuestProgress(userId, "ride_500km", km)`.
- `feed.ts` при создании комментария → `addQuestProgress(userId, "comments_5", 1)`. При создании поста блогером → `addQuestProgress(userId, "posts_5_blogger", 1)`.
- Hell AI роут (где-то в `routes/`, проверить наличие; если нет — создать заглушку-каунтер) → при каждом вопросе `addAiLadderProgress(userId)`.
- Новый эндпоинт `POST /api/v1/quests/pwa_install/confirm` — фронт дёргает после успешного `beforeinstallprompt` или после подтверждения юзером на iOS. Делает `completeQuest(userId, "pwa_install")`.
- Удалить триггеры `verify_email` и `first_pass` (не входят в новую сетку — или оставить как отдельные «бонусные», если хочешь; см. вопрос ниже).

### 4. Routes (`server/src/routes/quests.ts`)

`GET /api/v1/quests/` теперь возвращает на каждый квест:
```
{ id, code, title, description, kind, xpReward, ticketsReward, goal, unit,
  bloggerOnly, actionLabel, actionTo, bonusNote, ladder,
  progress, periodKey, completed, completedAt }
```
- `progress` — из `quest_progress` за текущий period_key.
- Для blogger-only квестов — отдаём только если у юзера роль `blogger` или `admin`.

Админка `/api/v1/admin/quests/` — обновить Zod-схемы под новые поля.

### 5. Migration

Один файл `0007_quests_v2.sql`:
- `ALTER TABLE quests ADD COLUMN xp_reward int NOT NULL DEFAULT 0`, `kind varchar(16) NOT NULL DEFAULT 'one_time'`, `blogger_only boolean NOT NULL DEFAULT false`, `goal int NOT NULL DEFAULT 1`, `unit varchar(32) NOT NULL DEFAULT ''`, `action_label varchar(64)`, `action_to varchar(128)`, `bonus_note varchar(120)`, `ladder jsonb`.
- `CREATE TABLE quest_progress (...)`.
- На старте `seedQuests()` сделает `INSERT ... ON CONFLICT (code) DO UPDATE` — затрёт текущие 5 квестов на новые 8.

## Что меняется на фронте

- `src/lib/queries.ts` — расширить тип `QuestItem` новыми полями. Убрать локальный seed `CLUB_QUESTS` из `src/data/quests.ts` (или оставить только хелперы `questPct`, `ladderEarnedXp`, `nextLadderStep`, `CATEGORY_LABEL` — они переиспользуются).
- `src/routes/club.quests.tsx` и `src/components/club/QuestsBlock.tsx` — уже умеют рендерить XP/билеты/лестницу/bloggerOnly, надо просто пробросить новые поля из API вместо мока.
- `src/routes/club.install.tsx` — после `installNow()` дёрнуть новый эндпоинт `POST /quests/pwa_install/confirm`.

## Деплой

После мёрджа — стандартная команда:
```
cd /opt/hhr/server && git pull && docker compose up -d --build api
```
Миграция `0007_quests_v2.sql` накатится автоматически на старте.

## Уточняющие вопросы (перед стартом)

1. **`verify_email` и `first_pass`** в новой сетке отсутствуют. Сейчас они дают билеты (10 и 30). Удалить полностью или оставить как «бонусные» вне основного списка (видны юзеру, но не считаются в формулу 2050 XP)?
2. **Период для monthly** — календарный месяц UTC или скользящие 30 дней с момента активации Pass?
3. **`invite_friend` — one-time или повторяемый?** В оригинале (#680) сказано `(one-time)`, но в брифе реферальная программа выглядит бессрочной (приглашаешь 10 человек — получаешь 10 билетов). Оставить one-time как договаривались, или сделать повторяемым (по 400 XP + 1 билет за каждого друга)?
4. **`shop_order` monthly** — даёт +1 билет в месяц независимо от числа заказов; параллельно у тебя уже работают бонус-билеты на каждый товар. Так и было задумано? (Я понял из #647 что да.)
