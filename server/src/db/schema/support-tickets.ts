import { pgTable, uuid, varchar, text, timestamp, index, jsonb } from "drizzle-orm/pg-core";
import { users } from "./users.js";

/**
 * Тикеты в раздел «Помощь» (PWA).
 *
 * Логика: полноценная переписка. Пока тикет не закрыт, юзер может дописывать
 * в тот же тикет, админ — отвечать. Сообщения лежат в support_ticket_messages.
 * Поля body / admin_reply оставлены для обратной совместимости:
 *   body — первое сообщение юзера, admin_reply — последний ответ админа.
 *
 * status:
 *   'open'     — есть новое сообщение юзера, ждёт ответа админа
 *   'answered' — админ ответил последним
 *   'closed'   — закрыт (read-only)
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
    /** Публичные URL прикреплённых юзером картинок (до 4 шт). */
    attachments: jsonb("attachments").$type<string[]>().notNull().default([]),
    status: varchar("status", { length: 16 }).notNull().default("open"),
    adminReply: text("admin_reply"),
    answeredBy: uuid("answered_by").references(() => users.id, { onDelete: "set null" }),
    answeredAt: timestamp("answered_at", { withTimezone: true }),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userCreatedIdx: index("st_user_created_idx").on(t.userId, t.createdAt),
    statusCreatedIdx: index("st_status_created_idx").on(t.status, t.createdAt),
    categoryIdx: index("st_category_idx").on(t.category),
  }),
);

/** Сообщения переписки внутри тикета. */
export const supportTicketMessages = pgTable(
  "support_ticket_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ticketId: uuid("ticket_id")
      .notNull()
      .references(() => supportTickets.id, { onDelete: "cascade" }),
    /** 'user' | 'admin' */
    authorRole: varchar("author_role", { length: 8 }).notNull(),
    authorId: uuid("author_id").references(() => users.id, { onDelete: "set null" }),
    body: text("body").notNull(),
    attachments: jsonb("attachments").$type<string[]>().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    ticketCreatedIdx: index("stm_ticket_created_idx").on(t.ticketId, t.createdAt),
  }),
);

export type SupportTicket = typeof supportTickets.$inferSelect;
export type NewSupportTicket = typeof supportTickets.$inferInsert;
export type SupportTicketMessage = typeof supportTicketMessages.$inferSelect;

export const SUPPORT_CATEGORIES = ["bug", "feature", "question"] as const;
export type SupportCategory = (typeof SUPPORT_CATEGORIES)[number];

export const SUPPORT_STATUSES = ["open", "answered", "closed"] as const;
export type SupportStatus = (typeof SUPPORT_STATUSES)[number];

export const SUPPORT_AUTHOR_ROLES = ["user", "admin"] as const;
export type SupportAuthorRole = (typeof SUPPORT_AUTHOR_ROLES)[number];
