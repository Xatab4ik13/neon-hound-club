import type { FastifyInstance } from "fastify";
import { and, desc, eq, inArray, sql, sum, count } from "drizzle-orm";
import { db } from "../db/client.js";
import { requireAdmin } from "../lib/auth.js";
import { users } from "../db/schema/users.js";
import { orders, orderItems, products, PAID_ORDER_STATUSES } from "../db/schema/shop.js";
import { passPurchases } from "../db/schema/pass.js";
import { raffles, raffleEntries } from "../db/schema/raffles.js";
import { ticketsLedger } from "../db/schema/tickets.js";
import { payments } from "../db/schema/payments.js";

export async function adminDashboardRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAdmin);

  /** GET /api/v1/admin/dashboard — все KPI и таблицы для админ-дашборда. */
  app.get("/", async () => {
    const nowMs = Date.now();
    const now = new Date(nowMs).toISOString();
    const d30 = new Date(nowMs - 30 * 24 * 60 * 60 * 1000).toISOString();
    const d7 = new Date(nowMs - 7 * 24 * 60 * 60 * 1000).toISOString();
    const d48h = new Date(nowMs + 48 * 60 * 60 * 1000).toISOString();
    const d7next = new Date(nowMs + 7 * 24 * 60 * 60 * 1000).toISOString();

    // --- KPI ---
    // Выручка = подтверждённые банком платежи (orders + Hell Pass) за 30 дней.
    // Единый источник истины с экономикой.
    const [revenueRow] = await db
      .select({ total: sql<number>`COALESCE(SUM(${payments.amountRub}), 0)::int` })
      .from(payments)
      .where(and(eq(payments.status, "confirmed"), sql`${payments.updatedAt} >= ${d30}::timestamptz`));

    const [passActive] = await db
      .select({ c: sql<number>`COUNT(*)::int` })
      .from(passPurchases)
      .where(and(eq(passPurchases.status, "active"), sql`${passPurchases.expiresAt} >= ${now}::timestamptz`));

    const [newUsers7] = await db
      .select({ c: sql<number>`COUNT(*)::int` })
      .from(users)
      .where(sql`${users.createdAt} >= ${d7}::timestamptz`);

    const [ticketsTotal] = await db
      .select({ total: sql<number>`COALESCE(SUM(${ticketsLedger.amount}), 0)::int` })
      .from(ticketsLedger);

    const [rafflesActive] = await db
      .select({ c: sql<number>`COUNT(*)::int` })
      .from(raffles)
      .where(eq(raffles.status, "active"));

    const [rafflesBank] = await db
      .select({
        bank: sql<number>`COALESCE(SUM(${raffleEntries.ticketCostSnapshot}), 0)::int`,
      })
      .from(raffleEntries)
      .innerJoin(raffles, eq(raffles.id, raffleEntries.raffleId))
      .where(eq(raffles.status, "active"));

    const [orders7] = await db
      .select({ c: sql<number>`COUNT(*)::int` })
      .from(orders)
      .where(sql`${orders.createdAt} >= ${d7}::timestamptz`);

    // --- Last orders ---
    const lastOrders = await db
      .select({
        id: orders.id,
        status: orders.status,
        totalRub: orders.totalRub,
        createdAt: orders.createdAt,
        nick: users.nick,
      })
      .from(orders)
      .innerJoin(users, eq(users.id, orders.userId))
      .orderBy(desc(orders.createdAt))
      .limit(5);

    // --- Raffles ending in < 48h ---
    const rafflesSoon = await db
      .select({
        id: raffles.id,
        title: raffles.title,
        prize: raffles.prize,
        endsAt: raffles.endsAt,
      })
      .from(raffles)
      .where(
        and(
          eq(raffles.status, "active"),
          sql`${raffles.endsAt} < ${d48h}::timestamptz`,
          sql`${raffles.endsAt} >= ${now}::timestamptz`,
        ),
      )
      .orderBy(raffles.endsAt)
      .limit(5);

    const rafflesSoonWithEntries = await Promise.all(
      rafflesSoon.map(async (r) => {
        const [c] = await db
          .select({ c: sql<number>`COUNT(*)::int` })
          .from(raffleEntries)
          .where(eq(raffleEntries.raffleId, r.id));
        return { ...r, entries: c?.c ?? 0 };
      }),
    );

    // --- Pass expiring in 7d ---
    const passExpiring = await db
      .select({
        id: passPurchases.id,
        tier: passPurchases.tier,
        expiresAt: passPurchases.expiresAt,
        nick: users.nick,
      })
      .from(passPurchases)
      .innerJoin(users, eq(users.id, passPurchases.userId))
      .where(
        and(
          eq(passPurchases.status, "active"),
          sql`${passPurchases.expiresAt} >= ${now}::timestamptz`,
          sql`${passPurchases.expiresAt} < ${d7next}::timestamptz`,
        ),
      )
      .orderBy(passPurchases.expiresAt)
      .limit(5);

    // --- Top products (by paid orders qty over 30d) ---
    const topProducts = await db
      .select({
        productId: orderItems.productId,
        title: sql<string>`MAX(${orderItems.titleSnapshot})`,
        qty: sql<number>`SUM(${orderItems.qty})::int`,
        revenue: sql<number>`SUM(${orderItems.qty} * ${orderItems.priceRubSnapshot})::int`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .where(
        and(
          inArray(orders.status, PAID_ORDER_STATUSES as unknown as string[]),
          sql`${orders.paidAt} >= ${d30}::timestamptz`,
        ),
      )
      .groupBy(orderItems.productId)
      .orderBy(sql`SUM(${orderItems.qty}) DESC`)
      .limit(5);

    return {
      kpi: {
        revenue30d: revenueRow?.total ?? 0,
        passActive: passActive?.c ?? 0,
        newUsers7d: newUsers7?.c ?? 0,
        ticketsInCirculation: ticketsTotal?.total ?? 0,
        rafflesActive: rafflesActive?.c ?? 0,
        rafflesBankTickets: rafflesBank?.bank ?? 0,
        orders7d: orders7?.c ?? 0,
      },
      lastOrders,
      rafflesSoon: rafflesSoonWithEntries,
      passExpiring,
      topProducts,
    };
  });
}
