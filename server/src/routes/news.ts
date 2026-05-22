import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { news } from "../db/schema/news.js";
import { requireAuth, requireAdmin, type SessionPayload } from "../lib/auth.js";

const slugRe = /^[a-z0-9][a-z0-9-]{1,158}$/;
const tagSchema = z.string().min(1).max(40);

const createSchema = z.object({
  slug: z.string().regex(slugRe),
  title: z.string().min(1).max(240),
  excerpt: z.string().max(2000).default(""),
  body: z.string().max(100_000).default(""),
  tag: tagSchema.default("Клуб"),
  coverUrl: z.string().url().max(2000).nullable().optional(),
  metaTitle: z.string().max(240).default(""),
  metaDescription: z.string().max(500).default(""),
  ogImage: z.string().url().max(2000).nullable().optional(),
  status: z.enum(["draft", "published"]).default("draft"),
});
const patchSchema = createSchema.partial();

export async function newsRoutes(app: FastifyInstance) {
  /** GET /api/v1/news — публичный список опубликованных */
  app.get("/", async (req) => {
    const q = z
      .object({ limit: z.coerce.number().int().min(1).max(50).default(20), tag: z.string().max(40).optional() })
      .parse((req.query as object) ?? {});
    const where = q.tag
      ? and(eq(news.status, "published"), eq(news.tag, q.tag))
      : eq(news.status, "published");
    const rows = await db
      .select({
        slug: news.slug,
        title: news.title,
        excerpt: news.excerpt,
        tag: news.tag,
        coverUrl: news.coverUrl,
        publishedAt: news.publishedAt,
      })
      .from(news)
      .where(where)
      .orderBy(desc(news.publishedAt))
      .limit(q.limit);
    return { items: rows };
  });

  /** GET /api/v1/news/:slug — публичная страница */
  app.get<{ Params: { slug: string } }>("/:slug", async (req, reply) => {
    const [row] = await db.select().from(news).where(eq(news.slug, req.params.slug)).limit(1);
    if (!row || row.status !== "published") return reply.code(404).send({ error: "not_found" });
    return row;
  });
}

export async function adminNewsRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAdmin);

  app.get("/", async (req) => {
    const q = z
      .object({
        search: z.string().max(120).optional(),
        status: z.enum(["draft", "published", "all"]).default("all"),
      })
      .parse((req.query as object) ?? {});
    const conds = [] as any[];
    if (q.status !== "all") conds.push(eq(news.status, q.status));
    if (q.search) conds.push(ilike(news.title, `%${q.search}%`));
    const where = conds.length ? and(...conds) : undefined;
    const rows = await db.select().from(news).where(where).orderBy(desc(news.createdAt));
    return { items: rows };
  });

  app.post("/", async (req, reply) => {
    const session = req.user as SessionPayload;
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid", message: parsed.error.issues[0]?.message });
    const data = parsed.data;
    const publishedAt = data.status === "published" ? new Date() : null;
    try {
      const [row] = await db
        .insert(news)
        .values({ ...data, publishedAt, createdBy: session.sub })
        .returning();
      return row;
    } catch (e: any) {
      if (String(e?.code) === "23505") return reply.code(409).send({ error: "slug_taken" });
      throw e;
    }
  });

  app.patch<{ Params: { id: string } }>("/:id", async (req, reply) => {
    const parsed = patchSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid" });
    const data: Record<string, unknown> = { ...parsed.data, updatedAt: new Date() };
    if (parsed.data.status === "published") {
      const [cur] = await db.select({ publishedAt: news.publishedAt }).from(news).where(eq(news.id, req.params.id)).limit(1);
      if (cur && !cur.publishedAt) data.publishedAt = new Date();
    }
    const [row] = await db.update(news).set(data).where(eq(news.id, req.params.id)).returning();
    if (!row) return reply.code(404).send({ error: "not_found" });
    return row;
  });

  app.delete<{ Params: { id: string } }>("/:id", async (req, reply) => {
    const [row] = await db.delete(news).where(eq(news.id, req.params.id)).returning({ id: news.id });
    if (!row) return reply.code(404).send({ error: "not_found" });
    return { ok: true };
  });
}
