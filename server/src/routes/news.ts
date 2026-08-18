// /api/v1/news         — публичный список опубликованных новостей + лайк/анлайк.
// /api/v1/admin/news   — админский CRUD (черновики, публикация, закреп, удаление).
//
// Комментарии на бэке пока не реализованы: в UI используется заглушка
// (NewsCommentsSheet). Когда появится флоу — заведём отдельные роуты и миграцию.

import type { FastifyInstance } from "fastify";
import { and, desc, eq, isNull, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client.js";
import {
  newsPosts,
  newsPostLikes,
  newsPostComments,
  newsCommentLikes,
} from "../db/schema/news-posts.js";
import { users } from "../db/schema/users.js";
import { profiles } from "../db/schema/profile.js";
import { loadSession, requireAdmin, requireAuth, type SessionPayload } from "../lib/auth.js";
import { isOurS3Url, mirrorRemoteImage } from "../lib/s3.js";
import { getRanksMap } from "./feed.js";
import { awardXp } from "../lib/xp.js";
import { addQuestProgress } from "../lib/quests.js";


/**
 * Картинку с чужого домена копируем в наше хранилище: хотлинк на чужой CDN
 * часто отдаёт 403 и в ленте вместо фото пустое место.
 */
async function ownImageUrl(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  if (isOurS3Url(url)) return url;
  return (await mirrorRemoteImage(url, "post", "news")) ?? url;
}


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

const commentSchema = z.object({
  text: z.string().trim().min(1).max(2000),
  imageUrl: z
    .string()
    .trim()
    .max(1000)
    .refine((s) => s === "" || /^https?:\/\//i.test(s), { message: "imageUrl должен быть http(s):// URL" })
    .optional()
    .transform((v) => (v ? v : null)),
  parentId: z.string().uuid().optional(),
});

/** Комментарии поста: автор, ранг, лайки и флаг лайка вьюера. */
async function loadComments(postId: string, viewerId: string | null) {
  const rows = await db
    .select({
      id: newsPostComments.id,
      postId: newsPostComments.postId,
      parentId: newsPostComments.parentId,
      text: newsPostComments.text,
      imageUrl: newsPostComments.imageUrl,
      createdAt: newsPostComments.createdAt,
      editedAt: newsPostComments.editedAt,
      authorId: newsPostComments.authorId,
      nick: users.nick,
      role: users.role,
      avatarUrl: profiles.avatarUrl,
    })
    .from(newsPostComments)
    .innerJoin(users, eq(users.id, newsPostComments.authorId))
    .leftJoin(profiles, eq(profiles.userId, users.id))
    .where(and(eq(newsPostComments.postId, postId), isNull(newsPostComments.deletedAt)))
    .orderBy(newsPostComments.createdAt);

  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);
  const [likeCounts, mine, ranks] = await Promise.all([
    db
      .select({ commentId: newsCommentLikes.commentId, c: sql<number>`count(*)::int` })
      .from(newsCommentLikes)
      .where(inArray(newsCommentLikes.commentId, ids))
      .groupBy(newsCommentLikes.commentId),
    viewerId
      ? db
          .select({ commentId: newsCommentLikes.commentId })
          .from(newsCommentLikes)
          .where(and(inArray(newsCommentLikes.commentId, ids), eq(newsCommentLikes.userId, viewerId)))
      : Promise.resolve([] as { commentId: string }[]),
    getRanksMap([...new Set(rows.map((r) => r.authorId))]),
  ]);
  const likeMap = new Map(likeCounts.map((r) => [r.commentId, r.c]));
  const mineSet = new Set(mine.map((r) => r.commentId));

  return rows.map((r) => ({
    ...r,
    rankId: ranks.get(r.authorId) ?? "rookie",
    likes: likeMap.get(r.id) ?? 0,
    liked: mineSet.has(r.id),
  }));
}

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
    const viewerId = (req.user as SessionPayload | undefined)?.sub ?? null;

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
    const viewerId = (req.user as SessionPayload | undefined)?.sub ?? null;

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
    const viewerId = (req.user as SessionPayload).sub;

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
    const viewerId = (req.user as SessionPayload).sub;

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

  // GET /api/v1/news/:id/comments — плоский список с автором и лайками.
  app.get<{ Params: { id: string } }>("/:id/comments", async (req, reply) => {
    const id = z.string().uuid().safeParse(req.params.id);
    if (!id.success) return reply.code(400).send({ error: "invalid_id" });
    const viewerId = (req.user as SessionPayload | undefined)?.sub ?? null;
    return { items: await loadComments(id.data, viewerId) };
  });

  // POST /api/v1/news/:id/comments — текст (+ опц. картинка, опц. ответ на коммент).
  app.post<{ Params: { id: string } }>("/:id/comments", { preHandler: requireAuth }, async (req, reply) => {
    const id = z.string().uuid().safeParse(req.params.id);
    if (!id.success) return reply.code(400).send({ error: "invalid_id" });
    const parsed = commentSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_input", message: zodMessage(parsed.error) });
    }
    const viewerId = (req.user as SessionPayload).sub;

    const [post] = await db
      .select({ id: newsPosts.id })
      .from(newsPosts)
      .where(and(eq(newsPosts.id, id.data), isNull(newsPosts.deletedAt), eq(newsPosts.published, true)))
      .limit(1);
    if (!post) return reply.code(404).send({ error: "not_found" });

    let parentId: string | null = null;
    if (parsed.data.parentId) {
      const [parent] = await db
        .select({
          id: newsPostComments.id,
          postId: newsPostComments.postId,
          deletedAt: newsPostComments.deletedAt,
        })
        .from(newsPostComments)
        .where(eq(newsPostComments.id, parsed.data.parentId))
        .limit(1);
      if (!parent || parent.postId !== id.data || parent.deletedAt) {
        return reply.code(400).send({ error: "invalid_parent" });
      }
      parentId = parent.id;
    }

    const [row] = await db
      .insert(newsPostComments)
      .values({
        postId: id.data,
        authorId: viewerId,
        parentId,
        text: parsed.data.text.trim(),
        imageUrl: parsed.data.imageUrl ?? null,
      })
      .returning();

    await db
      .update(newsPosts)
      .set({ commentsCount: sql`${newsPosts.commentsCount} + 1` })
      .where(eq(newsPosts.id, id.data));

    await awardXp({
      userId: viewerId,
      amount: 1,
      source: "admin",
      reason: "news_comment",
      refType: "comment",
      refId: row.id,
      idempotent: true,
    }).catch(() => null);
    await addQuestProgress(viewerId, "comments_5", 1).catch(() => null);

    const [author] = await db
      .select({ nick: users.nick, role: users.role, avatarUrl: profiles.avatarUrl })
      .from(users)
      .leftJoin(profiles, eq(profiles.userId, users.id))
      .where(eq(users.id, viewerId))
      .limit(1);
    const ranks = await getRanksMap([viewerId]);

    return reply.code(201).send({
      comment: {
        id: row.id,
        postId: row.postId,
        parentId: row.parentId,
        text: row.text,
        imageUrl: row.imageUrl,
        createdAt: row.createdAt,
        editedAt: row.editedAt,
        authorId: viewerId,
        nick: author?.nick ?? "",
        role: author?.role ?? "user",
        avatarUrl: author?.avatarUrl ?? null,
        rankId: ranks.get(viewerId) ?? "rookie",
        likes: 0,
        liked: false,
      },
    });
  });

  // PATCH /api/v1/news/comments/:cid — правка своего текста.
  app.patch<{ Params: { cid: string } }>("/comments/:cid", { preHandler: requireAuth }, async (req, reply) => {
    const cid = z.string().uuid().safeParse(req.params.cid);
    if (!cid.success) return reply.code(400).send({ error: "invalid_id" });
    const parsed = z.object({ text: z.string().trim().min(1).max(2000) }).safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_input" });
    const s = req.user as SessionPayload;

    const [c] = await db
      .select({ id: newsPostComments.id, authorId: newsPostComments.authorId, deletedAt: newsPostComments.deletedAt })
      .from(newsPostComments)
      .where(eq(newsPostComments.id, cid.data))
      .limit(1);
    if (!c || c.deletedAt) return reply.code(404).send({ error: "not_found" });
    if (c.authorId !== s.sub) return reply.code(403).send({ error: "forbidden" });

    const [row] = await db
      .update(newsPostComments)
      .set({ text: parsed.data.text, editedAt: new Date() })
      .where(eq(newsPostComments.id, cid.data))
      .returning();
    return { id: row.id, text: row.text, editedAt: row.editedAt };
  });

  // DELETE /api/v1/news/comments/:cid — автор или админ.
  app.delete<{ Params: { cid: string } }>("/comments/:cid", { preHandler: requireAuth }, async (req, reply) => {
    const cid = z.string().uuid().safeParse(req.params.cid);
    if (!cid.success) return reply.code(400).send({ error: "invalid_id" });
    const s = req.user as SessionPayload;

    const [c] = await db
      .select({
        id: newsPostComments.id,
        postId: newsPostComments.postId,
        authorId: newsPostComments.authorId,
        deletedAt: newsPostComments.deletedAt,
      })
      .from(newsPostComments)
      .where(eq(newsPostComments.id, cid.data))
      .limit(1);
    if (!c || c.deletedAt) return reply.code(404).send({ error: "not_found" });
    if (c.authorId !== s.sub && s.role !== "admin") return reply.code(403).send({ error: "forbidden" });

    await db
      .update(newsPostComments)
      .set({ deletedAt: new Date() })
      .where(eq(newsPostComments.id, cid.data));
    await db
      .update(newsPosts)
      .set({ commentsCount: sql`greatest(${newsPosts.commentsCount} - 1, 0)` })
      .where(eq(newsPosts.id, c.postId));
    return { ok: true };
  });

  // POST/DELETE /api/v1/news/comments/:cid/like
  app.post<{ Params: { cid: string } }>("/comments/:cid/like", { preHandler: requireAuth }, async (req, reply) => {
    const cid = z.string().uuid().safeParse(req.params.cid);
    if (!cid.success) return reply.code(400).send({ error: "invalid_id" });
    const s = req.user as SessionPayload;
    await db
      .insert(newsCommentLikes)
      .values({ commentId: cid.data, userId: s.sub })
      .onConflictDoNothing();
    return { ok: true, liked: true };
  });

  app.delete<{ Params: { cid: string } }>("/comments/:cid/like", { preHandler: requireAuth }, async (req, reply) => {
    const cid = z.string().uuid().safeParse(req.params.cid);
    if (!cid.success) return reply.code(400).send({ error: "invalid_id" });
    const s = req.user as SessionPayload;
    await db
      .delete(newsCommentLikes)
      .where(and(eq(newsCommentLikes.commentId, cid.data), eq(newsCommentLikes.userId, s.sub)));
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

    const imageUrl = await ownImageUrl(rest.imageUrl);

    const [created] = await db
      .insert(newsPosts)
      .values({ ...rest, imageUrl, publishedAt: publishedAtDate })
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
    if (rest.imageUrl !== undefined) patch.imageUrl = await ownImageUrl(rest.imageUrl);
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
