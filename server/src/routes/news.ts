// /api/v1/news         — публичный список опубликованных новостей + лайк/анлайк.
// /api/v1/admin/news   — админский CRUD (черновики, публикация, закреп, удаление).
//
// Комментарии на бэке пока не реализованы: в UI используется заглушка
// (NewsCommentsSheet). Когда появится флоу — заведём отдельные роуты и миграцию.

import type { FastifyInstance } from "fastify";
import { and, desc, eq, isNull, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client.js";
import { newsPosts, newsPostLikes } from "../db/schema/news-posts.js";
import { loadSession, requireAdmin, requireAuth, type SessionPayload } from "../lib/auth.js";

// ─── Схемы валидации ────────────────────────────────────────────────

const createSchema = z.object({
  category: z.string().trim().max(60).default(""),
  title: z.string().trim().min(1).max(240),
  text: z.string().max(20_000).default(""),
  imageUrl: z
    .string()
    .trim()
    .max(1000)
    .refine((s) => s === "" || /^https?:\/\//i.test(s), {
      message: "imageUrl должен быть http(s):// URL",
    })
    .optional()
    .transform((v) => (v ? v : null)),
  published: z.boolean().default(false),
  pinned: z.boolean().default(false),
  publishedAt: z.string().datetime().optional(),
});

const patchSchema = createSchema.partial();

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().datetime().optional(),
});

const adminListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  status: z.enum(["all", "published", "drafts"]).default("all"),
});

function zodMessage(error: z.ZodError) {
  return error.issues[0]?.message ?? "Проверь поля новости";
}

// Ключ сортировки в публичной ленте — publishedAt (или createdAt как fallback).
function orderKey() {
  return sql<Date>`coalesce(${newsPosts.publishedAt}, ${newsPosts.createdAt})`;
}

// Хелпер: подтянуть liked-флаг для набора id для текущего юзера.
async function loadLikedSet(postIds: string[], viewerId: string | null): Promise<Set<string>> {
  if (!viewerId || postIds.length === 0) return new Set();
  const rows = await db
    .select({ postId: newsPostLikes.postId })
    .from(newsPostLikes)
    .where(and(inArray(newsPostLikes.postId, postIds), eq(newsPostLikes.userId, viewerId)));
  return new Set(rows.map((r) => r.postId));
}

function serialize(row: typeof newsPosts.$inferSelect, liked: boolean) {
  return {
    id: row.id,
    category: row.category,
    title: row.title,
    text: row.text,
    image: row.imageUrl ?? undefined,
    createdAt: (row.publishedAt ?? row.createdAt).toISOString(),
    likes: row.likesCount,
    liked,
    commentsCount: row.commentsCount,
    pinned: row.pinned,
    published: row.published,
  };
}

// ─── Публичные роуты ────────────────────────────────────────────────

