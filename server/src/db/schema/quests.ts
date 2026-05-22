import { pgTable, uuid, varchar, integer, text, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { users } from "./users.js";

/**
 * Каталог квестов. `code` — стабильный идентификатор для триггеров из кода
 * (например, `verify_email`, `first_bike`, `first_order`).
 *
 * kind:
 *   - 'auto'   — засчитывается автоматически при наступлении события в системе
 *   - 'manual' — засчитывается админом вручную (например, «выложил рилс с хэштегом»)
 *
 * repeatable:
 *   - false — квест можно пройти 1 раз (стартовые задания)
 *   - true  — можно засчитывать многократно (повторяющиеся активности)
 */
export const quests = pgTable(
  "quests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: varchar("code", { length: 64 }).notNull().unique(),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description").notNull().default(""),
    ticketsReward: integer("tickets_reward").notNull(),
    kind: varchar("kind", { length: 16 }).notNull().default("auto"),
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

/** Лог завершений. Для нерепитабельных квестов уникальность контролируется в коде. */
export const userQuestCompletions = pgTable(
  "user_quest_completions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    questId: uuid("quest_id")
      .notNull()
      .references(() => quests.id, { onDelete: "cascade" }),
    ticketsAwarded: integer("tickets_awarded").notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("uqc_user_idx").on(t.userId),
    userQuestIdx: index("uqc_user_quest_idx").on(t.userId, t.questId),
  }),
);

export type Quest = typeof quests.$inferSelect;
export type QuestCompletion = typeof userQuestCompletions.$inferSelect;

export const QUEST_KINDS = ["auto", "manual"] as const;
export type QuestKind = (typeof QUEST_KINDS)[number];
