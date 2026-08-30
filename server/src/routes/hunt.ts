import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { and, desc, eq, gt, inArray, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { hunts, huntPrizes, huntBets } from "../db/schema/hunt.js";
import { users } from "../db/schema/users.js";
import { profiles } from "../db/schema/profile.js";
import { passPurchases } from "../db/schema/pass.js";

import { requireAuth, requireAdmin, type SessionPayload } from "../lib/auth.js";
import {
  HuntError,
  HUNT_LOCK_MS,
  capsulesOf,
  drawHunt,
  getCurrentHunt,
  getHuntEntries,
  getHuntPrizes,
  getMyBet,
  placeHuntBet,
  refundHunt,
} from "../lib/hunt.js";
import { getActivePass } from "../lib/pass.js";
import { getTicketBalance } from "../lib/tickets.js";

async function ranksMap(ids: string[]) {
  if (!ids.length) return new Map<string, string>();
  const { getRanksMap } = await import("./feed.js");
  return getRanksMap(ids);
}

/**
 * Детерминированный «вес» назначенного победителя, у которого нет реальной ставки.
 * Нужен только для шоу: человек должен выглядеть как крупный участник, а не
 * появляться из ниоткуда. Число стабильно для одного и того же userId, поэтому
 * при перезагрузке страницы капсулы не прыгают.
 */
function ghostTickets(userId: string, step: number, maxTickets: number) {
  let h = 2166136261;
  for (let i = 0; i < userId.length; i++) {
    h ^= userId.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  // Целимся в верхнюю часть таблицы: 45–80% от максимальной реальной ставки.
  const base = Math.max(step * 4, Math.floor(maxTickets * 0.45));
  const span = Math.max(step, Math.floor(maxTickets * 0.35));
  const raw = base + (h % Math.max(1, span));
  return Math.max(step, Math.round(raw / step) * step);
}

async function serializeHunt(huntId: string, viewerId: string | null) {
  const [hunt] = await db.select().from(hunts).where(eq(hunts.id, huntId)).limit(1);
  if (!hunt) return null;
  const prizes = await getHuntPrizes(huntId);
  const realEntries = await getHuntEntries(huntId);
  const step = Math.max(1, hunt.ticketStep);

  // Ставка зрителя считается только по реальным ставкам — до подмешивания призрачных.
  const my = viewerId ? realEntries.find((e) => e.userId === viewerId) : undefined;

  // Назначенные руками победители без ставки: добавляем в пул с визуальными
  // капсулами, чтобы шоу выбило именно их и это выглядело естественно.
  const betIds = new Set(realEntries.map((e) => e.userId));
  const ghostIds = [
    ...new Set(
      prizes
        .map((p) => p.forcedWinnerId)
        .filter((v): v is string => !!v && !betIds.has(v)),
    ),
  ];
  const maxTickets = realEntries.reduce((m, e) => Math.max(m, e.tickets), step * 10);
  const ghostRows = ghostIds.length
    ? await db
        .select({
          userId: users.id,
          nick: users.nick,
          city: profiles.city,
          avatarUrl: profiles.avatarUrl,
        })
        .from(users)
        .leftJoin(profiles, eq(profiles.userId, users.id))
        .where(inArray(users.id, ghostIds))
    : [];
  const entries = [
    ...realEntries,
    ...ghostRows.map((g) => ({ ...g, tickets: ghostTickets(g.userId, step, maxTickets) })),
  ].sort((a, b) => b.tickets - a.tickets);

  const ranks = await ranksMap(entries.map((e) => e.userId));

  const winnerIds = prizes.map((p) => p.winnerUserId).filter((v): v is string => !!v);
  const winnerNicks = winnerIds.length
    ? await db.select({ id: users.id, nick: users.nick }).from(users).where(inArray(users.id, winnerIds))
    : [];
  const nickById = new Map(winnerNicks.map((w) => [w.id, w.nick]));

  const totalTickets = entries.reduce((s, e) => s + e.tickets, 0);
  const totalCapsules = entries.reduce((s, e) => s + capsulesOf(e.tickets, step), 0);


  return {
    hunt: {
      id: hunt.id,
      title: hunt.title,
      startsAt: hunt.startsAt.toISOString(),
      ticketStep: step,
      status: hunt.status,
      drawnAt: hunt.drawnAt?.toISOString() ?? null,
      lockMs: HUNT_LOCK_MS,
    },
    prizes: prizes.map((p) => ({
      id: p.id,
      place: p.place,
      title: p.title,
      sub: p.sub,
      img: p.imgUrl,
      ticketsReward: p.ticketsReward,
      forcedWinnerId: p.forcedWinnerId,
      winnerUserId: p.winnerUserId,
      winnerNick: p.winnerUserId ? (nickById.get(p.winnerUserId) ?? null) : null,
    })),
    entries: entries.map((e) => ({
      id: e.userId,
      nick: (e.nick ?? "RIDER").toUpperCase(),
      city: e.city ?? "",
      avatarUrl: e.avatarUrl,
      rankId: ranks.get(e.userId) ?? "rookie",
      tickets: e.tickets,
      capsules: capsulesOf(e.tickets, step),
    })),
    totals: { participants: entries.length, tickets: totalTickets, capsules: totalCapsules },
    me: { tickets: my?.tickets ?? 0, capsules: capsulesOf(my?.tickets ?? 0, step) },
  };
}

/** Клиентские роуты: /api/v1/hunt */
export async function huntRoutes(app: FastifyInstance) {
  app.get("/current", { preHandler: requireAuth }, async (req) => {
    const session = req.user as SessionPayload;
    const hunt = await getCurrentHunt();
    if (!hunt) return { hunt: null, prizes: [], entries: [], totals: null, me: null, pass: null, balance: 0 };
    const data = await serializeHunt(hunt.id, session.sub);
    const pass = await getActivePass(session.sub);
    const balance = await getTicketBalance(session.sub);
    return { ...data, pass: pass ? { tier: pass.tier, expiresAt: pass.expiresAt?.toISOString() ?? null } : null, balance };
  });

  app.post("/bet", { preHandler: requireAuth }, async (req, reply) => {
    const session = req.user as SessionPayload;
    const parsed = z.object({ tickets: z.number().int().positive().max(100000) }).safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "bad_request" });
    try {
      return await placeHuntBet(session.sub, parsed.data.tickets);
    } catch (err) {
      if (err instanceof HuntError) {
        const status = err.code === "no_pass" ? 403 : err.code === "no_hunt" ? 404 : 409;
        return reply.code(status).send({ error: err.code, message: err.message });
      }
      throw err;
    }
  });

  app.get("/my-bet", { preHandler: requireAuth }, async (req) => {
    const session = req.user as SessionPayload;
    const hunt = await getCurrentHunt();
    if (!hunt) return { tickets: 0, capsules: 0 };
    const bet = await getMyBet(hunt.id, session.sub);
    return { tickets: bet?.tickets ?? 0, capsules: capsulesOf(bet?.tickets ?? 0, hunt.ticketStep) };
  });
}

