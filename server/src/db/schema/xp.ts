import { pgTable, uuid, varchar, integer, text, timestamp, index } from "drizzle-orm/pg-core";
import { users } from "./users.js";

export const xpEvents = pgTable(
  "xp_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    amount: integer("amount").notNull(),
    source: varchar("source", { length: 40 }).notNull(),
    reason: text("reason").notNull(),
    refType: varchar("ref_type", { length: 40 }),
    refId: uuid("ref_id"),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("xp_user_idx").on(t.userId),
    userCreatedIdx: index("xp_user_created_idx").on(t.userId, t.createdAt),
    refIdx: index("xp_ref_idx").on(t.refType, t.refId),
  }),
);

export type XpEvent = typeof xpEvents.$inferSelect;