export async function newsRoutes(app: FastifyInstance) {
  app.addHook("preHandler", loadSession);

  // GET /api/v1/news?limit=&cursor= — лента опубликованных новостей.
  app.get("/", async (req, reply) => {
    const parsed = listQuerySchema.safeParse(req.query ?? {});
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_input", message: zodMessage(parsed.error) });
    }
    const { limit, cursor } = parsed.data;
    const viewerId = (req.user as SessionPayload | undefined)?.uid ?? null;

    const key = orderKey();
    const rows = await db
      .select()
      .from(newsPosts)
      .where(
        and(
          isNull(newsPosts.deletedAt),
          eq(newsPosts.published, true),
          cursor ? sql`${key} < ${new Date(cursor)}` : sql`true`,
        ),
      )
      .orderBy(desc(newsPosts.pinned), desc(key))
      .limit(limit);

    const liked = await loadLikedSet(rows.map((r) => r.id), viewerId);
    const items = rows.map((r) => serialize(r, liked.has(r.id)));
    const last = rows.at(-1);
    const nextCursor = last
      ? (last.publishedAt ?? last.createdAt).toISOString()
      : null;
    return { items, nextCursor };
  });

  // GET /api/v1/news/:id — одна опубликованная новость.
  app.get<{ Params: { id: string } }>("/:id", async (req, reply) => {
    const id = z.string().uuid().safeParse(req.params.id);
    if (!id.success) return reply.code(400).send({ error: "invalid_id" });
    const viewerId = (req.user as SessionPayload | undefined)?.uid ?? null;

    const [row] = await db
      .select()
      .from(newsPosts)
      .where(
        and(
          eq(newsPosts.id, id.data),
          isNull(newsPosts.deletedAt),
          eq(newsPosts.published, true),
        ),
      )
      .limit(1);
    if (!row) return reply.code(404).send({ error: "not_found" });

    const liked = await loadLikedSet([row.id], viewerId);
    return { post: serialize(row, liked.has(row.id)) };
  });

  // POST /api/v1/news/:id/like  — поставить лайк.
  app.post<{ Params: { id: string } }>("/:id/like", { preHandler: requireAuth }, async (req, reply) => {
    const id = z.string().uuid().safeParse(req.params.id);
    if (!id.success) return reply.code(400).send({ error: "invalid_id" });
    const viewerId = (req.user as SessionPayload).uid;

    const [row] = await db
      .select({ id: newsPosts.id })
      .from(newsPosts)
      .where(and(eq(newsPosts.id, id.data), isNull(newsPosts.deletedAt), eq(newsPosts.published, true)))
      .limit(1);
    if (!row) return reply.code(404).send({ error: "not_found" });

    const inserted = await db
      .insert(newsPostLikes)
      .values({ postId: id.data, userId: viewerId })
      .onConflictDoNothing()
      .returning({ postId: newsPostLikes.postId });

    if (inserted.length > 0) {
      await db
        .update(newsPosts)
        .set({ likesCount: sql`${newsPosts.likesCount} + 1` })
        .where(eq(newsPosts.id, id.data));
    }
    return { ok: true, liked: true };
  });

  // DELETE /api/v1/news/:id/like — снять лайк.
  app.delete<{ Params: { id: string } }>("/:id/like", { preHandler: requireAuth }, async (req, reply) => {
    const id = z.string().uuid().safeParse(req.params.id);
    if (!id.success) return reply.code(400).send({ error: "invalid_id" });
    const viewerId = (req.user as SessionPayload).uid;

    const deleted = await db
      .delete(newsPostLikes)
      .where(and(eq(newsPostLikes.postId, id.data), eq(newsPostLikes.userId, viewerId)))
      .returning({ postId: newsPostLikes.postId });

    if (deleted.length > 0) {
      await db
        .update(newsPosts)
        .set({ likesCount: sql`greatest(${newsPosts.likesCount} - 1, 0)` })
        .where(eq(newsPosts.id, id.data));
    }
    return { ok: true, liked: false };
  });
}

// ─── Админские роуты ────────────────────────────────────────────────

