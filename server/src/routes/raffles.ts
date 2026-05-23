import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { and, count, desc, eq, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import {
  raffles,
  raffleEntries,
  rafflePrizes,
  rafflePrizeWinners,
  RAFFLE_STATUSES,
} from "../db/schema/raffles.js";
import { users } from "../db/schema/users.js";
import { requireAuth, requireAdmin, requireBloggerOrAdmin, type SessionPayload } from "../lib/auth.js";
import {
  cancelRaffleWithRefund,
  confirmRafflePrizeWinner,
  drawRafflePrizeWinner,
  enterRaffle,
  getRaffleBoard,
  listRafflePrizes,
  pickWinner,
} from "../lib/raffles.js";

// ---------- USER / PUBLIC ----------

export async function rafflesRoutes(app: FastifyInstance) {
  // GET /api/v1/raffles — активные и завершённые (черновики не светим)
  app.get("/", async () => {
    const rows = await db
      .select()
      .from(raffles)
      .where(sql`${raffles.status} in ('active','finished')`)
      .orderBy(desc(raffles.endsAt));
    return { items: rows };
  });

  // GET /api/v1/raffles/home — активные с флагом show_on_home, с превью призов.
  // Используется для hero-блока на главной.
  app.get("/home", async () => {
    const rows = await db
      .select()
      .from(raffles)
      .where(and(eq(raffles.showOnHome, true), eq(raffles.status, "active")))
      .orderBy(desc(raffles.endsAt));

    const items = await Promise.all(
      rows.map(async (r) => {
        const prizes = await db
          .select({ name: rafflePrizes.name, qty: rafflePrizes.qty })
          .from(rafflePrizes)
          .where(eq(rafflePrizes.raffleId, r.id))
          .orderBy(rafflePrizes.position);
        const [{ totalEntries }] = await db
          .select({ totalEntries: count() })
          .from(raffleEntries)
          .where(eq(raffleEntries.raffleId, r.id));
        return { ...r, prizes, totalEntries };
      }),
    );
    return { items };
  });

  // GET /api/v1/raffles/:id — карточка + (если auth) кол-во моих заявок
  app.get<{ Params: { id: string } }>("/:id", async (req, reply) => {
    const [r] = await db
      .select()
      .from(raffles)
      .where(and(eq(raffles.id, req.params.id), sql`${raffles.status} in ('active','finished')`))
      .limit(1);
    if (!r) return reply.code(404).send({ error: "not_found" });

    const [{ totalEntries }] = await db
      .select({ totalEntries: count() })
      .from(raffleEntries)
      .where(eq(raffleEntries.raffleId, r.id));

    let myEntries = 0;
    try {
      await req.jwtVerify();
      const session = req.user as SessionPayload;
      const [{ c }] = await db
        .select({ c: count() })
        .from(raffleEntries)
        .where(and(eq(raffleEntries.raffleId, r.id), eq(raffleEntries.userId, session.sub)));
      myEntries = c as number;
    } catch {
      // не залогинен — пофиг
    }

    let winnerNick: string | null = null;
    if (r.winnerUserId) {
      const [u] = await db.select({ nick: users.nick }).from(users).where(eq(users.id, r.winnerUserId)).limit(1);
      winnerNick = u?.nick ?? null;
    }

    return { ...r, totalEntries, myEntries, winnerNick };
  });

  // POST /api/v1/raffles/:id/enter — участвовать
  app.post<{ Params: { id: string } }>("/:id/enter", { preHandler: requireAuth }, async (req, reply) => {
    const session = req.user as SessionPayload;
    const r = await enterRaffle({ raffleId: req.params.id, userId: session.sub });
    if (!r.ok) {
      const status =
        r.code === "not_found"
          ? 404
          : r.code === "insufficient_tickets" || r.code === "limit_reached"
            ? 409
            : 400;
      return reply.code(status).send({ error: r.code });
    }
    return reply.code(201).send(r);
  });

  // GET /api/v1/raffles/:id/my-entries — мои заявки в розыгрыше
  app.get<{ Params: { id: string } }>("/:id/my-entries", { preHandler: requireAuth }, async (req) => {
    const session = req.user as SessionPayload;
    const rows = await db
      .select()
      .from(raffleEntries)
      .where(and(eq(raffleEntries.raffleId, req.params.id), eq(raffleEntries.userId, session.sub)))
      .orderBy(desc(raffleEntries.createdAt));
    return { items: rows };
  });

  // GET /api/v1/raffles/my — все розыгрыши, в которых юзер участвовал (для «Я участвовал»)
  app.get("/my", { preHandler: requireAuth }, async (req) => {
    const session = req.user as SessionPayload;
    const rows = await db
      .select({
        raffle: raffles,
        entries: count(raffleEntries.id),
      })
      .from(raffleEntries)
      .innerJoin(raffles, eq(raffles.id, raffleEntries.raffleId))
      .where(eq(raffleEntries.userId, session.sub))
      .groupBy(raffles.id)
      .orderBy(desc(raffles.endsAt));

    const items = await Promise.all(
      rows.map(async (row) => {
        // Мои выигранные призы в этом раффле (новая модель — много призов).
        const myWins = await db
          .select({ prizeName: rafflePrizes.name })
          .from(rafflePrizeWinners)
          .innerJoin(rafflePrizes, eq(rafflePrizes.id, rafflePrizeWinners.prizeId))
          .where(
            and(
              eq(rafflePrizeWinners.raffleId, row.raffle.id),
              eq(rafflePrizeWinners.userId, session.sub),
            ),
          );
        const wonPrizes = myWins.map((w) => w.prizeName);
        const won = wonPrizes.length > 0;

        // Победители раффла (для строки «забрал @nick» если я не выиграл).
        let winnerNick: string | null = null;
        if (!won) {
          const [w] = await db
            .select({ nick: users.nick })
            .from(rafflePrizeWinners)
            .innerJoin(users, eq(users.id, rafflePrizeWinners.userId))
            .where(eq(rafflePrizeWinners.raffleId, row.raffle.id))
            .limit(1);
          winnerNick = w?.nick ?? null;
        }
        return {
          ...row.raffle,
          myEntries: row.entries,
          won,
          wonPrizes,
          winnerNick,
        };
      }),
    );
    return { items };
  });
}

// ---------- ADMIN ----------

const createRaffleSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(10_000).default(""),
  imageUrl: z.string().url().nullable().optional(),
  prize: z.string().trim().min(1).max(200),
  ticketCost: z.number().int().min(1).max(100_000),
  maxEntriesPerUser: z.number().int().min(1).max(10_000).nullable().default(null),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  status: z.enum(RAFFLE_STATUSES).default("draft"),
});

