import { pgTable, uuid, varchar, text, timestamp, index } from "drizzle-orm/pg-core";
import { users } from "./users.js";

/**
 * Тикеты в раздел «Помощь» (PWA).
 *
 * Логика: один вопрос → один ответ. Юзер не может дописывать после ответа.
 * Хочет ещё — создаёт новый тикет.
 *
 * status:
 *   'open'     — отправлен, ждёт ответа админа
 *   'answered' — админ ответил
 *   'closed'   — закрыт (юзер видит read-only в архиве)
 */
export const supportTickets = pgTable(
  "support_tickets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    category: varchar("category", { length: 16 }).notNull(), // bug | feature | question
    subject: varchar("subject", { length: 120 }).notNull(),
    body: text("body").notNull(),
    status: varchar("status", { length: 16 }).notNull().default("open"),
    adminReply: text("admin_reply"),
    answeredBy: uuid("answered_by").references(() => users.id, { onDelete: "set null" }),
    answeredAt: timestamp("answered_at", { withTimezone: true }),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userCreatedIdx: index("st_user_created_idx").on(t.userId, t.createdAt),
    statusCreatedIdx: index("st_status_created_idx").on(t.status, t.createdAt),
    categoryIdx: index("st_category_idx").on(t.category),
  }),
);

export type SupportTicket = typeof supportTickets.$inferSelect;
export type NewSupportTicket = typeof supportTickets.$inferInsert;

export const SUPPORT_CATEGORIES = ["bug", "feature", "question"] as const;
export type SupportCategory = (typeof SUPPORT_CATEGORIES)[number];

export const SUPPORT_STATUSES = ["open", "answered", "closed"] as const;
export type SupportStatus = (typeof SUPPORT_STATUSES)[number];
