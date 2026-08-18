// /api/v1/admin/news-agent — управление AI-агентом новостной ленты.
//
// Агент только ПРЕДЛАГАЕТ. Публикует всегда человек: выбирает один из двух
// вариантов текста, при желании правит и жмёт «в черновик» / «в очередь» /
// «опубликовать сейчас».
import type { FastifyInstance } from "fastify";
import { and, count, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client.js";
import { newsPosts } from "../db/schema/news-posts.js";
import {
  newsAgentRuns,
  newsAgentState,
  newsCandidates,
  newsSources,
  newsVariants,
} from "../db/schema/news-agent.js";
import { requireAdmin } from "../lib/auth.js";
import { DEFAULT_WRITER_PROMPT } from "../lib/news-agent/prompts.js";
import { getAgentState, runAgent, writerPrompt } from "../lib/news-agent/run.js";
import { nextSlot } from "../lib/news-agent/queue.js";
import { isOurS3Url, mirrorRemoteImage } from "../lib/s3.js";

const uuidSchema = z.string().uuid();

const settingsSchema = z.object({
  enabled: z.boolean().optional(),
  paused: z.boolean().optional(),
  prompt: z.string().max(20_000).optional(),
  filterModel: z.string().trim().min(3).max(80).optional(),
  writerModel: z.string().trim().min(3).max(80).optional(),
  minScore: z.coerce.number().int().min(0).max(100).optional(),
  hotDraftCap: z.coerce.number().int().min(0).max(20).optional(),
  normalDraftCap: z.coerce.number().int().min(0).max(30).optional(),
  queueGapMin: z.coerce.number().int().min(5).max(600).optional(),
});

const approveSchema = z.object({
  variantId: uuidSchema.optional(),
  title: z.string().trim().min(1).max(240),
  text: z.string().max(20_000).default(""),
  category: z.string().trim().max(60).default(""),
  image: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .transform((v) => (v && /^https?:\/\//i.test(v) ? v : null)),
  mode: z.enum(["draft", "queue", "now"]).default("draft"),
});

const sourceSchema = z.object({
  name: z.string().trim().min(1).max(120),
  url: z.string().trim().url().max(600),
  lang: z.string().trim().max(8).default("en"),
  stream: z.enum(["hot", "normal"]).default("normal"),
  weight: z.coerce.number().int().min(0).max(20).default(0),
  active: z.boolean().default(true),
});

export async function adminNewsAgentRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAdmin);

  // ─── Состояние + статистика ──────────────────────────────────────
  app.get("/state", async () => {
    const state = await getAgentState();

    const dayAgo = new Date(Date.now() - 86_400_000);
    const [byStatus, sourcesCount, runs, queued, [today]] = await Promise.all([
      db
        .select({ status: newsCandidates.status, n: count() })
        .from(newsCandidates)
        .groupBy(newsCandidates.status),
      db.select({ n: count() }).from(newsSources).where(eq(newsSources.active, true)),
      db.select().from(newsAgentRuns).orderBy(desc(newsAgentRuns.startedAt)).limit(12),
      db
        .select({ n: count() })
        .from(newsPosts)
        .where(and(eq(newsPosts.queued, true), eq(newsPosts.published, false))),
      db
        .select({
          drafted: sql<number>`coalesce(sum(${newsAgentRuns.drafted}), 0)`,
          fetched: sql<number>`coalesce(sum(${newsAgentRuns.fetched}), 0)`,
          errors: sql<number>`coalesce(sum(${newsAgentRuns.errors}), 0)`,
        })
        .from(newsAgentRuns)
        .where(gte(newsAgentRuns.startedAt, dayAgo)),
    ]);

    const counts: Record<string, number> = {};
    for (const r of byStatus) counts[r.status] = Number(r.n);

    return {
      state: {
        enabled: state.enabled,
        paused: state.paused,
        pausedReason: state.pausedReason,
        running: !!state.leaseUntil && state.leaseUntil.getTime() > Date.now(),
        lastHotRunAt: state.lastHotRunAt?.toISOString() ?? null,
        lastNormalRunAt: state.lastNormalRunAt?.toISOString() ?? null,
        prompt: state.prompt,
        defaultPrompt: DEFAULT_WRITER_PROMPT,
        filterModel: state.filterModel,
        writerModel: state.writerModel,
        minScore: state.minScore,
        hotDraftCap: state.hotDraftCap,
        normalDraftCap: state.normalDraftCap,
        queueGapMin: state.queueGapMin,
      },
      stats: {
        sources: Number(sourcesCount[0]?.n ?? 0),
        pending: counts.new ?? 0,
        drafted: counts.drafted ?? 0,
        rejected: counts.rejected ?? 0,
        used: counts.used ?? 0,
        failed: counts.failed ?? 0,
        queued: Number(queued[0]?.n ?? 0),
        last24h: {
          drafted: Number(today?.drafted ?? 0),
          fetched: Number(today?.fetched ?? 0),
          errors: Number(today?.errors ?? 0),
        },
      },
      runs: runs.map((r) => ({
        id: r.id,
        stream: r.stream,
        startedAt: r.startedAt.toISOString(),
        finishedAt: r.finishedAt?.toISOString() ?? null,
        fetched: r.fetched,
        newCandidates: r.newCandidates,
        drafted: r.drafted,
        errors: r.errors,
        note: r.note,
      })),
    };
  });

  // PATCH /state — настройки агента.
  app.patch("/state", async (req, reply) => {
    const parsed = settingsSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_input", message: parsed.error.issues[0]?.message });
    }
    const patch: Record<string, unknown> = { ...parsed.data, updatedAt: new Date() };
    // Снятие паузы вручную очищает причину.
    if (parsed.data.paused === false) patch.pausedReason = null;
    await db.update(newsAgentState).set(patch).where(eq(newsAgentState.id, 1));
    return { ok: true };
  });

  // POST /run?stream=hot|normal — ручной прогон.
  app.post("/run", async (req) => {
    const stream = (req.query as { stream?: string })?.stream === "normal" ? "normal" : "hot";
    const result = await runAgent(stream, { force: true });
    return { result };
  });

  // ─── Кандидаты ───────────────────────────────────────────────────
  // GET /candidates?status=drafted|new|rejected|failed
  app.get("/candidates", async (req) => {
    const q = z
      .object({
        status: z.enum(["drafted", "new", "rejected", "failed", "used"]).default("drafted"),
        category: z.string().trim().max(60).optional(),
        limit: z.coerce.number().int().min(1).max(100).default(40),
      })
      .parse(req.query ?? {});

    // Категория живёт в вариантах текста (их пишет модель), поэтому фильтруем
    // через EXISTS, а не по колонке кандидата.
    const catFilter =
      q.category && q.category !== "all"
        ? sql`exists (select 1 from ${newsVariants} v where v."candidate_id" = ${newsCandidates.id} and lower(v."category") = lower(${q.category}))`
        : undefined;

    // Сверху — самое актуальное: свежие прогоны, внутри прогона по score.
    const rows = await db
      .select()
      .from(newsCandidates)
      .where(and(eq(newsCandidates.status, q.status), ...(catFilter ? [catFilter] : [])))
      .orderBy(
        desc(sql`coalesce(${newsCandidates.draftedAt}, ${newsCandidates.createdAt})`),
        desc(newsCandidates.isHot),
        desc(newsCandidates.score),
      )
      .limit(q.limit);


    const ids = rows.map((r) => r.id);
    const variants = ids.length
      ? await db
          .select()
          .from(newsVariants)
          .where(inArray(newsVariants.candidateId, ids))
          .orderBy(newsVariants.idx)
      : [];

    return {
      items: rows.map((c) => ({
        id: c.id,
        sourceName: c.sourceName,
        url: c.url,
        lang: c.lang,
        srcTitle: c.srcTitle,
        srcText: c.srcText.slice(0, 600),
        image: c.srcImage,
        publishedAt: c.srcPublishedAt?.toISOString() ?? null,
        createdAt: c.createdAt.toISOString(),
        score: c.score,
        hot: c.isHot,
        topic: c.topic,
        status: c.status,
        rejectReason: c.rejectReason,
        variants: variants
          .filter((v) => v.candidateId === c.id)
          .map((v) => ({
            id: v.id,
            idx: v.idx,
            tone: v.tone,
            title: v.title,
            text: v.text,
            category: v.category,
          })),
      })),
    };
  });

  // POST /candidates/:id/approve — создать пост из выбранного варианта.
  app.post<{ Params: { id: string } }>("/candidates/:id/approve", async (req, reply) => {
    const id = uuidSchema.safeParse(req.params.id);
    if (!id.success) return reply.code(400).send({ error: "invalid_id" });
    const parsed = approveSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_input", message: parsed.error.issues[0]?.message });
    }
    const [cand] = await db.select().from(newsCandidates).where(eq(newsCandidates.id, id.data)).limit(1);
    if (!cand) return reply.code(404).send({ error: "not_found" });

    const { mode, title, text, category, image } = parsed.data;
    const publishedAt =
      mode === "now" ? new Date() : mode === "queue" ? await nextSlot() : null;

    // Картинку с чужого сайта перекладываем к себе: og:image часто отдаёт 403
    // на хотлинк, и в ленте вместо фото пустое место.
    const srcImageUrl = image ?? cand.srcImage ?? null;
    const imageUrl = srcImageUrl
      ? isOurS3Url(srcImageUrl)
        ? srcImageUrl
        : ((await mirrorRemoteImage(srcImageUrl, "post", "news")) ?? srcImageUrl)
      : null;

    const [post] = await db
      .insert(newsPosts)
      .values({
        title,
        text,
        category,
        imageUrl,

        published: mode === "now",
        queued: mode === "queue",
        publishedAt,
        sourceUrl: cand.url,
        sourceName: cand.sourceName,
        candidateId: cand.id,
      })
      .returning();

    await db
      .update(newsCandidates)
      .set({ status: "used" })
      .where(eq(newsCandidates.id, cand.id));

    if (post.published) {
      void import("../lib/push-reminders.js").then(({ pushNewsPublished }) =>
        pushNewsPublished({ id: post.id, title: post.title }),
      );
    }

    return reply.code(201).send({
      postId: post.id,
      mode,
      publishAt: publishedAt?.toISOString() ?? null,
    });
  });

  // POST /candidates/:id/reject — «мимо». Причина логируется для настройки фильтра.
  app.post<{ Params: { id: string } }>("/candidates/:id/reject", async (req, reply) => {
    const id = uuidSchema.safeParse(req.params.id);
    if (!id.success) return reply.code(400).send({ error: "invalid_id" });
    const reason = z
      .object({ reason: z.string().trim().max(300).default("") })
      .safeParse(req.body ?? {});
    const [updated] = await db
      .update(newsCandidates)
      .set({
        status: "rejected",
        rejectReason: `[админ] ${reason.success ? reason.data.reason : ""}`.trim().slice(0, 300),
      })
      .where(eq(newsCandidates.id, id.data))
      .returning({ id: newsCandidates.id });
    if (!updated) return reply.code(404).send({ error: "not_found" });
    return { ok: true };
  });

  // POST /candidates/:id/rewrite — перегенерировать варианты текста.
  app.post<{ Params: { id: string } }>("/candidates/:id/rewrite", async (req, reply) => {
    const id = uuidSchema.safeParse(req.params.id);
    if (!id.success) return reply.code(400).send({ error: "invalid_id" });
    const [cand] = await db.select().from(newsCandidates).where(eq(newsCandidates.id, id.data)).limit(1);
    if (!cand) return reply.code(404).send({ error: "not_found" });

    const state = await getAgentState();
    const { rewriteCandidate } = await import("../lib/news-agent/rewrite.js");
    try {
      const res = await rewriteCandidate(
        {
          title: cand.srcTitle,
          text: cand.srcText,
          sourceName: cand.sourceName,
          lang: cand.lang,
          topic: cand.topic,
        },
        { model: state.writerModel, prompt: writerPrompt(state.prompt) },
      );
      await db.transaction(async (tx) => {
        await tx.delete(newsVariants).where(eq(newsVariants.candidateId, cand.id));
        await tx.insert(newsVariants).values(
          res.variants.map((v, idx) => ({
            candidateId: cand.id,
            idx,
            tone: v.tone,
            title: v.title,
            text: v.text,
            category: res.category,
          })),
        );
        await tx
          .update(newsCandidates)
          .set({ status: "drafted", draftedAt: new Date() })
          .where(eq(newsCandidates.id, cand.id));
      });
      return { ok: true };
    } catch (err) {
      return reply.code(502).send({ error: "rewrite_failed", message: (err as Error).message });
    }
  });

  // ─── Источники ───────────────────────────────────────────────────
  app.get("/sources", async () => {
    const rows = await db.select().from(newsSources).orderBy(newsSources.stream, newsSources.name);
    return {
      items: rows.map((s) => ({
        id: s.id,
        name: s.name,
        url: s.url,
        lang: s.lang,
        stream: s.stream,
        weight: s.weight,
        active: s.active,
        lastFetchedAt: s.lastFetchedAt?.toISOString() ?? null,
        lastError: s.lastError,
      })),
    };
  });

  app.post("/sources", async (req, reply) => {
    const parsed = sourceSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_input", message: parsed.error.issues[0]?.message });
    }
    const [created] = await db
      .insert(newsSources)
      .values(parsed.data)
      .onConflictDoNothing({ target: newsSources.url })
      .returning({ id: newsSources.id });
    if (!created) return reply.code(409).send({ error: "duplicate", message: "Такой фид уже есть" });
    return reply.code(201).send({ id: created.id });
  });

  app.patch<{ Params: { id: string } }>("/sources/:id", async (req, reply) => {
    const id = z.coerce.number().int().safeParse(req.params.id);
    if (!id.success) return reply.code(400).send({ error: "invalid_id" });
    const parsed = sourceSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_input", message: parsed.error.issues[0]?.message });
    }
    const [updated] = await db
      .update(newsSources)
      .set(parsed.data)
      .where(eq(newsSources.id, id.data))
      .returning({ id: newsSources.id });
    if (!updated) return reply.code(404).send({ error: "not_found" });
    return { ok: true };
  });

  app.delete<{ Params: { id: string } }>("/sources/:id", async (req, reply) => {
    const id = z.coerce.number().int().safeParse(req.params.id);
    if (!id.success) return reply.code(400).send({ error: "invalid_id" });
    await db.delete(newsSources).where(eq(newsSources.id, id.data));
    return { ok: true };
  });
}
