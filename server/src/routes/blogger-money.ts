import type { FastifyInstance } from "fastify";
import { and, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client.js";
import { orderItems, orders, PAID_ORDER_STATUSES } from "../db/schema/shop.js";
import { requireBlogger } from "../lib/auth.js";
import { calculateBloggerMoneyRub } from "../lib/blogger-money.js";

const PROJECT_STARTED_AT = "2026-08-09T00:00:00.000Z";

function parseDateRange(fromValue: string, toValue: string) {
  const from = new Date(`${fromValue}T00:00:00.000Z`);
  const to = new Date(`${toValue}T23:59:59.999Z`);
  const floor = new Date(PROJECT_STARTED_AT);
  if (from < floor) from.setTime(floor.getTime());
  return { from, to };
}

export async function bloggerMoneyRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { from?: string; to?: string } }>(
    "/",
    { preHandler: requireBlogger },
    async (req, reply) => {
      const parsed = z
        .object({
          from: z.string().date(),
          to: z.string().date(),
        })
        .safeParse(req.query);
      if (!parsed.success) return reply.code(400).send({ error: "invalid_date_range" });

      const { from, to } = parseDateRange(parsed.data.from, parsed.data.to);
      if (from > to) return reply.code(400).send({ error: "invalid_date_range" });

      const rows = await db
        .select({
          orderId: orders.id,
          subtotalRub: orders.subtotalRub,
          discountRub: orders.discountRub,
          digitalGrossRub: sql<number>`COALESCE(SUM(${orderItems.qty} * ${orderItems.priceRubSnapshot}) FILTER (WHERE ${orderItems.kindSnapshot} IN ('digital', 'virtual')), 0)::int`,
        })
        .from(orders)
        .innerJoin(orderItems, sql`${orderItems.orderId} = ${orders.id}`)
        .where(
          and(
            inArray(orders.status, PAID_ORDER_STATUSES as unknown as string[]),
            sql`${orders.paidAt} >= ${from.toISOString()}::timestamptz`,
            sql`${orders.paidAt} <= ${to.toISOString()}::timestamptz`,
          ),
        )
        .groupBy(orders.id, orders.subtotalRub, orders.discountRub);

      return {
        amountRub: calculateBloggerMoneyRub(rows),
        range: {
          from: from.toISOString(),
          to: to.toISOString(),
        },
      };
    },
  );
}