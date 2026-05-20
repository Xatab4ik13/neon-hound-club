import type { FastifyInstance } from "fastify";
import { and, asc, desc, eq, ilike, isNull, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client.js";
import { categories, productImages, products, productVariants } from "../db/schema.js";

// Публичные эндпоинты витрины. Никакого auth.
export async function shopPublicRoutes(app: FastifyInstance) {
  // Категории деревом: [{...top, children: [...]}]
  app.get("/shop/categories", async () => {
    const rows = await db.select().from(categories).orderBy(asc(categories.sortOrder), asc(categories.name));
    const tops = rows.filter((c) => c.parentId === null);
    const tree = tops.map((top) => ({
      ...top,
      children: rows.filter((c) => c.parentId === top.id),
    }));
    return { categories: tree };
  });

  // Список товаров с фильтрами.
  app.get("/shop/products", async (req) => {
    const q = z
      .object({
        category: z.string().optional(), // slug категории или под-категории
        source: z.enum(["hellhound", "partner", "used"]).optional(),
        search: z.string().max(100).optional(),
        limit: z.coerce.number().int().min(1).max(100).default(50),
        offset: z.coerce.number().int().min(0).default(0),
      })
      .parse(req.query);

    const conds = [eq(products.isPublished, true)];

    if (q.category) {
      // Найти все ID категорий по slug: сама + дети если это верхняя.
      const cat = await db.select().from(categories).where(eq(categories.slug, q.category)).limit(1);
      if (cat[0]) {
        if (cat[0].parentId === null) {
          const kids = await db
            .select({ id: categories.id })
            .from(categories)
            .where(eq(categories.parentId, cat[0].id));
          const ids = [cat[0].id, ...kids.map((k) => k.id)];
          conds.push(or(...ids.map((id) => eq(products.categoryId, id)))!);
        } else {
          conds.push(eq(products.categoryId, cat[0].id));
        }
      }
    }
    if (q.source) conds.push(eq(products.source, q.source));
    if (q.search) conds.push(ilike(products.name, `%${q.search}%`));

    const rows = await db
      .select()
      .from(products)
      .where(and(...conds))
      .orderBy(asc(products.sortOrder), desc(products.createdAt))
      .limit(q.limit)
      .offset(q.offset);

    // Подтянуть обложки одним запросом
    const ids = rows.map((p) => p.id);
    const covers = ids.length
      ? await db
          .select()
          .from(productImages)
          .where(and(eq(productImages.isCover, true), or(...ids.map((id) => eq(productImages.productId, id)))!))
      : [];
    const coverByProduct = new Map(covers.map((c) => [c.productId, c.url]));

    return {
      products: rows.map((p) => ({ ...p, coverUrl: coverByProduct.get(p.id) ?? null })),
    };
  });

  // Детальная страница: товар + галерея + варианты.
  app.get("/shop/products/:slug", async (req, reply) => {
    const { slug } = z.object({ slug: z.string().min(1).max(120) }).parse(req.params);
    const [product] = await db
      .select()
      .from(products)
      .where(and(eq(products.slug, slug), eq(products.isPublished, true)))
      .limit(1);
    if (!product) return reply.code(404).send({ error: "not_found" });

    const [images, variants, cat] = await Promise.all([
      db
        .select()
        .from(productImages)
        .where(eq(productImages.productId, product.id))
        .orderBy(desc(productImages.isCover), asc(productImages.sortOrder)),
      db
        .select()
        .from(productVariants)
        .where(eq(productVariants.productId, product.id))
        .orderBy(asc(productVariants.sortOrder)),
      product.categoryId
        ? db.select().from(categories).where(eq(categories.id, product.categoryId)).limit(1)
        : Promise.resolve([]),
    ]);

    return { product, images, variants, category: cat[0] ?? null };
  });
}
