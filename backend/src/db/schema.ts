import { pgTable, uuid, text, timestamp, varchar, integer, pgEnum, index, boolean, uniqueIndex } from "drizzle-orm/pg-core";

// ============ auth ============
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const profiles = pgTable("profiles", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  displayName: varchar("display_name", { length: 80 }).notNull(),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ============ Hell Pass ============
export const tierEnum = pgEnum("tier", ["silver", "gold", "platinum"]);

// Справочник тиров. Заполняется сидом, читается публично.
export const subscriptionTiers = pgTable("subscription_tiers", {
  tier: tierEnum("tier").primaryKey(),
  priceRub: integer("price_rub").notNull(),         // 490 / 1290 / 2990
  monthlyTickets: integer("monthly_tickets").notNull(), // сколько билетов начисляется при активации/продлении
  aiMonthlyLimit: integer("ai_monthly_limit").notNull(), // 20 / 100 / -1 (∞)
  name: varchar("name", { length: 40 }).notNull(),
});

export const subStatusEnum = pgEnum("sub_status", ["active", "cancelled", "expired"]);

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    tier: tierEnum("tier").notNull(),
    status: subStatusEnum("status").notNull().default("active"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }).notNull(),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("subscriptions_user_idx").on(t.userId),
  }),
);

// Журнал операций с билетами. Баланс = SUM(delta) WHERE user_id = ?
export const ticketReasonEnum = pgEnum("ticket_reason", [
  "subscription_grant", // начислено при активации/продлении подписки
  "activity_bonus",     // ручное начисление за активность
  "cashback_purchase",  // кешбэк с покупки мерча (1 билет за 200₽)
  "direct_purchase",    // купил билеты напрямую
  "lottery_entry",      // потратил на участие в розыгрыше
  "admin_adjust",       // корректировка админом
]);

export const ticketTransactions = pgTable(
  "ticket_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    delta: integer("delta").notNull(), // + или -
    reason: ticketReasonEnum("reason").notNull(),
    refId: uuid("ref_id"),             // ссылка на subscription / lottery_entry / order — без FK для гибкости
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("ticket_tx_user_idx").on(t.userId),
    userCreatedIdx: index("ticket_tx_user_created_idx").on(t.userId, t.createdAt),
  }),
);

export type User = typeof users.$inferSelect;
export type Profile = typeof profiles.$inferSelect;
export type SubscriptionTier = typeof subscriptionTiers.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type TicketTransaction = typeof ticketTransactions.$inferSelect;
