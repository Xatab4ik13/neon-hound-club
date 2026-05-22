import { pgTable, uuid, varchar, integer, timestamp, index } from "drizzle-orm/pg-core";
import { users } from "./users.js";

export const referralCodes = pgTable("referral_codes", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  code: varchar("code", { length: 40 }).notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const referrals = pgTable(
  "referrals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    referrerId: uuid("referrer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    invitedUserId: uuid("invited_user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
    code: varchar("code", { length: 40 }).notNull(),
    status: varchar("status", { length: 16 }).notNull().default("joined"),
    ticketsRewarded: integer("tickets_rewarded").notNull().default(0),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
    activatedAt: timestamp("activated_at", { withTimezone: true }),
  },
  (t) => ({ referrerIdx: index("referrals_referrer_idx").on(t.referrerId) }),
);

export type ReferralCode = typeof referralCodes.$inferSelect;
export type Referral = typeof referrals.$inferSelect;
