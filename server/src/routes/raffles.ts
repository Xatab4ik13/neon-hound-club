import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { and, count, desc, eq, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { raffles, raffleEntries, RAFFLE_STATUSES } from "../db/schema/raffles.js";
import { users } from "../db/schema/users.js";
import { requireAuth, requireAdmin, type SessionPayload } from "../lib/auth.js";
import { cancelRaffleWithRefund, enterRaffle, pickWinner } from "../lib/raffles.js";

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
