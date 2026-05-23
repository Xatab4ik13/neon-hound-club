import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import {
  products,
  orders,
  orderItems,
  ORDER_STATUSES,
  PRODUCT_KINDS,
  shopCategories,
  shopSubcategories,
  shopShowcase,
} from "../db/schema/shop.js";
import { requireAuth, requireAdmin, type SessionPayload } from "../lib/auth.js";
import {
  decrementStockIfTracked,
  getOrderWithItems,
  markOrderPaid,
  refundOrder,
} from "../lib/shop.js";

// ---------- PUBLIC / USER ----------

const shippingSchema = z.object({
  fio: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(5).max(32),
  city: z.string().trim().min(1).max(80),
  address: z.string().trim().min(3).max(300),
  postalCode: z.string().trim().min(3).max(16).optional(),
});

const createOrderSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        qty: z.number().int().min(1).max(50),
      }),
    )
    .min(1)
    .max(20),
  shipping: shippingSchema,
  comment: z.string().trim().max(1000).optional(),
});

export async function shopRoutes(app: FastifyInstance) {
  // GET /api/v1/shop/products — публичный каталог (только активные)
  app.get("/products", async () => {
    const rows = await db
      .select({
        id: products.id,
        slug: products.slug,
        title: products.title,
        priceRub: products.priceRub,
        bonusTickets: products.bonusTickets,
        images: products.images,
        stock: products.stock,
        kind: products.kind,
        categoryId: products.categoryId,
        subcategoryId: products.subcategoryId,
        preorderExpectedAt: products.preorderExpectedAt,
      })
      .from(products)
      .where(eq(products.active, true))
      .orderBy(desc(products.createdAt));
    return { items: rows };
  });

  // GET /api/v1/shop/categories — публичное дерево категорий с подкатегориями
  app.get("/categories", async () => {
    const cats = await db
      .select()
      .from(shopCategories)
      .orderBy(asc(shopCategories.sort), asc(shopCategories.name));
    const subs = await db
      .select()
      .from(shopSubcategories)
      .orderBy(asc(shopSubcategories.sort), asc(shopSubcategories.name));
    const byCat = new Map<string, typeof subs>();
    for (const s of subs) {
      const arr = byCat.get(s.categoryId) ?? [];
      arr.push(s);
      byCat.set(s.categoryId, arr);
    }
    return {
      items: cats.map((c) => ({ ...c, subs: byCat.get(c.id) ?? [] })),
    };
  });

  // GET /api/v1/shop/showcase — товары на витрине (для главной/клуба)
  app.get("/showcase", async () => {
    const rows = await db
      .select({
        id: products.id,
        slug: products.slug,
        title: products.title,
        priceRub: products.priceRub,
        bonusTickets: products.bonusTickets,
        images: products.images,
        stock: products.stock,
        kind: products.kind,
        preorderExpectedAt: products.preorderExpectedAt,
        sort: shopShowcase.sort,
      })
      .from(shopShowcase)
      .innerJoin(products, eq(products.id, shopShowcase.productId))
      .where(eq(products.active, true))
      .orderBy(asc(shopShowcase.sort));
    return { items: rows };
  });

  // GET /api/v1/shop/products/:slug — публичная карточка
  app.get<{ Params: { slug: string } }>("/products/:slug", async (req, reply) => {
    const [p] = await db
      .select()
      .from(products)
      .where(and(eq(products.slug, req.params.slug), eq(products.active, true)))
      .limit(1);
    if (!p) return reply.code(404).send({ error: "not_found" });
    return p;
  });

  // POST /api/v1/shop/orders — оформить заказ (auth)
  app.post("/orders", { preHandler: requireAuth }, async (req, reply) => {
    const parsed = createOrderSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_input", message: parsed.error.issues[0]?.message });
    }
    const session = req.user as SessionPayload;
    const { items, shipping, comment } = parsed.data;

    // подгружаем актуальные товары одним запросом
    const productIds = items.map((i) => i.productId);
    const dbProducts = await db
      .select()
      .from(products)
      .where(and(inArray(products.id, productIds), eq(products.active, true)));

    if (dbProducts.length !== productIds.length) {
      return reply.code(400).send({ error: "product_unavailable", message: "Один из товаров недоступен" });
    }

    // считаем тоталы (снапшоты)
    const productMap = new Map(dbProducts.map((p) => [p.id, p]));
    let totalRub = 0;
    let bonusTotal = 0;
    const itemSnapshots = items.map((i) => {
      const p = productMap.get(i.productId)!;
      totalRub += p.priceRub * i.qty;
      bonusTotal += p.bonusTickets * i.qty;
      return {
        productId: p.id,
        titleSnapshot: p.title,
        priceRubSnapshot: p.priceRub,
        bonusTicketsSnapshot: p.bonusTickets,
        qty: i.qty,
      };
    });

    // резерв остатков (для товаров с stock != null)
    for (const i of items) {
      const p = productMap.get(i.productId)!;
      if (p.stock !== null && p.stock < i.qty) {
        return reply
          .code(409)
          .send({ error: "out_of_stock", message: `«${p.title}» закончился`, productId: p.id });
      }
    }
    for (const i of items) {
      const ok = await decrementStockIfTracked(i.productId, i.qty);
      if (!ok) {
        return reply
          .code(409)
          .send({ error: "out_of_stock", message: "Кто-то успел раньше, попробуй ещё раз" });
      }
    }

    // создаём заказ
    const [order] = await db
      .insert(orders)
      .values({
        userId: session.sub,
        status: "pending_payment",
        totalRub,
        bonusTicketsTotal: bonusTotal,
        shipping,
        comment: comment ?? null,
      })
      .returning();

    await db.insert(orderItems).values(itemSnapshots.map((s) => ({ ...s, orderId: order!.id })));

    const full = await getOrderWithItems(order!.id);
    return reply.code(201).send(full);
  });

  // GET /api/v1/shop/orders — мои заказы
  app.get("/orders", { preHandler: requireAuth }, async (req) => {
    const session = req.user as SessionPayload;
    const rows = await db
      .select()
      .from(orders)
      .where(eq(orders.userId, session.sub))
      .orderBy(desc(orders.createdAt))
      .limit(100);
    return { items: rows };
  });

  // GET /api/v1/shop/orders/:id — мой заказ с позициями
  app.get<{ Params: { id: string } }>("/orders/:id", { preHandler: requireAuth }, async (req, reply) => {
    const session = req.user as SessionPayload;
    const order = await getOrderWithItems(req.params.id);
    if (!order || order.userId !== session.sub) return reply.code(404).send({ error: "not_found" });
    return order;
  });
}

