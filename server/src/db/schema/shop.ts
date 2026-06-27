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
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { users } from "./users.js";

/**
 * Категории и подкатегории магазина. Создаёт админ.
 * subcategories.slug уникален в рамках своей категории.
 */
export const shopCategories = pgTable("shop_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 120 }).notNull(),
  sort: integer("sort").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const shopSubcategories = pgTable(
  "shop_subcategories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => shopCategories.id, { onDelete: "cascade" }),
    slug: varchar("slug", { length: 64 }).notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    sort: integer("sort").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    catIdx: index("shop_subcategories_cat_idx").on(t.categoryId),
    catSlugUniq: uniqueIndex("shop_subcategories_cat_slug_uniq").on(t.categoryId, t.slug),
  }),
);

export type ShopCategory = typeof shopCategories.$inferSelect;
export type ShopSubcategory = typeof shopSubcategories.$inferSelect;

/**
 * Тип товара:
 *   physical — обычный, в наличии, доставляется СДЭКом, есть stock и вес/габариты.
 *   preorder — оплата сразу, отгрузка с указанной даты (preorder_expected_at). Доставка СДЭКом.
 *   virtual  — Hell Pass / билеты / курс Школы. Активация сразу после оплаты, без доставки и без файла.
 *   digital  — файл (PDF/JPG/ZIP) в MinIO. После оплаты — ссылка в кабинете покупателя.
 */
export const PRODUCT_KINDS = ["physical", "preorder", "virtual", "digital"] as const;
export type ProductKind = (typeof PRODUCT_KINDS)[number];

/**
 * Каталог товаров. Создаёт админ (Hell).
 * price_rub — цена в рублях (целое).
 * bonus_tickets — сколько билетов начислится покупателю при оплате (задаёт админ на товаре).
 * images — массив URL картинок (первая — обложка). Грузим в MinIO, тут только ссылки.
 * stock — null = без учёта остатков. 0 = нет в наличии. >0 — резервируем при заказе.
 *         У digital — stock игнорируется (всегда null).
 * digital_file_url / digital_file_name — только для kind='digital'.
 * preorder_expected_at — только для kind='preorder'. Дата, с которой ожидается отгрузка.
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
    kind: varchar("kind", { length: 16 }).notNull().default("physical").$type<ProductKind>(),
    categoryId: uuid("category_id").references(() => shopCategories.id, { onDelete: "set null" }),
    subcategoryId: uuid("subcategory_id").references(() => shopSubcategories.id, { onDelete: "set null" }),
    digitalFileUrl: text("digital_file_url"),
    digitalFileName: varchar("digital_file_name", { length: 200 }),
    preorderExpectedAt: timestamp("preorder_expected_at", { withTimezone: true }),
    shippingInfo: text("shipping_info").notNull().default(""),
    returnPolicy: text("return_policy").notNull().default(""),
    sizes: jsonb("sizes").$type<Array<{ label: string; stock: number | null }>>().notNull().default([]),
    // Габариты для расчёта СДЭК. Обязательны для physical/preorder — иначе тариф не посчитать.
    weightG: integer("weight_g"),
    lengthCm: integer("length_cm"),
    widthCm: integer("width_cm"),
    heightCm: integer("height_cm"),
    stickerPackSlug: varchar("sticker_pack_slug", { length: 64 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    activeIdx: index("products_active_idx").on(t.active),
    categoryIdx: index("products_category_idx").on(t.categoryId),
    kindIdx: index("products_kind_idx").on(t.kind),
    stickerPackSlugIdx: index("products_sticker_pack_slug_idx").on(t.stickerPackSlug),
  }),
);

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;

/**
 * Витрина — ручная подборка товаров на главной/клубе (до 6 шт.).
 * Один товар = одна строка. Сортировка через `sort` (по возрастанию).
 */
export const shopShowcase = pgTable(
  "shop_showcase",
  {
    productId: uuid("product_id")
      .primaryKey()
      .references(() => products.id, { onDelete: "cascade" }),
    sort: integer("sort").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    sortIdx: index("shop_showcase_sort_idx").on(t.sort),
  }),
);

export type ShopShowcaseRow = typeof shopShowcase.$inferSelect;

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
    subtotalRub: integer("subtotal_rub").notNull(),
    discountPct: integer("discount_pct").notNull().default(0),
    discountRub: integer("discount_rub").notNull().default(0),
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
    /** Дедлайн оплаты для status='pending_payment'. После этого воркер сносит заказ и возвращает сток. */
    expiresAt: timestamp("expires_at", { withTimezone: true }),
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
    sizeSnapshot: varchar("size_snapshot", { length: 24 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    orderIdx: index("order_items_order_idx").on(t.orderId),
  }),
);

export type OrderItem = typeof orderItems.$inferSelect;
export type NewOrderItem = typeof orderItems.$inferInsert;

/**
 * Серверная корзина. Одна запись на (user, product, size).
 * Хранит только id + qty + размер — цены/название берём всегда из products на чтении,
 * чтобы пользователь видел актуальную цену.
 */
export const cartItems = pgTable(
  "cart_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    size: varchar("size", { length: 24 }),
    qty: integer("qty").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("cart_items_user_idx").on(t.userId),
    userProductSizeUniq: uniqueIndex("cart_items_user_product_size_uniq").on(
      t.userId,
      t.productId,
      t.size,
    ),
  }),
);

export type CartItem = typeof cartItems.$inferSelect;
export type NewCartItem = typeof cartItems.$inferInsert;