const patchRaffleSchema = createRaffleSchema.partial();

export async function adminRafflesRoutes(app: FastifyInstance) {
  app.get("/", { preHandler: requireAdmin }, async () => {
    const rows = await db.select().from(raffles).orderBy(desc(raffles.createdAt));
    return { items: rows };
  });

  app.post("/", { preHandler: requireAdmin }, async (req, reply) => {
    const parsed = createRaffleSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_input", message: parsed.error.issues[0]?.message });
    }
    const d = parsed.data;
    if (new Date(d.endsAt) <= new Date(d.startsAt)) {
      return reply.code(400).send({ error: "invalid_input", message: "endsAt должен быть позже startsAt" });
    }
    const [row] = await db
      .insert(raffles)
      .values({
        title: d.title,
        description: d.description,
        imageUrl: d.imageUrl ?? null,
        prize: d.prize,
        ticketCost: d.ticketCost,
        maxEntriesPerUser: d.maxEntriesPerUser ?? null,
        startsAt: new Date(d.startsAt),
        endsAt: new Date(d.endsAt),
        status: d.status,
      })
      .returning();
    return reply.code(201).send(row);
  });

  app.patch<{ Params: { id: string } }>("/:id", { preHandler: requireAdmin }, async (req, reply) => {
    const parsed = patchRaffleSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_input", message: parsed.error.issues[0]?.message });
    }
    const d = parsed.data;
    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (d.title !== undefined) patch.title = d.title;
    if (d.description !== undefined) patch.description = d.description;
    if (d.imageUrl !== undefined) patch.imageUrl = d.imageUrl;
    if (d.prize !== undefined) patch.prize = d.prize;
    if (d.ticketCost !== undefined) patch.ticketCost = d.ticketCost;
    if (d.maxEntriesPerUser !== undefined) patch.maxEntriesPerUser = d.maxEntriesPerUser;
    if (d.startsAt !== undefined) patch.startsAt = new Date(d.startsAt);
    if (d.endsAt !== undefined) patch.endsAt = new Date(d.endsAt);
    if (d.status !== undefined) patch.status = d.status;

    const [row] = await db.update(raffles).set(patch).where(eq(raffles.id, req.params.id)).returning();
    if (!row) return reply.code(404).send({ error: "not_found" });
    return row;
  });

  // POST /api/v1/admin/raffles/:id/pick-winner — выбрать победителя
  app.post<{ Params: { id: string } }>("/:id/pick-winner", { preHandler: requireAdmin }, async (req, reply) => {
    const r = await pickWinner(req.params.id);
    if (!r.ok) return reply.code(400).send({ error: r.reason });
    return r;
  });

  // POST /api/v1/admin/raffles/:id/cancel — отменить с возвратом билетов всем
  app.post<{ Params: { id: string } }>("/:id/cancel", { preHandler: requireAdmin }, async (req, reply) => {
    const r = await cancelRaffleWithRefund(req.params.id);
    if (!r.ok) return reply.code(400).send({ error: r.reason });
    return r;
  });
}

// ---------- ADMIN: PRIZES CRUD ----------

const prizeSchema = z.object({
  name: z.string().trim().min(1).max(200),
  qty: z.number().int().min(1).max(10_000).default(1),
  position: z.number().int().min(0).max(10_000).default(0),
});