const prizeInput = z.object({
  id: z.string().uuid().optional(),
  place: z.number().int().min(1).max(10),
  title: z.string().min(1).max(160),
  sub: z.string().max(120).default(""),
  img: z.string().max(2048).nullable().optional(),
  ticketsReward: z.number().int().min(0).max(100000).default(0),
  forcedWinnerId: z.string().uuid().nullable().optional(),
});

/** Админские роуты: /api/v1/admin/hunt */
export async function adminHuntRoutes(app: FastifyInstance) {
  app.get("/current", { preHandler: requireAdmin }, async () => {
    const hunt = await getCurrentHunt(true);
    if (!hunt) return { hunt: null, prizes: [], entries: [], totals: null };
    return serializeHunt(hunt.id, null);
  });

  // Создать/обновить актуальную охоту вместе с призами.
  app.post("/save", { preHandler: requireAdmin }, async (req, reply) => {
    const parsed = z
      .object({
        id: z.string().uuid().nullable().optional(),
        /** true — всегда создаём новую охоту (кнопка «Создать новую охоту»). */
        create: z.boolean().default(false),
        title: z.string().min(1).max(120).default("HELL HUNT"),
        startsAt: z.string().min(4),
        ticketStep: z.number().int().min(1).max(10000).default(10),
        status: z.enum(["draft", "open", "finished", "canceled"]).default("open"),
        prizes: z.array(prizeInput).min(1).max(10),
      })
      .safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "bad_request", details: parsed.error.flatten() });
    const body = parsed.data;
    const startsAt = new Date(body.startsAt);
    if (Number.isNaN(startsAt.getTime())) return reply.code(400).send({ error: "bad_starts_at" });

    // Если фронт не прислал id (например, конфиг пришёл из локального кеша),
    // не создаём вторую охоту — обновляем актуальную. Кроме случая create:true.
    let huntId = body.create ? null : (body.id ?? (await getCurrentHunt(true))?.id ?? null);
    if (huntId) {
      await db
        .update(hunts)
        .set({ title: body.title, startsAt, ticketStep: body.ticketStep, status: body.status, updatedAt: new Date() })
        .where(eq(hunts.id, huntId));
    } else {
      // Прошлую охоту закрываем, чтобы она осталась в истории и не мешала.
      const prev = await getCurrentHunt(true);
      if (prev && prev.status !== "finished" && prev.status !== "canceled") {
        await db.update(hunts).set({ status: "finished", updatedAt: new Date() }).where(eq(hunts.id, prev.id));
      }
      const [row] = await db
        .insert(hunts)
        .values({ title: body.title, startsAt, ticketStep: body.ticketStep, status: body.status })
        .returning();
      huntId = row!.id;
    }


    // Призы синхронизируем целиком: что не пришло — удаляем.
    const existing = await getHuntPrizes(huntId);
    const keep = new Set(body.prizes.map((p) => p.id).filter(Boolean) as string[]);
    for (const old of existing) {
      if (!keep.has(old.id)) await db.delete(huntPrizes).where(eq(huntPrizes.id, old.id));
    }
    for (const p of body.prizes) {
      const values = {
        huntId,
        place: p.place,
        title: p.title,
        sub: p.sub ?? "",
        imgUrl: p.img ?? null,
        ticketsReward: p.ticketsReward ?? 0,
        forcedWinnerId: p.forcedWinnerId ?? null,
      };
      if (p.id && existing.some((e) => e.id === p.id)) {
        await db.update(huntPrizes).set(values).where(eq(huntPrizes.id, p.id));
      } else {
        await db.insert(huntPrizes).values(values);
      }
    }

    // Диагностика: видно, какие назначения победителей реально дошли и легли в БД.
    const after = await getHuntPrizes(huntId);
    req.log.info(
      {
        huntId,
        got: body.prizes.map((p) => ({ place: p.place, id: p.id ?? null, forced: p.forcedWinnerId ?? null })),
        saved: after.map((p) => ({ place: p.place, id: p.id, forced: p.forcedWinnerId })),
      },
      "hunt/save forced winners",
    );

    return serializeHunt(huntId, null);

  });

  // Прокрутить жребий (в т.ч. повторно с force=true).
  app.post("/draw", { preHandler: requireAdmin }, async (req, reply) => {
    const parsed = z
      .object({ huntId: z.string().uuid().optional(), force: z.boolean().default(false) })
      .safeParse(req.body ?? {});
    if (!parsed.success) return reply.code(400).send({ error: "bad_request" });
    const hunt = parsed.data.huntId ? { id: parsed.data.huntId } : await getCurrentHunt(true);
    if (!hunt) return reply.code(404).send({ error: "no_hunt" });
    try {
      await drawHunt(hunt.id, parsed.data.force);
      return serializeHunt(hunt.id, null);
    } catch (err) {
      if (err instanceof HuntError) return reply.code(409).send({ error: err.code, message: err.message });
      throw err;
    }
  });

  // Вернуть билеты участникам и обнулить ставки.
  app.post("/refund", { preHandler: requireAdmin }, async (req, reply) => {
    const hunt = await getCurrentHunt(true);
    if (!hunt) return reply.code(404).send({ error: "no_hunt" });
    const res = await refundHunt(hunt.id);
    await db.update(hunts).set({ status: "canceled", updatedAt: new Date() }).where(eq(hunts.id, hunt.id));
    return res;
  });

  // Сбросить итоги (снять победителей, вернуть в open).
  app.post("/reset-results", { preHandler: requireAdmin }, async (req, reply) => {
    const hunt = await getCurrentHunt(true);
    if (!hunt) return reply.code(404).send({ error: "no_hunt" });
    await db.update(huntPrizes).set({ winnerUserId: null }).where(eq(huntPrizes.huntId, hunt.id));
    await db.update(hunts).set({ status: "open", drawnAt: null, updatedAt: new Date() }).where(eq(hunts.id, hunt.id));
    return serializeHunt(hunt.id, null);
  });

  // Список участников для селекта победителя.
  app.get("/participants", { preHandler: requireAdmin }, async () => {
    const hunt = await getCurrentHunt(true);
    if (!hunt) return { items: [] };
    const entries = await getHuntEntries(hunt.id);
    const step = Math.max(1, hunt.ticketStep);
    const total = entries.reduce((s, e) => s + capsulesOf(e.tickets, step), 0) || 1;
    return {
      items: entries.map((e) => ({
        id: e.userId,
        nick: (e.nick ?? "RIDER").toUpperCase(),
        tickets: e.tickets,
        capsules: capsulesOf(e.tickets, step),
        chance: Math.round((capsulesOf(e.tickets, step) / total) * 1000) / 10,
      })),
    };
  });

  // Поиск владельцев активного Hell Pass Platinum — для назначения победителя
  // вручную. Показываем ставку в текущей охоте, если она есть.
  app.get("/platinum-users", { preHandler: requireAdmin }, async (req) => {
    const q = String((req.query as { q?: string } | undefined)?.q ?? "").trim().toLowerCase();
    const hunt = await getCurrentHunt(true);
    const step = Math.max(1, hunt?.ticketStep ?? 10);

    const rows = await db
      .selectDistinctOn([users.id], {
        id: users.id,
        nick: users.nick,
        email: users.email,
        city: profiles.city,
        avatarUrl: profiles.avatarUrl,
        expiresAt: passPurchases.expiresAt,
      })
      .from(passPurchases)
      .innerJoin(users, eq(users.id, passPurchases.userId))
      .leftJoin(profiles, eq(profiles.userId, users.id))
      .where(
        and(
          eq(passPurchases.tier, "platinum"),
          eq(passPurchases.status, "active"),
          gt(passPurchases.expiresAt, new Date()),
          q
            ? sql`(lower(${users.nick}) like ${`%${q}%`} or lower(${users.email}) like ${`%${q}%`})`
            : sql`true`,
        ),
      )
      .limit(200);

    const bets = hunt ? await getHuntEntries(hunt.id) : [];
    const betByUser = new Map(bets.map((b) => [b.userId, b.tickets]));

    return {
      items: rows
        .map((r) => {
          const tickets = betByUser.get(r.id) ?? 0;
          return {
            id: r.id,
            nick: (r.nick ?? "RIDER").toUpperCase(),
            email: r.email,
            city: r.city ?? null,
            avatarUrl: r.avatarUrl ?? null,
            passExpiresAt: r.expiresAt?.toISOString() ?? null,
            tickets,
            capsules: capsulesOf(tickets, step),
            inHunt: tickets > 0,
          };
        })
        .sort((a, b) => Number(b.inHunt) - Number(a.inHunt) || b.capsules - a.capsules || a.nick.localeCompare(b.nick)),
    };
  });

  // История охот: список всех охот с призами, победителями и объёмом ставок.
  app.get("/list", { preHandler: requireAdmin }, async () => {
    const rows = await db.select().from(hunts).orderBy(desc(hunts.startsAt)).limit(50);
    const items = [];
    for (const h of rows) {
      const prizes = await getHuntPrizes(h.id);
      const entries = await getHuntEntries(h.id);
      const winnerIds = prizes.map((p) => p.winnerUserId).filter((v): v is string => !!v);
      const nicks = winnerIds.length
        ? await db.select({ id: users.id, nick: users.nick }).from(users).where(inArray(users.id, winnerIds))
        : [];
      const nickById = new Map(nicks.map((n) => [n.id, n.nick]));
      items.push({
        id: h.id,
        title: h.title,
        startsAt: h.startsAt.toISOString(),
        status: h.status,
        drawnAt: h.drawnAt?.toISOString() ?? null,
        ticketStep: h.ticketStep,
        participants: entries.length,
        tickets: entries.reduce((s, e) => s + e.tickets, 0),
        prizes: prizes.map((p) => ({
          id: p.id,
          place: p.place,
          title: p.title,
          winnerNick: p.winnerUserId ? ((nickById.get(p.winnerUserId) ?? null)?.toUpperCase() ?? null) : null,
        })),
      });
    }
    return { items };
  });

  // Кол-во ставок (для дашборда).

  app.get("/stats", { preHandler: requireAdmin }, async () => {
    const hunt = await getCurrentHunt(true);
    if (!hunt) return { participants: 0, tickets: 0 };
    const rows = await db.select().from(huntBets).where(eq(huntBets.huntId, hunt.id));
    return { participants: rows.length, tickets: rows.reduce((s, r) => s + r.tickets, 0) };
  });
}

