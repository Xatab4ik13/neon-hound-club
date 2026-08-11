import {
  pgTable,
  uuid,
  varchar,
  integer,
  boolean,
  date,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { users } from "./users.js";

/**
 * HellSpin — ежедневная рулетка клуба (CS2-стайл ролик на фронте).
 *
 * Доступ: только PWA + подтверждённый телефон + включённые push.
 * Спины «use-or-lose»: не копятся, лимит по тиру Hell Pass, сброс в 00:00 МСК.
 * Сезон = календарный месяц: абсолютные пулы (ремувка/Silver/jackpot) живут внутри сезона.
 *
 * Все проценты и лимиты — на сервере (см. lib/spin.ts). Юзер видит только результат.
 */

export type SpinRarity = "common" | "rare" | "epic" | "legend";

/** Тип награды — определяет, как начисляем приз. */
export type SpinRewardKind =
  | "xp"
  | "tickets"
  | "promo"
  | "bonus_spin"
  | "merch" // физический приз, отправляем руками (ремувка, носки)
  | "pass" // Hell Pass на 30 дней
  | "jackpot" // AirPods / Watch / PS5
  | "ticket_boost"; // Капсула ×2: двойные билеты за цифру на 24 часа

/** Сезон рулетки = календарный месяц. */
export const spinSeasons = pgTable(
  "spin_seasons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Ключ сезона 'YYYY-MM' по МСК. */
    periodKey: varchar("period_key", { length: 16 }).notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    /** Сколько дней в сезоне (для календаря активности и прогноза спинов). */
    daysTotal: integer("days_total").notNull().default(30),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    periodUniq: uniqueIndex("spin_seasons_period_uniq").on(t.periodKey),
  }),
);

/**
 * Призы сезона. Создаются при первом обращении к сезону из конфига в lib/spin.ts.
 * limitTotal = NULL — без лимита (XP, билеты, промокод, бонус-спин).
 * queueOrder — порядок jackpot-очереди: AirPods(1) → Watch(2) → PS5(3).
 */
export const spinPrizes = pgTable(
  "spin_prizes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    seasonId: uuid("season_id")
      .notNull()
      .references(() => spinSeasons.id, { onDelete: "cascade" }),
    code: varchar("code", { length: 32 }).notNull(),
    title: varchar("title", { length: 120 }).notNull(),
    rarity: varchar("rarity", { length: 16 }).notNull(),
    rewardKind: varchar("reward_kind", { length: 16 }).notNull(),
    /** Числовой параметр награды: XP, кол-во билетов, % промокода. */
    rewardValue: integer("reward_value").notNull().default(0),
    /** Базовый шанс в ppm (миллионных долях): 1% = 10 000 ppm. */
    baseChancePpm: integer("base_chance_ppm").notNull().default(0),
    limitTotal: integer("limit_total"),
    issued: integer("issued").notNull().default(0),
    queueOrder: integer("queue_order"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    seasonCodeUniq: uniqueIndex("spin_prizes_season_code_uniq").on(t.seasonId, t.code),
    seasonIdx: index("spin_prizes_season_idx").on(t.seasonId),
  }),
);

/** Лог прокрутов. */
export const spinSpins = pgTable(
  "spin_spins",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    seasonId: uuid("season_id")
      .notNull()
      .references(() => spinSeasons.id, { onDelete: "cascade" }),
    prizeId: uuid("prize_id").references(() => spinPrizes.id, { onDelete: "set null" }),
    prizeCode: varchar("prize_code", { length: 32 }).notNull(),
    rarity: varchar("rarity", { length: 16 }).notNull(),
    /** Локальная дата МСК, за которую списан спин. */
    spinDate: date("spin_date").notNull(),
    /** Тир Hell Pass на момент прокрута: none/silver/gold/platinum. */
    tier: varchar("tier", { length: 16 }).notNull().default("none"),
    /** Прокрут получен за счёт приза «+1 спин» — не списывает дневной лимит. */
    bonus: boolean("bonus").notNull().default(false),
    /** Итоговый шанс приза (ppm) на момент розыгрыша — для аудита честности. */
    rolledChancePpm: integer("rolled_chance_ppm").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("spin_spins_user_idx").on(t.userId, t.createdAt),
    seasonIdx: index("spin_spins_season_idx").on(t.seasonId),
    userDayIdx: index("spin_spins_user_day_idx").on(t.userId, t.spinDate),
  }),
);

/** Дневной счётчик спинов. Use-or-lose: одна строка на юзера и дату. */
export const spinDaily = pgTable(
  "spin_daily",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    spinDate: date("spin_date").notNull(),
    /** Лимит по тиру на эту дату. */
    allowed: integer("allowed").notNull().default(1),
    /** Сколько бонус-спинов начислено за день. */
    bonus: integer("bonus").notNull().default(0),
    used: integer("used").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uniq: uniqueIndex("spin_daily_user_date_uniq").on(t.userId, t.spinDate),
  }),
);

/** Календарь активности сезона: сколько дней юзер крутил и какие вехи забрал. */
export const spinStreaks = pgTable(
  "spin_streaks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    seasonId: uuid("season_id")
      .notNull()
      .references(() => spinSeasons.id, { onDelete: "cascade" }),
    /** Кол-во уникальных дней с прокрутом внутри сезона. */
    daysCount: integer("days_count").notNull().default(0),
    lastSpinDate: date("last_spin_date"),
    claimed10At: timestamp("claimed_10_at", { withTimezone: true }),
    claimed20At: timestamp("claimed_20_at", { withTimezone: true }),
    claimed30At: timestamp("claimed_30_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uniq: uniqueIndex("spin_streaks_user_season_uniq").on(t.userId, t.seasonId),
  }),
);

export const SPIN_FULFILLMENT_STATUSES = ["pending", "contacted", "shipped", "delivered"] as const;
export type SpinFulfillmentStatus = (typeof SPIN_FULFILLMENT_STATUSES)[number];

/**
 * Победители, требующие ручной обработки: ремувка, носки, AirPods, Watch, PS5.
 * Сюда же падают физические призы календаря активности (source='streak').
 */
export const spinWinners = pgTable(
  "spin_winners",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    seasonId: uuid("season_id")
      .notNull()
      .references(() => spinSeasons.id, { onDelete: "cascade" }),
    spinId: uuid("spin_id").references(() => spinSpins.id, { onDelete: "set null" }),
    /** 'spin' — выпало в рулетке, 'streak' — награда календаря активности. */
    source: varchar("source", { length: 16 }).notNull().default("spin"),
    prizeCode: varchar("prize_code", { length: 32 }).notNull(),
    prizeTitle: varchar("prize_title", { length: 120 }).notNull(),
    status: varchar("status", { length: 16 }).notNull().default("pending"),
    trackNumber: varchar("track_number", { length: 64 }),
    adminNote: varchar("admin_note", { length: 400 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    seasonIdx: index("spin_winners_season_idx").on(t.seasonId, t.createdAt),
    userIdx: index("spin_winners_user_idx").on(t.userId),
    statusIdx: index("spin_winners_status_idx").on(t.status),
  }),
);

export type SpinSeason = typeof spinSeasons.$inferSelect;
export type SpinPrize = typeof spinPrizes.$inferSelect;
export type SpinRecord = typeof spinSpins.$inferSelect;
export type SpinWinner = typeof spinWinners.$inferSelect;