// ---------- ADMIN ----------

const createProductSchema = z
  .object({
    slug: z
      .string()
      .trim()
      .min(2)
      .max(64)
      .regex(/^[a-z0-9-]+$/, "slug: только a-z, 0-9, -"),
    title: z.string().trim().min(1).max(200),
    description: z.string().max(10_000).default(""),
    priceRub: z.number().int().min(0).max(10_000_000),
    bonusTickets: z.number().int().min(0).max(100_000).default(0),
    images: z.array(z.string().url()).max(20).default([]),
    stock: z.number().int().min(0).max(1_000_000).nullable().default(null),
    active: z.boolean().default(true),
    kind: z.enum(PRODUCT_KINDS).default("physical"),
    categoryId: z.string().uuid().nullable().optional(),
    subcategoryId: z.string().uuid().nullable().optional(),
    digitalFileUrl: z.string().url().max(1000).nullable().optional(),
    digitalFileName: z.string().trim().max(200).nullable().optional(),
    preorderExpectedAt: z.string().datetime().nullable().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.kind === "digital" && !v.digitalFileUrl) {
      ctx.addIssue({ code: "custom", message: "Для цифрового товара нужен файл", path: ["digitalFileUrl"] });
    }
    if (v.kind === "preorder" && !v.preorderExpectedAt) {
      ctx.addIssue({ code: "custom", message: "Для предзаказа нужна дата ожидания", path: ["preorderExpectedAt"] });
    }
  });

const patchProductSchema = z
  .object({
    slug: z.string().trim().min(2).max(64).regex(/^[a-z0-9-]+$/),
    title: z.string().trim().min(1).max(200),
    description: z.string().max(10_000),
    priceRub: z.number().int().min(0).max(10_000_000),
    bonusTickets: z.number().int().min(0).max(100_000),
    images: z.array(z.string().url()).max(20),
    stock: z.number().int().min(0).max(1_000_000).nullable(),
    active: z.boolean(),
    kind: z.enum(PRODUCT_KINDS),
    categoryId: z.string().uuid().nullable(),
    subcategoryId: z.string().uuid().nullable(),
    digitalFileUrl: z.string().url().max(1000).nullable(),
    digitalFileName: z.string().trim().max(200).nullable(),
    preorderExpectedAt: z.string().datetime().nullable(),
  })
  .partial();

const categorySchema = z.object({
  slug: z.string().trim().min(2).max(64).regex(/^[a-z0-9-]+$/, "slug: только a-z, 0-9, -"),
  name: z.string().trim().min(1).max(120),
  sort: z.number().int().min(0).max(10_000).default(0),
});

const subcategorySchema = z.object({
  categoryId: z.string().uuid(),
  slug: z.string().trim().min(2).max(64).regex(/^[a-z0-9-]+$/, "slug: только a-z, 0-9, -"),
  name: z.string().trim().min(1).max(120),
  sort: z.number().int().min(0).max(10_000).default(0),
});

