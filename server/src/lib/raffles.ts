import { and, count, eq, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { raffles, raffleEntries, rafflePrizes, rafflePrizeWinners } from "../db/schema/raffles.js";
import { users } from "../db/schema/users.js";
import { profiles } from "../db/schema/profile.js";
import { getTicketBalance, ticketCredit } from "./tickets.js";
import { awardXp } from "./xp.js";

/**
 * Вход в розыгрыш:
 *  - проверяем статус/окно/лимит на юзера
 *  - проверяем баланс билетов
 *  - списываем билеты (отрицательное начисление) с refType='raffle_entry'
 *  - создаём строку entry
 *
 * Гонки: возможна ситуация «двойного списания» при параллельных запросах того же юзера —
 * для v1 это допустимо (entries просто будет несколько, баланс не уйдёт в минус, т.к. проверка идёт перед списанием
 * и max_entries_per_user мягкая). Если станет важно — обернём в SERIALIZABLE-транзакцию.
 */
export async function enterRaffle(opts: {
  raffleId: string;
  userId: string;
}): Promise<
  | { ok: true; entryId: string; balance: number }
  | { ok: false; code: "not_found" | "not_active" | "not_started" | "ended" | "limit_reached" | "insufficient_tickets" | "phone_required" }
> {
  const [r] = await db.select().from(raffles).where(eq(raffles.id, opts.raffleId)).limit(1);
  if (!r) return { ok: false, code: "not_found" };
  if (r.status !== "active") return { ok: false, code: "not_active" };

  // Анти-мультиак: участвовать можно только с подтверждённым (уникальным в БД) телефоном.
  const [prof] = await db
    .select({ phoneE164: profiles.phoneE164 })
    .from(profiles)
    .where(eq(profiles.userId, opts.userId))
    .limit(1);
  if (!prof?.phoneE164) return { ok: false, code: "phone_required" };



  const now = new Date();
  if (now < r.startsAt) return { ok: false, code: "not_started" };
  if (now > r.endsAt) return { ok: false, code: "ended" };

  if (r.maxEntriesPerUser !== null && r.maxEntriesPerUser !== undefined) {
    const [{ c }] = await db
      .select({ c: count() })
      .from(raffleEntries)
      .where(and(eq(raffleEntries.raffleId, r.id), eq(raffleEntries.userId, opts.userId)));
    if (c >= r.maxEntriesPerUser) return { ok: false, code: "limit_reached" };
  }

  const balance = await getTicketBalance(opts.userId);
  if (balance < r.ticketCost) return { ok: false, code: "insufficient_tickets" };

  // создаём заявку, потом списываем — refId нужен для трассировки
  const [entry] = await db
    .insert(raffleEntries)
    .values({
      raffleId: r.id,
      userId: opts.userId,
      ticketCostSnapshot: r.ticketCost,
    })
    .returning();

  await ticketCredit({
    userId: opts.userId,
    amount: -r.ticketCost,
    source: "raffle_entry",
    reason: `Розыгрыш: ${r.title}`,
    refType: "raffle_entry",
    refId: entry!.id,
  });

  const newBalance = await getTicketBalance(opts.userId);
  return { ok: true, entryId: entry!.id, balance: newBalance };
}

/**
 * Выбрать победителя случайно из всех заявок розыгрыша.
 * Идемпотентность: если winner уже выбран — возвращаем его.
 */
export async function pickWinner(raffleId: string) {
  const [r] = await db.select().from(raffles).where(eq(raffles.id, raffleId)).limit(1);
  if (!r) return { ok: false as const, reason: "not_found" };
  if (r.winnerEntryId) {
    return { ok: true as const, winnerUserId: r.winnerUserId, winnerEntryId: r.winnerEntryId, alreadyPicked: true };
  }
  if (r.status !== "active" && r.status !== "finished") {
    return { ok: false as const, reason: "wrong_status" };
  }

  const [winner] = await db
    .select({ id: raffleEntries.id, userId: raffleEntries.userId })
    .from(raffleEntries)
    .where(eq(raffleEntries.raffleId, raffleId))
    .orderBy(sql`random()`)
    .limit(1);

  if (!winner) return { ok: false as const, reason: "no_entries" };

  await db
    .update(raffles)
    .set({
      winnerUserId: winner.userId,
      winnerEntryId: winner.id,
      status: "finished",
      updatedAt: new Date(),
    })
    .where(eq(raffles.id, raffleId));

  // +XP победителю
  await awardXp({
    userId: winner.userId,
    amount: 500,
    source: "raffle_win",
    reason: "Победа в розыгрыше",
    refType: "raffle",
    refId: raffleId,
    idempotent: true,
  });

  return { ok: true as const, winnerUserId: winner.userId, winnerEntryId: winner.id, alreadyPicked: false };
}

/**
 * Отмена розыгрыша с возвратом билетов всем участникам.
 * Возврат — отдельная компенсирующая строка в ledger (idempotent по refType='raffle_refund', refId=entry.id).
 */
export async function cancelRaffleWithRefund(raffleId: string) {
  const [r] = await db.select().from(raffles).where(eq(raffles.id, raffleId)).limit(1);
  if (!r) return { ok: false as const, reason: "not_found" };
  if (r.status === "cancelled") return { ok: true as const, refunded: 0 };
  if (r.status === "finished") return { ok: false as const, reason: "already_finished" };

  const entries = await db
    .select()
    .from(raffleEntries)
    .where(eq(raffleEntries.raffleId, raffleId));

  for (const e of entries) {
    await ticketCredit({
      userId: e.userId,
      amount: e.ticketCostSnapshot,
      source: "refund",
      reason: `Возврат за отменённый розыгрыш: ${r.title}`,
      refType: "raffle_refund",
      refId: e.id,
      idempotent: true,
    });
  }

  await db
    .update(raffles)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(eq(raffles.id, raffleId));

  return { ok: true as const, refunded: entries.length };
}

import { getXpTotal, computeRank } from "./xp.js";

/**
 * Список призов раффла, отсортированных по position.
 */
export async function listRafflePrizes(raffleId: string) {
  return db
    .select()
    .from(rafflePrizes)
    .where(eq(rafflePrizes.raffleId, raffleId))
    .orderBy(rafflePrizes.position, rafflePrizes.createdAt);
}

/**
 * Сводный «доскорд» рулетки: участники с агрегированными билетами + призы + зафиксированные победители.
 * Билет = одна строка raffle_entries (вес участника = его число entries).
 * Для каждого участника тащим nick, avatarUrl, city, рассчитываем rank по xpTotal.
 */
export async function getRaffleBoard(raffleId: string) {
  const [raffle] = await db.select().from(raffles).where(eq(raffles.id, raffleId)).limit(1);
  if (!raffle) return null;

  const prizes = await listRafflePrizes(raffleId);

  // агрегируем entries по user_id
  const aggRows = await db
    .select({
      userId: raffleEntries.userId,
      tickets: sql<number>`count(*)::int`,
    })
    .from(raffleEntries)
    .where(eq(raffleEntries.raffleId, raffleId))
    .groupBy(raffleEntries.userId);

  const userIds = aggRows.map((r) => r.userId);
  let participants: Array<{
    userId: string;
    nick: string;
    avatarUrl: string | null;
    city: string | null;
    xpTotal: number;
    rankId: string;
    rankLabel: string;
    tickets: number;
  }> = [];

  if (userIds.length > 0) {
    const userRows = await db
      .select({
        id: users.id,
        nick: users.nick,
      })
      .from(users)
      .where(sql`${users.id} in ${userIds}`);
    const profRows = await db
      .select({
        userId: profiles.userId,
        avatarUrl: profiles.avatarUrl,
        city: profiles.city,
      })
      .from(profiles)
      .where(sql`${profiles.userId} in ${userIds}`);

    const profByUser = new Map(profRows.map((p) => [p.userId, p]));
    const userById = new Map(userRows.map((u) => [u.id, u]));

    // XP считаем параллельно
    const xpEntries = await Promise.all(
      userIds.map(async (uid) => [uid, await getXpTotal(uid)] as const),
    );
    const xpByUser = new Map(xpEntries);

    participants = aggRows.map((row) => {
      const u = userById.get(row.userId);
      const p = profByUser.get(row.userId);
      const xpTotal = xpByUser.get(row.userId) ?? 0;
      const rank = computeRank(xpTotal);
      return {
        userId: row.userId,
        nick: u?.nick ?? "user",
        avatarUrl: p?.avatarUrl ?? null,
        city: p?.city ?? null,
        xpTotal,
        rankId: rank.rankId,
        rankLabel: rank.rankLabel,
        tickets: row.tickets,
      };
    });
  }

  // победители
  const winRows = await db
    .select({
      id: rafflePrizeWinners.id,
      prizeId: rafflePrizeWinners.prizeId,
      userId: rafflePrizeWinners.userId,
      entryId: rafflePrizeWinners.entryId,
      createdAt: rafflePrizeWinners.createdAt,
      nick: users.nick,
    })
    .from(rafflePrizeWinners)
    .innerJoin(users, eq(users.id, rafflePrizeWinners.userId))
    .where(eq(rafflePrizeWinners.raffleId, raffleId))
    .orderBy(rafflePrizeWinners.createdAt);

  return { raffle, prizes, participants, winners: winRows };
}

/**
 * Превью-выбор победителя для приза: НЕ персистит.
 * Возвращает кандидата (entry + профиль). Блогер может вызвать несколько раз
 * (перекручивать), пока не зафиксирует через confirmRafflePrizeWinner.
 *
 * Исключаем entries, которые уже были победителями любого приза в этом раффле.
 */
export async function drawRafflePrizeWinner(opts: { raffleId: string; prizeId: string }) {
  const [prize] = await db
    .select()
    .from(rafflePrizes)
    .where(and(eq(rafflePrizes.id, opts.prizeId), eq(rafflePrizes.raffleId, opts.raffleId)))
    .limit(1);
  if (!prize) return { ok: false as const, reason: "prize_not_found" };

  const [{ already }] = await db
    .select({ already: count() })
    .from(rafflePrizeWinners)
    .where(eq(rafflePrizeWinners.prizeId, opts.prizeId));
  if (already >= prize.qty) return { ok: false as const, reason: "prize_exhausted" };

  // случайный entry, исключая уже выигравшие в этом раффле
  const [entry] = await db
    .select({ id: raffleEntries.id, userId: raffleEntries.userId })
    .from(raffleEntries)
    .where(
      and(
        eq(raffleEntries.raffleId, opts.raffleId),
        sql`${raffleEntries.id} not in (select entry_id from raffle_prize_winners where raffle_id = ${opts.raffleId})`,
      ),
    )
    .orderBy(sql`random()`)
    .limit(1);

  if (!entry) return { ok: false as const, reason: "no_entries" };

  const [u] = await db.select({ id: users.id, nick: users.nick }).from(users).where(eq(users.id, entry.userId)).limit(1);
  const [p] = await db
    .select({ avatarUrl: profiles.avatarUrl, city: profiles.city })
    .from(profiles)
    .where(eq(profiles.userId, entry.userId))
    .limit(1);
  const xpTotal = await getXpTotal(entry.userId);
  const rank = computeRank(xpTotal);

  return {
    ok: true as const,
    entryId: entry.id,
    userId: entry.userId,
    nick: u?.nick ?? "user",
    avatarUrl: p?.avatarUrl ?? null,
    city: p?.city ?? null,
    xpTotal,
    rankId: rank.rankId,
    rankLabel: rank.rankLabel,
  };
}

/**
 * Фиксация победителя приза. Валидирует, что entry принадлежит раффлу
 * и не зафиксирован раньше. Если после вставки все слоты всех призов заполнены
 * — переводит раффл в status='finished'.
 */
export async function confirmRafflePrizeWinner(opts: {
  raffleId: string;
  prizeId: string;
  entryId: string;
}) {
  const [prize] = await db
    .select()
    .from(rafflePrizes)
    .where(and(eq(rafflePrizes.id, opts.prizeId), eq(rafflePrizes.raffleId, opts.raffleId)))
    .limit(1);
  if (!prize) return { ok: false as const, reason: "prize_not_found" };

  const [entry] = await db
    .select()
    .from(raffleEntries)
    .where(and(eq(raffleEntries.id, opts.entryId), eq(raffleEntries.raffleId, opts.raffleId)))
    .limit(1);
  if (!entry) return { ok: false as const, reason: "entry_not_found" };

  const [{ already }] = await db
    .select({ already: count() })
    .from(rafflePrizeWinners)
    .where(eq(rafflePrizeWinners.prizeId, opts.prizeId));
  if (already >= prize.qty) return { ok: false as const, reason: "prize_exhausted" };

  // entry уже выигрывал?
  const dup = await db
    .select({ id: rafflePrizeWinners.id })
    .from(rafflePrizeWinners)
    .where(eq(rafflePrizeWinners.entryId, opts.entryId))
    .limit(1);
  if (dup.length > 0) return { ok: false as const, reason: "entry_already_won" };

  const [winner] = await db
    .insert(rafflePrizeWinners)
    .values({
      raffleId: opts.raffleId,
      prizeId: opts.prizeId,
      userId: entry.userId,
      entryId: entry.id,
    })
    .returning();

  await awardXp({
    userId: entry.userId,
    amount: 500,
    source: "raffle_win",
    reason: `Победа в розыгрыше: ${prize.name}`,
    refType: "raffle_prize_winner",
    refId: winner!.id,
    idempotent: true,
  });

  // все призы разыграны?
  const allPrizes = await db
    .select({ qty: rafflePrizes.qty })
    .from(rafflePrizes)
    .where(eq(rafflePrizes.raffleId, opts.raffleId));
  const totalSlots = allPrizes.reduce((s, p) => s + p.qty, 0);
  const [{ totalWinners }] = await db
    .select({ totalWinners: count() })
    .from(rafflePrizeWinners)
    .where(eq(rafflePrizeWinners.raffleId, opts.raffleId));

  let finished = false;
  if (totalSlots > 0 && totalWinners >= totalSlots) {
    await db
      .update(raffles)
      .set({ status: "finished", updatedAt: new Date() })
      .where(eq(raffles.id, opts.raffleId));
    finished = true;
  }

  return { ok: true as const, winnerId: winner!.id, raffleFinished: finished };
}
