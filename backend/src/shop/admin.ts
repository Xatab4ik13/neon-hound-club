import type { FastifyInstance } from "fastify";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client.js";
import { categories, productImages, products, productVariants } from "../db/schema.js";
import { requireAdmin } from "../auth/admin.js";

const categorySchema = z.object({
  parentId: z.string().uuid().nullable().optional(),
  slug: z.string().trim().min(1).max(60).regex(/^[a-z0-9-]+$/, "только латиница, цифры, дефис"),
  name: z.string().trim().min(1).max(80),
  sortOrder: z.number().int().optional(),
});

const productSchema = z.object({
  slug: z.string().trim().min(1).max(120).regex(/^[a-z0-9-]+$/),
  name: z.string().trim().min(1).max(200),
  priceRub: z.number().int().min(0).max(10_000_000),
  categoryId: z.string().uuid().nullable().optional(),
  source: z.enum(["hellhound", "partner", "used"]).default("hellhound"),
  sourceLabel: z.string().max(80).nullable().optional(),
  description: z.string().max(5000).nullable().optional(),
  composition: z.string().max(1000).nullable().optional(),
  care: z.string().max(1000).nullable().optional(),
  badgeLabel: z.string().max(40).nullable().optional(),
  badgeTone: z.enum(["primary", "muted", "danger"]).nullable().optional(),
  isPublished: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

const variantSchema = z.object({
  size: z.string().trim().min(1).max(20),
  stock: z.number().int().min(-1).default(0),
  priceOverrideRub: z.number().int().min(0).nullable().optional(),
  sortOrder: z.number().int().optional(),
});

const imageSchema = z.object({
  url: z.string().url().max(1000),
  sortOrder: z.number().int().optional(),
  isCover: z.boolean().optional(),
});

export async function shopAdminRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAdmin);

  // ===== Категории =====
  app.post("/admin/shop/categories", async (req, reply) => {
    const parsed = categorySchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_input", details: parsed.error.flatten() });
    const [created] = await db.insert(categories).values(parsed.data).returning();
    return reply.code(201).send({ category: created });
  });

  app.patch("/admin/shop/categories/:id", async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const parsed = categorySchema.partial().safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_input" });
    const [updated] = await db.update(categories).set(parsed.data).where(eq(categories.id, id)).returning();
    if (!updated) return reply.code(404).send({ error: "not_found" });
    return reply.send({ category: updated });
  });

  app.delete("/admin/shop/categories/:id", async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const [deleted] = await db.delete(categories).where(eq(categories.id, id)).returning();
    if (!deleted) return reply.code(404).send({ error: "not_found" });
    return reply.send({ ok: true });
  });

  // ===== Товары =====
  app.post("/admin/shop/products", async (req, reply) => {
    const parsed = productSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_input", details: parsed.error.flatten() });
    const [created] = await db.insert(products).values(parsed.data).returning();
    return reply.code(201).send({ product: created });
  });

  app.patch("/admin/shop/products/:id", async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const parsed = productSchema.partial().safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_input", details: parsed.error.flatten() });
    const [updated] = await db
      .update(products)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();
    if (!updated) return reply.code(404).send({ error: "not_found" });
    return reply.send({ product: updated });
  });

  app.delete("/admin/shop/products/:id", async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const [deleted] = await db.delete(products).where(eq(products.id, id)).returning();
    if (!deleted) return reply.code(404).send({ error: "not_found" });
    return reply.send({ ok: true });
  });

  // ===== Варианты (размеры) =====
  app.post("/admin/shop/products/:productId/variants", async (req, reply) => {
    const { productId } = z.object({ productId: z.string().uuid() }).parse(req.params);
    const parsed = variantSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_input" });
    const [created] = await db.insert(productVariants).values({ ...parsed.data, productId }).returning();
    return reply.code(201).send({ variant: created });
  });

  app.patch("/admin/shop/variants/:id", async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const parsed = variantSchema.partial().safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_input" });
    const [updated] = await db.update(productVariants).set(parsed.data).where(eq(productVariants.id, id)).returning();
    if (!updated) return reply.code(404).send({ error: "not_found" });
    return reply.send({ variant: updated });
  });

  app.delete("/admin/shop/variants/:id", async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const [deleted] = await db.delete(productVariants).where(eq(productVariants.id, id)).returning();
    if (!deleted) return reply.code(404).send({ error: "not_found" });
    return reply.send({ ok: true });
  });

  // ===== Картинки =====
  app.post("/admin/shop/products/:productId/images", async (req, reply) => {
    const { productId } = z.object({ productId: z.string().uuid() }).parse(req.params);
    const parsed = imageSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_input" });

    // Если ставим isCover=true — снять флаг с остальных у этого товара.
    if (parsed.data.isCover) {
      await db
        .update(productImages)
        .set({ isCover: false })
        .where(and(eq(productImages.productId, productId), eq(productImages.isCover, true)));
    }
    const [created] = await db.insert(productImages).values({ ...parsed.data, productId }).returning();
    return reply.code(201).send({ image: created });
  });

  app.delete("/admin/shop/images/:id", async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const [deleted] = await db.delete(productImages).where(eq(productImages.id, id)).returning();
    if (!deleted) return reply.code(404).send({ error: "not_found" });
    return reply.send({ ok: true });
  });
}
