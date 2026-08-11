import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { and, desc, eq, isNull, or, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { promoCodes } from "../db/schema/promo.js";
import { users } from "../db/schema/users.js";
import { products } from "../db/schema/shop.js";
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
      .select()
      .from(promoCodes)
      .where(and(eq(promoCodes.userId, session.sub), eq(promoCodes.active, true)))
      .orderBy(desc(promoCodes.createdAt));
    const now = Date.now();
    return {
      items: rows.map((r) => ({
        ...serialize(r),
        expired: !!r.expiresAt && r.expiresAt.getTime() < now,
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
