import { pgTable, uuid, varchar, text, integer, boolean, timestamp, unique, index } from "drizzle-orm/pg-core";
import { users } from "./users.js";

export const badges = pgTable("badges", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: varchar("code", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 120 }).notNull(),
  description: text("description").notNull().default(""),
  rarity: varchar("rarity", { length: 16 }).notNull().default("common"),
  category: varchar("category", { length: 24 }).notNull().default("club"),
  issue: varchar("issue", { length: 16 }),
  mintedOf: integer("minted_of"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const userBadges = pgTable(
  "user_badges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    badgeId: uuid("badge_id").notNull().references(() => badges.id, { onDelete: "cascade" }),
    pinned: boolean("pinned").notNull().default(false),
    awardedAt: timestamp("awarded_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("user_badges_user_idx").on(t.userId),
    uq: unique().on(t.userId, t.badgeId),
  }),
);

export type Badge = typeof badges.$inferSelect;
export type UserBadge = typeof userBadges.$inferSelect;
export const BADGE_RARITIES = ["common", "rare", "epic", "legendary", "mythic"] as const;
export const BADGE_CATEGORIES = ["rank", "club", "pass", "event", "achievement", "founder"] as const;
