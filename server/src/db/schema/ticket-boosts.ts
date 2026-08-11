import { pgTable, uuid, varchar, integer, timestamp, index } from "drizzle-orm/pg-core";
import { users } from "./users.js";
import { orders } from "./shop.js";

/**
 * Лог капсул ×2 (приз HellSpin `boost_x2`).
 * Одна строка = одна выбитая капсула: когда выдана, до когда действует,
 * потратил ли юзер её на цифровую покупку и сколько бонусных билетов получил.
 * Нужен для админки: фильтр «Активированные» = used_at IS NOT NULL.
 */
export const ticketBoosts = pgTable(
  "ticket_boosts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** 'spin' — выбита в рулетке. */
    source: varchar("source", { length: 16 }).notNull().default("spin"),
    grantedAt: timestamp("granted_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    usedOrderId: uuid("used_order_id").references(() => orders.id, { onDelete: "set null" }),
    /** Сколько бонусных билетов принесла капсула (сверх обычного начисления). */
    bonusTickets: integer("bonus_tickets").notNull().default(0),
  },
  (t) => ({
    userIdx: index("ticket_boosts_user_idx").on(t.userId, t.grantedAt),
    usedIdx: index("ticket_boosts_used_idx").on(t.usedAt),
  }),
);

export type TicketBoost = typeof ticketBoosts.$inferSelect;
