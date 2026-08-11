import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { and, asc, desc, eq, gt, inArray, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import {
  supportTickets,
  supportTicketMessages,
  SUPPORT_CATEGORIES,
  SUPPORT_STATUSES,
  type SupportStatus,
} from "../db/schema/support-tickets.js";
import { users } from "../db/schema/users.js";
import { requireAuth, requireAdmin, type SessionPayload } from "../lib/auth.js";
import { isOurS3Url } from "../lib/s3.js";
import { parsePagination } from "../lib/pagination.js";
import { pushToUsers } from "../lib/push.js";

const attachmentsSchema = z.array(z.string().url().max(500)).max(4).optional().default([]);

const createSchema = z.object({
  category: z.enum(SUPPORT_CATEGORIES),
  subject: z.string().trim().min(3).max(120),
  body: z.string().trim().min(5).max(4000),
  attachments: attachmentsSchema,
});

const messageSchema = z.object({
  body: z.string().trim().min(1).max(4000),
  attachments: attachmentsSchema,
});

function cleanAttachments(list: string[] | undefined) {
  return (list ?? []).filter((u) => isOurS3Url(u)).slice(0, 4);
}

async function loadMessages(ticketId: string) {
  return db
    .select({
      id: supportTicketMessages.id,
      authorRole: supportTicketMessages.authorRole,
      body: supportTicketMessages.body,
      attachments: supportTicketMessages.attachments,
      createdAt: supportTicketMessages.createdAt,
    })
    .from(supportTicketMessages)
    .where(eq(supportTicketMessages.ticketId, ticketId))
    .orderBy(asc(supportTicketMessages.createdAt))
    .limit(300);
}

// ---------------- USER ROUTES ----------------

export async function supportRoutes(app: FastifyInstance) {
  // GET /api/v1/support/tickets?status=active|closed
  app.get("/tickets", { preHandler: requireAuth }, async (req, reply) => {
    const session = req.user as SessionPayload;
    const qSchema = z.object({ status: z.enum(["active", "closed"]).default("active") });
    const parsed = qSchema.safeParse(req.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_query" });
    }
    const filter =
      parsed.data.status === "closed"
        ? eq(supportTickets.status, "closed")
        : inArray(supportTickets.status, ["open", "answered"]);

    const rows = await db
      .select({
        id: supportTickets.id,
        category: supportTickets.category,
        subject: supportTickets.subject,
        status: supportTickets.status,
        createdAt: supportTickets.createdAt,
        answeredAt: supportTickets.answeredAt,
        lastMessageAt: supportTickets.lastMessageAt,
      })
      .from(supportTickets)
      .where(and(eq(supportTickets.userId, session.sub), filter))
      .orderBy(desc(supportTickets.createdAt))
      .limit(100);

    return { items: rows };
  });

  // GET /api/v1/support/tickets/:id
  app.get("/tickets/:id", { preHandler: requireAuth }, async (req, reply) => {
    const session = req.user as SessionPayload;
    const params = z.object({ id: z.string().uuid() }).safeParse(req.params);
    if (!params.success) return reply.code(400).send({ error: "invalid_id" });

    const [row] = await db
      .select({
        id: supportTickets.id,
        category: supportTickets.category,
        subject: supportTickets.subject,
        body: supportTickets.body,
        attachments: supportTickets.attachments,
        status: supportTickets.status,
        adminReply: supportTickets.adminReply,
        answeredAt: supportTickets.answeredAt,
        closedAt: supportTickets.closedAt,
        lastMessageAt: supportTickets.lastMessageAt,
        createdAt: supportTickets.createdAt,
      })
      .from(supportTickets)
      .where(and(eq(supportTickets.id, params.data.id), eq(supportTickets.userId, session.sub)))
      .limit(1);

    if (!row) return reply.code(404).send({ error: "not_found" });
    const messages = await loadMessages(row.id);
    return { ...row, messages };
  });

  // POST /api/v1/support/tickets
  app.post("/tickets", { preHandler: requireAuth }, async (req, reply) => {
    const session = req.user as SessionPayload;
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply
        .code(400)
        .send({ error: "invalid_input", message: parsed.error.issues[0]?.message });
    }

    // Простой rate-limit: 1 тикет в минуту на юзера.
    const minuteAgo = new Date(Date.now() - 60_000);
    const [recent] = await db
      .select({ id: supportTickets.id })
      .from(supportTickets)
      .where(
        and(eq(supportTickets.userId, session.sub), gt(supportTickets.createdAt, minuteAgo)),
      )
      .limit(1);
    if (recent) {
      return reply
        .code(429)
        .send({ error: "rate_limited", message: "Подожди минуту перед следующим тикетом" });
    }

    const attachments = cleanAttachments(parsed.data.attachments);
    const now = new Date();

    const [created] = await db
      .insert(supportTickets)
      .values({
        userId: session.sub,
        category: parsed.data.category,
        subject: parsed.data.subject,
        body: parsed.data.body,
        attachments,
        status: "open",
        lastMessageAt: now,
      })
      .returning({ id: supportTickets.id });

    await db.insert(supportTicketMessages).values({
      ticketId: created!.id,
      authorRole: "user",
      authorId: session.sub,
      body: parsed.data.body,
      attachments,
      createdAt: now,
    });

    return reply.send({ id: created!.id });
  });

  // POST /api/v1/support/tickets/:id/messages — юзер дописывает в тикет
  app.post("/tickets/:id/messages", { preHandler: requireAuth }, async (req, reply) => {
    const session = req.user as SessionPayload;
    const params = z.object({ id: z.string().uuid() }).safeParse(req.params);
    if (!params.success) return reply.code(400).send({ error: "invalid_id" });

    const parsed = messageSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply
        .code(400)
        .send({ error: "invalid_input", message: parsed.error.issues[0]?.message });
    }

    const [ticket] = await db
      .select({ id: supportTickets.id, status: supportTickets.status })
      .from(supportTickets)
      .where(and(eq(supportTickets.id, params.data.id), eq(supportTickets.userId, session.sub)))
      .limit(1);

    if (!ticket) return reply.code(404).send({ error: "not_found" });
    if (ticket.status === "closed") {
      return reply
        .code(409)
        .send({ error: "ticket_closed", message: "Тикет закрыт — создай новый" });
    }

    const now = new Date();
    const [msg] = await db
      .insert(supportTicketMessages)
      .values({
        ticketId: ticket.id,
        authorRole: "user",
        authorId: session.sub,
        body: parsed.data.body,
        attachments: cleanAttachments(parsed.data.attachments),
        createdAt: now,
      })
      .returning({ id: supportTicketMessages.id });

    // Вернуть тикет в очередь админа.
    await db
      .update(supportTickets)
      .set({ status: "open", lastMessageAt: now, updatedAt: now })
      .where(eq(supportTickets.id, ticket.id));

    return reply.send({ id: msg!.id });
  });
}

