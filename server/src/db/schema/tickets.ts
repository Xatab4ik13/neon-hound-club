import { pgTable, uuid, varchar, integer, text, timestamp, index } from "drizzle-orm/pg-core";
import { users } from "./users.js";

/**
 * Append-only ledger билетов.
 * Баланс юзера = SUM(amount) WHERE user_id = ?.
 * Никаких UPDATE/DELETE — только INSERT новых строк (в т.ч. компенсирующих).
 *
 * amount:
 *   > 0 — начисление (Pass, квест, бонус за товар, ручкой админа)
 *   < 0 — списание (вход в розыгрыш, штраф, аннулирование)
 *
 * source — откуда пришла операция, для фильтров и аналитики:
 *   'admin'          — ручное начисление/списание Hell'ом или ассистентом
 *   'quest'          — завершённый квест
 *   'product_bonus'  — бонус билетов за купленный товар (кол-во на товаре задаёт админ)
 *   'pass_monthly'   — ежемесячное начисление по тиру Hell Pass
 *   'raffle_entry'   — списание за вход в розыгрыш
 *   'refund'         — компенсация (отмена розыгрыша, возврат заказа и т.п.)
 *
 * refType / refId — опциональная ссылка на сущность-источник
 *   (quest_id, order_id, raffle_id, pass_subscription_id), для дедупа и трейсинга.
 */
export const ticketsLedger = pgTable(
  "tickets_ledger",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    amount: integer("amount").notNull(),
    source: varchar("source", { length: 32 }).notNull(),
    reason: text("reason").notNull(),
    refType: varchar("ref_type", { length: 32 }),
    refId: uuid("ref_id"),
    // Кто инициировал (для админских/системных операций). null = система.
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("tl_user_idx").on(t.userId),
    userCreatedIdx: index("tl_user_created_idx").on(t.userId, t.createdAt),
    refIdx: index("tl_ref_idx").on(t.refType, t.refId),
  }),
);

export type TicketEntry = typeof ticketsLedger.$inferSelect;
export type NewTicketEntry = typeof ticketsLedger.$inferInsert;

export const TICKET_SOURCES = [
  "admin",
  "quest",
  "product_bonus",
  "pass_monthly",
  "raffle_entry",
  "refund",
] as const;
export type TicketSource = (typeof TICKET_SOURCES)[number];
