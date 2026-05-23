import { pgTable, uuid, varchar, integer, text, boolean, timestamp, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core";
import { users } from "./users.js";

/**
 * Каталог квестов v2. См. .lovable/plan.md — балансировка XP/билетов под
 * порог Road Captain (≈2050 XP).
 *
 * kind:
 *   - 'one_time' — выполнить можно один раз
 *   - 'monthly'  — выполнить можно раз в календарный месяц (UTC)
 *   - 'ladder'   — ступенчатая шкала (используется ladder JSON)
 *   - 'manual'   — засчитывает только админ
 *
 * category — для группировки в UI: onboarding/ride/social/shop/ai/referral/app.
 *
 * ladder = JSON массив [{ at: number, xp: number }] для kind='ladder'.
 *   Каждая ступень даёт свою порцию XP. Поле ticketsReward для лестницы — 0.
 */
export const quests = pgTable(
  "quests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: varchar("code", { length: 64 }).notNull().unique(),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description").notNull().default(""),
    category: varchar("category", { length: 32 }).notNull().default("onboarding"),
    kind: varchar("kind", { length: 16 }).notNull().default("one_time"),
    xpReward: integer("xp_reward").notNull().default(0),
    ticketsReward: integer("tickets_reward").notNull().default(0),
    goal: integer("goal").notNull().default(1),
    unit: varchar("unit", { length: 32 }).notNull().default(""),
    actionLabel: varchar("action_label", { length: 64 }),
    actionTo: varchar("action_to", { length: 128 }),
    bonusNote: varchar("bonus_note", { length: 160 }),
    ladder: jsonb("ladder").$type<Array<{ at: number; xp: number }> | null>(),
    bloggerOnly: boolean("blogger_only").notNull().default(false),
    repeatable: boolean("repeatable").notNull().default(false),
    active: boolean("active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    activeIdx: index("q_active_idx").on(t.active, t.sortOrder),
  }),
);

/** Лог завершений. Для monthly/ladder уникальность по (user, quest, period_key). */
export const userQuestCompletions = pgTable(
  "user_quest_completions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    questId: uuid("quest_id").notNull().references(() => quests.id, { onDelete: "cascade" }),
    periodKey: varchar("period_key", { length: 16 }).notNull().default("all"),
    ticketsAwarded: integer("tickets_awarded").notNull(),
    xpAwarded: integer("xp_awarded").notNull().default(0),
    completedAt: timestamp("completed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("uqc_user_idx").on(t.userId),
    userQuestIdx: index("uqc_user_quest_idx").on(t.userId, t.questId),
    uniqByPeriod: uniqueIndex("uqc_user_quest_period_uniq").on(t.userId, t.questId, t.periodKey),
  }),
);

/** Прогресс по квестам со счётчиком (комментарии, км, ai-вопросы). */
export const questProgress = pgTable(
  "quest_progress",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    questId: uuid("quest_id").notNull().references(() => quests.id, { onDelete: "cascade" }),
    periodKey: varchar("period_key", { length: 16 }).notNull().default("all"),
    progress: integer("progress").notNull().default(0),
    lastLadderStep: integer("last_ladder_step").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uniq: uniqueIndex("quest_progress_uniq").on(t.userId, t.questId, t.periodKey),
    userIdx: index("quest_progress_user_idx").on(t.userId),
  }),
);

export type Quest = typeof quests.$inferSelect;
export type QuestCompletion = typeof userQuestCompletions.$inferSelect;
export type QuestProgress = typeof questProgress.$inferSelect;

export const QUEST_KINDS = ["one_time", "monthly", "ladder", "manual"] as const;
export type QuestKind = (typeof QUEST_KINDS)[number];

export const QUEST_CATEGORIES = ["onboarding", "ride", "social", "shop", "ai", "referral", "app"] as const;
export type QuestCategory = (typeof QUEST_CATEGORIES)[number];
