import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { spinPrizes, spinSpins, spinStreaks } from "../db/schema/spin.js";
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

  // История прокрутов с пагинацией.
  // rarity: top = epic+legend, low = common+rare, all = все.
  // q — поиск по нику, prize — фильтр по коду приза (для карточек «крупные призы»).
  app.get("/history", { preHandler: requireAdmin }, async (req) => {
    const q = z
      .object({
        rarity: z.enum(["all", "top", "low"]).default("all"),
        q: z.string().trim().max(64).optional(),
        prize: z.string().trim().max(32).optional(),
        page: z.coerce.number().int().min(1).max(100000).default(1),
        pageSize: z.coerce.number().int().min(10).max(200).default(100),
      })
      .parse(req.query ?? {});

    const season = await ensureCurrentSeason();
    const rarities =
      q.rarity === "top" ? ["epic", "legend"] : q.rarity === "low" ? ["common", "rare"] : null;
    const conds = [eq(spinSpins.seasonId, season.id)];
    if (rarities) conds.push(inArray(spinSpins.rarity, rarities));
    if (q.prize) conds.push(eq(spinSpins.prizeCode, q.prize));
    if (q.q) conds.push(sql`${users.nick} ilike ${"%" + q.q + "%"}`);
    const where = and(...conds);

    const [totalRow] = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(spinSpins)
      .leftJoin(users, eq(users.id, spinSpins.userId))
      .where(where);

    const prizes = await db
      .select({ code: spinPrizes.code, title: spinPrizes.title })
      .from(spinPrizes)
      .where(eq(spinPrizes.seasonId, season.id));
    const prizeTitle = new Map(prizes.map((p) => [p.code, p.title]));

    const rows = await db
      .select({
        id: spinSpins.id,
        userId: spinSpins.userId,
        nick: users.nick,
        prizeCode: spinSpins.prizeCode,
        rarity: spinSpins.rarity,
        tier: spinSpins.tier,
        bonus: spinSpins.bonus,
        createdAt: spinSpins.createdAt,
      })
      .from(spinSpins)
      .leftJoin(users, eq(users.id, spinSpins.userId))
      .where(where)
      .orderBy(desc(spinSpins.createdAt))
      .limit(q.pageSize)
      .offset((q.page - 1) * q.pageSize);

    return {
      items: rows.map((r) => ({
        ...r,
        prizeTitle: prizeTitle.get(r.prizeCode) ?? r.prizeCode,
        createdAt: r.createdAt.toISOString(),
      })),
      total: totalRow?.c ?? 0,
      page: q.page,
      pageSize: q.pageSize,
    };
  });

  // Легендарные призы: крупные выигрыши (jackpot-техника, Hell Pass) с анкетой победителя.
  app.get("/legends", { preHandler: requireAdmin }, async () => {
    const season = await ensureCurrentSeason();
    const rows = await db
      .select({
        id: spinSpins.id,
        userId: spinSpins.userId,
        nick: users.nick,
        email: users.email,
        city: profiles.city,
        phone: profiles.phone,
        prizeCode: spinSpins.prizeCode,
        tier: spinSpins.tier,
        createdAt: spinSpins.createdAt,
      })
      .from(spinSpins)
      .leftJoin(users, eq(users.id, spinSpins.userId))
      .leftJoin(profiles, eq(profiles.userId, spinSpins.userId))
      .where(and(eq(spinSpins.seasonId, season.id), eq(spinSpins.rarity, "legend")))
      .orderBy(desc(spinSpins.createdAt));

    const prizes = await db
      .select({ code: spinPrizes.code, title: spinPrizes.title, rewardKind: spinPrizes.rewardKind })
      .from(spinPrizes)
      .where(eq(spinPrizes.seasonId, season.id));
    const byCode = new Map(prizes.map((p) => [p.code, p]));

    return rows.map((r) => ({
      ...r,
      prizeTitle: byCode.get(r.prizeCode)?.title ?? r.prizeCode,
      rewardKind: byCode.get(r.prizeCode)?.rewardKind ?? "unknown",
      createdAt: r.createdAt.toISOString(),
    }));
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
