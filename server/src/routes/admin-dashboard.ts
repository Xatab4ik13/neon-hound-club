import type { FastifyInstance } from "fastify";
import { and, desc, eq, gte, lt, sql, sum, count } from "drizzle-orm";
import { db } from "../db/client.js";
import { requireAdmin } from "../lib/auth.js";
import { users } from "../db/schema/users.js";
import { orders, orderItems, products } from "../db/schema/shop.js";
import { passPurchases } from "../db/schema/pass.js";
import { raffles, raffleEntries } from "../db/schema/raffles.js";
import { ticketsLedger } from "../db/schema/tickets.js";

export async function adminDashboardRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAdmin);

  /** GET /api/v1/admin/dashboard — все KPI и таблицы для админ-дашборда. */
  app.get("/", async () => {
    const now = new Date();
    const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const d48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    const d7next = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // --- KPI ---
    const [revenueRow] = await db
      .select({ total: sql<number>`COALESCE(SUM(${orders.totalRub}), 0)::int` })
      .from(orders)
      .where(and(gte(orders.paidAt, d30), eq(orders.status, "paid")));

    const [passActive] = await db
      .select({ c: sql<number>`COUNT(*)::int` })
      .from(passPurchases)
      .where(and(eq(passPurchases.status, "active"), gte(passPurchases.expiresAt, now)));

    const [newUsers7] = await db
      .select({ c: sql<number>`COUNT(*)::int` })
      .from(users)
      .where(gte(users.createdAt, d7));

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
      .where(gte(orders.createdAt, d7));

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
      .where(and(eq(raffles.status, "active"), lt(raffles.endsAt, d48h), gte(raffles.endsAt, now)))
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
          gte(passPurchases.expiresAt, now),
          lt(passPurchases.expiresAt, d7next),
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
      .where(and(eq(orders.status, "paid"), gte(orders.paidAt, d30)))
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
