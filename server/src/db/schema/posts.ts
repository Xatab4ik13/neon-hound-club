import { pgTable, uuid, text, boolean, timestamp, integer, varchar, jsonb, index, primaryKey } from "drizzle-orm/pg-core";
import { users } from "./users.js";

export type PollOption = { id: string; text: string };
export type PollDef = {
  question: string;
  anonymous: boolean;
  multi: boolean;
  closed: boolean;
  options: PollOption[];
};

export const posts = pgTable(
  "posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    authorId: uuid("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    text: text("text").notNull().default(""),
    imageUrl: text("image_url"),
    pinned: boolean("pinned").notNull().default(false),
    poll: jsonb("poll").$type<PollDef | null>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => ({
    feedIdx: index("posts_feed_idx").on(t.deletedAt, t.pinned, t.createdAt),
    authorIdx: index("posts_author_idx").on(t.authorId, t.createdAt),
  }),
);

export const postLikes = pgTable(
  "post_likes",
  {
    postId: uuid("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.postId, t.userId] }) }),
);

export const postComments = pgTable(
  "post_comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    postId: uuid("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
    authorId: uuid("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    likes: integer("likes").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => ({ postIdx: index("post_comments_post_idx").on(t.postId, t.createdAt) }),
);

export const postPollVotes = pgTable(
  "post_poll_votes",
  {
    postId: uuid("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    optionId: varchar("option_id", { length: 64 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.postId, t.userId, t.optionId] }) }),
);

export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
export type PostComment = typeof postComments.$inferSelect;
