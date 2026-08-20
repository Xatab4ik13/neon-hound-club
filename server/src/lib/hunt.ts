import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { hunts, huntPrizes, huntBets, type Hunt } from "../db/schema/hunt.js";
import { users } from "../db/schema/users.js";
import { profiles } from "../db/schema/profile.js";
import { getTicketBalance, ticketCredit } from "./tickets.js";
import { getActivePass } from "./pass.js";

export class HuntError extends Error {
  constructor(
    public code:
      | "no_hunt"
      | "closed"
      | "locked"
      | "no_pass"
      | "bad_amount"
      | "not_enough_tickets"
      | "already_drawn",
    message: string,
  ) {
    super(message);
  }
}

/** За сколько до старта закрываем приём ставок (совпадает с фронтом). */
export const HUNT_LOCK_MS = 10 * 60 * 1000;

/** Актуальная охота: самая свежая не-draft. */
export async function getCurrentHunt(includeDraft = false): Promise<Hunt | null> {
  const rows = await db
    .select()
    .from(hunts)
    .where(includeDraft ? sql`true` : sql`${hunts.status} <> 'draft'`)
    .orderBy(desc(hunts.startsAt))
    .limit(1);
  return rows[0] ?? null;
}

export async function getHuntPrizes(huntId: string) {
  return db.select().from(huntPrizes).where(eq(huntPrizes.huntId, huntId)).orderBy(asc(huntPrizes.place));
}

/** Участники охоты с ником/аватаркой и весами. */
export async function getHuntEntries(huntId: string) {
  const rows = await db
    .select({
      userId: huntBets.userId,
      tickets: huntBets.tickets,
      nick: users.nick,
      city: profiles.city,
      avatarUrl: profiles.avatarUrl,
    })
    .from(huntBets)
    .innerJoin(users, eq(users.id, huntBets.userId))
    .leftJoin(profiles, eq(profiles.userId, huntBets.userId))
    .where(eq(huntBets.huntId, huntId))
    .orderBy(desc(huntBets.tickets));
  return rows;
}

export function capsulesOf(tickets: number, step: number) {
  return Math.floor(tickets / Math.max(1, step));
}

export async function getMyBet(huntId: string, userId: string) {
  const [row] = await db
    .select()
    .from(huntBets)
    .where(and(eq(huntBets.huntId, huntId), eq(huntBets.userId, userId)))
    .limit(1);
  return row ?? null;
}

/**
 * Поставить билеты. Билеты сгорают сразу (списание в леджер), отмены нет.
 * Условия: активная охота, фаза приёма ставок, активный Hell Pass,
 * количество кратно ticket_step и не меньше одного шага.
 */
export async function placeHuntBet(userId: string, amount: number) {
  const hunt = await getCurrentHunt();
  if (!hunt || hunt.status !== "open") throw new HuntError("no_hunt", "Охота не открыта");

  const startsAt = hunt.startsAt.getTime();
  if (Date.now() >= startsAt - HUNT_LOCK_MS) {
    throw new HuntError("locked", "Приём ставок закрыт — барабан зафиксирован");
  }

  const pass = await getActivePass(userId);
  if (!pass) throw new HuntError("no_pass", "Нужен активный Hell Pass");

  const step = Math.max(1, hunt.ticketStep);
  if (!Number.isInteger(amount) || amount < step || amount % step !== 0) {
    throw new HuntError("bad_amount", `Ставка кратна ${step} билетам`);
  }

  const balance = await getTicketBalance(userId);
  if (balance < amount) throw new HuntError("not_enough_tickets", "Не хватает билетов");

  await ticketCredit({
    userId,
    amount: -amount,
    source: "raffle_entry",
    reason: `Вход в HELL HUNT (${hunt.title})`,
    refType: "hunt",
    refId: hunt.id,
  });

  const existing = await getMyBet(hunt.id, userId);
  if (existing) {
    await db
      .update(huntBets)
      .set({ tickets: existing.tickets + amount, updatedAt: new Date() })
      .where(eq(huntBets.id, existing.id));
  } else {
    await db.insert(huntBets).values({ huntId: hunt.id, userId, tickets: amount });
  }

  const tickets = (existing?.tickets ?? 0) + amount;
  return { tickets, capsules: capsulesOf(tickets, step), balance: balance - amount };
}

/**
 * Прокрутить жребий. Идём от младшего места к главному (3 → 2 → 1).
 * Назначенный руками победитель выигрывает гарантированно; остальные призы —
 * честный жребий с весом = число капсул. Один юзер не берёт два приза.
 */
export async function drawHunt(huntId: string, force = false) {
  const [hunt] = await db.select().from(hunts).where(eq(hunts.id, huntId)).limit(1);
  if (!hunt) throw new HuntError("no_hunt", "Охота не найдена");
  if (hunt.drawnAt && !force) throw new HuntError("already_drawn", "Итоги уже зафиксированы");

  const prizes = await getHuntPrizes(huntId);
  const entries = await getHuntEntries(huntId);
  const step = Math.max(1, hunt.ticketStep);

  const taken = new Set<string>();
  const forced = new Set(prizes.map((p) => p.forcedWinnerId).filter((v): v is string => !!v));

  // Порядок вскрытия: сначала младшие места, главный приз последним.
  const order = [...prizes].sort((a, b) => b.place - a.place);

  for (const prize of order) {
    let winnerId: string | null = prize.forcedWinnerId ?? null;

    if (!winnerId) {
      const pool = entries.filter(
        (e) => !taken.has(e.userId) && !forced.has(e.userId) && capsulesOf(e.tickets, step) > 0,
      );
      const total = pool.reduce((s, e) => s + capsulesOf(e.tickets, step), 0);
      if (total > 0) {
        let roll = Math.random() * total;
        for (const e of pool) {
          roll -= capsulesOf(e.tickets, step);
          if (roll <= 0) {
            winnerId = e.userId;
            break;
          }
        }
        if (!winnerId) winnerId = pool[pool.length - 1]!.userId;
      }
    }

    if (winnerId) taken.add(winnerId);

    await db.update(huntPrizes).set({ winnerUserId: winnerId }).where(eq(huntPrizes.id, prize.id));

    // Призы-билеты начисляем сразу.
    if (winnerId && prize.ticketsReward > 0) {
      await ticketCredit({
        userId: winnerId,
        amount: prize.ticketsReward,
        source: "admin",
        reason: `Приз HELL HUNT: ${prize.title}`,
        refType: "hunt_prize",
        refId: prize.id,
        idempotent: true,
      });
    }
  }

  await db
    .update(hunts)
    .set({ status: "finished", drawnAt: new Date(), updatedAt: new Date() })
    .where(eq(hunts.id, huntId));

  return getHuntPrizes(huntId);
}

/** Вернуть билеты всем участникам и обнулить ставки (отмена охоты / рестарт). */
export async function refundHunt(huntId: string) {
  const rows = await db.select().from(huntBets).where(eq(huntBets.huntId, huntId));
  for (const r of rows) {
    if (r.tickets <= 0) continue;
    await ticketCredit({
      userId: r.userId,
      amount: r.tickets,
      source: "refund",
      reason: "Возврат билетов за HELL HUNT",
      refType: "hunt_refund",
      refId: r.id,
      idempotent: true,
    });
  }
  await db.delete(huntBets).where(eq(huntBets.huntId, huntId));
  return { refunded: rows.length };
}
