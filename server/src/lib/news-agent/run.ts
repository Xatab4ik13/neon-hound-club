// Оркестратор прогона агента.
//
// Один прогон = fetch RSS → дедуп → батч-фильтр → рерайт топ-N → черновики.
// Ограничители (обязательны для фоновых AI-джоб):
//   • bounded work: не больше SOURCE_CAP фидов и cap черновиков за прогон;
//   • single-flight lease в news_agent_state.lease_until;
//   • идемпотентность: кандидат помечается drafted/rejected в той же транзакции;
//   • circuit breaker: 402/403 → paused (до ручного снятия), 429 → пропуск прогона;
//   • guard: paused/enabled проверяется в начале каждого прогона.
import { and, asc, desc, eq, gt, inArray, isNull, lt, or, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import {
  newsAgentRuns,
  newsAgentState,
  newsCandidates,
  newsSources,
  newsVariants,
} from "../../db/schema/news-agent.js";
import { OpenRouterError } from "../openrouter.js";
import { extractArticle, fetchFeed, titleHash } from "./fetch.js";
import { scoreBatch, type FilterInput } from "./filter.js";
import { DEFAULT_WRITER_PROMPT } from "./prompts.js";
import { rewriteCandidate } from "./rewrite.js";

export type Stream = "hot" | "normal";

const SOURCE_CAP = { hot: 14, normal: 26 } as const;
const ITEMS_PER_FEED = 12;
const FILTER_BATCH = 20;
const LEASE_MIN = 12;
/** Не тянем в фильтр то, что старше этого (часов). */
const MAX_AGE_H = { hot: 30, normal: 96 } as const;

export type RunSummary = {
  stream: Stream;
  skipped?: string;
  fetched: number;
  newCandidates: number;
  drafted: number;
  errors: number;
  note?: string;
};

export async function getAgentState() {
  const [row] = await db.select().from(newsAgentState).where(eq(newsAgentState.id, 1)).limit(1);
  if (row) return row;
  const [created] = await db.insert(newsAgentState).values({ id: 1 }).returning();
  return created;
}

export function writerPrompt(prompt: string | null | undefined) {
  return prompt && prompt.trim().length > 40 ? prompt : DEFAULT_WRITER_PROMPT;
}

async function pauseAgent(reason: string) {
  await db
    .update(newsAgentState)
    .set({ paused: true, pausedReason: reason.slice(0, 500), updatedAt: new Date() })
    .where(eq(newsAgentState.id, 1));
}

/** Берём lease. false = кто-то уже работает. */
async function acquireLease(): Promise<boolean> {
  const now = new Date();
  const until = new Date(now.getTime() + LEASE_MIN * 60_000);
  const rows = await db
    .update(newsAgentState)
    .set({ leaseUntil: until })
    .where(
      and(
        eq(newsAgentState.id, 1),
        or(isNull(newsAgentState.leaseUntil), lt(newsAgentState.leaseUntil, now)),
      ),
    )
    .returning({ id: newsAgentState.id });
  return rows.length > 0;
}

async function releaseLease() {
  await db.update(newsAgentState).set({ leaseUntil: null }).where(eq(newsAgentState.id, 1));
}

/** Основной прогон. */
export async function runAgent(stream: Stream, opts?: { force?: boolean }): Promise<RunSummary> {
  const empty: RunSummary = { stream, fetched: 0, newCandidates: 0, drafted: 0, errors: 0 };

  const state = await getAgentState();
  if (!state.enabled && !opts?.force) return { ...empty, skipped: "agent_disabled" };
  if (state.paused && !opts?.force) return { ...empty, skipped: `paused: ${state.pausedReason ?? ""}` };

  if (!(await acquireLease())) return { ...empty, skipped: "already_running" };

  const [run] = await db.insert(newsAgentRuns).values({ stream }).returning();
  let fetched = 0;
  let newCount = 0;
  let drafted = 0;
  let errors = 0;
  const notes: string[] = [];

  try {
    // ─── 1. Забираем фиды ────────────────────────────────────────────
    const sources = await db
      .select()
      .from(newsSources)
      .where(and(eq(newsSources.active, true), eq(newsSources.stream, stream)))
      .orderBy(asc(newsSources.lastFetchedAt))
      .limit(SOURCE_CAP[stream]);

    const maxAgeMs = MAX_AGE_H[stream] * 3_600_000;
    const seenUrls = new Set<string>();
    const staged: {
      sourceId: number;
      sourceName: string;
      lang: string;
      url: string;
      title: string;
      summary: string;
      image: string | null;
      publishedAt: Date | null;
      weight: number;
    }[] = [];

    for (const src of sources) {
      try {
        const items = await fetchFeed(src.url);
        fetched += items.length;
        for (const it of items.slice(0, ITEMS_PER_FEED)) {
          if (seenUrls.has(it.url)) continue;
          if (it.publishedAt && Date.now() - it.publishedAt.getTime() > maxAgeMs) continue;
          seenUrls.add(it.url);
          staged.push({
            sourceId: src.id,
            sourceName: src.name,
            lang: src.lang,
            url: it.url,
            title: it.title,
            summary: it.summary,
            image: it.image,
            publishedAt: it.publishedAt,
            weight: src.weight,
          });
        }
        await db
          .update(newsSources)
          .set({ lastFetchedAt: new Date(), lastError: null })
          .where(eq(newsSources.id, src.id));
      } catch (err) {
        errors++;
        await db
          .update(newsSources)
          .set({ lastFetchedAt: new Date(), lastError: String((err as Error).message).slice(0, 300) })
          .where(eq(newsSources.id, src.id));
      }
    }

    // ─── 2. Дедуп: по URL и по хешу заголовка ────────────────────────
    if (staged.length > 0) {
      const urls = staged.map((s) => s.url);
      const hashes = staged.map((s) => titleHash(s.title));
      const existing = await db
        .select({ url: newsCandidates.url, titleHash: newsCandidates.titleHash })
        .from(newsCandidates)
        .where(or(inArray(newsCandidates.url, urls), inArray(newsCandidates.titleHash, hashes)));
      const knownUrls = new Set(existing.map((e) => e.url));
      const knownHashes = new Set(existing.map((e) => e.titleHash));

      const rows: (typeof newsCandidates.$inferInsert)[] = [];
      for (const s of staged) {
        const h = titleHash(s.title);
        if (knownUrls.has(s.url) || knownHashes.has(h)) continue;
        knownUrls.add(s.url);
        knownHashes.add(h);
        rows.push({
          sourceId: s.sourceId,
          sourceName: s.sourceName,
          url: s.url,
          titleHash: h,
          lang: s.lang,
          srcTitle: s.title,
          srcText: s.summary,
          srcImage: s.image,
          srcPublishedAt: s.publishedAt,
        });
      }
      if (rows.length > 0) {
        const inserted = await db
          .insert(newsCandidates)
          .values(rows)
          .onConflictDoNothing({ target: newsCandidates.url })
          .returning({ id: newsCandidates.id });
        newCount = inserted.length;
      }
    }

    // ─── 3. Фильтр: скорим свежие new-кандидаты батчами ──────────────
    const pending = await db
      .select()
      .from(newsCandidates)
      .where(and(eq(newsCandidates.status, "new"), eq(newsCandidates.score, 0)))
      .orderBy(desc(newsCandidates.createdAt))
      .limit(FILTER_BATCH * 3);

    const weightBySource = new Map(sources.map((s) => [s.id, s.weight]));

    for (let i = 0; i < pending.length; i += FILTER_BATCH) {
      const batch = pending.slice(i, i + FILTER_BATCH);
      const input: FilterInput[] = batch.map((c) => ({
        id: c.id,
        title: c.srcTitle,
        summary: c.srcText,
        sourceName: c.sourceName,
        lang: c.lang,
        ageHours: c.srcPublishedAt ? (Date.now() - c.srcPublishedAt.getTime()) / 3_600_000 : null,
      }));

      let verdicts: Awaited<ReturnType<typeof scoreBatch>> = [];
      try {
        verdicts = await scoreBatch(input, state.filterModel);
      } catch (err) {
        errors++;
        if (err instanceof OpenRouterError && (err.status === 402 || err.status === 403)) {
          await pauseAgent(`Фильтр остановлен: ${err.status} ${err.message}`);
          notes.push(`circuit_breaker ${err.status}`);
          break;
        }
        if (err instanceof OpenRouterError && err.status === 429) {
          notes.push("rate_limited, прогон прерван");
          break;
        }
        notes.push(`filter: ${(err as Error).message}`.slice(0, 200));
        continue;
      }

      const byId = new Map(verdicts.map((v) => [v.id, v]));
      for (const c of batch) {
        const v = byId.get(c.id);
        if (!v) {
          await db
            .update(newsCandidates)
            .set({ status: "rejected", rejectReason: "модель не оценила" })
            .where(eq(newsCandidates.id, c.id));
          continue;
        }
        const boosted = Math.min(100, v.score + Math.round((weightBySource.get(c.sourceId ?? -1) ?? 0) / 2));
        const passed = boosted >= state.minScore;
        await db
          .update(newsCandidates)
          .set({
            score: boosted,
            isHot: v.hot,
            topic: v.topic,
            status: passed ? "new" : "rejected",
            rejectReason: passed ? null : v.reason || `score ${boosted} < ${state.minScore}`,
          })
          .where(eq(newsCandidates.id, c.id));
      }
    }

    // ─── 4. Рерайт: топ прошедших фильтр ─────────────────────────────
    const fresh = await getAgentState();
    if (!fresh.paused) {
      const cap = stream === "hot" ? fresh.hotDraftCap : fresh.normalDraftCap;
      const queue = await db
        .select()
        .from(newsCandidates)
        .where(
          and(
            eq(newsCandidates.status, "new"),
            gt(newsCandidates.score, fresh.minScore - 1),
            ...(stream === "hot" ? [eq(newsCandidates.isHot, true)] : []),
          ),
        )
        .orderBy(desc(newsCandidates.isHot), desc(newsCandidates.score), desc(newsCandidates.createdAt))
        .limit(cap);

      const prompt = writerPrompt(fresh.prompt);

      for (const c of queue) {
        try {
          // Полный текст и og:image со страницы (RSS часто отдаёт огрызок).
          const article = await extractArticle(c.url);
          const body = article.text.length > c.srcText.length ? article.text : c.srcText;
          const image = c.srcImage ?? article.image;

          const res = await rewriteCandidate(
            {
              title: c.srcTitle,
              text: body,
              sourceName: c.sourceName,
              lang: c.lang,
              topic: c.topic,
            },
            { model: fresh.writerModel, prompt },
          );

          await db.transaction(async (tx) => {
            await tx.delete(newsVariants).where(eq(newsVariants.candidateId, c.id));
            await tx.insert(newsVariants).values(
              res.variants.map((v, idx) => ({
                candidateId: c.id,
                idx,
                tone: v.tone,
                title: v.title,
                text: v.text,
                category: res.category,
              })),
            );
            await tx
              .update(newsCandidates)
              .set({
                status: "drafted",
                draftedAt: new Date(),
                srcImage: image,
                srcText: body.slice(0, 6000),
              })
              .where(eq(newsCandidates.id, c.id));
          });
          drafted++;
        } catch (err) {
          errors++;
          if (err instanceof OpenRouterError && (err.status === 402 || err.status === 403)) {
            await pauseAgent(`Рерайт остановлен: ${err.status} ${err.message}`);
            notes.push(`circuit_breaker ${err.status}`);
            break;
          }
          if (err instanceof OpenRouterError && err.status === 429) {
            notes.push("rate_limited на рерайте");
            break;
          }
          await db
            .update(newsCandidates)
            .set({ status: "failed", rejectReason: String((err as Error).message).slice(0, 300) })
            .where(eq(newsCandidates.id, c.id));
        }
      }
    }

    await db
      .update(newsAgentState)
      .set({
        ...(stream === "hot" ? { lastHotRunAt: new Date() } : { lastNormalRunAt: new Date() }),
        updatedAt: new Date(),
      })
      .where(eq(newsAgentState.id, 1));

    return { stream, fetched, newCandidates: newCount, drafted, errors, note: notes.join("; ") };
  } finally {
    await db
      .update(newsAgentRuns)
      .set({
        finishedAt: new Date(),
        fetched,
        newCandidates: newCount,
        drafted,
        errors,
        note: notes.join("; ").slice(0, 500) || null,
      })
      .where(eq(newsAgentRuns.id, run.id));
    await releaseLease();
  }
}

/** Чистка: кандидаты старше 14 дней, кроме использованных. */
export async function pruneCandidates() {
  const cutoff = new Date(Date.now() - 14 * 86_400_000);
  await db
    .delete(newsCandidates)
    .where(and(lt(newsCandidates.createdAt, cutoff), sql`${newsCandidates.status} <> 'used'`));
}
