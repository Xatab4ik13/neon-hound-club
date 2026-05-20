import { pgTable, uuid, text, timestamp, varchar, integer, pgEnum, index, boolean, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

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

// ============ гараж пользователя ============
// Контекст для Hell AI. Каждый юзер может иметь несколько мото, одно — primary.
export const userMotorcycles = pgTable(
  "user_motorcycles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    nickname: varchar("nickname", { length: 60 }),  // "Чёрная", "Зверь" — необязательно
    brand: varchar("brand", { length: 60 }).notNull(),       // Honda, Yamaha, ...
    model: varchar("model", { length: 80 }).notNull(),       // CBR1000RR, MT-09
    year: integer("year").notNull(),                          // 2019
    engineCc: integer("engine_cc"),                           // 1000 — для AI важно
    mileageKm: integer("mileage_km"),                         // пробег, юзер обновляет вручную
    vin: varchar("vin", { length: 17 }),                      // для каталогов запчастей, опционально
    photoUrl: text("photo_url"),
    notes: text("notes"),                                     // свободное поле: модификации, прошивка
    isPrimary: boolean("is_primary").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("user_motorcycles_user_idx").on(t.userId),
    // Гарантия: у юзера максимум один primary. Частичный уникальный индекс.
    onePrimaryPerUser: uniqueIndex("user_motorcycles_one_primary")
      .on(t.userId)
      .where(sql`${t.isPrimary} = true`),
  }),
);

// ============ роли (для админки) ============
// Отдельная таблица, НЕ колонка в users. Назначаем вручную через SQL:
//   INSERT INTO user_roles (user_id, role) VALUES ('...', 'admin');
export const roleEnum = pgEnum("role", ["admin"]);

export const userRoles = pgTable(
  "user_roles",
  {
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    role: roleEnum("role").notNull(),
  },
  (t) => ({
    pk: uniqueIndex("user_roles_pk").on(t.userId, t.role),
  }),
);

// ============ каталог мерча ============
// Категории дерева 2 уровня: верхняя ("Одежда") и под-категория ("Худи").
// Для простоты — self-reference через parent_id.
export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  parentId: uuid("parent_id"),
  slug: varchar("slug", { length: 60 }).notNull().unique(),
  name: varchar("name", { length: 80 }).notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const productSourceEnum = pgEnum("product_source", ["hellhound", "partner", "used"]);
export const badgeToneEnum = pgEnum("badge_tone", ["primary", "muted", "danger"]);

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: varchar("slug", { length: 120 }).notNull().unique(),
    name: varchar("name", { length: 200 }).notNull(),
    priceRub: integer("price_rub").notNull(),
    // Категория = под-категория (sub). Верхнюю получаем через parent_id у category.
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
    source: productSourceEnum("source").notNull().default("hellhound"),
    sourceLabel: varchar("source_label", { length: 80 }), // "Komine", "Андрей К."
    description: text("description"),
    composition: text("composition"),
    care: text("care"),
    badgeLabel: varchar("badge_label", { length: 40 }),   // "Новинка", "Осталось 24"
    badgeTone: badgeToneEnum("badge_tone"),
    isPublished: boolean("is_published").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    publishedIdx: index("products_published_idx").on(t.isPublished, t.sortOrder),
    categoryIdx: index("products_category_idx").on(t.categoryId),
  }),
);

export const productImages = pgTable(
  "product_images",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    isCover: boolean("is_cover").notNull().default(false),
  },
  (t) => ({
    productIdx: index("product_images_product_idx").on(t.productId, t.sortOrder),
  }),
);

// Варианты = размеры. Каждый со своим остатком. Цена обычно как у товара.
export const productVariants = pgTable(
  "product_variants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
    size: varchar("size", { length: 20 }).notNull(),  // "S", "M", "One size"
    stock: integer("stock").notNull().default(0),     // -1 = безлимит, 0 = нет в наличии
    priceOverrideRub: integer("price_override_rub"),  // null = брать price у product
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => ({
    uniq: uniqueIndex("variants_product_size_uniq").on(t.productId, t.size),
  }),
);

// ============ розыгрыши ============
// Raffle = одна кампания с одним или несколькими призами.
// Билет участия = одна строка в raffle_entries. Юзер тратит N билетов → N строк.
// Розыгрыш приза = SELECT случайной строки → запись в raffle_winners → удаление этой строки.
// Таким образом один выигравший билет «выбывает» (как в текущем фронте).

export const raffles = pgTable(
  "raffles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: varchar("slug", { length: 80 }).notNull().unique(),
    name: varchar("name", { length: 160 }).notNull(),
    description: text("description"),
    coverUrl: text("cover_url"),
    ticketCost: integer("ticket_cost").notNull().default(1), // сколько билетов = одна попытка
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    isPublished: boolean("is_published").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    publishedIdx: index("raffles_published_idx").on(t.isPublished, t.endsAt),
  }),
);

