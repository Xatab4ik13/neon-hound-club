import { and, eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { quests, userQuestCompletions, type Quest } from "../db/schema/quests.js";
import { ticketCredit } from "./tickets.js";
import { awardXp } from "./xp.js";

/**
 * Стартовый набор квестов — создаётся при первом старте, если ещё нет в БД.
 * Дальше админ может править через `/api/v1/admin/quests`.
 *
 * code'ы используются как стабильные ключи для авто-триггеров из кода:
 *   - verify_email      — подтвердил email
 *   - profile_complete  — заполнил профиль (avatar + bio + city + phone)
 *   - first_bike        — добавил первую мото в гараж
 *   - first_order       — оплатил первый заказ в магазине
 *   - first_pass        — впервые активировал Hell Pass любого тира
 */
export const SEED_QUESTS: Array<{
  code: string;
  title: string;
  description: string;
  ticketsReward: number;
  kind: "auto" | "manual";
  repeatable?: boolean;
  sortOrder: number;
}> = [
  {
    code: "verify_email",
    title: "Подтвердить email",
    description: "Подтверди почту по ссылке из письма.",
    ticketsReward: 10,
    kind: "auto",
    sortOrder: 10,
  },
  {
    code: "profile_complete",
    title: "Заполнить профиль",
    description: "Аватар, город, телефон и пара слов о себе.",
    ticketsReward: 20,
    kind: "auto",
    sortOrder: 20,
  },
  {
    code: "first_bike",
    title: "Добавить мото в гараж",
    description: "Расскажи на чём катаешь.",
    ticketsReward: 25,
    kind: "auto",
    sortOrder: 30,
  },
  {
    code: "first_order",
    title: "Первый заказ в магазине",
    description: "Любой оплаченный заказ.",
    ticketsReward: 50,
    kind: "auto",
    sortOrder: 40,
  },
  {
    code: "first_pass",
    title: "Активировать Hell Pass",
    description: "Любой тир. Засчитывается один раз.",
    ticketsReward: 30,
    kind: "auto",
    sortOrder: 50,
  },
];

export async function seedQuests(): Promise<void> {
  for (const q of SEED_QUESTS) {
    await db
      .insert(quests)
      .values({
        code: q.code,
        title: q.title,
        description: q.description,
        ticketsReward: q.ticketsReward,
        kind: q.kind,
        repeatable: q.repeatable ?? false,
        sortOrder: q.sortOrder,
      })
      .onConflictDoNothing({ target: quests.code });
  }
}

export async function getQuestByCode(code: string): Promise<Quest | null> {
  const [row] = await db.select().from(quests).where(eq(quests.code, code)).limit(1);
  return row ?? null;
}

/**
 * Засчитать квест юзеру. Идемпотентно для нерепитабельных квестов:
 * повторный вызов не задвоит билеты.
 *
 * Возвращает { credited: true, completionId, tickets } если зачли;
 * { credited: false, reason } если квест уже пройден / неактивен / не найден.
 */
export async function completeQuest(
  userId: string,
  code: string,
): Promise<
  | { credited: true; completionId: string; tickets: number }
  | { credited: false; reason: string }
> {
  const quest = await getQuestByCode(code);
  if (!quest) return { credited: false, reason: "quest_not_found" };
  if (!quest.active) return { credited: false, reason: "quest_inactive" };

  if (!quest.repeatable) {
    const [exists] = await db
      .select({ id: userQuestCompletions.id })
      .from(userQuestCompletions)
      .where(
        and(eq(userQuestCompletions.userId, userId), eq(userQuestCompletions.questId, quest.id)),
      )
      .limit(1);
    if (exists) return { credited: false, reason: "already_completed" };
  }

  const [completion] = await db
    .insert(userQuestCompletions)
    .values({ userId, questId: quest.id, ticketsAwarded: quest.ticketsReward })
    .returning();

  if (quest.ticketsReward !== 0) {
    await ticketCredit({
      userId,
      amount: quest.ticketsReward,
      source: "quest",
      reason: `Квест: ${quest.title}`,
      refType: "quest",
      refId: completion!.id,
    });
  }

  // +XP за квест: 10 XP за каждый билет (минимум 25)
  const xp = Math.max(25, quest.ticketsReward * 10);
  await awardXp({
    userId,
    amount: xp,
    source: "quest",
    reason: `Квест: ${quest.title}`,
    refType: "quest_completion",
    refId: completion!.id,
    idempotent: true,
  });

  return { credited: true, completionId: completion!.id, tickets: quest.ticketsReward };
}

/** Безопасный триггер: ловит исключения, чтобы не валить основной запрос. */
export async function tryCompleteQuest(userId: string, code: string): Promise<void> {
  try {
    await completeQuest(userId, code);
  } catch {
    // не критично — основная операция уже прошла
  }
}
