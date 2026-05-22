import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { posts, postLikes, postComments, postPollVotes, type PollDef } from "../db/schema/posts.js";
import { users } from "../db/schema/users.js";
import { profiles } from "../db/schema/profile.js";
import { loadSession, requireAuth, requireAdmin, type SessionPayload } from "../lib/auth.js";
import { awardXp } from "../lib/xp.js";

// ───────── helpers ─────────

async function isBloggerOrAdmin(userId: string): Promise<boolean> {
  const [u] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId)).limit(1);
  return !!u && (u.role === "blogger" || u.role === "admin");
}

async function requireBlogger(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    await req.jwtVerify();
  } catch {
    return reply.code(401).send({ error: "unauthorized" }) as unknown as void;
  }
  const s = req.user as SessionPayload;
  if (!(await isBloggerOrAdmin(s.sub))) {
    return reply.code(403).send({ error: "forbidden", message: "Только для блогеров" }) as unknown as void;
  }
}

const pollOption = z.object({ id: z.string().min(1).max(64), text: z.string().min(1).max(160) });
const pollSchema = z.object({
  question: z.string().min(1).max(240),
  anonymous: z.boolean().default(true),
  multi: z.boolean().default(false),
  closed: z.boolean().default(false),
  options: z.array(pollOption).min(2).max(8),
});

const createSchema = z.object({
  text: z.string().max(4000).default(""),
  imageUrl: z.string().url().max(2000).nullable().optional(),
  pinned: z.boolean().optional(),
  poll: pollSchema.nullable().optional(),
}).refine((d) => d.text.trim().length > 0 || d.imageUrl || d.poll, {
  message: "Нужен текст, картинка или опрос",
});

const patchSchema = z.object({
  text: z.string().max(4000).optional(),
  imageUrl: z.string().url().max(2000).nullable().optional(),
  pinned: z.boolean().optional(),
  poll: pollSchema.nullable().optional(),
});

const commentSchema = z.object({ text: z.string().min(1).max(2000) });

