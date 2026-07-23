import { pgTable, uuid, varchar, text, integer, boolean, timestamp, index, primaryKey } from "drizzle-orm/pg-core";
import { users } from "./users.js";

/**
 * Новостные посты для NEWS-таба на /club.
 * Создаются админом (в перспективе — AI-агентом через админку).
 * Отдельная сущность от `posts` (лента HELLHOUND): у новостей есть title/category,
 * нет автора-юзера, нет опросов, свои лайки/комментарии.
 *
 * Комментарии пока не реализуем на бэке (в UI заглушка) — заведём отдельной
 * миграцией, когда будет готов флоу.
 */
export const newsPosts = pgTable(
  "news_posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    category: varchar("category", { length: 60 }).notNull().default(""),
    title: varchar("title", { length: 240 }).notNull(),
    text: text("text").notNull().default(""),
    imageUrl: text("image_url"),
    // Черновик/опубликовано. На публичном GET показываем только published.
    published: boolean("published").notNull().default(false),
    // Закреп сверху (аналогично posts.pinned).
    pinned: boolean("pinned").notNull().default(false),
    // Денормализованный счётчик лайков — держим ин-синк при like/unlike.
    likesCount: integer("likes_count").notNull().default(0),
    // Денормализованный счётчик комментариев (пока всегда 0 — комментов на бэке нет).
    commentsCount: integer("comments_count").notNull().default(0),
    // Опциональная дата публикации (для отложенного постинга AI-агентом).
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => ({
    feedIdx: index("news_posts_feed_idx").on(t.deletedAt, t.published, t.pinned, t.publishedAt),
  }),
);

export const newsPostLikes = pgTable(
  "news_post_likes",
  {
    postId: uuid("post_id").notNull().references(() => newsPosts.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.postId, t.userId] }),
    userIdx: index("news_post_likes_user_idx").on(t.userId),
  }),
);

export type NewsPost = typeof newsPosts.$inferSelect;
export type NewNewsPost = typeof newsPosts.$inferInsert;
