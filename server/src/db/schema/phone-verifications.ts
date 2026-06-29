import { pgTable, uuid, varchar, text, timestamp, integer, bigserial, index } from "drizzle-orm/pg-core";
import { users } from "./users.js";

/**
 * Журнал подтверждений номера через Telegram Gateway.
 * Хранит request_id от Telegram (для последующего checkVerificationStatus),
 * срок жизни, число попыток ввода кода и факт «погашения» (consumed_at).
 */
export const phoneVerifications = pgTable(
  "phone_verifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    phoneE164: varchar("phone_e164", { length: 16 }).notNull(),
    purpose: text("purpose").notNull(), // 'verify' | 'recovery'
    requestId: text("request_id").notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    attempts: integer("attempts").notNull().default(0),
  },
  (t) => ({
    userIdx: index("pv_user_idx").on(t.userId),
    phoneIdx: index("pv_phone_idx").on(t.phoneE164),
    requestIdx: index("pv_request_idx").on(t.requestId),
  }),
);

export type PhoneVerification = typeof phoneVerifications.$inferSelect;

/**
 * Аппенд-онли журнал отправок кодов. Используем для rate-limit:
 *  - 1 отправка в 60 сек на номер
 *  - 5 отправок в час на IP
 *  - 10 отправок в сутки на номер
 */
export const phoneSendLog = pgTable(
  "phone_send_log",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    phoneE164: varchar("phone_e164", { length: 16 }).notNull(),
    ip: text("ip"), // inet в БД, в TS храним как строку
    purpose: text("purpose").notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    phoneIdx: index("psl_phone_idx").on(t.phoneE164, t.sentAt),
    ipIdx: index("psl_ip_idx").on(t.ip, t.sentAt),
  }),
);
