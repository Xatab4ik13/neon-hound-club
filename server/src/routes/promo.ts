import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { and, desc, eq, isNull, or, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { promoCodes } from "../db/schema/promo.js";
import { users } from "../db/schema/users.js";
import { products, orders, orderItems } from "../db/schema/shop.js";
import { ticketBoosts } from "../db/schema/ticket-boosts.js";
import { requireAuth, requireAdmin, type SessionPayload } from "../lib/auth.js";
import {
  PromoError,
  generatePromoCode,
  normalizePromoCode,
  validatePromoForUser,
} from "../lib/promo.js";


function serialize(row: typeof promoCodes.$inferSelect) {
  return {
    id: row.id,
    code: row.code,
    discountPct: row.discountPct,
    userId: row.userId,
    productId: row.productId ?? null,
    note: row.note,
    expiresAt: row.expiresAt?.toISOString() ?? null,
    usedAt: row.usedAt?.toISOString() ?? null,
    usedOrderId: row.usedOrderId ?? null,
    active: row.active,

    createdAt: row.createdAt.toISOString(),
  };
}


/** Клиентские роуты: /api/v1/promo */
export async function promoRoutes(app: FastifyInstance) {
  // Мои промокоды (для вкладки «Промокоды» в профиле).
  app.get("/mine", { preHandler: requireAuth }, async (req) => {
    const session = req.user as SessionPayload;
    const rows = await db
      .select({ promo: promoCodes, productTitle: products.title })
      .from(promoCodes)
      .leftJoin(products, eq(products.id, promoCodes.productId))
      .where(and(eq(promoCodes.userId, session.sub), eq(promoCodes.active, true)))
      .orderBy(desc(promoCodes.createdAt));
    const now = Date.now();
    return {
      items: rows.map((r) => ({
        ...serialize(r.promo),
        productTitle: r.productTitle ?? null,
        expired: !!r.promo.expiresAt && r.promo.expiresAt.getTime() < now,
      })),
    };
  });

  // Проверка промокода на чекауте — возвращает процент скидки.
  // items — корзина, нужна для товарных промокодов.
  app.post("/validate", { preHandler: requireAuth }, async (req, reply) => {
    const parsed = z
      .object({
        code: z.string().trim().min(1).max(32),
        items: z
          .array(z.object({ productId: z.string().uuid(), qty: z.coerce.number().int().min(1) }))
          .optional(),
      })
      .safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_input", message: "Введи промокод" });
    const session = req.user as SessionPayload;
    try {
      const promo = await validatePromoForUser(session.sub, parsed.data.code, parsed.data.items);
      return {
        ok: true as const,
        code: promo.code,
        discountPct: promo.discountPct,
        productId: promo.productId ?? null,
        expiresAt: promo.expiresAt?.toISOString() ?? null,
      };
    } catch (e) {
      if (e instanceof PromoError) {
        return reply.code(400).send({ error: e.code, message: e.message });
      }
      throw e;
    }
  });
}

const createSchema = z.object({
  code: z.string().trim().min(3).max(32).optional(),
  discountPct: z.coerce.number().int().min(1).max(100),
  userId: z.string().uuid().nullable().optional(),
  /** Товарный промокод: скидка только на этот товар, корзина = 1 шт. этого товара. */
  productId: z.string().uuid().nullable().optional(),
  note: z.string().trim().max(200).optional(),
  /** ISO-дата окончания действия. */
  expiresAt: z.string().datetime().nullable().optional(),
});


/** Админские роуты: /api/v1/admin/promo */
export async function adminPromoRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAdmin);

  // Список. ?userId= — только промокоды этого юзера.
  app.get("/", async (req) => {
    const q = z
      .object({
        userId: z.string().uuid().optional(),
        q: z.string().trim().max(64).optional(),
      })
      .parse(req.query ?? {});
    const conds = [];
    if (q.userId) conds.push(eq(promoCodes.userId, q.userId));
    if (q.q) conds.push(sql`upper(${promoCodes.code}) LIKE ${`%${q.q.toUpperCase()}%`}`);
    const rows = await db
      .select({
        promo: promoCodes,
        userNick: users.nick,
        userEmail: users.email,
        productTitle: products.title,
      })
      .from(promoCodes)
      .leftJoin(users, eq(users.id, promoCodes.userId))
      .leftJoin(products, eq(products.id, promoCodes.productId))
      .where(conds.length ? and(...conds) : undefined)
      .orderBy(desc(promoCodes.createdAt))
      .limit(500);
    const now = Date.now();
    return {
      items: rows.map((r) => ({
        ...serialize(r.promo),
        userNick: r.userNick ?? null,
        userEmail: r.userEmail ?? null,
        productTitle: r.productTitle ?? null,
        expired: !!r.promo.expiresAt && r.promo.expiresAt.getTime() < now,
      })),
    };
  });

  /**
   * Сводка по активациям: сколько промокодов отработало, сколько денег принесли
   * заказы по ним и как часто юзер докладывал что-то ещё в корзину.
   * Это ключевая метрика для «бесплатная ремувка → но человек добирает товар».
   */
  app.get("/stats", async () => {
    const rowsRes = (await db.execute(sql`
      WITH used AS (
        SELECT p.id,
               p.product_id,
               o.id AS order_id,
               o.subtotal_rub,
               o.discount_rub,
               o.total_rub,
               o.shipping_price_rub,
               COALESCE((SELECT SUM(oi.qty) FROM order_items oi WHERE oi.order_id = o.id), 0) AS units,
               COALESCE((
                 SELECT SUM(oi.price_rub_snapshot * oi.qty)
                 FROM order_items oi
                 WHERE oi.order_id = o.id
                   AND (p.product_id IS NULL OR oi.product_id IS DISTINCT FROM p.product_id)
               ), 0) AS extra_rub
        FROM promo_codes p
        JOIN orders o ON o.id = p.used_order_id
        WHERE p.used_at IS NOT NULL
      )
      SELECT
        (SELECT COUNT(*)::int FROM promo_codes WHERE used_at IS NOT NULL) AS used_total,
        (SELECT COUNT(*)::int FROM promo_codes WHERE used_at IS NULL AND active = true) AS unused_total,
        (SELECT COUNT(*)::int FROM used) AS with_order,
        (SELECT COUNT(*)::int FROM used WHERE extra_rub > 0) AS with_extras,
        COALESCE((SELECT SUM(total_rub) FROM used), 0)::int AS revenue_rub,
        COALESCE((SELECT SUM(extra_rub) FROM used), 0)::int AS extra_rub,
        COALESCE((SELECT SUM(discount_rub) FROM used), 0)::int AS discount_rub,
        COALESCE((SELECT SUM(shipping_price_rub) FROM used), 0)::int AS shipping_rub
    `)) as unknown as Array<Record<string, number>>;
    const s = Array.from(rowsRes ?? [])[0] ?? ({} as Record<string, number>);

    const withOrder = Number(s.with_order ?? 0);
    const withExtras = Number(s.with_extras ?? 0);
    return {
      usedTotal: Number(s.used_total ?? 0),
      unusedTotal: Number(s.unused_total ?? 0),
      withOrder,
      withExtras,
      extrasSharePct: withOrder ? Math.round((withExtras / withOrder) * 100) : 0,
      revenueRub: Number(s.revenue_rub ?? 0),
      extraRub: Number(s.extra_rub ?? 0),
      discountRub: Number(s.discount_rub ?? 0),
      shippingRub: Number(s.shipping_rub ?? 0),
      avgOrderRub: withOrder ? Math.round(Number(s.revenue_rub ?? 0) / withOrder) : 0,
      avgExtraRub: withOrder ? Math.round(Number(s.extra_rub ?? 0) / withOrder) : 0,
    };
  });

  /** Как активировали промокод: заказ, корзина, доставка, статус. */
  app.get<{ Params: { id: string } }>("/:id/usage", async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const [promo] = await db.select().from(promoCodes).where(eq(promoCodes.id, id)).limit(1);
    if (!promo) return reply.code(404).send({ error: "not_found" });
    if (!promo.usedOrderId) return { promo: serialize(promo), order: null };

    const [row] = await db
      .select({ order: orders, nick: users.nick, email: users.email })
      .from(orders)
      .leftJoin(users, eq(users.id, orders.userId))
      .where(eq(orders.id, promo.usedOrderId))
      .limit(1);
    if (!row) return { promo: serialize(promo), order: null };

    const items = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, row.order.id))
      .orderBy(orderItems.createdAt);

    const targetId = promo.productId;
    const extraRub = items
      .filter((i) => !targetId || i.productId !== targetId)
      .reduce((s, i) => s + i.priceRubSnapshot * i.qty, 0);

    return {
      promo: serialize(promo),
      order: {
        id: row.order.id,
        userId: row.order.userId,
        nick: row.nick ?? null,
        email: row.email ?? null,
        status: row.order.status,
        subtotalRub: row.order.subtotalRub,
        discountRub: row.order.discountRub,
        discountPct: row.order.discountPct,
        totalRub: row.order.totalRub,
        shippingPriceRub: row.order.shippingPriceRub,
        shippingMode: row.order.shippingMode,
        bonusTicketsTotal: row.order.bonusTicketsTotal,
        city: row.order.shipping?.city ?? null,
        createdAt: row.order.createdAt.toISOString(),
        paidAt: row.order.paidAt?.toISOString() ?? null,
        extraRub,
        items: items.map((i) => ({
          id: i.id,
          productId: i.productId,
          title: i.titleSnapshot,
          priceRub: i.priceRubSnapshot,
          qty: i.qty,
          size: i.sizeSnapshot,
          kind: i.kindSnapshot,
          isPromoTarget: !!targetId && i.productId === targetId,
        })),
      },
    };
  });



  /**
   * Капсулы ×2 (приз HellSpin). Показываем как «промокод-подобную» выдачу:
   * кто выбил, до когда действует, активировал ли и на какой заказ.
   * status: active | used | expired.
   */
  app.get("/capsules", async (req) => {
    const q = z
      .object({
        status: z.enum(["all", "used", "active", "expired"]).default("all"),
        q: z.string().trim().max(64).optional(),
        userId: z.string().uuid().optional(),
      })
      .parse(req.query ?? {});

    const conds = [];
    if (q.userId) conds.push(eq(ticketBoosts.userId, q.userId));
    if (q.q) conds.push(sql`${users.nick} ilike ${"%" + q.q + "%"}`);
    if (q.status === "used") conds.push(sql`${ticketBoosts.usedAt} is not null`);
    if (q.status === "active")
      conds.push(sql`${ticketBoosts.usedAt} is null and ${ticketBoosts.expiresAt} > now()`);
    if (q.status === "expired")
      conds.push(sql`${ticketBoosts.usedAt} is null and ${ticketBoosts.expiresAt} <= now()`);

    const rows = await db
      .select({
        id: ticketBoosts.id,
        userId: ticketBoosts.userId,
        nick: users.nick,
        email: users.email,
        grantedAt: ticketBoosts.grantedAt,
        expiresAt: ticketBoosts.expiresAt,
        usedAt: ticketBoosts.usedAt,
        usedOrderId: ticketBoosts.usedOrderId,
        bonusTickets: ticketBoosts.bonusTickets,
        orderTotalRub: orders.totalRub,
      })
      .from(ticketBoosts)
      .leftJoin(users, eq(users.id, ticketBoosts.userId))
      .leftJoin(orders, eq(orders.id, ticketBoosts.usedOrderId))
      .where(conds.length ? and(...conds) : undefined)
      .orderBy(desc(ticketBoosts.grantedAt))
      .limit(500);

    const now = Date.now();
    const items = rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      nick: r.nick ?? null,
      email: r.email ?? null,
      grantedAt: r.grantedAt.toISOString(),
      expiresAt: r.expiresAt.toISOString(),
      usedAt: r.usedAt?.toISOString() ?? null,
      usedOrderId: r.usedOrderId ?? null,
      bonusTickets: r.bonusTickets,
      orderTotalRub: r.orderTotalRub ?? null,
      status: r.usedAt
        ? ("used" as const)
        : r.expiresAt.getTime() > now
          ? ("active" as const)
          : ("expired" as const),
    }));

    const [totals] = (await db.execute(sql`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE used_at IS NOT NULL)::int AS used,
        COUNT(*) FILTER (WHERE used_at IS NULL AND expires_at > now())::int AS active,
        COALESCE(SUM(bonus_tickets), 0)::int AS bonus_tickets
      FROM ticket_boosts
    `)) as unknown as Array<Record<string, number>>;

    return {
      items,
      stats: {
        total: Number(totals?.total ?? 0),
        used: Number(totals?.used ?? 0),
        active: Number(totals?.active ?? 0),
        bonusTickets: Number(totals?.bonus_tickets ?? 0),
      },
    };
  });

  // Создать / сгенерировать промокод.
  app.post("/", async (req, reply) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply
        .code(400)
        .send({ error: "invalid_input", message: parsed.error.issues[0]?.message });
    }
    const data = parsed.data;
    const code = normalizePromoCode(data.code ?? generatePromoCode());
    const [dup] = await db
      .select({ id: promoCodes.id })
      .from(promoCodes)
      .where(sql`upper(${promoCodes.code}) = ${code}`)
      .limit(1);
    if (dup) return reply.code(409).send({ error: "code_exists", message: "Такой код уже есть" });

    if (data.productId) {
      const [p] = await db
        .select({ id: products.id })
        .from(products)
        .where(eq(products.id, data.productId))
        .limit(1);
      if (!p) return reply.code(400).send({ error: "product_not_found", message: "Товар не найден" });
    }

    const [row] = await db
      .insert(promoCodes)
      .values({
        code,
        discountPct: data.discountPct,
        userId: data.userId ?? null,
        productId: data.productId ?? null,
        note: data.note ?? null,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      })
      .returning();
    return reply.code(201).send({ promo: serialize(row!) });
  });



  app.patch<{ Params: { id: string } }>("/:id", async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const parsed = z
      .object({
        discountPct: z.coerce.number().int().min(1).max(100).optional(),
        expiresAt: z.string().datetime().nullable().optional(),
        active: z.boolean().optional(),
        note: z.string().trim().max(200).nullable().optional(),
        userId: z.string().uuid().nullable().optional(),
        productId: z.string().uuid().nullable().optional(),
      })
      .safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_input" });
    const patch: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.expiresAt !== undefined) {
      patch.expiresAt = parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null;
    }
    const [row] = await db
      .update(promoCodes)
      .set(patch as any)
      .where(eq(promoCodes.id, id))
      .returning();
    if (!row) return reply.code(404).send({ error: "not_found" });
    return { promo: serialize(row) };
  });

  app.delete<{ Params: { id: string } }>("/:id", async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const [row] = await db.delete(promoCodes).where(eq(promoCodes.id, id)).returning();
    if (!row) return reply.code(404).send({ error: "not_found" });
    return { ok: true };
  });
}
