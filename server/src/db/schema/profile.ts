import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
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
    city: varchar("city", { length: 80 }),
    avatarUrl: text("avatar_url"),
    bio: text("bio"),
    instagram: varchar("instagram", { length: 80 }), // только handle, без url
    telegram: varchar("telegram", { length: 80 }),
    youtube: varchar("youtube", { length: 120 }),
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
