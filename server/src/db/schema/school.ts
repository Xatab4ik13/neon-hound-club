import {
  pgTable,
  uuid,
  varchar,
  integer,
  text,
  boolean,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { users } from "./users.js";
import { payments } from "./payments.js";

export type InstructorTone = "primary" | "yellow" | "cyan" | "lime" | "violet";

export type InstructorSkill = { title: string; text: string };
export type InstructorLocation = {
  address: string;
  lat: number;
  lng: number;
  note?: string;
};
export type InstructorCourse = {
  title: string;
  duration: string;
  price: number;
  priceFrom?: boolean;
  description: string;
  includes?: string[];
};
export type InstructorUpcomingCourse = { title: string };

/** Богатый профиль инструктора, редактируется в админке одним куском. */
export type InstructorProfile = {
  specialties?: string[];
  bioParagraphs?: string[];
  skills?: InstructorSkill[];
  courses?: InstructorCourse[];
  upcomingCourses?: InstructorUpcomingCourse[];
  approach?: string[];
  location?: InstructorLocation;
  gallery?: string[];
};

export const schoolInstructors = pgTable(
  "school_instructors",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    slug: varchar("slug", { length: 64 }).notNull(),
    displayName: varchar("display_name", { length: 120 }).notNull(),
    bio: text("bio").notNull().default(""),
    city: varchar("city", { length: 120 }).notNull().default(""),
    moto: varchar("moto", { length: 200 }).notNull().default(""),
    avatarUrl: text("avatar_url"),
    hourlyRateRub: integer("hourly_rate_rub").notNull().default(0),
    active: boolean("active").notNull().default(true),
    // v2: расширенный профиль под клубный/лендинговый UI.
    tone: varchar("tone", { length: 16 }).notNull().default("primary").$type<InstructorTone>(),
    experience: integer("experience").notNull().default(0),
    tagline: varchar("tagline", { length: 300 }).notNull().default(""),
    profile: jsonb("profile").notNull().default({}).$type<InstructorProfile>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userUq: uniqueIndex("school_instr_user_uq").on(t.userId),
    slugUq: uniqueIndex("school_instr_slug_uq").on(t.slug),
  }),
);

export const schoolChats = pgTable(
  "school_chats",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    instructorId: uuid("instructor_id").notNull().references(() => schoolInstructors.id, { onDelete: "cascade" }),
    studentId: uuid("student_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }).notNull().defaultNow(),
    lastMessagePreview: varchar("last_message_preview", { length: 200 }).notNull().default(""),
    lastMessageRole: varchar("last_message_role", { length: 16 }).notNull().default("student"),
    studentUnread: integer("student_unread").notNull().default(0),
    instructorUnread: integer("instructor_unread").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pairUq: uniqueIndex("sc_pair_uq").on(t.instructorId, t.studentId),
    instrLast: index("sc_instr_last_idx").on(t.instructorId, t.lastMessageAt),
    studentLast: index("sc_student_last_idx").on(t.studentId, t.lastMessageAt),
  }),
);

export const schoolMessages = pgTable(
  "school_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    chatId: uuid("chat_id").notNull().references(() => schoolChats.id, { onDelete: "cascade" }),
    senderId: uuid("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    senderRole: varchar("sender_role", { length: 16 }).notNull(),
    text: text("text"),
    imageUrl: text("image_url"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    chatCreated: index("sm_chat_created_idx").on(t.chatId, t.createdAt),
  }),
);

export const schoolOrders = pgTable(
  "school_orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    chatId: uuid("chat_id").notNull().references(() => schoolChats.id, { onDelete: "cascade" }),
    instructorId: uuid("instructor_id").notNull().references(() => schoolInstructors.id, { onDelete: "cascade" }),
    studentId: uuid("student_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description").notNull().default(""),
    instructorAmountRub: integer("instructor_amount_rub").notNull(),
    studentAmountRub: integer("student_amount_rub").notNull(),
    commissionRub: integer("commission_rub").notNull(),
    status: varchar("status", { length: 24 }).notNull().default("invoiced"),
    paymentId: uuid("payment_id").references(() => payments.id, { onDelete: "set null" }),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    chat: index("so_chat_idx").on(t.chatId),
    instr: index("so_instr_idx").on(t.instructorId, t.createdAt),
    student: index("so_student_idx").on(t.studentId, t.createdAt),
    status: index("so_status_idx").on(t.status),
  }),
);

export const schoolPayouts = pgTable(
  "school_payouts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    instructorId: uuid("instructor_id").notNull().references(() => schoolInstructors.id, { onDelete: "cascade" }),
    periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
    periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),
    grossRub: integer("gross_rub").notNull().default(0),
    taxRub: integer("tax_rub").notNull().default(0),
    commissionRub: integer("commission_rub").notNull().default(0),
    payoutRub: integer("payout_rub").notNull().default(0),
    status: varchar("status", { length: 24 }).notNull().default("pending"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    note: text("note").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    instrPeriod: index("sp_instr_period_idx").on(t.instructorId, t.periodStart),
    status: index("sp_status_idx").on(t.status),
  }),
);

export type SchoolInstructor = typeof schoolInstructors.$inferSelect;
export type SchoolChat = typeof schoolChats.$inferSelect;
export type SchoolMessage = typeof schoolMessages.$inferSelect;
export type SchoolOrder = typeof schoolOrders.$inferSelect;
export type SchoolPayout = typeof schoolPayouts.$inferSelect;

export const SCHOOL_ORDER_STATUSES = [
  "draft",
  "invoiced",
  "paid",
  "cancelled",
  "refunded",
] as const;
export type SchoolOrderStatus = (typeof SCHOOL_ORDER_STATUSES)[number];

/** Комиссия платформы. Ученик видит цену выше на COMMISSION_MULTIPLIER-1. */
export const SCHOOL_COMMISSION_RATE = 0.2;
export const SCHOOL_COMMISSION_MULTIPLIER = 1 + SCHOOL_COMMISSION_RATE;

export function calcSchoolAmounts(instructorAmountRub: number) {
  const student = Math.round(instructorAmountRub * SCHOOL_COMMISSION_MULTIPLIER);
  return {
    instructorAmountRub,
    studentAmountRub: student,
    commissionRub: student - instructorAmountRub,
  };
}
