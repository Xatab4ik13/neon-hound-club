import { and, eq, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import {
  quests,
  userQuestCompletions,
  questProgress,
  type Quest,
} from "../db/schema/quests.js";
import { ticketCredit } from "./tickets.js";
import { awardXp } from "./xp.js";

/**
 * Зафиксированная сетка квестов (см. .lovable/plan.md).
 * Сумма XP по разовым + monthly (за месяц) + полная лестница AI ≈ 2050 XP
 * — ровно порог Road Captain.
 */
export const SEED_QUESTS: Array<{
  code: string;
  title: string;
  description: string;
  category: "onboarding" | "ride" | "social" | "shop" | "ai" | "referral" | "app";
  kind: "one_time" | "monthly" | "ladder" | "manual";
  xpReward: number;
  ticketsReward: number;
  goal: number;
  unit: string;
  actionLabel?: string;
  actionTo?: string;
  bonusNote?: string;
  bloggerOnly?: boolean;
  ladder?: Array<{ at: number; xp: number }>;
  sortOrder: number;
}> = [
  {
    code: "profile_and_bike",
    title: "Заполни профиль и добавь мотоцикл",
    description: "Аватар, город, телефон, пара слов о себе и мотоцикл в гараже — это нужно для розыгрышей и доставки.",
    category: "onboarding",
    kind: "one_time",
    xpReward: 300,
    ticketsReward: 0,
    goal: 2,
    unit: "из 2",
    actionLabel: "В гараж",
    actionTo: "/club/garage",
    sortOrder: 10,
  },
  {
    code: "ride_500km",
    title: "Накатать 500 км",
    description: "Запиши поездки в журнал байка — суммарно 500 км за месяц.",
    category: "ride",
    kind: "monthly",
    xpReward: 200,
    ticketsReward: 0,
    goal: 500,
    unit: "км",
    actionLabel: "Открыть журнал",
    actionTo: "/club/garage",
    sortOrder: 20,
  },
  {
    code: "comments_5",
    title: "5 комментариев в ленте",
    description: "Поддержи движ — оставь 5 комментариев в клубной ленте за месяц.",
    category: "social",
    kind: "monthly",
    xpReward: 100,
    ticketsReward: 0,
    goal: 5,
    unit: "комментариев",
    actionLabel: "В ленту",
    actionTo: "/club",
    sortOrder: 30,
  },
  {
    code: "posts_5_blogger",
    title: "5 постов в ленту",
    description: "Только для блогеров. Опубликуй 5 постов в клубной ленте за месяц.",
    category: "social",
    kind: "monthly",
    xpReward: 100,
    ticketsReward: 0,
    goal: 5,
    unit: "постов",
    bloggerOnly: true,
    actionLabel: "В кабинет блогера",
    actionTo: "/blogger",
    sortOrder: 40,
  },
  {
    code: "shop_order",
    title: "Заказ из магазина",
    description: "Любая оплаченная покупка в клубном магазине за месяц.",
    category: "shop",
    kind: "monthly",
    xpReward: 250,
    ticketsReward: 1,
    goal: 1,
    unit: "заказ",
    actionLabel: "В магазин",
    actionTo: "/club/shop",
    sortOrder: 50,
  },
  {
    code: "invite_friend",
    title: "Пригласи друга",
    description: "Друг регистрируется по твоей ссылке и подтверждает email. Билет получите оба.",
    category: "referral",
    kind: "one_time",
    xpReward: 400,
    ticketsReward: 1,
    goal: 1,
    unit: "друг",
    bonusNote: "+1 билет другу",
    actionLabel: "Реферальная ссылка",
    actionTo: "/club/invite",
    sortOrder: 60,
  },
  {
    code: "pwa_install",
    title: "Установи приложение",
    description: "Добавь клуб на главный экран — это PWA с пуш-уведомлениями. Откроем гайд под твоё устройство.",
    category: "app",
    kind: "one_time",
    xpReward: 200,
    ticketsReward: 1,
    goal: 1,
    unit: "установка",
    actionLabel: "Как установить",
    actionTo: "/club/install",
    sortOrder: 70,
  },
  {
    code: "hell_ai_ladder",
    title: "Общайся с Hell AI",
    description: "Спрашивай по своему мото — чем больше вопросов, тем больше XP. Прогресс по ступеням.",
    category: "ai",
    kind: "ladder",
    xpReward: 600, // суммарно по всей шкале
    ticketsReward: 0,
    goal: 50,
    unit: "вопросов",
    ladder: [
      { at: 5, xp: 50 },
      { at: 10, xp: 100 },
      { at: 20, xp: 150 },
      { at: 35, xp: 150 },
      { at: 50, xp: 150 },
    ],
    actionLabel: "Открыть Hell AI",
    actionTo: "/club/hell-ai",
    sortOrder: 80,
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
        category: q.category,
        kind: q.kind,
        xpReward: q.xpReward,
        ticketsReward: q.ticketsReward,
        goal: q.goal,
        unit: q.unit,
        actionLabel: q.actionLabel ?? null,
        actionTo: q.actionTo ?? null,
        bonusNote: q.bonusNote ?? null,
        bloggerOnly: q.bloggerOnly ?? false,
        ladder: q.ladder ?? null,
        sortOrder: q.sortOrder,
        repeatable: q.kind === "monthly" || q.kind === "ladder",
      })
      .onConflictDoUpdate({
        target: quests.code,
        set: {
          title: q.title,
          description: q.description,
          category: q.category,
          kind: q.kind,
          xpReward: q.xpReward,
          ticketsReward: q.ticketsReward,
          goal: q.goal,
          unit: q.unit,
          actionLabel: q.actionLabel ?? null,
          actionTo: q.actionTo ?? null,
          bonusNote: q.bonusNote ?? null,
          bloggerOnly: q.bloggerOnly ?? false,
          ladder: q.ladder ?? null,
          sortOrder: q.sortOrder,
          repeatable: q.kind === "monthly" || q.kind === "ladder",
          active: true,
          updatedAt: new Date(),
        },
      });
  }
}

