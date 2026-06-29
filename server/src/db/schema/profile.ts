import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  date,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users.js";

/**
 * Профиль 1:1 к users. В users — только то, что нужно для auth (email, pwd, nick, role).
 * Здесь — публичные/расширенные поля: телефон, город, аватар, био, соцсети.
 *
 * Создаётся лениво при первом GET /profile/me (или при первом PATCH), чтобы не плодить
 * пустые строки и не трогать существующих юзеров.
 */
export const profiles = pgTable(
  "profiles",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    phone: varchar("phone", { length: 32 }),
    // Нормализованная форма "7XXXXXXXXXX" — поддерживается триггером в БД,
    // используется для уникальности (анти-мультиак).
    phoneE164: varchar("phone_e164", { length: 16 }),
    city: varchar("city", { length: 80 }),
    avatarUrl: text("avatar_url"),
    bio: text("bio"),
    instagram: varchar("instagram", { length: 80 }), // только handle, без url
    telegram: varchar("telegram", { length: 80 }),
    youtube: varchar("youtube", { length: 120 }),
    // NULL = телефон не подтверждён через Telegram Gateway. Только при non-null
    // юзер допускается в розыгрыши и может логиниться/восстанавливать пароль по номеру.
    phoneVerifiedAt: timestamp("phone_verified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
);

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;

/**
 * Мото в гараже юзера.
 * Один из байков может быть isPrimary=true — он по умолчанию пойдёт в контекст Hell AI.
 * photos — jsonb массив URL (MinIO подключим позже, пока внешние ссылки).
 */
export const bikes = pgTable(
  "bikes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    brand: varchar("brand", { length: 64 }).notNull(),
    model: varchar("model", { length: 80 }).notNull(),
    year: integer("year"), // nullable — не всегда хочется указывать
    engineCc: integer("engine_cc"), // объём двигателя, для контекста AI
    color: varchar("color", { length: 40 }),
    nickname: varchar("nickname", { length: 60 }), // прозвище мота, опционально
    notes: text("notes"), // свободный текст: тюнинг, особенности
    photos: jsonb("photos").$type<string[]>().notNull().default([]),
    mileage: varchar("mileage", { length: 40 }), // свободный текст: "18 400 км"
    purchaseDate: date("purchase_date"), // ISO yyyy-mm-dd
    mods: jsonb("mods").$type<string[]>().notNull().default([]),
    isPrimary: boolean("is_primary").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("bikes_user_idx").on(t.userId),
    primaryIdx: index("bikes_primary_idx").on(t.userId, t.isPrimary),
  }),
);

export type Bike = typeof bikes.$inferSelect;
export type NewBike = typeof bikes.$inferInsert;

/**
 * Адрес доставки СДЭК. 1:1 к users.
 * Дефолтный ПВЗ + контакты подставляются в чекаут; юзер может изменить там же.
 * verified_at — когда юзер последний раз нажал «Проверил данные» (для бейджа подтверждения).
 */
export const deliveryAddresses = pgTable("delivery_addresses", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  fullName: varchar("full_name", { length: 120 }).notNull().default(""),
  phone: varchar("phone", { length: 32 }).notNull().default(""),
  city: varchar("city", { length: 80 }).notNull().default(""),
  postalCode: varchar("postal_code", { length: 16 }).notNull().default(""),
  pickupPoint: text("pickup_point").notNull().default(""),
  comment: text("comment").notNull().default(""),
  // СДЭК-поля
  cdekCityCode: integer("cdek_city_code"),
  cdekPvzCode: varchar("cdek_pvz_code", { length: 32 }),
  cdekPvzAddress: text("cdek_pvz_address"),
  streetAddress: text("street_address").notNull().default(""),
  preferredMode: varchar("preferred_mode", { length: 8 }).notNull().default("pvz"),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type DeliveryAddress = typeof deliveryAddresses.$inferSelect;

/**
 * Настройки уведомлений. 1:1 к users. Дефолты: важное (розыгрыши/заказы) включено.
 */
export const notificationPrefs = pgTable("notification_prefs", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  emailRaffles: boolean("email_raffles").notNull().default(true),
  emailOrders: boolean("email_orders").notNull().default(true),
  emailNews: boolean("email_news").notNull().default(false),
  pushRaffles: boolean("push_raffles").notNull().default(true),
  pushOrders: boolean("push_orders").notNull().default(true),
  pushNews: boolean("push_news").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type NotificationPref = typeof notificationPrefs.$inferSelect;
