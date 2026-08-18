import { pgTable, uuid, varchar, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { users } from "./users.js";

export const pushReminders = pgTable(
  "push_reminders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: varchar("kind", { length: 32 }).notNull(),
    refKey: varchar("ref_key", { length: 120 }).notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uniq: uniqueIndex("push_reminders_uniq").on(t.userId, t.kind, t.refKey),
  }),
);
