import { and, eq, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { xpEvents } from "../db/schema/xp.js";

export const XP_SOURCES = [
  "admin",
  "verify_email",
  "profile_complete",
  "quest",
  "raffle_entry",
  "raffle_win",
  "merch_purchase",
  "pass_monthly",
  "ai_helpful",
  "school_course",
  "daily_login",
  "referral_joined",
  "referral_purchase",
] as const;
export type XpSource = (typeof XP_SOURCES)[number];

export interface AwardXpOptions {
  userId: string;
  amount: number;
  source: XpSource;
  reason: string;
  refType?: string;
  refId?: string;
  createdBy?: string | null;
  idempotent?: boolean;
}

/** Append-only начисление XP. Возвращает строку или null если уже было (idempotent). */
export async function awardXp(opts: AwardXpOptions) {
  if (!Number.isInteger(opts.amount) || opts.amount === 0) {
    throw new Error("xp amount must be a non-zero integer");
  }
  if (opts.idempotent && opts.refType && opts.refId) {
    const [existing] = await db
      .select({ id: xpEvents.id })
      .from(xpEvents)
      .where(
        and(
          eq(xpEvents.userId, opts.userId),
          eq(xpEvents.source, opts.source),
          eq(xpEvents.refType, opts.refType),
          eq(xpEvents.refId, opts.refId),
        ),
      )
      .limit(1);
    if (existing) return null;
  }
  const [row] = await db
    .insert(xpEvents)
    .values({
      userId: opts.userId,
      amount: opts.amount,
      source: opts.source,
      reason: opts.reason,
      refType: opts.refType,
      refId: opts.refId,
      createdBy: opts.createdBy ?? null,
    })
    .returning();
  return row;
}

export async function getXpTotal(userId: string): Promise<number> {
  const [row] = await db
    .select({ total: sql<number>`coalesce(sum(${xpEvents.amount}), 0)::int` })
    .from(xpEvents)
    .where(eq(xpEvents.userId, userId));
  return row?.total ?? 0;
}

// ---------- Ранги (зеркало src/data/ranks.ts) ----------
export const RANKS = [
  { id: "rookie", label: "ROOKIE", short: "ROOKIE" },
  { id: "pit-crew", label: "PIT CREW", short: "PIT" },
  { id: "road-captain", label: "ROAD CAPTAIN", short: "CAPTAIN" },
  { id: "alpha-hound", label: "ALPHA HOUND", short: "ALPHA" },
  { id: "hell-legend", label: "HELL LEGEND", short: "LEGEND" },
] as const;
export const XP_THRESHOLDS = [0, 500, 2_000, 6_000, 15_000];

export function computeRank(xp: number) {
  let idx = 0;
  for (let i = 0; i < RANKS.length; i++) {
    if (xp >= XP_THRESHOLDS[i]) idx = i;
  }
  const rank = RANKS[idx];
  const next = RANKS[idx + 1];
  const isMax = !next;
  const base = XP_THRESHOLDS[idx];
  const top = XP_THRESHOLDS[idx + 1] ?? xp;
  const span = isMax ? 0 : top - base;
  const inRank = Math.max(0, xp - base);
  const pct = isMax ? 100 : Math.max(0, Math.min(100, Math.round((inRank / span) * 100)));
  const toNext = isMax ? 0 : Math.max(0, top - xp);
  return {
    xp,
    rankIndex: idx,
    rankId: rank.id,
    rankLabel: rank.label,
    nextLabel: next?.label ?? null,
    pct,
    inRank,
    span,
    toNext,
    isMax,
  };
}