export async function adminRafflePrizesRoutes(app: FastifyInstance) {
  // GET /api/v1/admin/raffles/:id/prizes
  app.get<{ Params: { id: string } }>("/:id/prizes", { preHandler: requireAdmin }, async (req) => {
    return { items: await listRafflePrizes(req.params.id) };
  });

  // POST /api/v1/admin/raffles/:id/prizes
  app.post<{ Params: { id: string } }>("/:id/prizes", { preHandler: requireAdmin }, async (req, reply) => {
    const parsed = prizeSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_input", message: parsed.error.issues[0]?.message });
    }
    const [r] = await db.select({ id: raffles.id }).from(raffles).where(eq(raffles.id, req.params.id)).limit(1);
    if (!r) return reply.code(404).send({ error: "not_found" });
    const [row] = await db
      .insert(rafflePrizes)
      .values({ ...parsed.data, raffleId: req.params.id })
      .returning();
    return reply.code(201).send(row);
  });

  // PATCH /api/v1/admin/raffles/prizes/:prizeId
  app.patch<{ Params: { prizeId: string } }>("/prizes/:prizeId", { preHandler: requireAdmin }, async (req, reply) => {
    const parsed = prizeSchema.partial().safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_input" });
    const [row] = await db
      .update(rafflePrizes)
      .set(parsed.data)
      .where(eq(rafflePrizes.id, req.params.prizeId))
      .returning();
    if (!row) return reply.code(404).send({ error: "not_found" });
    return row;
  });

  // DELETE /api/v1/admin/raffles/prizes/:prizeId
  app.delete<{ Params: { prizeId: string } }>("/prizes/:prizeId", { preHandler: requireAdmin }, async (req, reply) => {
    // нельзя удалить приз, по которому уже есть зафиксированные победители
    const [{ c }] = await db
      .select({ c: count() })
      .from(rafflePrizeWinners)
      .where(eq(rafflePrizeWinners.prizeId, req.params.prizeId));
    if (c > 0) return reply.code(409).send({ error: "has_winners" });
    await db.delete(rafflePrizes).where(eq(rafflePrizes.id, req.params.prizeId));
    return reply.code(204).send();
  });
}

// ---------- BLOGGER: ROULETTE ----------

export async function bloggerRafflesRoutes(app: FastifyInstance) {
  // GET /api/v1/blogger/raffles — список (черновики тоже видны блогеру)
  app.get("/", { preHandler: requireBloggerOrAdmin }, async () => {
    const rows = await db.select().from(raffles).orderBy(desc(raffles.createdAt));
    // для списка добавим totalEntries и totalSlots/totalWinners
    const items = await Promise.all(
      rows.map(async (r) => {
        const [{ totalEntries }] = await db
          .select({ totalEntries: count() })
          .from(raffleEntries)
          .where(eq(raffleEntries.raffleId, r.id));
        const slots = await db
          .select({ qty: rafflePrizes.qty })
          .from(rafflePrizes)
          .where(eq(rafflePrizes.raffleId, r.id));
        const totalSlots = slots.reduce((s, p) => s + p.qty, 0);
        const [{ totalWinners }] = await db
          .select({ totalWinners: count() })
          .from(rafflePrizeWinners)
          .where(eq(rafflePrizeWinners.raffleId, r.id));
        return { ...r, totalEntries, totalSlots, totalWinners };
      }),
    );
    return { items };
  });

  // GET /api/v1/blogger/raffles/:id/board — всё для рулетки
  app.get<{ Params: { id: string } }>("/:id/board", { preHandler: requireBloggerOrAdmin }, async (req, reply) => {
    const board = await getRaffleBoard(req.params.id);
    if (!board) return reply.code(404).send({ error: "not_found" });
    return board;
  });

  // POST /api/v1/blogger/raffles/:id/prizes/:prizeId/draw — превью кандидата (без сохранения)
  app.post<{ Params: { id: string; prizeId: string } }>(
    "/:id/prizes/:prizeId/draw",
    { preHandler: requireBloggerOrAdmin },
    async (req, reply) => {
      const r = await drawRafflePrizeWinner({ raffleId: req.params.id, prizeId: req.params.prizeId });
      if (!r.ok) {
        const code = r.reason === "prize_not_found" ? 404 : r.reason === "no_entries" ? 409 : 400;
        return reply.code(code).send({ error: r.reason });
      }
      return r;
    },
  );

  // POST /api/v1/blogger/raffles/:id/prizes/:prizeId/confirm — фиксация
  const confirmSchema = z.object({ entryId: z.string().uuid() });
  app.post<{ Params: { id: string; prizeId: string } }>(
    "/:id/prizes/:prizeId/confirm",
    { preHandler: requireBloggerOrAdmin },
    async (req, reply) => {
      const parsed = confirmSchema.safeParse(req.body);
      if (!parsed.success) return reply.code(400).send({ error: "invalid_input" });
      const r = await confirmRafflePrizeWinner({
        raffleId: req.params.id,
        prizeId: req.params.prizeId,
        entryId: parsed.data.entryId,
      });
      if (!r.ok) {
        const code =
          r.reason === "prize_not_found" || r.reason === "entry_not_found"
            ? 404
            : r.reason === "prize_exhausted" || r.reason === "entry_already_won"
              ? 409
              : 400;
        return reply.code(code).send({ error: r.reason });
      }
      return r;
    },
  );
}
