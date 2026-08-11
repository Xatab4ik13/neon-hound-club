import type { FastifyInstance } from "fastify";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { requireAdmin } from "../lib/auth.js";
import { users } from "../db/schema/users.js";
import { orders, orderItems, products, PAID_ORDER_STATUSES } from "../db/schema/shop.js";
import { passPurchases } from "../db/schema/pass.js";
import { raffles, raffleEntries } from "../db/schema/raffles.js";
import { ticketsLedger } from "../db/schema/tickets.js";
import { payments } from "../db/schema/payments.js";

/** Разбор ?from=&to= (YYYY-MM-DD или ISO). По умолчанию — последние 30 дней. */
function parseRange(q: { from?: string; to?: string }) {
  const nowMs = Date.now();
  const to = q.to ? new Date(q.to) : new Date(nowMs);
  const from = q.from ? new Date(q.from) : new Date(nowMs - 30 * 24 * 60 * 60 * 1000);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return {
      from: new Date(nowMs - 30 * 24 * 60 * 60 * 1000).toISOString(),
      to: new Date(nowMs).toISOString(),
    };
  }
  // Если пришла чистая дата (без времени) — конец дня включительно.
  if (q.to && /^\d{4}-\d{2}-\d{2}$/.test(q.to)) to.setUTCHours(23, 59, 59, 999);
  return { from: from.toISOString(), to: to.toISOString() };
}