export const rafflePrizes = pgTable(
  "raffle_prizes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    raffleId: uuid("raffle_id").notNull().references(() => raffles.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 200 }).notNull(),
    qty: integer("qty").notNull().default(1),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => ({
    raffleIdx: index("raffle_prizes_raffle_idx").on(t.raffleId, t.sortOrder),
  }),
);

// Один билет участия = одна строка. После выигрыша строка удаляется.
export const raffleEntries = pgTable(
  "raffle_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    raffleId: uuid("raffle_id").notNull().references(() => raffles.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    raffleIdx: index("raffle_entries_raffle_idx").on(t.raffleId),
    raffleUserIdx: index("raffle_entries_raffle_user_idx").on(t.raffleId, t.userId),
  }),
);

export const raffleWinners = pgTable(
  "raffle_winners",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    raffleId: uuid("raffle_id").notNull().references(() => raffles.id, { onDelete: "cascade" }),
    prizeId: uuid("prize_id").notNull().references(() => rafflePrizes.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    drawnAt: timestamp("drawn_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    prizeIdx: index("raffle_winners_prize_idx").on(t.prizeId),
    raffleIdx: index("raffle_winners_raffle_idx").on(t.raffleId),
    userIdx: index("raffle_winners_user_idx").on(t.userId),
  }),
);

// ============ заказы ============
// Снапшотим название/цену/размер на момент покупки — товар может потом
// поменять цену или быть удалён, а в истории заказа должна остаться правда.
export const orderStatusEnum = pgEnum("order_status", [
  "created",    // оформлен, ждёт оплаты
  "paid",       // оплачен → начислили кешбэк
  "shipping",   // передан в СДЭК
  "delivered",  // получен
  "cancelled",  // отменён
]);

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: varchar("code", { length: 16 }).notNull().unique(), // короткий HH-XXXXXX для UI
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
    status: orderStatusEnum("status").notNull().default("created"),
    totalRub: integer("total_rub").notNull(),
    cashbackTickets: integer("cashback_tickets").notNull().default(0), // сколько начислится при оплате
    cashbackGranted: boolean("cashback_granted").notNull().default(false),
    recipientName: varchar("recipient_name", { length: 120 }).notNull(),
    phone: varchar("phone", { length: 32 }).notNull(),
    email: varchar("email", { length: 200 }).notNull(),
    address: text("address").notNull(),
    note: text("note"),
    cdekTrackingNumber: varchar("cdek_tracking_number", { length: 64 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("orders_user_idx").on(t.userId, t.createdAt),
    statusIdx: index("orders_status_idx").on(t.status),
  }),
);

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
    // Ссылки оставляем мягкими — товар/вариант могут быть удалены
    productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
    variantId: uuid("variant_id").references(() => productVariants.id, { onDelete: "set null" }),
    name: varchar("name", { length: 200 }).notNull(),     // снапшот
    size: varchar("size", { length: 20 }),                // снапшот
    priceRub: integer("price_rub").notNull(),             // снапшот
    qty: integer("qty").notNull(),
  },
  (t) => ({
    orderIdx: index("order_items_order_idx").on(t.orderId),
  }),
);

// ============ Hell AI ============
// Одна строка-конфиг (id = 1). Редактируется из админки.
export const hellAiSettings = pgTable("hell_ai_settings", {
  id: integer("id").primaryKey().default(1),
  systemPrompt: text("system_prompt").notNull(),
  signature: text("signature"),                  // подпись в конце ответа, опционально
  bannedTopics: text("banned_topics"),           // свободный текст — добавляется в system prompt
  model: varchar("model", { length: 80 }).notNull().default("google/gemini-3-flash-preview"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const hellAiRoleEnum = pgEnum("hell_ai_role", ["user", "assistant"]);

export const hellAiMessages = pgTable(
  "hell_ai_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    role: hellAiRoleEnum("role").notNull(),
    content: text("content").notNull(),
    bikeId: uuid("bike_id").references(() => userMotorcycles.id, { onDelete: "set null" }),
    model: varchar("model", { length: 80 }),
    tokensIn: integer("tokens_in"),
    tokensOut: integer("tokens_out"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userCreatedIdx: index("hell_ai_msgs_user_created_idx").on(t.userId, t.createdAt),
  }),
);

export type User = typeof users.$inferSelect;
export type Profile = typeof profiles.$inferSelect;
export type SubscriptionTier = typeof subscriptionTiers.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type TicketTransaction = typeof ticketTransactions.$inferSelect;
export type UserMotorcycle = typeof userMotorcycles.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Product = typeof products.$inferSelect;
export type ProductImage = typeof productImages.$inferSelect;
export type ProductVariant = typeof productVariants.$inferSelect;
export type Raffle = typeof raffles.$inferSelect;
export type RafflePrize = typeof rafflePrizes.$inferSelect;
export type RaffleEntry = typeof raffleEntries.$inferSelect;
export type RaffleWinner = typeof raffleWinners.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type HellAiSettings = typeof hellAiSettings.$inferSelect;
export type HellAiMessage = typeof hellAiMessages.$inferSelect;
