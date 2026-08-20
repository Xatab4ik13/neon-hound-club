import { pgTable, uuid, varchar, integer, text, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { users } from "./users.js";

/**
 * HELL HUNT — недельная охота: юзеры ставят билеты (от ticket_step = 1 капсула),
 * билеты сгорают, в шоу разыгрываются 3 приза (3 раунда, главный — последним).
 *
 * Вход: только с активным Hell Pass. Вес в барабане = число капсул.
 * Победителя можно назначить руками (forced_winner_id) или оставить честный жребий.
 */

export type HuntStatus = "draft" | "open" | "finished" | "canceled";

export const hunts = pgTable(
  "hunts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: varchar("title", { length: 120 }).notNull().default("HELL HUNT"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    /** Сколько билетов = одна капсула в барабане. */
    ticketStep: integer("ticket_step").notNull().default(10),
    /** draft — не видно юзерам; open — приём ставок/шоу; finished — итоги. */
    status: varchar("status", { length: 16 }).notNull().default("open"),
    /** Когда прокрутили жребий (итоги зафиксированы). */
    drawnAt: timestamp("drawn_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    statusIdx: index("hunts_status_idx").on(t.status, t.startsAt),
  }),
);

export const huntPrizes = pgTable(
  "hunt_prizes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    huntId: uuid("hunt_id")
      .notNull()
      .references(() => hunts.id, { onDelete: "cascade" }),
    /** 1 — главный приз (вскрывается последним), 3 — первый раунд. */
    place: integer("place").notNull(),
    title: varchar("title", { length: 160 }).notNull(),
    sub: varchar("sub", { length: 120 }).notNull().default(""),
    imgUrl: text("img_url"),
    /** Если приз — билеты, начислим победителю столько билетов. */
    ticketsReward: integer("tickets_reward").notNull().default(0),
    /** Назначенный руками победитель или NULL = честный жребий по весам. */
    forcedWinnerId: uuid("forced_winner_id").references(() => users.id, { onDelete: "set null" }),
    /** Итог: кто выиграл. Заполняется при прокрутке жребия. */
    winnerUserId: uuid("winner_user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    huntIdx: index("hunt_prizes_hunt_idx").on(t.huntId, t.place),
  }),
);

/** Ставка юзера в охоте: одна строка на юзера, билеты суммируются. */
export const huntBets = pgTable(
  "hunt_bets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    huntId: uuid("hunt_id")
      .notNull()
      .references(() => hunts.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tickets: integer("tickets").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uniq: uniqueIndex("hunt_bets_uniq").on(t.huntId, t.userId),
    huntIdx: index("hunt_bets_hunt_idx").on(t.huntId),
  }),
);

export type Hunt = typeof hunts.$inferSelect;
export type HuntPrizeRow = typeof huntPrizes.$inferSelect;
export type HuntBet = typeof huntBets.$inferSelect;