export async function adminDashboardRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAdmin);

  /** GET /api/v1/admin/dashboard?from=&to= — KPI и продажи по товарам за период. */
  app.get<{ Querystring: { from?: string; to?: string } }>("/", async (req) => {
    const { from, to } = parseRange(req.query ?? {});
    const now = new Date().toISOString();
    const paid = PAID_ORDER_STATUSES as unknown as string[];

    // --- Выручка (подтверждённые банком платежи: заказы + Hell Pass) ---
    const [revenueRow] = await db
      .select({ total: sql<number>`COALESCE(SUM(${payments.amountRub}), 0)::int` })
      .from(payments)
      .where(
        and(
          eq(payments.status, "confirmed"),
          sql`${payments.updatedAt} >= ${from}::timestamptz`,
          sql`${payments.updatedAt} <= ${to}::timestamptz`,
        ),
      );

    // --- Заказы за период (оплаченные) ---
    const [ordersRow] = await db
      .select({
        cnt: sql<number>`COUNT(*)::int`,
        goods: sql<number>`COALESCE(SUM(${orders.totalRub} - ${orders.shippingPriceRub}), 0)::int`,
        shipping: sql<number>`COALESCE(SUM(${orders.shippingPriceRub}) FILTER (WHERE ${orders.paidAt} >= ${SHIPPING_MARKUP_SINCE}::timestamptz), 0)::int`,
        discount: sql<number>`COALESCE(SUM(${orders.discountRub}), 0)::int`,
        // Себестоимость доставки: клиенту показывается цена СДЭК × 1.25.
        // Наценка включена 11.08.2026 21:00 МСК — раньше этого времени разницы не было.
        shippingCost: sql<number>`COALESCE(SUM(ROUND(${orders.shippingPriceRub} / 1.25)) FILTER (WHERE ${orders.paidAt} >= ${SHIPPING_MARKUP_SINCE}::timestamptz), 0)::int`,
        shippingOrders: sql<number>`COUNT(*) FILTER (WHERE ${orders.shippingPriceRub} > 0 AND ${orders.paidAt} >= ${SHIPPING_MARKUP_SINCE}::timestamptz)::int`,
      })
      .from(orders)
      .where(
        and(
          inArray(orders.status, paid),
          sql`${orders.paidAt} >= ${from}::timestamptz`,
          sql`${orders.paidAt} <= ${to}::timestamptz`,
        ),
      );

    const [newUsers] = await db
      .select({ c: sql<number>`COUNT(*)::int` })
      .from(users)
      .where(and(sql`${users.createdAt} >= ${from}::timestamptz`, sql`${users.createdAt} <= ${to}::timestamptz`));

    const [passSold] = await db
      .select({
        cnt: sql<number>`COUNT(*)::int`,
        sum: sql<number>`COALESCE(SUM(${passPurchases.priceRub}), 0)::int`,
      })
      .from(passPurchases)
      .where(
        and(
          inArray(passPurchases.status, ["active", "expired"]),
          sql`${passPurchases.createdAt} >= ${from}::timestamptz`,
          sql`${passPurchases.createdAt} <= ${to}::timestamptz`,
        ),
      );

    const [passActive] = await db
      .select({ c: sql<number>`COUNT(*)::int` })
      .from(passPurchases)
      .where(and(eq(passPurchases.status, "active"), sql`${passPurchases.expiresAt} >= ${now}::timestamptz`));

    const [ticketsTotal] = await db
      .select({ total: sql<number>`COALESCE(SUM(${ticketsLedger.amount}), 0)::int` })
      .from(ticketsLedger);

    const [rafflesActive] = await db
      .select({ c: sql<number>`COUNT(*)::int` })
      .from(raffles)
      .where(eq(raffles.status, "active"));

    const [rafflesBank] = await db
      .select({ bank: sql<number>`COALESCE(SUM(${raffleEntries.ticketCostSnapshot}), 0)::int` })
      .from(raffleEntries)
      .innerJoin(raffles, eq(raffles.id, raffleEntries.raffleId))
      .where(eq(raffles.status, "active"));

    // --- Продажи по товарам за период ---
    const productRows = await db
      .select({
        productId: orderItems.productId,
        title: sql<string>`MAX(${orderItems.titleSnapshot})`,
        kind: sql<string>`COALESCE(MAX(${products.kind}), 'physical')`,
        slug: sql<string | null>`MAX(${products.slug})`,
        qty: sql<number>`SUM(${orderItems.qty})::int`,
        revenue: sql<number>`SUM(${orderItems.qty} * ${orderItems.priceRubSnapshot})::int`,
        ordersCount: sql<number>`COUNT(DISTINCT ${orderItems.orderId})::int`,
        buyers: sql<number>`COUNT(DISTINCT ${orders.userId})::int`,
        tickets: sql<number>`COALESCE(SUM(${orderItems.qty} * ${orderItems.bonusTicketsSnapshot}), 0)::int`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .leftJoin(products, eq(products.id, orderItems.productId))
      .where(
        and(
          inArray(orders.status, paid),
          sql`${orders.paidAt} >= ${from}::timestamptz`,
          sql`${orders.paidAt} <= ${to}::timestamptz`,
        ),
      )
      .groupBy(orderItems.productId)
      .orderBy(sql`SUM(${orderItems.qty} * ${orderItems.priceRubSnapshot}) DESC`);

    // --- Динамика по месяцам (12 мес) — для быстрых фильтров и графика ---
    const monthly = await db
      .select({
        month: sql<string>`to_char(date_trunc('month', ${payments.updatedAt}), 'YYYY-MM')`,
        revenue: sql<number>`COALESCE(SUM(${payments.amountRub}), 0)::int`,
      })
      .from(payments)
      .where(
        and(eq(payments.status, "confirmed"), sql`${payments.updatedAt} >= now() - interval '12 months'`),
      )
      .groupBy(sql`date_trunc('month', ${payments.updatedAt})`)
      .orderBy(sql`date_trunc('month', ${payments.updatedAt})`);

    // --- Последние заказы ---
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
      .limit(8);

    // --- Розыгрыши, до конца < 48ч ---
    const d48h = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    const rafflesSoon = await db
      .select({ id: raffles.id, title: raffles.title, prize: raffles.prize, endsAt: raffles.endsAt })
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

    const ordersCnt = ordersRow?.cnt ?? 0;
    const goods = ordersRow?.goods ?? 0;

    return {
      range: { from, to },
      kpi: {
        revenue: revenueRow?.total ?? 0,
        ordersPaid: ordersCnt,
        goodsRevenue: goods,
        shippingRevenue: ordersRow?.shipping ?? 0,
        shippingCostRub: ordersRow?.shippingCost ?? 0,
        shippingMarginRub: (ordersRow?.shipping ?? 0) - (ordersRow?.shippingCost ?? 0),
        shippingOrders: ordersRow?.shippingOrders ?? 0,
        discountRub: ordersRow?.discount ?? 0,
        avgOrderRub: ordersCnt > 0 ? Math.round(goods / ordersCnt) : 0,
        passSold: passSold?.cnt ?? 0,
        passRevenue: passSold?.sum ?? 0,
        newUsers: newUsers?.c ?? 0,
        passActive: passActive?.c ?? 0,
        ticketsInCirculation: ticketsTotal?.total ?? 0,
        rafflesActive: rafflesActive?.c ?? 0,
        rafflesBankTickets: rafflesBank?.bank ?? 0,
      },
      products: productRows,
      monthly,
      lastOrders,
      rafflesSoon: rafflesSoonWithEntries,
    };
  });
}