// ---------------- ADMIN ROUTES ----------------

const replySchema = z.object({
  reply: z.string().trim().min(1).max(4000),
  close: z.boolean().optional(),
});

export async function adminSupportRoutes(app: FastifyInstance) {
  // GET /api/v1/admin/support/tickets/unread-count
  // Считаем только те, где последнее слово за юзером (status='open').
  app.get("/tickets/unread-count", { preHandler: requireAdmin }, async () => {
    const [row] = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(supportTickets)
      .where(eq(supportTickets.status, "open"));
    return { count: row?.c ?? 0 };
  });

  // GET /api/v1/admin/support/tickets?status=&category=&page=&pageSize=
  app.get("/tickets", { preHandler: requireAdmin }, async (req) => {
    const { page, pageSize, offset } = parsePagination(req.query);
    const qSchema = z.object({
      status: z.enum(SUPPORT_STATUSES).optional(),
      category: z.enum(SUPPORT_CATEGORIES).optional(),
    });
    const parsed = qSchema.safeParse(req.query);
    const status = parsed.success ? parsed.data.status : undefined;
    const category = parsed.success ? parsed.data.category : undefined;

    const conds = [];
    if (status) conds.push(eq(supportTickets.status, status));
    if (category) conds.push(eq(supportTickets.category, category));
    const where = conds.length ? and(...conds) : undefined;

    const [rows, totalRows] = await Promise.all([
      db
        .select({
          id: supportTickets.id,
          userId: supportTickets.userId,
          nick: users.nick,
          category: supportTickets.category,
          subject: supportTickets.subject,
          status: supportTickets.status,
          createdAt: supportTickets.createdAt,
          answeredAt: supportTickets.answeredAt,
          lastMessageAt: supportTickets.lastMessageAt,
          messagesCount: sql<number>`(
            select count(*)::int from support_ticket_messages m
            where m.ticket_id = ${supportTickets.id}
          )`,
        })
        .from(supportTickets)
        .leftJoin(users, eq(users.id, supportTickets.userId))
        .where(where as never)
        .orderBy(desc(sql`coalesce(${supportTickets.lastMessageAt}, ${supportTickets.createdAt})`))
        .limit(pageSize)
        .offset(offset),
      db
        .select({ c: sql<number>`count(*)::int` })
        .from(supportTickets)
        .where(where as never),
    ]);

    return { items: rows, total: totalRows[0]?.c ?? 0, page, pageSize };
  });

  // GET /api/v1/admin/support/tickets/:id
  app.get("/tickets/:id", { preHandler: requireAdmin }, async (req, reply) => {
    const params = z.object({ id: z.string().uuid() }).safeParse(req.params);
    if (!params.success) return reply.code(400).send({ error: "invalid_id" });

    const [row] = await db
      .select({
        id: supportTickets.id,
        userId: supportTickets.userId,
        nick: users.nick,
        email: users.email,
        category: supportTickets.category,
        subject: supportTickets.subject,
        body: supportTickets.body,
        attachments: supportTickets.attachments,
        status: supportTickets.status,
        adminReply: supportTickets.adminReply,
        answeredAt: supportTickets.answeredAt,
        closedAt: supportTickets.closedAt,
        lastMessageAt: supportTickets.lastMessageAt,
        createdAt: supportTickets.createdAt,
      })
      .from(supportTickets)
      .leftJoin(users, eq(users.id, supportTickets.userId))
      .where(eq(supportTickets.id, params.data.id))
      .limit(1);

    if (!row) return reply.code(404).send({ error: "not_found" });
    const messages = await loadMessages(row.id);
    return { ...row, messages };
  });

  // POST /api/v1/admin/support/tickets/:id/reply
  app.post("/tickets/:id/reply", { preHandler: requireAdmin }, async (req, reply) => {
    const admin = req.user as SessionPayload;
    const params = z.object({ id: z.string().uuid() }).safeParse(req.params);
    if (!params.success) return reply.code(400).send({ error: "invalid_id" });

    const parsed = replySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply
        .code(400)
        .send({ error: "invalid_input", message: parsed.error.issues[0]?.message });
    }

    const newStatus: SupportStatus = parsed.data.close ? "closed" : "answered";
    const now = new Date();

    const [updated] = await db
      .update(supportTickets)
      .set({
        adminReply: parsed.data.reply,
        answeredBy: admin.sub,
        answeredAt: now,
        closedAt: parsed.data.close ? now : null,
        status: newStatus,
        lastMessageAt: now,
        updatedAt: now,
      })
      .where(eq(supportTickets.id, params.data.id))
      .returning({ id: supportTickets.id, userId: supportTickets.userId });

    if (!updated) return reply.code(404).send({ error: "not_found" });

    await db.insert(supportTicketMessages).values({
      ticketId: updated.id,
      authorRole: "admin",
      authorId: admin.sub,
      body: parsed.data.reply,
      attachments: [],
      createdAt: now,
    });

    // Push юзеру.
    try {
      const preview = parsed.data.reply.slice(0, 80);
      await pushToUsers([updated.userId], {
        title: "Ответ на ваш тикет",
        body: preview + (parsed.data.reply.length > 80 ? "…" : ""),
        url: `/club/help/${updated.id}`,
        tag: `support-${updated.id}`,
      });
    } catch (e) {
      app.log.error({ err: e }, "support push failed");
    }

    return reply.send({ ok: true });
  });

  // POST /api/v1/admin/support/tickets/:id/close — закрыть без ответа
  app.post("/tickets/:id/close", { preHandler: requireAdmin }, async (req, reply) => {
    const params = z.object({ id: z.string().uuid() }).safeParse(req.params);
    if (!params.success) return reply.code(400).send({ error: "invalid_id" });

    const now = new Date();
    const [updated] = await db
      .update(supportTickets)
      .set({ status: "closed", closedAt: now, updatedAt: now })
      .where(eq(supportTickets.id, params.data.id))
      .returning({ id: supportTickets.id });

    if (!updated) return reply.code(404).send({ error: "not_found" });
    return reply.send({ ok: true });
  });

  // POST /api/v1/admin/support/tickets/:id/reopen — вернуть в работу
  app.post("/tickets/:id/reopen", { preHandler: requireAdmin }, async (req, reply) => {
    const params = z.object({ id: z.string().uuid() }).safeParse(req.params);
    if (!params.success) return reply.code(400).send({ error: "invalid_id" });

    const now = new Date();
    const [updated] = await db
      .update(supportTickets)
      .set({ status: "answered", closedAt: null, updatedAt: now })
      .where(eq(supportTickets.id, params.data.id))
      .returning({ id: supportTickets.id });

    if (!updated) return reply.code(404).send({ error: "not_found" });
    return reply.send({ ok: true });
  });
}