export async function getQuestByCode(code: string): Promise<Quest | null> {
  const [row] = await db.select().from(quests).where(eq(quests.code, code)).limit(1);
  return row ?? null;
}

/** Текущий period_key: 'YYYY-MM' (UTC) для monthly, 'all' для остальных. */
export function periodKeyFor(kind: string, now: Date = new Date()): string {
  if (kind !== "monthly") return "all";
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/**
 * Засчитать прохождение квеста (для one_time / monthly).
 * Идемпотентно по (user, quest, period_key) — повторный вызов в том же периоде
 * не задвоит билеты/XP.
 *
 * Для kind='ladder' используй addLadderProgress.
 */
export async function completeQuest(
  userId: string,
  code: string,
): Promise<
  | { credited: true; completionId: string; tickets: number; xp: number }
  | { credited: false; reason: string }
> {
  const quest = await getQuestByCode(code);
  if (!quest) return { credited: false, reason: "quest_not_found" };
  if (!quest.active) return { credited: false, reason: "quest_inactive" };
  if (quest.kind === "ladder") return { credited: false, reason: "use_ladder_progress" };

  const periodKey = periodKeyFor(quest.kind);

  const [exists] = await db
    .select({ id: userQuestCompletions.id })
    .from(userQuestCompletions)
    .where(
      and(
        eq(userQuestCompletions.userId, userId),
        eq(userQuestCompletions.questId, quest.id),
        eq(userQuestCompletions.periodKey, periodKey),
      ),
    )
    .limit(1);
  if (exists) return { credited: false, reason: "already_completed" };

  const [completion] = await db
    .insert(userQuestCompletions)
    .values({
      userId,
      questId: quest.id,
      periodKey,
      ticketsAwarded: quest.ticketsReward,
      xpAwarded: quest.xpReward,
    })
    .returning();

  if (quest.ticketsReward > 0) {
    await ticketCredit({
      userId,
      amount: quest.ticketsReward,
      source: "quest",
      reason: `Квест: ${quest.title}`,
      refType: "quest",
      refId: completion!.id,
    });
  }
  if (quest.xpReward > 0) {
    await awardXp({
      userId,
      amount: quest.xpReward,
      source: "quest",
      reason: `Квест: ${quest.title}`,
      refType: "quest_completion",
      refId: completion!.id,
      idempotent: true,
    });
  }

  return {
    credited: true,
    completionId: completion!.id,
    tickets: quest.ticketsReward,
    xp: quest.xpReward,
  };
}

/** Безопасный триггер для one_time/monthly — ловит исключения. */
export async function tryCompleteQuest(userId: string, code: string): Promise<void> {
  try {
    await completeQuest(userId, code);
  } catch {
    // не критично — основная операция уже прошла
  }
}

/**
 * Прибавить прогресс счётчика. Если цель достигнута и квест ещё не зачтён в
 * текущем периоде — авто-completeQuest.
 *
 * Для kind='ladder' начисляет XP за каждую новую пройденную ступень.
 */
export async function addQuestProgress(
  userId: string,
  code: string,
  delta: number,
): Promise<void> {
  if (delta <= 0) return;
  const quest = await getQuestByCode(code);
  if (!quest || !quest.active) return;
  if (quest.kind === "one_time" || quest.kind === "manual") return;

  const periodKey = periodKeyFor(quest.kind);

  // Upsert строки прогресса.
  await db
    .insert(questProgress)
    .values({ userId, questId: quest.id, periodKey, progress: delta })
    .onConflictDoUpdate({
      target: [questProgress.userId, questProgress.questId, questProgress.periodKey],
      set: {
        progress: sql`${questProgress.progress} + ${delta}`,
        updatedAt: new Date(),
      },
    });

  const [row] = await db
    .select()
    .from(questProgress)
    .where(
      and(
        eq(questProgress.userId, userId),
        eq(questProgress.questId, quest.id),
        eq(questProgress.periodKey, periodKey),
      ),
    )
    .limit(1);
  if (!row) return;

  if (quest.kind === "monthly") {
    if (row.progress >= quest.goal) {
      await tryCompleteQuest(userId, quest.code);
    }
    return;
  }

  // ladder: начисляем XP за каждую вновь пройденную ступень.
  if (quest.kind === "ladder" && quest.ladder) {
    const reached = quest.ladder.filter((s) => row.progress >= s.at);
    const newSteps = reached.slice(row.lastLadderStep);
    if (newSteps.length === 0) return;

    for (const step of newSteps) {
      // completion per step (для лога), period_key = `step:${step.at}`
      const stepKey = `step:${step.at}`;
      const [stepCompletion] = await db
        .insert(userQuestCompletions)
        .values({
          userId,
          questId: quest.id,
          periodKey: stepKey,
          ticketsAwarded: 0,
          xpAwarded: step.xp,
        })
        .onConflictDoNothing()
        .returning();
      if (!stepCompletion) continue;
      await awardXp({
        userId,
        amount: step.xp,
        source: "quest",
        reason: `${quest.title}: ступень ${step.at}`,
        refType: "quest_ladder",
        refId: stepCompletion.id,
        idempotent: true,
      });
    }

    await db
      .update(questProgress)
      .set({ lastLadderStep: reached.length, updatedAt: new Date() })
      .where(eq(questProgress.id, row.id));
  }
}

/** Получить текущий прогресс юзера по квесту (для GET /quests/). */
export async function getMyProgress(
  userId: string,
  questId: string,
  periodKey: string,
): Promise<{ progress: number; lastLadderStep: number }> {
  const [row] = await db
    .select({ progress: questProgress.progress, lastLadderStep: questProgress.lastLadderStep })
    .from(questProgress)
    .where(
      and(
        eq(questProgress.userId, userId),
        eq(questProgress.questId, questId),
        eq(questProgress.periodKey, periodKey),
      ),
    )
    .limit(1);
  return row ?? { progress: 0, lastLadderStep: 0 };
}
