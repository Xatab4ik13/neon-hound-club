import type { FastifyInstance } from "fastify";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client.js";
import {
  raffleEntries,
  rafflePrizes,
  raffleWinners,
  raffles,
  ticketTransactions,
} from "../db/schema.js";
import { requireAuth } from "../auth/middleware.js";

const enterSchema = z.object({
  tickets: z.number().int().min(1).max(1000),
});

async function getBalance(userId: string): Promise<number> {
  const [row] = await db
    .select({ b: sql<number>`COALESCE(SUM(${ticketTransactions.delta}), 0)::int` })
    .from(ticketTransactions)
    .where(eq(ticketTransactions.userId, userId));
  return row?.b ?? 0;
}

async function loadRaffleFull(raffleId: string) {
  const [raffle] = await db.select().from(raffles).where(eq(raffles.id, raffleId)).limit(1);
  if (!raffle) return null;

  const [prizes, totalsRow, winners] = await Promise.all([
    db
      .select()
      .from(rafflePrizes)
      .where(eq(rafflePrizes.raffleId, raffleId))
      .orderBy(asc(rafflePrizes.sortOrder)),
    db
      .select({
        totalTickets: sql<number>`COUNT(*)::int`,
        totalParticipants: sql<number>`COUNT(DISTINCT ${raffleEntries.userId})::int`,
      })
      .from(raffleEntries)
      .where(eq(raffleEntries.raffleId, raffleId)),
    db.select().from(raffleWinners).where(eq(raffleWinners.raffleId, raffleId)),
  ]);

  const winnersByPrize = new Map<string, string[]>();
  for (const w of winners) {
    const arr = winnersByPrize.get(w.prizeId) ?? [];
    arr.push(w.userId);
    winnersByPrize.set(w.prizeId, arr);
  }

  return {
    raffle,
    prizes: prizes.map((p) => ({
      ...p,
      winners: winnersByPrize.get(p.id) ?? [],
      remaining: Math.max(0, p.qty - (winnersByPrize.get(p.id)?.length ?? 0)),
    })),
    totalTickets: totalsRow[0]?.totalTickets ?? 0,
    totalParticipants: totalsRow[0]?.totalParticipants ?? 0,
  };
}

export async function rafflesPublicRoutes(app: FastifyInstance) {
  // Список опубликованных розыгрышей со сводкой
  app.get("/raffles", async () => {
    const rows = await db
      .select()
      .from(raffles)
      .where(eq(raffles.isPublished, true))
      .orderBy(desc(raffles.endsAt));

    const ids = rows.map((r) => r.id);
    if (ids.length === 0) return { raffles: [] };

    const totals = await db
      .select({
        raffleId: raffleEntries.raffleId,
        totalTickets: sql<number>`COUNT(*)::int`,
        totalParticipants: sql<number>`COUNT(DISTINCT ${raffleEntries.userId})::int`,
      })
      .from(raffleEntries)
      .where(sql`${raffleEntries.raffleId} = ANY(${ids})`)
      .groupBy(raffleEntries.raffleId);

    const totalsMap = new Map(totals.map((t) => [t.raffleId, t]));

    return {
      raffles: rows.map((r) => ({
        ...r,
        totalTickets: totalsMap.get(r.id)?.totalTickets ?? 0,
        totalParticipants: totalsMap.get(r.id)?.totalParticipants ?? 0,
      })),
    };
  });

  // Один розыгрыш — призы, остатки, статистика
  app.get<{ Params: { id: string } }>("/raffles/:id", async (req, reply) => {
    const data = await loadRaffleFull(req.params.id);
    if (!data) return reply.code(404).send({ error: "not_found" });
    return data;
  });

  // Сколько билетов потратил конкретный юзер в этом розыгрыше + его выигрыши
  app.get<{ Params: { id: string } }>(
    "/raffles/:id/me",
    { preHandler: requireAuth },
    async (req) => {
      const userId = req.userId!;
      const raffleId = req.params.id;
      const [entries, wins] = await Promise.all([
        db
          .select({ c: sql<number>`COUNT(*)::int` })
          .from(raffleEntries)
          .where(and(eq(raffleEntries.raffleId, raffleId), eq(raffleEntries.userId, userId))),
        db
          .select()
          .from(raffleWinners)
          .where(and(eq(raffleWinners.raffleId, raffleId), eq(raffleWinners.userId, userId))),
      ]);
      return { tickets: entries[0]?.c ?? 0, wins };
    },
  );

  // Купить участие за билеты
  app.post<{ Params: { id: string } }>(
    "/raffles/:id/enter",
    { preHandler: requireAuth },
    async (req, reply) => {
      const userId = req.userId!;
      const raffleId = req.params.id;
      const parsed = enterSchema.safeParse(req.body);
      if (!parsed.success) return reply.code(400).send({ error: "invalid_input" });

      const [raffle] = await db.select().from(raffles).where(eq(raffles.id, raffleId)).limit(1);
      if (!raffle) return reply.code(404).send({ error: "not_found" });
      if (!raffle.isPublished) return reply.code(403).send({ error: "not_published" });
      if (raffle.endsAt.getTime() < Date.now())
        return reply.code(409).send({ error: "already_finished" });

      const cost = raffle.ticketCost * parsed.data.tickets;
      const balance = await getBalance(userId);
      if (balance < cost) return reply.code(402).send({ error: "not_enough_tickets", balance, cost });

      // Одна транзакция -cost, и N строк-участий (по одной на «попытку»)
      await db.transaction(async (tx) => {
        await tx.insert(ticketTransactions).values({
          userId,
          delta: -cost,
          reason: "lottery_entry",
          refId: raffleId,
          note: `Участие в «${raffle.name}» — ${parsed.data.tickets} шт.`,
        });
        const rows = Array.from({ length: parsed.data.tickets }, () => ({
          raffleId,
          userId,
        }));
        await tx.insert(raffleEntries).values(rows);
      });

      return reply.code(201).send({ ok: true, spent: cost, tickets: parsed.data.tickets });
    },
  );
}
