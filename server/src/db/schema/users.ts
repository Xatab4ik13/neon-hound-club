import { pgTable, uuid, varchar, timestamp, boolean, index } from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    nick: varchar("nick", { length: 32 }).notNull().unique(),
    // 'user' | 'admin'. Hell сам выдаёт admin вручную через SQL/админку.
    role: varchar("role", { length: 16 }).notNull().default("user"),
    emailVerified: boolean("email_verified").notNull().default(false),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    blocked: boolean("blocked").notNull().default(false),
    blockedAt: timestamp("blocked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    emailIdx: index("users_email_idx").on(t.email),
    nickIdx: index("users_nick_idx").on(t.nick),
  }),
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
