import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { ticketsLedger, TICKET_SOURCES } from "../db/schema/tickets.js";
import { users } from "../db/schema/users.js";
import { requireAuth, requireAdmin, type SessionPayload } from "../lib/auth.js";
import { getTicketBalance, ticketCredit } from "../lib/tickets.js";
import { parsePagination } from "../lib/pagination.js";

const historyQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(30),
  cursor: z.string().datetime().optional(), // ISO timestamp последней увиденной строки
});

const creditSchema = z.object({
  // принимаем либо userId, либо nick — что админу удобнее в той ситуации
  userId: z.string().uuid().optional(),
  nick: z.string().trim().min(3).max(32).optional(),
  amount: z.number().int().refine((n) => n !== 0, "amount must be non-zero"),
  reason: z.string().trim().min(1).max(500),
  source: z.enum(TICKET_SOURCES).default("admin"),
  refType: z.string().trim().min(1).max(32).optional(),
  refId: z.string().uuid().optional(),
});

export async function ticketsRoutes(app: FastifyInstance) {
  // GET /api/v1/tickets/balance — текущий баланс залогиненного юзера
  app.get("/balance", { preHandler: requireAuth }, async (req) => {
    const session = req.user as SessionPayload;
    const balance = await getTicketBalance(session.sub);
    return { balance };
  });

  // GET /api/v1/tickets/history?limit=30&cursor=ISO — постраничная история (cursor по created_at desc)
  app.get("/history", { preHandler: requireAuth }, async (req, reply) => {
    const session = req.user as SessionPayload;
    const parsed = historyQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_query", message: parsed.error.issues[0]?.message });
    }
    const { limit, cursor } = parsed.data;

    const where = cursor
      ? sql`${ticketsLedger.userId} = ${session.sub} and ${ticketsLedger.createdAt} < ${new Date(cursor)}`
      : sql`${ticketsLedger.userId} = ${session.sub}`;

    const rows = await db
      .select({
        id: ticketsLedger.id,
        amount: ticketsLedger.amount,
        source: ticketsLedger.source,
        reason: ticketsLedger.reason,
        refType: ticketsLedger.refType,
        refId: ticketsLedger.refId,
        createdAt: ticketsLedger.createdAt,
      })
      .from(ticketsLedger)
      .where(where)
      .orderBy(desc(ticketsLedger.createdAt))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? items[items.length - 1]!.createdAt.toISOString() : null;

    return { items, nextCursor };
  });
}

export async function adminTicketsRoutes(app: FastifyInstance) {
  // GET /api/v1/admin/tickets/journal — общий журнал последних операций
  app.get("/journal", { preHandler: requireAdmin }, async (req) => {
    const { page, pageSize, offset } = parsePagination(req.query);
    const [rows, totalRows] = await Promise.all([
      db
        .select({
          id: ticketsLedger.id,
          userId: ticketsLedger.userId,
          nick: users.nick,
          amount: ticketsLedger.amount,
          source: ticketsLedger.source,
          reason: ticketsLedger.reason,
          refType: ticketsLedger.refType,
          refId: ticketsLedger.refId,
          createdAt: ticketsLedger.createdAt,
        })
        .from(ticketsLedger)
        .leftJoin(users, eq(users.id, ticketsLedger.userId))
        .orderBy(desc(ticketsLedger.createdAt))
        .limit(pageSize)
        .offset(offset),
      db.select({ c: sql<number>`count(*)::int` }).from(ticketsLedger),
    ]);
    return { items: rows, total: totalRows[0]?.c ?? 0, page, pageSize };
  });

  app.post("/credit", { preHandler: requireAdmin }, async (req, reply) => {
    const parsed = creditSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_input", message: parsed.error.issues[0]?.message });
    }
    const data = parsed.data;
    if (!data.userId && !data.nick) {
      return reply.code(400).send({ error: "invalid_input", message: "Укажи userId или nick" });
    }

    let targetUserId = data.userId;
    let targetNick: string | undefined;

    if (!targetUserId && data.nick) {
      const [u] = await db
        .select({ id: users.id, nick: users.nick })
        .from(users)
        .where(sql`lower(${users.nick}) = lower(${data.nick})`)
        .limit(1);
      if (!u) return reply.code(404).send({ error: "user_not_found", message: "Юзер не найден" });
      targetUserId = u.id;
      targetNick = u.nick;
    } else if (targetUserId) {
      const [u] = await db.select({ nick: users.nick }).from(users).where(eq(users.id, targetUserId)).limit(1);
      if (!u) return reply.code(404).send({ error: "user_not_found", message: "Юзер не найден" });
      targetNick = u.nick;
    }

    const admin = req.user as SessionPayload;
    const entry = await ticketCredit({
      userId: targetUserId!,
      amount: data.amount,
      source: data.source,
      reason: data.reason,
      refType: data.refType,
      refId: data.refId,
      createdBy: admin.sub,
    });

    const balance = await getTicketBalance(targetUserId!);
    return reply.send({ ok: true, entry, balance, user: { id: targetUserId, nick: targetNick } });
  });
}
