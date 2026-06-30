import { pgTable, uuid, varchar, text, timestamp, integer, boolean, index } from "drizzle-orm/pg-core";
import { users } from "./users.js";

/** Singleton-настройки Hell AI (id = 1). Меняются из админки без передеплоя. */
export const aiSettings = pgTable("ai_settings", {
  id: integer("id").primaryKey().default(1),
  systemPrompt: text("system_prompt").notNull().default(""),
  signature: text("signature"),
  bannedTopics: text("banned_topics"),
  model: varchar("model", { length: 80 }).notNull().default("openai/gpt-5"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
});

export type AiSettings = typeof aiSettings.$inferSelect;

/** Журнал сообщений Hell AI. role: 'user' | 'assistant'. */
export const aiMessages = pgTable(
  "ai_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    chatId: varchar("chat_id", { length: 64 }),
    role: varchar("role", { length: 16 }).notNull(),
    content: text("content").notNull(),
    bikeId: uuid("bike_id"),
    /** Pass, к которому привязано сообщение. NULL = free-режим (учитывается в 3/24h). */
    passId: uuid("pass_id"),
    model: varchar("model", { length: 80 }),
    tokensIn: integer("tokens_in"),
    tokensOut: integer("tokens_out"),
    error: boolean("error").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("ai_msg_user_idx").on(t.userId, t.createdAt),
    chatIdx: index("ai_msg_chat_idx").on(t.chatId),
    roleIdx: index("ai_msg_role_idx").on(t.userId, t.role, t.createdAt),
  }),
);

export type AiMessage = typeof aiMessages.$inferSelect;
export type NewAiMessage = typeof aiMessages.$inferInsert;

/** Список моделей, которые админ может выбрать в селекте. */
export const ALLOWED_AI_MODELS = [
  "openrouter/auto",
  "openai/gpt-5",
  "openai/gpt-5-mini",
  "anthropic/claude-sonnet-4.5",
  "google/gemini-2.5-pro",
] as const;
export type AiModel = (typeof ALLOWED_AI_MODELS)[number];
