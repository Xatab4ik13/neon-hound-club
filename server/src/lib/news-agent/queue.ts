// Очередь публикации: посты, поставленные в очередь из админки, выходят
// с интервалом queue_gap_min, а не пачкой.
import { and, asc, desc, eq, isNotNull, lte, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import { newsPosts } from "../../db/schema/news-posts.js";
import { getAgentState } from "./run.js";

/** Ближайший свободный слот публикации: max(последний слот, now) + gap. */
export async function nextSlot(): Promise<Date> {
  const state = await getAgentState();
  const gapMs = Math.max(5, state.queueGapMin) * 60_000;

  const [lastQueued] = await db
    .select({ at: newsPosts.publishedAt })
    .from(newsPosts)
    .where(and(eq(newsPosts.queued, true), isNotNull(newsPosts.publishedAt)))
    .orderBy(desc(newsPosts.publishedAt))
    .limit(1);

  const [lastPublished] = await db
    .select({ at: sql<Date>`coalesce(${newsPosts.publishedAt}, ${newsPosts.createdAt})` })
    .from(newsPosts)
    .where(eq(newsPosts.published, true))
    .orderBy(desc(sql`coalesce(${newsPosts.publishedAt}, ${newsPosts.createdAt})`))
    .limit(1);

  const base = Math.max(
    Date.now(),
    lastQueued?.at ? new Date(lastQueued.at).getTime() : 0,
    lastPublished?.at ? new Date(lastPublished.at).getTime() : 0,
  );
  return new Date(base + gapMs);
}

/** Публикует всё, чей слот наступил. Вызывается кроном раз в минуту. */
export async function flushQueue(): Promise<number> {
  const due = await db
    .select({ id: newsPosts.id })
    .from(newsPosts)
    .where(
      and(
        eq(newsPosts.queued, true),
        eq(newsPosts.published, false),
        isNotNull(newsPosts.publishedAt),
        lte(newsPosts.publishedAt, new Date()),
      ),
    )
    .orderBy(asc(newsPosts.publishedAt))
    .limit(10);

  if (due.length === 0) return 0;

  for (const p of due) {
    const [published] = await db
      .update(newsPosts)
      .set({ published: true, queued: false, updatedAt: new Date() })
      .where(and(eq(newsPosts.id, p.id), eq(newsPosts.queued, true)))
      .returning({ id: newsPosts.id, title: newsPosts.title });
    if (published) {
      void import("../push-reminders.js").then(({ pushNewsPublished }) =>
        pushNewsPublished(published),
      );
    }
  }
  return due.length;
}