export async function adminNewsRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAdmin);

  // GET /api/v1/admin/news?status=all|published|drafts
  app.get("/", async (req, reply) => {
    const parsed = adminListQuerySchema.safeParse(req.query ?? {});
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_input", message: zodMessage(parsed.error) });
    }
    const { limit, status } = parsed.data;

    const conds = [isNull(newsPosts.deletedAt)];
    if (status === "published") conds.push(eq(newsPosts.published, true));
    if (status === "drafts") conds.push(eq(newsPosts.published, false));

    const rows = await db
      .select()
      .from(newsPosts)
      .where(and(...conds))
      .orderBy(desc(newsPosts.pinned), desc(newsPosts.createdAt))
      .limit(limit);

    return { items: rows.map((r) => serialize(r, false)) };
  });

  // GET /api/v1/admin/news/:id — любой статус, включая черновик.
  app.get<{ Params: { id: string } }>("/:id", async (req, reply) => {
    const id = z.string().uuid().safeParse(req.params.id);
    if (!id.success) return reply.code(400).send({ error: "invalid_id" });
    const [row] = await db
      .select()
      .from(newsPosts)
      .where(and(eq(newsPosts.id, id.data), isNull(newsPosts.deletedAt)))
      .limit(1);
    if (!row) return reply.code(404).send({ error: "not_found" });
    return { post: serialize(row, false) };
  });

  // POST /api/v1/admin/news — создать (черновик или сразу опубликовать).
  app.post("/", async (req, reply) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: "invalid_input",
        message: zodMessage(parsed.error),
        details: parsed.error.flatten(),
      });
    }
    const { publishedAt, ...rest } = parsed.data;
    const publishedAtDate = publishedAt
      ? new Date(publishedAt)
      : rest.published
        ? new Date()
        : null;

    const [created] = await db
      .insert(newsPosts)
      .values({ ...rest, publishedAt: publishedAtDate })
      .returning();
    return reply.code(201).send({ post: serialize(created, false) });
  });

  // PATCH /api/v1/admin/news/:id — редактировать.
  app.patch<{ Params: { id: string } }>("/:id", async (req, reply) => {
    const id = z.string().uuid().safeParse(req.params.id);
    if (!id.success) return reply.code(400).send({ error: "invalid_id" });
    const parsed = patchSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: "invalid_input",
        message: zodMessage(parsed.error),
        details: parsed.error.flatten(),
      });
    }

    const { publishedAt, ...rest } = parsed.data;

    // Если публикуем впервые и publishedAt не задан — проставим now().
    const patch: Record<string, unknown> = { ...rest, updatedAt: new Date() };
    if (publishedAt !== undefined) {
      patch.publishedAt = publishedAt ? new Date(publishedAt) : null;
    }
    if (rest.published === true && publishedAt === undefined) {
      // Пусть БД сама выставит, если ещё не было.
      patch.publishedAt = sql`coalesce(${newsPosts.publishedAt}, now())`;
    }

    const [updated] = await db
      .update(newsPosts)
      .set(patch)
      .where(and(eq(newsPosts.id, id.data), isNull(newsPosts.deletedAt)))
      .returning();
    if (!updated) return reply.code(404).send({ error: "not_found" });
    return { post: serialize(updated, false) };
  });

  // POST /api/v1/admin/news/:id/publish — быстрый экшн (для AI-агента тоже пригодится).
  app.post<{ Params: { id: string } }>("/:id/publish", async (req, reply) => {
    const id = z.string().uuid().safeParse(req.params.id);
    if (!id.success) return reply.code(400).send({ error: "invalid_id" });
    const [updated] = await db
      .update(newsPosts)
      .set({
        published: true,
        publishedAt: sql`coalesce(${newsPosts.publishedAt}, now())`,
        updatedAt: new Date(),
      })
      .where(and(eq(newsPosts.id, id.data), isNull(newsPosts.deletedAt)))
      .returning();
    if (!updated) return reply.code(404).send({ error: "not_found" });
    return { post: serialize(updated, false) };
  });

  // POST /api/v1/admin/news/:id/unpublish — вернуть в черновик.
  app.post<{ Params: { id: string } }>("/:id/unpublish", async (req, reply) => {
    const id = z.string().uuid().safeParse(req.params.id);
    if (!id.success) return reply.code(400).send({ error: "invalid_id" });
    const [updated] = await db
      .update(newsPosts)
      .set({ published: false, updatedAt: new Date() })
      .where(and(eq(newsPosts.id, id.data), isNull(newsPosts.deletedAt)))
      .returning();
    if (!updated) return reply.code(404).send({ error: "not_found" });
    return { post: serialize(updated, false) };
  });

  // DELETE /api/v1/admin/news/:id — soft-delete.
  app.delete<{ Params: { id: string } }>("/:id", async (req, reply) => {
    const id = z.string().uuid().safeParse(req.params.id);
    if (!id.success) return reply.code(400).send({ error: "invalid_id" });
    const [deleted] = await db
      .update(newsPosts)
      .set({ deletedAt: new Date(), published: false, updatedAt: new Date() })
      .where(and(eq(newsPosts.id, id.data), isNull(newsPosts.deletedAt)))
      .returning({ id: newsPosts.id });
    if (!deleted) return reply.code(404).send({ error: "not_found" });
    return { ok: true };
  });
}
