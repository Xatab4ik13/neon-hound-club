import {
  pgTable,
  uuid,
  varchar,
  integer,
  text,
  timestamp,
  boolean,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users.js";

/**
 * Каталог товаров. Создаёт админ (Hell).
 * price_rub — цена в рублях (целое).
 * bonus_tickets — сколько билетов начислится покупателю при оплате (задаёт админ на товаре).
 * images — массив URL картинок (первая — обложка). Грузим в MinIO, тут только ссылки.
 * stock — null = без учёта остатков. 0 = нет в наличии. >0 — резервируем при заказе.
 */
export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: varchar("slug", { length: 64 }).notNull().unique(),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description").notNull().default(""),
    priceRub: integer("price_rub").notNull(),
    bonusTickets: integer("bonus_tickets").notNull().default(0),
    images: jsonb("images").$type<string[]>().notNull().default([]),
    stock: integer("stock"), // nullable = unlimited
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    activeIdx: index("products_active_idx").on(t.active),
  }),
);

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;

/**
 * Заказ.
 * status:
 *   'pending_payment' — создан, ждём оплату (платёжку подключим позже)
 *   'paid'            — оплачен, можно собирать. ТУТ начисляем bonus_tickets через ledger (идемпотентно).
 *   'shipped'         — отправлен, есть СДЭК-трек
 *   'delivered'       — получен
 *   'cancelled'       — отменён до оплаты
 *   'refunded'        — оплачен и возвращён (билеты снимаем компенсирующей строкой)
 *
 * shipping — снимок адреса/контактов на момент заказа (jsonb, чтобы менять профиль безопасно).
 */
export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 24 }).notNull().default("pending_payment"),
    totalRub: integer("total_rub").notNull(),
    bonusTicketsTotal: integer("bonus_tickets_total").notNull().default(0),
    shipping: jsonb("shipping")
      .$type<{
        fio: string;
        phone: string;
        city: string;
        address: string;
        postalCode?: string;
      }>()
      .notNull(),
    comment: text("comment"),
    cdekTrack: varchar("cdek_track", { length: 64 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    shippedAt: timestamp("shipped_at", { withTimezone: true }),
  },
  (t) => ({
    userIdx: index("orders_user_idx").on(t.userId),
    statusIdx: index("orders_status_idx").on(t.status),
    createdIdx: index("orders_created_idx").on(t.createdAt),
  }),
);

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;

export const ORDER_STATUSES = [
  "pending_payment",
  "paid",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/**
 * Позиция заказа.
 * title/price/bonus — СНИМКИ на момент заказа. Товар потом могут править, цены меняться,
 * но в заказе должны остаться те, что юзер видел при оформлении.
 */
export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
    titleSnapshot: varchar("title_snapshot", { length: 200 }).notNull(),
    priceRubSnapshot: integer("price_rub_snapshot").notNull(),
    bonusTicketsSnapshot: integer("bonus_tickets_snapshot").notNull().default(0),
    qty: integer("qty").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    orderIdx: index("order_items_order_idx").on(t.orderId),
  }),
);

export type OrderItem = typeof orderItems.$inferSelect;
export type NewOrderItem = typeof orderItems.$inferInsert;