const showcaseSchema = z.object({
  items: z
    .array(z.object({ productId: z.string().uuid(), sort: z.number().int().min(0).max(10_000) }))
    .max(6),
});

const patchOrderSchema = z.object({
  status: z.enum(ORDER_STATUSES).optional(),
  cdekTrack: z.string().trim().max(64).nullable().optional(),
});

export async function adminShopRoutes(app: FastifyInstance) {
  // Products CRUD
  app.get("/products", { preHandler: requireAdmin }, async () => {
    const rows = await db.select().from(products).orderBy(desc(products.createdAt));
    return { items: rows };
  });

  app.post("/products", { preHandler: requireAdmin }, async (req, reply) => {
    const parsed = createProductSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_input", message: parsed.error.issues[0]?.message });
    }
    const d = parsed.data;
    const values = {
      ...d,
      preorderExpectedAt: d.preorderExpectedAt ? new Date(d.preorderExpectedAt) : null,
      stock: d.kind === "digital" ? null : d.stock,
    };
    try {
      const [row] = await db.insert(products).values(values).returning();
      return reply.code(201).send(row);
    } catch (e: any) {
      if (String(e?.code) === "23505") {
        return reply.code(409).send({ error: "slug_taken", message: "Такой slug уже есть" });
      }
      throw e;
    }
  });

  app.patch<{ Params: { id: string } }>("/products/:id", { preHandler: requireAdmin }, async (req, reply) => {
    const parsed = patchProductSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_input", message: parsed.error.issues[0]?.message });
    }
    const d = parsed.data;
    const patch: Record<string, unknown> = { ...d, updatedAt: new Date() };
    if (d.preorderExpectedAt !== undefined) {
      patch.preorderExpectedAt = d.preorderExpectedAt ? new Date(d.preorderExpectedAt) : null;
    }
    const [row] = await db
      .update(products)
      .set(patch)
      .where(eq(products.id, req.params.id))
      .returning();
    if (!row) return reply.code(404).send({ error: "not_found" });
    return row;
  });

  app.delete<{ Params: { id: string } }>("/products/:id", { preHandler: requireAdmin }, async (req, reply) => {
    // soft-delete: active=false (чтобы исторические заказы не сломались)
    const [row] = await db
      .update(products)
      .set({ active: false, updatedAt: new Date() })
      .where(eq(products.id, req.params.id))
      .returning({ id: products.id });
    if (!row) return reply.code(404).send({ error: "not_found" });
    return { ok: true };
  });

  // Orders admin
  app.get("/orders", { preHandler: requireAdmin }, async (req) => {
    const q = z
      .object({ status: z.enum(ORDER_STATUSES).optional(), limit: z.coerce.number().int().min(1).max(200).default(50) })
      .parse(req.query ?? {});
    const where = q.status ? eq(orders.status, q.status) : sql`true`;
    const rows = await db.select().from(orders).where(where).orderBy(desc(orders.createdAt)).limit(q.limit);
    return { items: rows };
  });

  app.get<{ Params: { id: string } }>("/orders/:id", { preHandler: requireAdmin }, async (req, reply) => {
    const order = await getOrderWithItems(req.params.id);
    if (!order) return reply.code(404).send({ error: "not_found" });
    return order;
  });

  // PATCH /api/v1/admin/shop/orders/:id — смена статуса / трека.
  // status = 'paid'      -> через markOrderPaid (начисляет билеты идемпотентно)
  // status = 'refunded'  -> через refundOrder (списывает билеты компенсацией)
  // status = 'shipped'   -> ставим shipped_at = now()
  // другие — простая смена статуса.
  app.patch<{ Params: { id: string } }>("/orders/:id", { preHandler: requireAdmin }, async (req, reply) => {
    const parsed = patchOrderSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_input", message: parsed.error.issues[0]?.message });
    }
    const { status, cdekTrack } = parsed.data;

    if (status === "paid") {
      const r = await markOrderPaid(req.params.id);
      if (!r.ok) return reply.code(400).send({ error: r.reason });
    } else if (status === "refunded") {
      const r = await refundOrder(req.params.id);
      if (!r.ok) return reply.code(400).send({ error: r.reason });
    } else if (status) {
      const patch: Record<string, unknown> = { status, updatedAt: new Date() };
      if (status === "shipped") patch.shippedAt = new Date();
      const [row] = await db.update(orders).set(patch).where(eq(orders.id, req.params.id)).returning();
      if (!row) return reply.code(404).send({ error: "not_found" });
    }

    if (cdekTrack !== undefined) {
      await db
        .update(orders)
        .set({ cdekTrack, updatedAt: new Date() })
        .where(eq(orders.id, req.params.id));
    }

    const full = await getOrderWithItems(req.params.id);
    if (!full) return reply.code(404).send({ error: "not_found" });
    return full;
  });
}
