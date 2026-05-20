import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { subscriptionTiers, subscriptions, ticketTransactions } from "../db/schema.js";
import { requireAuth } from "../auth/middleware.js";

const subscribeSchema = z.object({
  tier: z.enum(["silver", "gold", "platinum"]),
});

async function getBalance(userId: string): Promise<number> {
  const [row] = await db
    .select({ balance: sql<number>`COALESCE(SUM(${ticketTransactions.delta}), 0)::int` })
    .from(ticketTransactions)
    .where(eq(ticketTransactions.userId, userId));
  return row?.balance ?? 0;
}

async function getActiveSub(userId: string) {
  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, "active")))
    .orderBy(desc(subscriptions.startedAt))
    .limit(1);
  return sub ?? null;
}

export async function passRoutes(app: FastifyInstance) {
  // Публично: список тиров для лендинга/прайса
  app.get("/pass/tiers", async () => {
    const tiers = await db.select().from(subscriptionTiers);
    // фикс порядка silver → gold → platinum
    const order = { silver: 0, gold: 1, platinum: 2 } as const;
    tiers.sort((a, b) => order[a.tier] - order[b.tier]);
    return { tiers };
  });

  // Текущее состояние пользователя по Hell Pass
  app.get("/pass/me", { preHandler: requireAuth }, async (req) => {
    const userId = req.userId!;
    const [sub, balance, txns] = await Promise.all([
      getActiveSub(userId),
      getBalance(userId),
      db
        .select()
        .from(ticketTransactions)
        .where(eq(ticketTransactions.userId, userId))
        .orderBy(desc(ticketTransactions.createdAt))
        .limit(20),
    ]);
    return { subscription: sub, ticketsBalance: balance, recentTransactions: txns };
  });

  // Активировать подписку. БЕЗ ОПЛАТЫ — заглушка для разработки фронта.
  // Когда подключим ЮKassa, этот эндпоинт станет вебхуком после успешного платежа.
  app.post("/pass/subscribe", { preHandler: requireAuth }, async (req, reply) => {
    const parsed = subscribeSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_input" });
    const userId = req.userId!;
    const { tier } = parsed.data;

    const [tierInfo] = await db
      .select()
      .from(subscriptionTiers)
      .where(eq(subscriptionTiers.tier, tier))
      .limit(1);
    if (!tierInfo) return reply.code(404).send({ error: "tier_not_found" });

    // Если уже есть активная — отменить и создать новую (апгрейд/смена)
    const existing = await getActiveSub(userId);
    if (existing) {
      await db
        .update(subscriptions)
        .set({ status: "cancelled", cancelledAt: new Date() })
        .where(eq(subscriptions.id, existing.id));
    }

    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const [created] = await db
      .insert(subscriptions)
      .values({ userId, tier, currentPeriodEnd: periodEnd })
      .returning();

    // Начислить месячные билеты
    if (tierInfo.monthlyTickets > 0) {
      await db.insert(ticketTransactions).values({
        userId,
        delta: tierInfo.monthlyTickets,
        reason: "subscription_grant",
        refId: created.id,
        note: `Активация Hell Pass ${tierInfo.name}`,
      });
    }

    return reply.code(201).send({ subscription: created, granted: tierInfo.monthlyTickets });
  });

  // Отмена: подписка доработает до конца периода (status остаётся active, но cancelledAt стоит)
  app.post("/pass/cancel", { preHandler: requireAuth }, async (req, reply) => {
    const userId = req.userId!;
    const sub = await getActiveSub(userId);
    if (!sub) return reply.code(404).send({ error: "no_active_subscription" });
    if (sub.cancelledAt) return reply.send({ subscription: sub, alreadyCancelled: true });

    const [updated] = await db
      .update(subscriptions)
      .set({ cancelledAt: new Date() })
      .where(eq(subscriptions.id, sub.id))
      .returning();
    return reply.send({ subscription: updated });
  });

  // Баланс билетов + история
  app.get("/tickets/me", { preHandler: requireAuth }, async (req) => {
    const userId = req.userId!;
    const [balance, history] = await Promise.all([
      getBalance(userId),
      db
        .select()
        .from(ticketTransactions)
        .where(eq(ticketTransactions.userId, userId))
        .orderBy(desc(ticketTransactions.createdAt))
        .limit(100),
    ]);
    return { balance, history };
  });
}
