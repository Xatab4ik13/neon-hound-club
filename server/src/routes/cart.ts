// Серверная корзина для залогиненных юзеров.
// REST:
//   GET    /api/v1/cart                  — текущая корзина (всегда с актуальными ценами/наличием)
//   POST   /api/v1/cart/items            — добавить (или прибавить qty к существующей позиции)
//   PATCH  /api/v1/cart/items/:id        — изменить qty (0 = удалить)
//   DELETE /api/v1/cart/items/:id        — удалить позицию
//   DELETE /api/v1/cart                  — очистить корзину
//   POST   /api/v1/cart/merge            — слить локальную корзину при логине
//
// Цены и название берём всегда из products на чтении — пользователь видит актуальные.
// Снапшот фиксируется только при создании заказа (в shop.ts).

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { cartItems, products } from "../db/schema/shop.js";
import { requireAuth, type SessionPayload } from "../lib/auth.js";

const addItemSchema = z.object({
  productId: z.string().uuid(),
  qty: z.number().int().min(1).max(99).default(1),
  size: z.string().trim().min(1).max(24).nullable().optional(),
});

const patchItemSchema = z.object({
  qty: z.number().int().min(0).max(99),
});

const mergeSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        qty: z.number().int().min(1).max(99),
        size: z.string().trim().min(1).max(24).nullable().optional(),
      }),
    )
    .max(50),
});

type CartLine = {
  id: string;
  productId: string;
  slug: string;
  title: string;
  image: string | null;
  priceRub: number;
  bonusTickets: number;
  size: string | null;
  qty: number;
  active: boolean;
  /** Текущий остаток по выбранной строке (учитывает размеры). null = без учёта. */
  stockAvailable: number | null;
  /** Тип товара: physical | digital | preorder. */
  kind: "physical" | "digital" | "preorder";
};

async function getCartLines(userId: string): Promise<{ items: CartLine[]; totalRub: number }> {
  const rows = await db
    .select({
      id: cartItems.id,
      productId: cartItems.productId,
      qty: cartItems.qty,
      size: cartItems.size,
    })
    .from(cartItems)
    .where(eq(cartItems.userId, userId));

  if (rows.length === 0) return { items: [], totalRub: 0 };

  const ids = rows.map((r) => r.productId);
  const prods = await db
    .select({
      id: products.id,
      slug: products.slug,
      title: products.title,
      images: products.images,
      priceRub: products.priceRub,
      bonusTickets: products.bonusTickets,
      stock: products.stock,
      sizes: products.sizes,
      active: products.active,
      kind: products.kind,
    })
    .from(products)
    .where(inArray(products.id, ids));
  const byId = new Map(prods.map((p) => [p.id, p]));

  const items: CartLine[] = rows.map((r) => {
    const p = byId.get(r.productId);
    if (!p) {
      return {
        id: r.id,
        productId: r.productId,
        slug: "",
        title: "Товар удалён",
        image: null,
        priceRub: 0,
        bonusTickets: 0,
        size: r.size,
        qty: r.qty,
        active: false,
        stockAvailable: 0,
        kind: "physical",
      };
    }
    let stockAvailable: number | null = p.stock ?? null;
    if (r.size && Array.isArray(p.sizes)) {
      const s = p.sizes.find((x) => x.label === r.size);
      stockAvailable = s ? s.stock : 0;
    }
    return {
      id: r.id,
      productId: p.id,
      slug: p.slug,
      title: p.title,
      image: (p.images && p.images[0]) || null,
      priceRub: p.priceRub,
      bonusTickets: p.bonusTickets,
      size: r.size,
      qty: r.qty,
      active: p.active,
      stockAvailable,
      kind: (p.kind ?? "physical") as CartLine["kind"],
    };
  });

  const totalRub = items.reduce((s, i) => s + i.priceRub * i.qty, 0);
  return { items, totalRub };
}

