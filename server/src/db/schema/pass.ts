import {
  pgTable,
  uuid,
  varchar,
  integer,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users.js";

/**
 * Hell Pass — РАЗОВЫЙ доступ на 30 дней с момента оплаты.
 * НЕ подписка, без автопродления. Юзер платит снова, когда хочет.
 *
 * tier: 'silver' | 'gold' | 'platinum'
 *
 * status:
 *   'pending_payment' — создан, ждём оплату
 *   'active'          — оплачен, paid_at + expires_at заполнены
 *   'expired'         — истёк по времени (выставляем фоном или вычисляем на лету)
 *   'cancelled'       — отменён до оплаты / возврат
 *
 * Билеты по тиру начисляются ОДИН раз при активации (через ticketCredit,
 * idempotent по refType='pass_purchase', refId=purchase.id).
 */
export const passPurchases = pgTable(
  "pass_purchases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tier: varchar("tier", { length: 16 }).notNull(),
    priceRub: integer("price_rub").notNull(),
    ticketsGranted: integer("tickets_granted").notNull(),
    status: varchar("status", { length: 24 }).notNull().default("pending_payment"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
  },
  (t) => ({
    userIdx: index("pass_user_idx").on(t.userId),
    expiresIdx: index("pass_expires_idx").on(t.expiresAt),
    statusIdx: index("pass_status_idx").on(t.status),
  }),
);

export type PassPurchase = typeof passPurchases.$inferSelect;
export type NewPassPurchase = typeof passPurchases.$inferInsert;

export const PASS_TIERS = ["silver", "gold", "platinum"] as const;
export type PassTier = (typeof PASS_TIERS)[number];

/**
 * Прайс, пакет билетов и AI-лимит ПО ТИРАМ.
 * AI-лимит — это вопросов в скользящее окно 24 часа (а не на весь срок пасса).
 * Pass всё так же действует 30 дней с момента оплаты, но счётчик per-day.
 *
 *   silver   — 15 / сутки
 *   gold     — 40 / сутки
 *   platinum — 150 / сутки (hard cap от спама; для UI это «безлимит»)
 *
 * Free-режим (без активного пасса) — 3 / сутки, см. FREE_PER_DAY в lib/hell-ai.ts.
 */
export const PASS_CONFIG: Record<PassTier, { priceRub: number; tickets: number; aiQuestions: number }> = {
  silver: { priceRub: 490, tickets: 3, aiQuestions: 15 },
  gold: { priceRub: 1290, tickets: 10, aiQuestions: 40 },
  platinum: { priceRub: 2990, tickets: 30, aiQuestions: 150 },
};

export const PASS_DURATION_DAYS = 30;
