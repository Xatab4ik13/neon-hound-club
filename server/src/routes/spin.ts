import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { spinPrizes, spinSpins, spinStreaks, spinWinners } from "../db/schema/spin.js";
import { profiles } from "../db/schema/profile.js";
import { users } from "../db/schema/users.js";
import { requireAuth, requireAdmin, type SessionPayload } from "../lib/auth.js";
import {
  SpinError,
  SPINS_PER_DAY,
  claimStreakMilestone,
  ensureCurrentSeason,
  getSpinState,
  rollSpin,
} from "../lib/spin.js";

function isPwa(req: { headers: Record<string, unknown>; body?: unknown }): boolean {
  const header = String(req.headers["x-pwa"] ?? "").toLowerCase();
  if (header === "1" || header === "true") return true;
  const body = req.body as { pwa?: boolean } | undefined;
  return body?.pwa === true;
}

/** Клиентские роуты: /api/v1/spin */
export async function spinRoutes(app: FastifyInstance) {
  app.get("/state", { preHandler: requireAuth }, async (req) => {
    const session = req.user as SessionPayload;
    return getSpinState(session.sub, isPwa(req as never));
  });

  app.post("/roll", { preHandler: requireAuth }, async (req, reply) => {
    const session = req.user as SessionPayload;
    try {
      return await rollSpin(session.sub, isPwa(req as never));
    } catch (err) {
      if (err instanceof SpinError) {
        return reply.code(err.code === "access_denied" ? 403 : 409).send({ error: err.code, message: err.message });
      }
      throw err;
    }
  });

  app.post("/streak/claim", { preHandler: requireAuth }, async (req, reply) => {
    const session = req.user as SessionPayload;
    const parsed = z.object({ milestone: z.union([z.literal(10), z.literal(20), z.literal(30)]) }).safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "bad_request" });
    try {
      return await claimStreakMilestone(session.sub, parsed.data.milestone);
    } catch (err) {
      if (err instanceof SpinError) {
        return reply.code(409).send({ error: err.code, message: err.message });
      }
      throw err;
    }
  });
}

/** Админские роуты: /api/v1/admin/spin */
export async function adminSpinRoutes(app: FastifyInstance) {
  // Сводка сезона: пулы призов + статистика прокрутов.
  app.get("/overview", { preHandler: requireAdmin }, async () => {
    const season = await ensureCurrentSeason();
    const prizes = await db
      .select()
      .from(spinPrizes)
      .where(eq(spinPrizes.seasonId, season.id))
      .orderBy(desc(spinPrizes.baseChancePpm));

    const [stats] = await db
      .select({
        spins: sql<number>`count(*)::int`,
        players: sql<number>`count(distinct ${spinSpins.userId})::int`,
        spinsToday: sql<number>`count(*) filter (where ${spinSpins.spinDate} = (now() at time zone 'Europe/Moscow')::date)::int`,
      })
      .from(spinSpins)
      .where(eq(spinSpins.seasonId, season.id));

    const [pending] = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(spinWinners)
      .where(and(eq(spinWinners.seasonId, season.id), eq(spinWinners.status, "pending")));

    const byPrize = await db
      .select({
        prizeCode: spinSpins.prizeCode,
        count: sql<number>`count(*)::int`,
      })
      .from(spinSpins)
      .where(eq(spinSpins.seasonId, season.id))
      .groupBy(spinSpins.prizeCode);

    // Последние прокруты (включая цифровые призы) — для ленты в админке.
    const recent = await db
      .select({
        id: spinSpins.id,
        nick: users.nick,
        prizeCode: spinSpins.prizeCode,
        rarity: spinSpins.rarity,
        tier: spinSpins.tier,
        bonus: spinSpins.bonus,
        createdAt: spinSpins.createdAt,
      })
      .from(spinSpins)
      .leftJoin(users, eq(users.id, spinSpins.userId))
      .where(eq(spinSpins.seasonId, season.id))
      .orderBy(desc(spinSpins.createdAt))
      .limit(50);

    const prizeTitle = new Map(prizes.map((p) => [p.code, p.title]));

    return {
      season: {
        periodKey: season.periodKey,
        startsAt: season.startsAt.toISOString(),
        endsAt: season.endsAt.toISOString(),
        daysTotal: season.daysTotal,
      },
      stats: {
        spins: stats?.spins ?? 0,
        players: stats?.players ?? 0,
        spinsToday: stats?.spinsToday ?? 0,
        pendingShipments: pending?.c ?? 0,
      },
      spinsPerDay: SPINS_PER_DAY,
      prizes: prizes.map((p) => ({
        code: p.code,
        title: p.title,
        rarity: p.rarity,
        rewardKind: p.rewardKind,
        chancePpm: p.baseChancePpm,
        limitTotal: p.limitTotal,
        issued: p.issued,
        active: p.active,
      })),
      byPrize,
      recent: recent.map((r) => ({
        ...r,
        prizeTitle: prizeTitle.get(r.prizeCode) ?? r.prizeCode,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  });

  // Победители: физика со спинов + награды календаря активности.
  app.get("/winners", { preHandler: requireAdmin }, async (req) => {
    const query = z
      .object({ source: z.enum(["all", "spin", "streak"]).default("all") })
      .parse(req.query ?? {});
    const season = await ensureCurrentSeason();
    const where =
      query.source === "all"
        ? eq(spinWinners.seasonId, season.id)
        : and(eq(spinWinners.seasonId, season.id), eq(spinWinners.source, query.source));

    const rows = await db
      .select({
        id: spinWinners.id,
        source: spinWinners.source,
        prizeCode: spinWinners.prizeCode,
        prizeTitle: spinWinners.prizeTitle,
        status: spinWinners.status,
        trackNumber: spinWinners.trackNumber,
        adminNote: spinWinners.adminNote,
        createdAt: spinWinners.createdAt,
        userId: spinWinners.userId,
        nick: users.nick,
        city: profiles.city,
        phone: profiles.phone,
        email: users.email,
      })
      .from(spinWinners)
      .leftJoin(profiles, eq(profiles.userId, spinWinners.userId))
      .leftJoin(users, eq(users.id, spinWinners.userId))
      .where(where)
      .orderBy(desc(spinWinners.createdAt));

    return rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
  });

  app.patch("/winners/:id", { preHandler: requireAdmin }, async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const body = z
      .object({
        status: z.enum(["pending", "contacted", "shipped", "delivered"]).optional(),
        trackNumber: z.string().max(64).nullable().optional(),
        adminNote: z.string().max(400).nullable().optional(),
      })
      .parse(req.body ?? {});

    const [updated] = await db
      .update(spinWinners)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(spinWinners.id, id))
      .returning();
    if (!updated) return reply.code(404).send({ error: "not_found" });
    return { ...updated, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() };
  });

  // Календарь активности: кто сколько дней накрутил.
  app.get("/streaks", { preHandler: requireAdmin }, async () => {
    const season = await ensureCurrentSeason();
    const rows = await db
      .select({
        userId: spinStreaks.userId,
        nick: users.nick,
        city: profiles.city,
        phone: profiles.phone,
        daysCount: spinStreaks.daysCount,
        claimed10At: spinStreaks.claimed10At,
        claimed20At: spinStreaks.claimed20At,
        claimed30At: spinStreaks.claimed30At,
      })
      .from(spinStreaks)
      .leftJoin(profiles, eq(profiles.userId, spinStreaks.userId))
      .leftJoin(users, eq(users.id, spinStreaks.userId))
      .where(eq(spinStreaks.seasonId, season.id))
      .orderBy(desc(spinStreaks.daysCount));
    return rows;
  });
}
