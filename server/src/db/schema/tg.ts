import { pgTable, uuid, varchar, integer, jsonb, timestamp, bigint, index } from "drizzle-orm/pg-core";

/**
 * Заказы со страницы Telegram (tg.hhr.pro): билеты на розыгрыш + предзаказ футболок.
 * Живут отдельно от users — аккаунтов HHR пока нет; потом привязываем по телефону.
 * status: pending → paid | failed.
 */
export const tgOrders = pgTable(
  "tg_orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    telegramUserId: bigint("telegram_user_id", { mode: "number" }),
    telegramUsername: varchar("telegram_username", { length: 64 }),
    telegramName: varchar("telegram_name", { length: 128 }),
    phone: varchar("phone", { length: 16 }).notNull(),
    recipientName: varchar("recipient_name", { length: 128 }),
    tickets: integer("tickets").notNull().default(0),
    ticketsRub: integer("tickets_rub").notNull().default(0),
    shirts: jsonb("shirts").notNull().default([]),
    shirtsRub: integer("shirts_rub").notNull().default(0),
    shippingRub: integer("shipping_rub").notNull().default(0),
    cdekCityCode: integer("cdek_city_code"),
    cdekCityName: varchar("cdek_city_name", { length: 128 }),
    cdekPvzCode: varchar("cdek_pvz_code", { length: 32 }),
    cdekPvzAddress: varchar("cdek_pvz_address", { length: 300 }),
    totalRub: integer("total_rub").notNull(),
    status: varchar("status", { length: 16 }).notNull().default("pending"),
    providerPaymentId: varchar("provider_payment_id", { length: 64 }),
    paymentUrl: varchar("payment_url", { length: 500 }),
    rawLastNotification: jsonb("raw_last_notification"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    statusIdx: index("tg_orders_status_idx").on(t.status),
    phoneIdx: index("tg_orders_phone_idx").on(t.phone),
    providerIdx: index("tg_orders_provider_payment_idx").on(t.providerPaymentId),
  }),
);
export type TgOrder = typeof tgOrders.$inferSelect;
