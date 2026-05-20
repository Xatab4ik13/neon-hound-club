import type { FastifyInstance } from "fastify";
import { desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client.js";
import {
  orderItems,
  orders,
  productVariants,
  products,
} from "../db/schema.js";
import { requireAuth } from "../auth/middleware.js";

const itemSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().optional().nullable(),
  qty: z.number().int().min(1).max(50),
});

const createOrderSchema = z.object({
  items: z.array(itemSchema).min(1).max(50),
  recipientName: z.string().min(1).max(120),
  phone: z.string().min(3).max(32),
  email: z.string().email().max(200),
  address: z.string().min(3).max(2000),
  note: z.string().max(2000).optional().nullable(),
});

function genCode() {
  return "HH-" + Date.now().toString(36).toUpperCase().slice(-6);
}

async function loadOrderFull(orderId: string) {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) return null;
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  return { order, items };
}

export async function ordersRoutes(app: FastifyInstance) {
  // Создать заказ из корзины. Сервер пересчитывает суммы и снапшотит позиции.
  // Цены/наличие — серверная правда, клиентским значениям не верим.
  app.post("/orders", { preHandler: requireAuth }, async (req, reply) => {
    const parsed = createOrderSchema.safeParse(req.body);
    if (!parsed.success)
      return reply.code(400).send({ error: "invalid_input", details: parsed.error.format() });
    const userId = req.userId!;
    const input = parsed.data;

    const productIds = [...new Set(input.items.map((i) => i.productId))];
    const variantIds = input.items
      .map((i) => i.variantId)
      .filter((v): v is string => typeof v === "string");

    const [prodRows, variantRows] = await Promise.all([
      db.select().from(products).where(inArray(products.id, productIds)),
      variantIds.length
        ? db.select().from(productVariants).where(inArray(productVariants.id, variantIds))
        : Promise.resolve([] as Awaited<ReturnType<typeof db.select>> extends infer T ? any[] : never[]),
    ]);

    const prodMap = new Map(prodRows.map((p) => [p.id, p]));
    const varMap = new Map(variantRows.map((v) => [v.id, v]));

    type Snap = {
      productId: string;
      variantId: string | null;
      name: string;
      size: string | null;
      priceRub: number;
      qty: number;
    };
    const snapshots: Snap[] = [];

    for (const it of input.items) {
      const p = prodMap.get(it.productId);
      if (!p || !p.isPublished) return reply.code(404).send({ error: "product_not_found", productId: it.productId });
      let size: string | null = null;
      let price = p.priceRub;
      let variantId: string | null = null;
      if (it.variantId) {
        const v = varMap.get(it.variantId);
        if (!v || v.productId !== p.id)
          return reply.code(404).send({ error: "variant_not_found", variantId: it.variantId });
        // -1 = безлимит, 0 = нет в наличии
        if (v.stock !== -1 && v.stock < it.qty)
          return reply.code(409).send({ error: "out_of_stock", variantId: v.id, available: v.stock });
        size = v.size;
        variantId = v.id;
        if (v.priceOverrideRub != null) price = v.priceOverrideRub;
      }
      snapshots.push({
        productId: p.id,
        variantId,
        name: p.name,
        size,
        priceRub: price,
        qty: it.qty,
      });
    }

    const totalRub = snapshots.reduce((s, x) => s + x.priceRub * x.qty, 0);
    const cashbackTickets = Math.floor(totalRub / 200); // 1 билет за 200₽

    const created = await db.transaction(async (tx) => {
      const [order] = await tx
        .insert(orders)
        .values({
          code: genCode(),
          userId,
          totalRub,
          cashbackTickets,
          recipientName: input.recipientName,
          phone: input.phone,
          email: input.email,
          address: input.address,
          note: input.note ?? null,
        })
        .returning();

      await tx.insert(orderItems).values(
        snapshots.map((s) => ({
          orderId: order.id,
          productId: s.productId,
          variantId: s.variantId,
          name: s.name,
          size: s.size,
          priceRub: s.priceRub,
          qty: s.qty,
        })),
      );

      // Резервируем остатки сразу при создании заказа (не при оплате) —
      // иначе два юзера могут оформить одну футболку. При cancelled — вернём.
      for (const s of snapshots) {
        if (!s.variantId) continue;
        await tx
          .update(productVariants)
          .set({ stock: sql`CASE WHEN ${productVariants.stock} = -1 THEN -1 ELSE ${productVariants.stock} - ${s.qty} END` })
          .where(eq(productVariants.id, s.variantId));
      }

      return order;
    });

    return reply.code(201).send({ order: created });
  });

  // Мои заказы
  app.get("/orders/me", { preHandler: requireAuth }, async (req) => {
    const userId = req.userId!;
    const list = await db
      .select()
      .from(orders)
      .where(eq(orders.userId, userId))
      .orderBy(desc(orders.createdAt))
      .limit(100);
    return { orders: list };
  });

  // Детали моего заказа
  app.get<{ Params: { id: string } }>(
    "/orders/:id",
    { preHandler: requireAuth },
    async (req, reply) => {
      const data = await loadOrderFull(req.params.id);
      if (!data) return reply.code(404).send({ error: "not_found" });
      if (data.order.userId !== req.userId) return reply.code(403).send({ error: "forbidden" });
      return data;
    },
  );

  // Отмена своего заказа (только пока created)
  app.post<{ Params: { id: string } }>(
    "/orders/:id/cancel",
    { preHandler: requireAuth },
    async (req, reply) => {
      const userId = req.userId!;
      const [order] = await db.select().from(orders).where(eq(orders.id, req.params.id)).limit(1);
      if (!order) return reply.code(404).send({ error: "not_found" });
      if (order.userId !== userId) return reply.code(403).send({ error: "forbidden" });
      if (order.status !== "created")
        return reply.code(409).send({ error: "cannot_cancel", status: order.status });

      await db.transaction(async (tx) => {
        const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, order.id));
        for (const it of items) {
          if (!it.variantId) continue;
          await tx
            .update(productVariants)
            .set({ stock: sql`CASE WHEN ${productVariants.stock} = -1 THEN -1 ELSE ${productVariants.stock} + ${it.qty} END` })
            .where(eq(productVariants.id, it.variantId));
        }
        await tx
          .update(orders)
          .set({ status: "cancelled", updatedAt: new Date() })
          .where(eq(orders.id, order.id));
      });
      return { ok: true };
    },
  );
}
