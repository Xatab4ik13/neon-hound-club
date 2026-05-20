// Drizzle-схема. Источник правды для миграций — SQL-файлы в supabase/migrations/.
// Этот файл должен соответствовать состоянию БД (синхронизируем вручную при миграциях).
import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  nick: text("nick").notNull(),
  phone: text("phone"),
  city: text("city"),
  avatarUrl: text("avatar_url"),
  bio: text("bio"),
  referralCode: text("referral_code").notNull(),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
