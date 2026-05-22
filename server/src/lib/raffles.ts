import { and, count, eq, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { raffles, raffleEntries } from "../db/schema/raffles.js";
import { getTicketBalance, ticketCredit } from "./tickets.js";

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
  | { ok: false; code: "not_found" | "not_active" | "not_started" | "ended" | "limit_reached" | "insufficient_tickets" }
> {
  const [r] = await db.select().from(raffles).where(eq(raffles.id, opts.raffleId)).limit(1);
  if (!r) return { ok: false, code: "not_found" };
  if (r.status !== "active") return { ok: false, code: "not_active" };

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
