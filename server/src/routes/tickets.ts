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
      ? sql`${ticketsLedger.userId} = ${session.sub} and ${ticketsLedger.createdAt} < ${new Date(cursor).toISOString()}::timestamptz`
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
  // GET /api/v1/admin/tickets/stats — KPI + разбивка по источникам
  app.get("/stats", { preHandler: requireAdmin }, async () => {
    const d30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [totals] = await db
      .select({
        issued: sql<number>`coalesce(sum(case when amount > 0 then amount else 0 end), 0)::int`,
        spent: sql<number>`coalesce(sum(case when amount < 0 then -amount else 0 end), 0)::int`,
        balance: sql<number>`coalesce(sum(amount), 0)::int`,
        spentOnRaffles: sql<number>`coalesce(sum(case when source = 'raffle_entry' then -amount else 0 end), 0)::int`,
        ops: sql<number>`count(*)::int`,
        users: sql<number>`count(distinct user_id)::int`,
      })
      .from(ticketsLedger);

    const [last30] = await db
      .select({
        issued30: sql<number>`coalesce(sum(case when amount > 0 then amount else 0 end), 0)::int`,
        spent30: sql<number>`coalesce(sum(case when amount < 0 then -amount else 0 end), 0)::int`,
      })
      .from(ticketsLedger)
      .where(sql`${ticketsLedger.createdAt} >= ${d30}::timestamptz`);

    // FIFO-разнос: для каждого юзера в хронологическом порядке
    // кладём + в очередь партий с их source, а − съедает партии с головы.
    // На выходе для каждого source: сколько выпущено, сколько из этого реально сожжено,
    // сколько ещё лежит на руках.
    const allRows = await db
      .select({
        userId: ticketsLedger.userId,
        source: ticketsLedger.source,
        amount: ticketsLedger.amount,
      })
      .from(ticketsLedger)
      .orderBy(ticketsLedger.userId, ticketsLedger.createdAt, ticketsLedger.id);

    type SourceAgg = { issued: number; burned: number; held: number };
    const agg = new Map<string, SourceAgg>();
    const bump = (src: string, key: keyof SourceAgg, n: number) => {
      const cur = agg.get(src) ?? { issued: 0, burned: 0, held: 0 };
      cur[key] += n;
      agg.set(src, cur);
    };

    let curUser: string | null = null;
    let queue: { source: string; left: number }[] = [];
    for (const r of allRows) {
      if (r.userId !== curUser) {
        // финализируем хвост предыдущего юзера: остатки в партиях = «на руках»
        for (const p of queue) if (p.left > 0) bump(p.source, "held", p.left);
        curUser = r.userId;
        queue = [];
      }
      if (r.amount > 0) {
        bump(r.source, "issued", r.amount);
        queue.push({ source: r.source, left: r.amount });
      } else if (r.amount < 0) {
        let need = -r.amount;
        while (need > 0 && queue.length > 0) {
          const head = queue[0]!;
          const take = Math.min(head.left, need);
          head.left -= take;
          need -= take;
          bump(head.source, "burned", take);
          if (head.left === 0) queue.shift();
        }
        // если need > 0 — баланс уехал в минус (расхождение/правка вручную), игнорим
      }
    }
    for (const p of queue) if (p.left > 0) bump(p.source, "held", p.left);

    const bySource = Array.from(agg.entries()).map(([source, v]) => ({
      source,
      issued: v.issued,
      burned: v.burned,
      held: v.held,
    }));

    // Держатели = юзеры с положительным балансом. Отдельно — сколько людей вообще
    // когда-либо касались билетов (это НЕ держатели, раньше путалось в UI).
    const [holders] = await db.execute<{
      holders: number;
      ever_touched: number;
      avg_balance: number;
      max_balance: number;
    }>(sql`
      with b as (
        select user_id, sum(amount)::int as bal
        from tickets_ledger
        group by user_id
      )
      select
        count(*) filter (where bal > 0)::int as holders,
        count(*)::int as ever_touched,
        coalesce(round(avg(bal) filter (where bal > 0)), 0)::int as avg_balance,
        coalesce(max(bal), 0)::int as max_balance
      from b
    `) as unknown as { holders: number; ever_touched: number; avg_balance: number; max_balance: number }[];

    // Билеты внутри каждого розыгрыша: заявки, уникальные участники, сожжённые билеты.
    const raffleRows = (await db.execute(sql`
      select
        r.id,
        r.title,
        r.status,
        r.prize,
        r.ticket_cost as "ticketCost",
        r.starts_at as "startsAt",
        r.ends_at as "endsAt",
        coalesce(e.entries, 0)::int as entries,
        coalesce(e.participants, 0)::int as participants,
        coalesce(e.tickets, 0)::int as tickets
      from raffles r
      left join (
        select raffle_id,
               count(*)::int as entries,
               count(distinct user_id)::int as participants,
               sum(ticket_cost_snapshot)::int as tickets
        from raffle_entries
        group by raffle_id
      ) e on e.raffle_id = r.id
      where r.status <> 'draft'
      order by case r.status when 'active' then 0 when 'finished' then 1 else 2 end,
               r.ends_at desc
      limit 50
    `)) as unknown as {
      id: string;
      title: string;
      status: string;
      prize: string | null;
      ticketCost: number;
      startsAt: string;
      endsAt: string;
      entries: number;
      participants: number;
      tickets: number;
    }[];

    const raffleList = Array.from(raffleRows);
    const inActiveRaffles = raffleList
      .filter((r) => r.status === "active")
      .reduce((s, r) => s + r.tickets, 0);
    const activeParticipants = raffleList
      .filter((r) => r.status === "active")
      .reduce((s, r) => Math.max(s, r.participants), 0);

    const h = holders ?? { holders: 0, ever_touched: 0, avg_balance: 0, max_balance: 0 };

    return {
      totals: totals ?? { issued: 0, spent: 0, balance: 0, spentOnRaffles: 0, ops: 0, users: 0 },
      last30: last30 ?? { issued30: 0, spent30: 0 },
      bySource,
      holders: {
        holders: h.holders,
        everTouched: h.ever_touched,
        avgBalance: h.avg_balance,
        maxBalance: h.max_balance,
      },
      raffles: {
        items: raffleList,
        inActiveRaffles,
        activeParticipants,
      },
    };
  });


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
