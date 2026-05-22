import { pgTable, uuid, varchar, text, timestamp, index } from "drizzle-orm/pg-core";
import { users } from "./users.js";

export const news = pgTable(
  "news",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: varchar("slug", { length: 160 }).notNull().unique(),
    title: varchar("title", { length: 240 }).notNull(),
    excerpt: text("excerpt").notNull().default(""),
    body: text("body").notNull().default(""),
    tag: varchar("tag", { length: 40 }).notNull().default("Клуб"),
    coverUrl: text("cover_url"),
    metaTitle: varchar("meta_title", { length: 240 }).notNull().default(""),
    metaDescription: text("meta_description").notNull().default(""),
    ogImage: text("og_image"),
    status: varchar("status", { length: 16 }).notNull().default("draft"), // draft|published
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    statusIdx: index("news_status_published_idx").on(t.status, t.publishedAt),
  }),
);

export type News = typeof news.$inferSelect;
export type NewNews = typeof news.$inferInsert;
