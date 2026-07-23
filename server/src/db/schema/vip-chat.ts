import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { users } from "./users.js";

/**
 * VIP-чат: персональная переписка подписчика с блогером (Hell).
 *
 * На текущий момент чат открыт всем авторизованным пользователям. В планах —
 * закрыть под Platinum Hell Pass (см. TODO в routes/vip-chat.ts).
 *
 * Тред уникален для пары (user_id, blogger_id). Блогер видит все свои
 * входящие как список чатов, юзер — один тред со «своим» блогером.
 */
export const vipChatThreads = pgTable(
  "vip_chat_threads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    bloggerId: uuid("blogger_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }).notNull().defaultNow(),
    lastMessagePreview: varchar("last_message_preview", { length: 200 }).notNull().default(""),
    // 'user' | 'blogger' — кто прислал последнее сообщение.
    lastMessageRole: varchar("last_message_role", { length: 16 }).notNull().default("user"),
    userUnread: integer("user_unread").notNull().default(0),
    bloggerUnread: integer("blogger_unread").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pairUq: uniqueIndex("vct_pair_uq").on(t.userId, t.bloggerId),
    bloggerLastIdx: index("vct_blogger_last_idx").on(t.bloggerId, t.lastMessageAt),
    userLastIdx: index("vct_user_last_idx").on(t.userId, t.lastMessageAt),
  }),
);

export const vipChatMessages = pgTable(
  "vip_chat_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => vipChatThreads.id, { onDelete: "cascade" }),
    senderId: uuid("sender_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // 'user' | 'blogger'
    senderRole: varchar("sender_role", { length: 16 }).notNull(),
    text: text("text"),
    sticker: varchar("sticker", { length: 120 }),
    imageUrl: text("image_url"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    threadCreatedIdx: index("vcm_thread_created_idx").on(t.threadId, t.createdAt),
  }),
);

export type VipChatThread = typeof vipChatThreads.$inferSelect;
export type NewVipChatThread = typeof vipChatThreads.$inferInsert;
export type VipChatMessage = typeof vipChatMessages.$inferSelect;
export type NewVipChatMessage = typeof vipChatMessages.$inferInsert;

export const VIP_CHAT_SENDER_ROLES = ["user", "blogger"] as const;
export type VipChatSenderRole = (typeof VIP_CHAT_SENDER_ROLES)[number];
