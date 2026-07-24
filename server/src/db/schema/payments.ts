import {
  pgTable,
  uuid,
  varchar,
  integer,
  jsonb,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { users } from "./users.js";

/**
 * Платежи через внешнюю платёжку (сейчас — Т-Банк Acquiring).
 *
 * Один платёж привязан к одной "вещи":
 *   ref_type='pass'  + ref_id=passPurchases.id
 *   ref_type='order' + ref_id=orders.id
 *
 * status — нормализованный статус (наш, не вендорский):
 *   'new'         — создан, ждём ответа платёжки
 *   'pending'     — ушёл на платёжную страницу
 *   'authorized'  — деньги списаны, но ещё не подтверждены (двухстадийка; мы пока single-stage)
 *   'confirmed'   — успешно оплачен (это и есть тригер активации pass/order)
 *   'rejected'    — отказ
 *   'refunded'    — возврат
 *
 * provider_payment_id — PaymentId из ответа Т-Банка (string в их API).
 *
 * raw_init / raw_last_notification — сырые JSON'ы для расследований и сверки.
 */
export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    provider: varchar("provider", { length: 16 }).notNull().default("tbank"),
    providerPaymentId: varchar("provider_payment_id", { length: 64 }),
    refType: varchar("ref_type", { length: 16 }).notNull(),
    refId: uuid("ref_id").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    amountRub: integer("amount_rub").notNull(),
    /** 'card' | 'sbp' — какая торговая точка Райфа обрабатывает платёж. */
    method: varchar("method", { length: 8 }).notNull().default("card"),
    status: varchar("status", { length: 24 }).notNull().default("new"),
    paymentUrl: varchar("payment_url", { length: 500 }),
    rawInit: jsonb("raw_init"),
    rawLastNotification: jsonb("raw_last_notification"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    refIdx: index("payments_ref_idx").on(t.refType, t.refId),
    providerPaymentIdIdx: uniqueIndex("payments_provider_payment_id_uniq").on(t.providerPaymentId),
    userIdx: index("payments_user_idx").on(t.userId),
    statusIdx: index("payments_status_idx").on(t.status),
  }),
);

export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;

export const PAYMENT_STATUSES = [
  "new",
  "pending",
  "authorized",
  "confirmed",
  "rejected",
  "refunded",
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_REF_TYPES = ["pass", "order", "school_order"] as const;
export type PaymentRefType = (typeof PAYMENT_REF_TYPES)[number];

export const PAYMENT_METHODS = ["card", "sbp"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