// Собираем агрегаты для списка постов: лайки, комменты, мой лайк, голоса опроса.
async function hydratePosts(rows: typeof posts.$inferSelect[], viewerId: string | null) {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const authorIds = Array.from(new Set(rows.map((r) => r.authorId)));

  const [authors, likeCounts, commentCounts, myLikes, pollVotes, allComments] = await Promise.all([
    db
      .select({
        id: users.id,
        nick: users.nick,
        role: users.role,
        avatarUrl: profiles.avatarUrl,
        city: profiles.city,
      })
      .from(users)
      .leftJoin(profiles, eq(profiles.id, users.id))
      .where(inArray(users.id, authorIds)),
    db
      .select({ postId: postLikes.postId, c: sql<number>`count(*)::int` })
      .from(postLikes)
      .where(inArray(postLikes.postId, ids))
      .groupBy(postLikes.postId),
    db
      .select({ postId: postComments.postId, c: sql<number>`count(*)::int` })
      .from(postComments)
      .where(and(inArray(postComments.postId, ids), isNull(postComments.deletedAt)))
      .groupBy(postComments.postId),
    viewerId
      ? db.select({ postId: postLikes.postId }).from(postLikes).where(and(inArray(postLikes.postId, ids), eq(postLikes.userId, viewerId)))
      : Promise.resolve([] as { postId: string }[]),
    db
      .select({ postId: postPollVotes.postId, optionId: postPollVotes.optionId, c: sql<number>`count(*)::int` })
      .from(postPollVotes)
      .where(inArray(postPollVotes.postId, ids))
      .groupBy(postPollVotes.postId, postPollVotes.optionId),
    db
      .select({
        id: postComments.id,
        postId: postComments.postId,
        text: postComments.text,
        likes: postComments.likes,
        createdAt: postComments.createdAt,
        authorId: postComments.authorId,
        nick: users.nick,
        avatarUrl: profiles.avatarUrl,
      })
      .from(postComments)
      .innerJoin(users, eq(users.id, postComments.authorId))
      .leftJoin(profiles, eq(profiles.id, postComments.authorId))
      .where(and(inArray(postComments.postId, ids), isNull(postComments.deletedAt)))
      .orderBy(postComments.createdAt),
  ]);

  // Группируем комменты по постам, кап 20 последних (oldest-first внутри среза).
  const commentsByPost = new Map<string, typeof allComments>();
  for (const c of allComments) {
    if (!commentsByPost.has(c.postId)) commentsByPost.set(c.postId, []);
    commentsByPost.get(c.postId)!.push(c);
  }
  for (const [pid, list] of commentsByPost) commentsByPost.set(pid, list.slice(-20));

  const authorMap = new Map(authors.map((a) => [a.id, a]));
  const likeMap = new Map(likeCounts.map((r) => [r.postId, r.c]));
  const commentMap = new Map(commentCounts.map((r) => [r.postId, r.c]));
  const mineSet = new Set(myLikes.map((r) => r.postId));
  // postId → optionId → count
  const voteMap = new Map<string, Map<string, number>>();
  for (const v of pollVotes) {
    if (!voteMap.has(v.postId)) voteMap.set(v.postId, new Map());
    voteMap.get(v.postId)!.set(v.optionId, v.c);
  }

  // Мои голоса (для отображения «вы выбрали»). Только если есть viewer.
  let myVotes: { postId: string; optionId: string }[] = [];
  if (viewerId) {
    myVotes = await db
      .select({ postId: postPollVotes.postId, optionId: postPollVotes.optionId })
      .from(postPollVotes)
      .where(and(inArray(postPollVotes.postId, ids), eq(postPollVotes.userId, viewerId)));
  }
  const myVoteMap = new Map<string, string[]>();
  for (const v of myVotes) {
    if (!myVoteMap.has(v.postId)) myVoteMap.set(v.postId, []);
    myVoteMap.get(v.postId)!.push(v.optionId);
  }

  return rows.map((r) => {
    const a = authorMap.get(r.authorId);
    const votes = voteMap.get(r.id);
    let poll: (PollDef & { results: { id: string; text: string; votes: number }[]; myVote: string[] }) | null = null;
    if (r.poll) {
      poll = {
        ...r.poll,
        results: r.poll.options.map((o) => ({ ...o, votes: votes?.get(o.id) ?? 0 })),
        myVote: myVoteMap.get(r.id) ?? [],
      };
    }
    return {
      id: r.id,
      author: a
        ? { id: a.id, nick: a.nick, role: a.role, avatarUrl: a.avatarUrl, city: a.city }
        : { id: r.authorId, nick: "unknown", role: "user", avatarUrl: null, city: null },
      text: r.text,
      imageUrl: r.imageUrl,
      pinned: r.pinned,
      poll,
      likes: likeMap.get(r.id) ?? 0,
      liked: mineSet.has(r.id),
      commentsCount: commentMap.get(r.id) ?? 0,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  });
}

// ───────── PUBLIC FEED ─────────

export async function feedRoutes(app: FastifyInstance) {
  app.addHook("preHandler", loadSession);

  // GET /api/v1/feed?limit=&cursor= — лента (закреп сверху, потом по дате)
  app.get("/", async (req) => {
    const q = z
      .object({
        limit: z.coerce.number().int().min(1).max(50).default(20),
        cursor: z.string().datetime().optional(),
        author: z.string().uuid().optional(),
      })
      .parse((req.query as object) ?? {});
    const session = (req.user as SessionPayload | undefined) ?? null;

    const conds = [isNull(posts.deletedAt)];
    if (q.author) conds.push(eq(posts.authorId, q.author));
    if (q.cursor) conds.push(sql`${posts.createdAt} < ${new Date(q.cursor)}`);

    const rows = await db
      .select()
      .from(posts)
      .where(and(...conds))
      .orderBy(desc(posts.pinned), desc(posts.createdAt))
      .limit(q.limit);

    const items = await hydratePosts(rows, session?.sub ?? null);
    const nextCursor = rows.length === q.limit ? rows[rows.length - 1]!.createdAt.toISOString() : null;
    return { items, nextCursor };
  });

  // GET /api/v1/feed/:id — один пост + комменты
  app.get<{ Params: { id: string } }>("/:id", async (req, reply) => {
    const [row] = await db.select().from(posts).where(and(eq(posts.id, req.params.id), isNull(posts.deletedAt))).limit(1);
    if (!row) return reply.code(404).send({ error: "not_found" });
    const session = (req.user as SessionPayload | undefined) ?? null;
    const [hydrated] = await hydratePosts([row], session?.sub ?? null);

    const comments = await db
      .select({
        id: postComments.id,
        text: postComments.text,
        likes: postComments.likes,
        createdAt: postComments.createdAt,
        authorId: postComments.authorId,
        nick: users.nick,
        avatarUrl: profiles.avatarUrl,
      })
      .from(postComments)
      .innerJoin(users, eq(users.id, postComments.authorId))
      .leftJoin(profiles, eq(profiles.id, postComments.authorId))
      .where(and(eq(postComments.postId, req.params.id), isNull(postComments.deletedAt)))
      .orderBy(postComments.createdAt);

    return { ...hydrated, comments };
  });

  // POST /api/v1/feed/:id/like  /  DELETE → unlike
  app.post<{ Params: { id: string } }>("/:id/like", { preHandler: requireAuth }, async (req, reply) => {
    const s = req.user as SessionPayload;
    const [exists] = await db.select({ id: posts.id }).from(posts).where(and(eq(posts.id, req.params.id), isNull(posts.deletedAt))).limit(1);
    if (!exists) return reply.code(404).send({ error: "not_found" });
    await db.insert(postLikes).values({ postId: req.params.id, userId: s.sub }).onConflictDoNothing();
    return { ok: true };
  });
  app.delete<{ Params: { id: string } }>("/:id/like", { preHandler: requireAuth }, async (req) => {
    const s = req.user as SessionPayload;
    await db.delete(postLikes).where(and(eq(postLikes.postId, req.params.id), eq(postLikes.userId, s.sub)));
    return { ok: true };
  });

  // POST /api/v1/feed/:id/comments
  app.post<{ Params: { id: string } }>("/:id/comments", { preHandler: requireAuth }, async (req, reply) => {
    const s = req.user as SessionPayload;
    const parsed = commentSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid" });
    const [exists] = await db.select({ id: posts.id }).from(posts).where(and(eq(posts.id, req.params.id), isNull(posts.deletedAt))).limit(1);
    if (!exists) return reply.code(404).send({ error: "not_found" });
    const [row] = await db
      .insert(postComments)
      .values({ postId: req.params.id, authorId: s.sub, text: parsed.data.text.trim() })
      .returning();
    // +XP за активность (минимум, чтобы не фармили)
    await awardXp({
      userId: s.sub,
      amount: 1,
      source: "admin",
      reason: "feed_comment",
      refType: "comment",
      refId: row.id,
      idempotent: true,
    }).catch(() => null);
    return row;
  });

  // DELETE /api/v1/feed/comments/:cid — автор коммента или автор поста или admin/blogger
  app.delete<{ Params: { cid: string } }>("/comments/:cid", { preHandler: requireAuth }, async (req, reply) => {
    const s = req.user as SessionPayload;
    const [c] = await db
      .select({ id: postComments.id, authorId: postComments.authorId, postAuthorId: posts.authorId })
      .from(postComments)
      .innerJoin(posts, eq(posts.id, postComments.postId))
      .where(eq(postComments.id, req.params.cid))
      .limit(1);
    if (!c) return reply.code(404).send({ error: "not_found" });
    const canModerate = c.postAuthorId === s.sub || s.role === "admin";
    if (c.authorId !== s.sub && !canModerate) return reply.code(403).send({ error: "forbidden" });
    await db.update(postComments).set({ deletedAt: new Date() }).where(eq(postComments.id, req.params.cid));
    return { ok: true };
  });

  // POST /api/v1/feed/:id/vote — голос за опрос
  app.post<{ Params: { id: string } }>("/:id/vote", { preHandler: requireAuth }, async (req, reply) => {
    const s = req.user as SessionPayload;
    const body = z.object({ optionIds: z.array(z.string().min(1).max(64)).min(1).max(8) }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: "invalid" });

    const [p] = await db.select().from(posts).where(and(eq(posts.id, req.params.id), isNull(posts.deletedAt))).limit(1);
    if (!p || !p.poll) return reply.code(404).send({ error: "not_found" });
    if (p.poll.closed) return reply.code(409).send({ error: "closed" });

    const allowed = new Set(p.poll.options.map((o) => o.id));
    const picked = body.data.optionIds.filter((x) => allowed.has(x));
    if (picked.length === 0) return reply.code(400).send({ error: "invalid_option" });
    if (!p.poll.multi && picked.length > 1) return reply.code(400).send({ error: "single_choice" });

    // Перезаписываем голос пользователя (поддерживает смену выбора, пока опрос открыт).
    await db.delete(postPollVotes).where(and(eq(postPollVotes.postId, p.id), eq(postPollVotes.userId, s.sub)));
    await db
      .insert(postPollVotes)
      .values(picked.map((optionId) => ({ postId: p.id, userId: s.sub, optionId })))
      .onConflictDoNothing();
    return { ok: true };
  });
}

