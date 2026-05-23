import {
  pgTable,
  uuid,
  varchar,
  integer,
  text,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { users } from "./users.js";


/**
 * Розыгрыш.
 * ticketCost — сколько билетов списывается за одну заявку (entry).
 * maxEntriesPerUser — null = без лимита, иначе максимум заявок от одного юзера.
 * startsAt/endsAt — окно подачи заявок.
 * status: 'draft' | 'active' | 'finished' | 'cancelled'.
 * Когда выбран победитель — заполняются winnerUserId и winnerEntryId.
 */
export const raffles = pgTable(
  "raffles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description").notNull().default(""),
    imageUrl: text("image_url"),
    prize: varchar("prize", { length: 200 }).notNull(),
    ticketCost: integer("ticket_cost").notNull(),
    maxEntriesPerUser: integer("max_entries_per_user"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    status: varchar("status", { length: 16 }).notNull().default("draft"),
    winnerUserId: uuid("winner_user_id").references(() => users.id, { onDelete: "set null" }),
    winnerEntryId: uuid("winner_entry_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    statusIdx: index("raffles_status_idx").on(t.status),
    endsIdx: index("raffles_ends_idx").on(t.endsAt),
  }),
);

export type Raffle = typeof raffles.$inferSelect;
export type NewRaffle = typeof raffles.$inferInsert;

export const RAFFLE_STATUSES = ["draft", "active", "finished", "cancelled"] as const;
export type RaffleStatus = (typeof RAFFLE_STATUSES)[number];

/**
 * Заявка на участие.
 * ticketCostSnapshot — стоимость на момент входа (если потом админ поменяет — старые заявки не плывут).
 * Списание билетов делается отдельно через ticketCredit(amount=-ticketCost),
 * с refType='raffle_entry', refId=entry.id — идемпотентно и трассируемо.
 */
export const raffleEntries = pgTable(
  "raffle_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    raffleId: uuid("raffle_id")
      .notNull()
      .references(() => raffles.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    ticketCostSnapshot: integer("ticket_cost_snapshot").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    raffleIdx: index("raffle_entries_raffle_idx").on(t.raffleId),
    userIdx: index("raffle_entries_user_idx").on(t.userId),
    raffleUserIdx: index("raffle_entries_raffle_user_idx").on(t.raffleId, t.userId),
  }),
);

export type RaffleEntry = typeof raffleEntries.$inferSelect;
export type NewRaffleEntry = typeof raffleEntries.$inferInsert;

/**
 * Призы внутри розыгрыша. Один раффл = несколько призов, каждый со своим qty.
 * Победители фиксируются в raffle_prize_winners.
 */
export const rafflePrizes = pgTable(
  "raffle_prizes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    raffleId: uuid("raffle_id")
      .notNull()
      .references(() => raffles.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 200 }).notNull(),
    qty: integer("qty").notNull().default(1),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    raffleIdx: index("raffle_prizes_raffle_idx").on(t.raffleId),
  }),
);

export type RafflePrize = typeof rafflePrizes.$inferSelect;
export type NewRafflePrize = typeof rafflePrizes.$inferInsert;

/**
 * Одна строка на один разыгранный слот приза. entry_id уникален —
 * одна заявка-билет может выиграть только один раз во всём раффле.
 */
export const rafflePrizeWinners = pgTable(
  "raffle_prize_winners",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    raffleId: uuid("raffle_id")
      .notNull()
      .references(() => raffles.id, { onDelete: "cascade" }),
    prizeId: uuid("prize_id")
      .notNull()
      .references(() => rafflePrizes.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    entryId: uuid("entry_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    entryUnique: uniqueIndex("raffle_prize_winners_entry_unique").on(t.entryId),
    raffleIdx: index("raffle_prize_winners_raffle_idx").on(t.raffleId),
    prizeIdx: index("raffle_prize_winners_prize_idx").on(t.prizeId),
  }),
);

export type RafflePrizeWinner = typeof rafflePrizeWinners.$inferSelect;
export type NewRafflePrizeWinner = typeof rafflePrizeWinners.$inferInsert;
