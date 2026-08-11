import { pgTable, uuid, integer, timestamp, date, index, primaryKey } from "drizzle-orm/pg-core";
import { users } from "./users.js";

/**
 * Посуточная активность юзера (для рекламной статистики: DAU/WAU/MAU,
 * среднее время на сайте, число сессий). Обновляется из heartbeat'а сессии.
 */
export const userActivityDays = pgTable(
  "user_activity_days",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    day: date("day").notNull(),
    activeSeconds: integer("active_seconds").notNull().default(0),
    sessions: integer("sessions").notNull().default(0),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.day] }),
    dayIdx: index("user_activity_days_day_idx").on(t.day),
  }),
);

export type UserActivityDay = typeof userActivityDays.$inferSelect;