// ───────── BLOGGER / AUTHOR ROUTES ─────────

export async function postsRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireBlogger);

  // POST /api/v1/posts — создать пост
  app.post("/", async (req, reply) => {
    const s = req.user as SessionPayload;
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid", message: parsed.error.issues[0]?.message });
    const d = parsed.data;
    const [row] = await db
      .insert(posts)
      .values({
        authorId: s.sub,
        text: d.text.trim(),
        imageUrl: d.imageUrl ?? null,
        pinned: d.pinned ?? false,
        poll: d.poll
          ? { ...d.poll, anonymous: d.poll.anonymous, multi: d.poll.multi, closed: d.poll.closed }
          : null,
      })
      .returning();
    await awardXp({
      userId: s.sub,
      amount: 25,
      source: "admin",
      reason: "feed_post",
      refType: "post",
      refId: row.id,
      idempotent: true,
    }).catch(() => null);
    return row;
  });

  // PATCH /api/v1/posts/:id — править свой пост (или любой, если admin)
  app.patch<{ Params: { id: string } }>("/:id", async (req, reply) => {
    const s = req.user as SessionPayload;
    const parsed = patchSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid" });

    const [p] = await db.select().from(posts).where(eq(posts.id, req.params.id)).limit(1);
    if (!p || p.deletedAt) return reply.code(404).send({ error: "not_found" });
    if (p.authorId !== s.sub && s.role !== "admin") return reply.code(403).send({ error: "forbidden" });

    const data: Record<string, unknown> = { updatedAt: new Date() };
    if (parsed.data.text !== undefined) data.text = parsed.data.text;
    if (parsed.data.imageUrl !== undefined) data.imageUrl = parsed.data.imageUrl;
    if (parsed.data.pinned !== undefined) data.pinned = parsed.data.pinned;
    if (parsed.data.poll !== undefined) data.poll = parsed.data.poll;

    const [row] = await db.update(posts).set(data).where(eq(posts.id, req.params.id)).returning();
    return row;
  });

  // DELETE /api/v1/posts/:id — soft delete
  app.delete<{ Params: { id: string } }>("/:id", async (req, reply) => {
    const s = req.user as SessionPayload;
    const [p] = await db.select({ authorId: posts.authorId, deletedAt: posts.deletedAt }).from(posts).where(eq(posts.id, req.params.id)).limit(1);
    if (!p || p.deletedAt) return reply.code(404).send({ error: "not_found" });
    if (p.authorId !== s.sub && s.role !== "admin") return reply.code(403).send({ error: "forbidden" });
    await db.update(posts).set({ deletedAt: new Date() }).where(eq(posts.id, req.params.id));
    return { ok: true };
  });
}

// ───────── ADMIN ─────────

export async function adminFeedRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAdmin);

  // GET /api/v1/admin/feed/posts — все посты включая удалённые
  app.get("/posts", async () => {
    const rows = await db
      .select({
        id: posts.id,
        authorId: posts.authorId,
        nick: users.nick,
        text: posts.text,
        imageUrl: posts.imageUrl,
        pinned: posts.pinned,
        deletedAt: posts.deletedAt,
        createdAt: posts.createdAt,
      })
      .from(posts)
      .innerJoin(users, eq(users.id, posts.authorId))
      .orderBy(desc(posts.createdAt))
      .limit(200);
    return { items: rows };
  });

  // POST /api/v1/admin/feed/posts/:id/restore
  app.post<{ Params: { id: string } }>("/posts/:id/restore", async (req) => {
    await db.update(posts).set({ deletedAt: null }).where(eq(posts.id, req.params.id));
    return { ok: true };
  });

  // DELETE /api/v1/admin/feed/posts/:id — hard delete
  app.delete<{ Params: { id: string } }>("/posts/:id", async (req) => {
    await db.delete(posts).where(eq(posts.id, req.params.id));
    return { ok: true };
  });
}
