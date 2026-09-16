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
    /**
     * Период доступа:
     *   'monthly' — 30 дней (базовый вариант)
     *   'annual'  — 365 дней, покупается сразу со скидкой ~50%
     */
    period: varchar("period", { length: 16 }).notNull().default("monthly"),
    priceRub: integer("price_rub").notNull(),
    ticketsGranted: integer("tickets_granted").notNull(),
    status: varchar("status", { length: 24 }).notNull().default("pending_payment"),

    /**
     * Откуда взялся пасс:
     *   'purchase' — юзер купил за деньги
     *   'spin'     — выпал в рулетке HellSpin
     *   'streak'   — награда за календарь активности
     *   'grant'    — выдал админ вручную
     */
    source: varchar("source", { length: 24 }).notNull().default("purchase"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
  },
  (t) => ({
    userIdx: index("pass_user_idx").on(t.userId),
    expiresIdx: index("pass_expires_idx").on(t.expiresAt),
    statusIdx: index("pass_status_idx").on(t.status),
    sourceIdx: index("pass_source_idx").on(t.source),
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
  platinum: { priceRub: 2190, tickets: 30, aiQuestions: 150 },
};

export const PASS_DURATION_DAYS = 30;

// ─── ГОДОВОЙ PASS ──────────────────────────────────────────────────────────
// Разовая покупка на 365 дней. Цена ~половина от 12 месяцев,
// пакет билетов = месячный ×12 + 20% бонусом (начисляется сразу при активации).

export const PASS_PERIODS = ["monthly", "annual"] as const;
export type PassPeriod = (typeof PASS_PERIODS)[number];

export const PASS_ANNUAL_DURATION_DAYS = 365;

export const PASS_ANNUAL_CONFIG: Record<PassTier, { priceRub: number; tickets: number }> = {
  silver: { priceRub: 2990, tickets: 45 },
  gold: { priceRub: 7900, tickets: 150 },
  platinum: { priceRub: 12900, tickets: 450 },
};

/** Цена и пакет билетов для конкретной пары тир+период. */
export function passPlan(tier: PassTier, period: PassPeriod) {
  const monthly = PASS_CONFIG[tier];
  if (period === "annual") {
    const a = PASS_ANNUAL_CONFIG[tier];
    const fullRub = monthly.priceRub * 12;
    return {
      priceRub: a.priceRub,
      tickets: a.tickets,
      durationDays: PASS_ANNUAL_DURATION_DAYS,
      aiQuestions: monthly.aiQuestions,
      fullRub,
      saveRub: fullRub - a.priceRub,
      savePct: Math.round(((fullRub - a.priceRub) / fullRub) * 100),
    };
  }
  return {
    priceRub: monthly.priceRub,
    tickets: monthly.tickets,
    durationDays: PASS_DURATION_DAYS,
    aiQuestions: monthly.aiQuestions,
    fullRub: monthly.priceRub,
    saveRub: 0,
    savePct: 0,
  };
}


export const PASS_SOURCES = ["purchase", "spin", "streak", "grant"] as const;
export type PassSource = (typeof PASS_SOURCES)[number];

/** Сколько живёт неоплаченная заявка на пасс, после — удаляется. */
export const PASS_PENDING_TTL_MINUTES = 60;
