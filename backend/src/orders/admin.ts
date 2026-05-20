import type { FastifyInstance } from "fastify";
import { desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client.js";
import {
  orderItems,
  orders,
  productVariants,
  ticketTransactions,
} from "../db/schema.js";
import { requireAdmin } from "../auth/admin.js";

const statusSchema = z.enum(["created", "paid", "shipping", "delivered", "cancelled"]);

const updateSchema = z.object({
  status: statusSchema.optional(),
  cdekTrackingNumber: z.string().min(1).max(64).optional().nullable(),
});

export async function ordersAdminRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAdmin);

  // Список заказов с фильтром по статусу
  app.get<{ Querystring: { status?: string; limit?: string } }>(
    "/admin/orders",
    async (req) => {
      const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
      const parsed = req.query.status ? statusSchema.safeParse(req.query.status) : null;
      const where = parsed?.success ? eq(orders.status, parsed.data) : undefined;
      const rows = await db
        .select()
        .from(orders)
        .where(where)
        .orderBy(desc(orders.createdAt))
        .limit(limit);
      return { orders: rows };
    },
  );

  app.get<{ Params: { id: string } }>("/admin/orders/:id", async (req, reply) => {
    const [order] = await db.select().from(orders).where(eq(orders.id, req.params.id)).limit(1);
    if (!order) return reply.code(404).send({ error: "not_found" });
    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
    return { order, items };
  });

  // Смена статуса. Переход → paid начисляет кешбэк билетами один раз.
  // Переход → cancelled из ещё-не-cancelled возвращает остатки на варианты.
  app.patch<{ Params: { id: string } }>("/admin/orders/:id", async (req, reply) => {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_input" });

    const result = await db.transaction(async (tx) => {
      const [order] = await tx.select().from(orders).where(eq(orders.id, req.params.id)).limit(1);
      if (!order) return { error: "not_found" as const };

      const patch: Record<string, unknown> = { updatedAt: new Date() };
      if (parsed.data.cdekTrackingNumber !== undefined)
        patch.cdekTrackingNumber = parsed.data.cdekTrackingNumber;

      const nextStatus = parsed.data.status;
      if (nextStatus && nextStatus !== order.status) {
        patch.status = nextStatus;

        // → paid: фиксируем дату, начисляем кешбэк (идемпотентно по cashbackGranted)
        if (nextStatus === "paid" && !order.cashbackGranted) {
          patch.paidAt = new Date();
          if (order.cashbackTickets > 0) {
            await tx.insert(ticketTransactions).values({
              userId: order.userId,
              delta: order.cashbackTickets,
              reason: "cashback_purchase",
              refId: order.id,
              note: `Кешбэк за заказ ${order.code}`,
            });
          }
          patch.cashbackGranted = true;
        }

        // → cancelled: возвращаем остатки (только если ещё не были возвращены)
        if (nextStatus === "cancelled" && order.status !== "cancelled") {
          const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, order.id));
          for (const it of items) {
            if (!it.variantId) continue;
            await tx
              .update(productVariants)
              .set({
                stock: sql`CASE WHEN ${productVariants.stock} = -1 THEN -1 ELSE ${productVariants.stock} + ${it.qty} END`,
              })
              .where(eq(productVariants.id, it.variantId));
          }
          // Если ранее был paid → кешбэк уже начислен. Списываем его обратно.
          if (order.cashbackGranted && order.cashbackTickets > 0) {
            await tx.insert(ticketTransactions).values({
              userId: order.userId,
              delta: -order.cashbackTickets,
              reason: "admin_adjust",
              refId: order.id,
              note: `Отмена заказа ${order.code} — возврат кешбэка`,
            });
            patch.cashbackGranted = false;
          }
        }
      }

      const [updated] = await tx
        .update(orders)
        .set(patch)
        .where(eq(orders.id, order.id))
        .returning();
      return { order: updated };
    });

    if ("error" in result) return reply.code(404).send({ error: result.error });
    return result;
  });
}
