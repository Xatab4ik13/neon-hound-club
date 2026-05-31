import { pgTable, uuid, timestamp, primaryKey, index } from "drizzle-orm/pg-core";
import { users } from "./users.js";
import { posts } from "./posts.js";

export const postReads = pgTable(
  "post_reads",
  {
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    postId: uuid("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
    lastReadAt: timestamp("last_read_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.postId] }),
    userIdx: index("post_reads_user_idx").on(t.userId),
  }),
);

export type PostRead = typeof postReads.$inferSelect;