export async function cartRoutes(app: FastifyInstance) {
  // GET /cart
  app.get("/", { preHandler: requireAuth }, async (req) => {
    const session = req.user as SessionPayload;
    return getCartLines(session.sub);
  });

  // POST /cart/items
  app.post("/items", { preHandler: requireAuth }, async (req, reply) => {
    const parsed = addItemSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_input", message: parsed.error.issues[0]?.message });
    }
    const session = req.user as SessionPayload;
    const { productId, qty, size } = parsed.data;

    // Товар должен существовать и быть активным.
    const [p] = await db
      .select({ id: products.id, active: products.active })
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);
    if (!p) return reply.code(404).send({ error: "product_not_found" });
    if (!p.active) return reply.code(409).send({ error: "product_inactive" });

    // Upsert по (user_id, product_id, COALESCE(size, '')) — индекс по выражению.
    // Делаем сырым SQL, чтобы Drizzle не путался с ON CONFLICT по выражению.
    await db.execute(sql`
      INSERT INTO "cart_items" ("user_id", "product_id", "qty", "size")
      VALUES (${session.sub}, ${productId}, ${qty}, ${size ?? null})
      ON CONFLICT ("user_id", "product_id", COALESCE("size", ''))
      DO UPDATE SET "qty" = "cart_items"."qty" + EXCLUDED."qty", "updated_at" = now()
    `);

    return getCartLines(session.sub);
  });

  // PATCH /cart/items/:id
  app.patch<{ Params: { id: string } }>("/items/:id", { preHandler: requireAuth }, async (req, reply) => {
    const parsed = patchItemSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_input", message: parsed.error.issues[0]?.message });
    }
    const session = req.user as SessionPayload;
    const { qty } = parsed.data;

    if (qty === 0) {
      await db
        .delete(cartItems)
        .where(and(eq(cartItems.id, req.params.id), eq(cartItems.userId, session.sub)));
    } else {
      const [row] = await db
        .update(cartItems)
        .set({ qty, updatedAt: new Date() })
        .where(and(eq(cartItems.id, req.params.id), eq(cartItems.userId, session.sub)))
        .returning({ id: cartItems.id });
      if (!row) return reply.code(404).send({ error: "not_found" });
    }
    return getCartLines(session.sub);
  });

  // DELETE /cart/items/:id
  app.delete<{ Params: { id: string } }>("/items/:id", { preHandler: requireAuth }, async (req) => {
    const session = req.user as SessionPayload;
    await db
      .delete(cartItems)
      .where(and(eq(cartItems.id, req.params.id), eq(cartItems.userId, session.sub)));
    return getCartLines(session.sub);
  });

  // DELETE /cart — очистить
  app.delete("/", { preHandler: requireAuth }, async (req) => {
    const session = req.user as SessionPayload;
    await db.delete(cartItems).where(eq(cartItems.userId, session.sub));
    return { items: [], totalRub: 0 };
  });

  // POST /cart/merge — слить локальную корзину при логине.
  // Складываем qty, чтобы то, что юзер добавил гостем, не пропало.
  app.post("/merge", { preHandler: requireAuth }, async (req, reply) => {
    const parsed = mergeSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_input", message: parsed.error.issues[0]?.message });
    }
    const session = req.user as SessionPayload;
    const { items } = parsed.data;

    if (items.length === 0) return getCartLines(session.sub);

    // Отфильтровать только реально существующие активные товары — без падений на мусоре из localStorage.
    const ids = Array.from(new Set(items.map((i) => i.productId)));
    const prods = await db
      .select({ id: products.id, active: products.active })
      .from(products)
      .where(inArray(products.id, ids));
    const validIds = new Set(prods.filter((p) => p.active).map((p) => p.id));

    for (const it of items) {
      if (!validIds.has(it.productId)) continue;
      await db.execute(sql`
        INSERT INTO "cart_items" ("user_id", "product_id", "qty", "size")
        VALUES (${session.sub}, ${it.productId}, ${it.qty}, ${it.size ?? null})
        ON CONFLICT ("user_id", "product_id", COALESCE("size", ''))
        DO UPDATE SET "qty" = "cart_items"."qty" + EXCLUDED."qty", "updated_at" = now()
      `);
    }

    return getCartLines(session.sub);
  });
}
