// Школа HELLHOUND: инструкторы, чаты, счета, недельные выплаты.
//
// Правила:
//   - Инструктор видит и получает `instructor_amount_rub` (свою цену).
//   - Ученик видит и платит `student_amount_rub = instructor_amount * 1.2`.
//   - Скидка Hell Pass на школу НЕ применяется.
//   - Роль "instructor" в users.role: доступ ко "своим" чатам и заказам.

import type { FastifyInstance } from "fastify";
import { and, asc, desc, eq, gte, lt, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client.js";
import {
  schoolInstructors,
  schoolChats,
  schoolMessages,
  schoolOrders,
  schoolPayouts,
  calcSchoolAmounts,
  SCHOOL_COMMISSION_RATE,
} from "../db/schema/school.js";
import { users } from "../db/schema/users.js";
import { payments } from "../db/schema/payments.js";
import { requireAuth, requireAdmin, type SessionPayload } from "../lib/auth.js";
import { pushToUsers } from "../lib/push.js";
import { createPaymentForSchoolOrder, PaymentInitError } from "../lib/payments.js";
import { isRaifConfigured } from "../lib/raif.js";

const MAX_TEXT = 4000;

// --------------------- helpers ---------------------

async function getInstructorByUser(userId: string) {
  const [row] = await db.select().from(schoolInstructors).where(eq(schoolInstructors.userId, userId)).limit(1);
  return row ?? null;
}

async function requireInstructorProfile(userId: string) {
  const row = await getInstructorByUser(userId);
  if (!row || !row.active) return null;
  return row;
}

async function bumpChatOnMessage(
  chatId: string,
  senderRole: "student" | "instructor" | "system",
  preview: string,
) {
  const patch: Record<string, unknown> = {
    lastMessageAt: new Date(),
    lastMessagePreview: preview.slice(0, 200),
    lastMessageRole: senderRole,
    updatedAt: new Date(),
  };
  if (senderRole === "student") {
    patch.instructorUnread = sql`${schoolChats.instructorUnread} + 1`;
  } else if (senderRole === "instructor") {
    patch.studentUnread = sql`${schoolChats.studentUnread} + 1`;
  }
  await db.update(schoolChats).set(patch).where(eq(schoolChats.id, chatId));
}

// =================================================================
// STUDENT / PUBLIC ROUTES
// =================================================================
export async function schoolRoutes(app: FastifyInstance) {
  // Публичный список инструкторов (клуб + лендинг).
  app.get("/instructors", async () => {
    const rows = await db
      .select({
        id: schoolInstructors.id,
        slug: schoolInstructors.slug,
        displayName: schoolInstructors.displayName,
        bio: schoolInstructors.bio,
        city: schoolInstructors.city,
        moto: schoolInstructors.moto,
        avatarUrl: schoolInstructors.avatarUrl,
        tone: schoolInstructors.tone,
        experience: schoolInstructors.experience,
        tagline: schoolInstructors.tagline,
        profile: schoolInstructors.profile,
        // Публично видна цена ученика — с наценкой.
        hourlyPriceRub: sql<number>`ceil(${schoolInstructors.hourlyRateRub} * (1 + ${SCHOOL_COMMISSION_RATE}))`,
      })
      .from(schoolInstructors)
      .where(eq(schoolInstructors.active, true));
    return { items: rows };
  });

  app.get("/instructors/:slug", async (req, reply) => {
    const slug = (req.params as { slug: string }).slug;
    const [row] = await db.select().from(schoolInstructors).where(eq(schoolInstructors.slug, slug)).limit(1);
    if (!row || !row.active) return reply.code(404).send({ error: "not_found" });
    return {
      id: row.id,
      slug: row.slug,
      displayName: row.displayName,
      bio: row.bio,
      city: row.city,
      moto: row.moto,
      avatarUrl: row.avatarUrl,
      tone: row.tone,
      experience: row.experience,
      tagline: row.tagline,
      profile: row.profile ?? {},
      hourlyPriceRub: Math.ceil(row.hourlyRateRub * (1 + SCHOOL_COMMISSION_RATE)),
    };
  });

  // Ученик: открыть/получить чат с инструктором.
  app.post("/chats", { preHandler: requireAuth }, async (req, reply) => {
    const s = req.user as SessionPayload;
    const body = z.object({ instructorSlug: z.string().min(1) }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: "invalid_input" });

    const [instr] = await db.select().from(schoolInstructors).where(eq(schoolInstructors.slug, body.data.instructorSlug)).limit(1);
    if (!instr || !instr.active) return reply.code(404).send({ error: "instructor_not_found" });
    if (instr.userId === s.sub) return reply.code(400).send({ error: "cant_chat_with_self" });

    const [existing] = await db
      .select()
      .from(schoolChats)
      .where(and(eq(schoolChats.instructorId, instr.id), eq(schoolChats.studentId, s.sub)))
      .limit(1);
    if (existing) return { id: existing.id };

    const [created] = await db
      .insert(schoolChats)
      .values({ instructorId: instr.id, studentId: s.sub })
      .returning();
    return { id: created!.id };
  });

  // Список чатов текущего юзера (как ученика).
  app.get("/chats", { preHandler: requireAuth }, async (req) => {
    const s = req.user as SessionPayload;
    const rows = await db
      .select({
        id: schoolChats.id,
        instructorId: schoolChats.instructorId,
        instructorSlug: schoolInstructors.slug,
        instructorName: schoolInstructors.displayName,
        instructorAvatar: schoolInstructors.avatarUrl,
        lastMessageAt: schoolChats.lastMessageAt,
        lastMessagePreview: schoolChats.lastMessagePreview,
        lastMessageRole: schoolChats.lastMessageRole,
        unread: schoolChats.studentUnread,
      })
      .from(schoolChats)
      .innerJoin(schoolInstructors, eq(schoolInstructors.id, schoolChats.instructorId))
      .where(eq(schoolChats.studentId, s.sub))
      .orderBy(desc(schoolChats.lastMessageAt));
    return { items: rows };
  });

  // История сообщений одного чата (ученик или инструктор).
  app.get("/chats/:id/messages", { preHandler: requireAuth }, async (req, reply) => {
    const s = req.user as SessionPayload;
    const chatId = (req.params as { id: string }).id;
    const chat = await loadChatForUser(chatId, s.sub);
    if (!chat) return reply.code(404).send({ error: "not_found" });

    const msgs = await db
      .select()
      .from(schoolMessages)
      .where(eq(schoolMessages.chatId, chatId))
      .orderBy(asc(schoolMessages.createdAt))
      .limit(500);

    // Заказы этого чата (счета).
    const orders = await db
      .select()
      .from(schoolOrders)
      .where(eq(schoolOrders.chatId, chatId))
      .orderBy(desc(schoolOrders.createdAt));

    // Обнуляем непрочитанные для читающей стороны.
    if (chat.role === "student" && chat.chat.studentUnread > 0) {
      await db.update(schoolChats).set({ studentUnread: 0 }).where(eq(schoolChats.id, chatId));
    } else if (chat.role === "instructor" && chat.chat.instructorUnread > 0) {
      await db.update(schoolChats).set({ instructorUnread: 0 }).where(eq(schoolChats.id, chatId));
    }

    // Для инструктора HIDE наценку — возвращаем instructor_amount.
    const orderView = orders.map((o) => ({
      id: o.id,
      title: o.title,
      description: o.description,
      status: o.status,
      // Ученик видит student_amount; инструктор видит свою сумму.
      amountRub: chat.role === "instructor" ? o.instructorAmountRub : o.studentAmountRub,
      scheduledAt: o.scheduledAt,
      paidAt: o.paidAt,
      createdAt: o.createdAt,
      paymentId: o.paymentId,
    }));

    return { chat: publicChatView(chat), messages: msgs, orders: orderView, viewerRole: chat.role };
  });

  // Отправить сообщение (ученик или инструктор).
  app.post("/chats/:id/messages", { preHandler: requireAuth }, async (req, reply) => {
    const s = req.user as SessionPayload;
    const chatId = (req.params as { id: string }).id;
    const body = z
      .object({
        text: z.string().trim().max(MAX_TEXT).optional(),
        imageUrl: z.string().trim().max(1000).optional(),
      })
      .safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: "invalid_input" });
    if (!body.data.text && !body.data.imageUrl) return reply.code(400).send({ error: "empty_message" });

    const chat = await loadChatForUser(chatId, s.sub);
    if (!chat) return reply.code(404).send({ error: "not_found" });

    const [msg] = await db
      .insert(schoolMessages)
      .values({
        chatId,
        senderId: s.sub,
        senderRole: chat.role,
        text: body.data.text ?? null,
        imageUrl: body.data.imageUrl ?? null,
      })
      .returning();

    const preview = body.data.text ?? (body.data.imageUrl ? "📷 Фото" : "");
    await bumpChatOnMessage(chatId, chat.role, preview);

    // Пуш второй стороне.
    const recipientUserId = chat.role === "student" ? chat.instructorUserId : chat.chat.studentId;
    if (recipientUserId) {
      const title = chat.role === "student" ? `Ученик @${s.nick}` : `Инструктор ${chat.instructorName}`;
      void pushToUsers([recipientUserId], {
        title,
        body: preview.slice(0, 120),
        url: chat.role === "student" ? `/club/school-chats/${chatId}` : `/club/my-instructors/${chatId}`,
        tag: `school-chat-${chatId}`,
      });
    }

    return { message: msg };
  });

  // Ученик оплачивает счёт от инструктора.
  app.post("/orders/:id/pay", { preHandler: requireAuth }, async (req, reply) => {
    const s = req.user as SessionPayload;
    const orderId = (req.params as { id: string }).id;
    const method = z.object({ method: z.enum(["card", "sbp"]).optional() }).safeParse(req.body ?? {});
    const payMethod = (method.success && method.data.method) || "card";

    const [order] = await db.select().from(schoolOrders).where(eq(schoolOrders.id, orderId)).limit(1);
    if (!order) return reply.code(404).send({ error: "not_found" });
    if (order.studentId !== s.sub) return reply.code(403).send({ error: "forbidden" });
    if (order.status !== "invoiced") return reply.code(400).send({ error: "not_payable", status: order.status });

    if (!isRaifConfigured(payMethod)) return reply.code(502).send({ error: "payments_not_configured" });

    try {
      const { paymentUrl, payment } = await createPaymentForSchoolOrder(order.id, s.sub, payMethod);
      await db.update(schoolOrders).set({ paymentId: payment.id, updatedAt: new Date() }).where(eq(schoolOrders.id, order.id));
      return { paymentUrl, paymentId: payment.id };
    } catch (e) {
      if (e instanceof PaymentInitError) return reply.code(502).send({ error: e.code, message: e.message });
      throw e;
    }
  });
}

// =================================================================
// INSTRUCTOR ROUTES
// =================================================================
export async function schoolInstructorRoutes(app: FastifyInstance) {
  // Мой инструкторский профиль (для проверки роли на фронте).
  app.get("/me", { preHandler: requireAuth }, async (req, reply) => {
    const s = req.user as SessionPayload;
    const row = await getInstructorByUser(s.sub);
    if (!row) return reply.code(404).send({ error: "not_instructor" });
    return { instructor: row };
  });

  // Все чаты инструктора (входящие).
  app.get("/chats", { preHandler: requireAuth }, async (req, reply) => {
    const s = req.user as SessionPayload;
    const instr = await requireInstructorProfile(s.sub);
    if (!instr) return reply.code(403).send({ error: "not_instructor" });

    const rows = await db
      .select({
        id: schoolChats.id,
        studentId: schoolChats.studentId,
        studentNick: users.nick,
        lastMessageAt: schoolChats.lastMessageAt,
        lastMessagePreview: schoolChats.lastMessagePreview,
        lastMessageRole: schoolChats.lastMessageRole,
        unread: schoolChats.instructorUnread,
      })
      .from(schoolChats)
      .innerJoin(users, eq(users.id, schoolChats.studentId))
      .where(eq(schoolChats.instructorId, instr.id))
      .orderBy(desc(schoolChats.lastMessageAt));
    return { items: rows };
  });

  // Мои заказы (инструктор видит СВОЮ сумму, без наценки).
  app.get("/orders", { preHandler: requireAuth }, async (req, reply) => {
    const s = req.user as SessionPayload;
    const instr = await requireInstructorProfile(s.sub);
    if (!instr) return reply.code(403).send({ error: "not_instructor" });

    const rows = await db
      .select({
        id: schoolOrders.id,
        chatId: schoolOrders.chatId,
        studentId: schoolOrders.studentId,
        studentNick: users.nick,
        title: schoolOrders.title,
        description: schoolOrders.description,
        amountRub: schoolOrders.instructorAmountRub,
        status: schoolOrders.status,
        scheduledAt: schoolOrders.scheduledAt,
        paidAt: schoolOrders.paidAt,
        createdAt: schoolOrders.createdAt,
      })
      .from(schoolOrders)
      .innerJoin(users, eq(users.id, schoolOrders.studentId))
      .where(eq(schoolOrders.instructorId, instr.id))
      .orderBy(desc(schoolOrders.createdAt));
    return { items: rows };
  });

  // Инструктор выставляет счёт ученику.
  app.post("/orders", { preHandler: requireAuth }, async (req, reply) => {
    const s = req.user as SessionPayload;
    const instr = await requireInstructorProfile(s.sub);
    if (!instr) return reply.code(403).send({ error: "not_instructor" });

    const body = z
      .object({
        chatId: z.string().uuid(),
        title: z.string().trim().min(1).max(200),
        description: z.string().trim().max(2000).default(""),
        instructorAmountRub: z.number().int().min(100).max(1_000_000),
        scheduledAt: z.string().datetime().optional(),
      })
      .safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: "invalid_input", details: body.error.flatten() });

    const [chat] = await db.select().from(schoolChats).where(eq(schoolChats.id, body.data.chatId)).limit(1);
    if (!chat || chat.instructorId !== instr.id) return reply.code(404).send({ error: "chat_not_found" });

    const amounts = calcSchoolAmounts(body.data.instructorAmountRub);
    const [created] = await db
      .insert(schoolOrders)
      .values({
        chatId: chat.id,
        instructorId: instr.id,
        studentId: chat.studentId,
        title: body.data.title,
        description: body.data.description,
        instructorAmountRub: amounts.instructorAmountRub,
        studentAmountRub: amounts.studentAmountRub,
        commissionRub: amounts.commissionRub,
        status: "invoiced",
        scheduledAt: body.data.scheduledAt ? new Date(body.data.scheduledAt) : null,
      })
      .returning();

    // Сервисное сообщение в чат.
    await db.insert(schoolMessages).values({
      chatId: chat.id,
      senderId: s.sub,
      senderRole: "instructor",
      text: `📄 Выставлен счёт: ${body.data.title} — ${amounts.studentAmountRub}₽`,
    });
    await bumpChatOnMessage(chat.id, "instructor", `Счёт на ${amounts.studentAmountRub}₽`);

    // Пуш ученику.
    void pushToUsers([chat.studentId], {
      title: `Инструктор ${instr.displayName}`,
      body: `Счёт: ${body.data.title} — ${amounts.studentAmountRub}₽`,
      url: `/club/my-instructors/${chat.id}`,
      tag: `school-order-${created!.id}`,
    });

    return { id: created!.id };
  });

  // Отменить свой счёт (только пока не оплачен).
  app.post("/orders/:id/cancel", { preHandler: requireAuth }, async (req, reply) => {
    const s = req.user as SessionPayload;
    const instr = await requireInstructorProfile(s.sub);
    if (!instr) return reply.code(403).send({ error: "not_instructor" });
    const orderId = (req.params as { id: string }).id;
    const [o] = await db.select().from(schoolOrders).where(eq(schoolOrders.id, orderId)).limit(1);
    if (!o || o.instructorId !== instr.id) return reply.code(404).send({ error: "not_found" });
    if (o.status !== "invoiced") return reply.code(400).send({ error: "not_cancellable" });
    await db
      .update(schoolOrders)
      .set({ status: "cancelled", cancelledAt: new Date(), updatedAt: new Date() })
      .where(eq(schoolOrders.id, orderId));
    return { ok: true };
  });
}

// =================================================================
// ADMIN ROUTES
// =================================================================
export async function adminSchoolRoutes(app: FastifyInstance) {
  // KPI: gross, comission, кол-во оплаченных уроков за период (по умолчанию — 30д).
  app.get("/kpi", { preHandler: requireAdmin }, async (req) => {
    const q = z.object({ days: z.coerce.number().int().min(1).max(365).default(30) }).parse(req.query ?? {});
    const from = new Date(Date.now() - q.days * 24 * 60 * 60 * 1000);
    const [row] = await db
      .select({
        lessons: sql<number>`count(*)`,
        gross: sql<number>`coalesce(sum(${schoolOrders.studentAmountRub}), 0)`,
        instructorPayouts: sql<number>`coalesce(sum(${schoolOrders.instructorAmountRub}), 0)`,
        commission: sql<number>`coalesce(sum(${schoolOrders.commissionRub}), 0)`,
      })
      .from(schoolOrders)
      .where(and(eq(schoolOrders.status, "paid"), gte(schoolOrders.paidAt, from)));
    return { days: q.days, ...row };
  });

  // Список инструкторов + их суммы к выплате (неоплаченные payouts + pending gross).
  app.get("/instructors", { preHandler: requireAdmin }, async () => {
    const rows = await db
      .select({
        id: schoolInstructors.id,
        slug: schoolInstructors.slug,
        displayName: schoolInstructors.displayName,
        city: schoolInstructors.city,
        active: schoolInstructors.active,
        hourlyRateRub: schoolInstructors.hourlyRateRub,
      })
      .from(schoolInstructors)
      .orderBy(asc(schoolInstructors.displayName));
    return { items: rows };
  });

  // Список выплат.
  app.get("/payouts", { preHandler: requireAdmin }, async (req) => {
    const q = z
      .object({ status: z.enum(["pending", "paid"]).optional(), instructorId: z.string().uuid().optional() })
      .parse(req.query ?? {});
    const conds = [] as any[];
    if (q.status) conds.push(eq(schoolPayouts.status, q.status));
    if (q.instructorId) conds.push(eq(schoolPayouts.instructorId, q.instructorId));
    const rows = await db
      .select({
        p: schoolPayouts,
        instructorName: schoolInstructors.displayName,
        instructorSlug: schoolInstructors.slug,
      })
      .from(schoolPayouts)
      .innerJoin(schoolInstructors, eq(schoolInstructors.id, schoolPayouts.instructorId))
      .where(conds.length ? and(...conds) : undefined)
      .orderBy(desc(schoolPayouts.periodStart));
    return { items: rows.map((r) => ({ ...r.p, instructorName: r.instructorName, instructorSlug: r.instructorSlug })) };
  });

  // Собрать выплаты за неделю (или указанный период) из paid-заказов.
  app.post("/payouts/generate", { preHandler: requireAdmin }, async (req, reply) => {
    const b = z
      .object({
        periodStart: z.string().datetime(),
        periodEnd: z.string().datetime(),
        taxRatePercent: z.number().min(0).max(100).default(6),
      })
      .safeParse(req.body);
    if (!b.success) return reply.code(400).send({ error: "invalid_input" });
    const from = new Date(b.data.periodStart);
    const to = new Date(b.data.periodEnd);

    const grouped = await db
      .select({
        instructorId: schoolOrders.instructorId,
        gross: sql<number>`coalesce(sum(${schoolOrders.instructorAmountRub}), 0)`,
        studentGross: sql<number>`coalesce(sum(${schoolOrders.studentAmountRub}), 0)`,
        commission: sql<number>`coalesce(sum(${schoolOrders.commissionRub}), 0)`,
      })
      .from(schoolOrders)
      .where(
        and(
          eq(schoolOrders.status, "paid"),
          gte(schoolOrders.paidAt, from),
          lt(schoolOrders.paidAt, to),
        ),
      )
      .groupBy(schoolOrders.instructorId);

    const created: string[] = [];
    for (const g of grouped) {
      // Налог считаем с общей выручки (то, что заплатил ученик).
      const tax = Math.round((Number(g.studentGross) * b.data.taxRatePercent) / 100);
      const [row] = await db
        .insert(schoolPayouts)
        .values({
          instructorId: g.instructorId,
          periodStart: from,
          periodEnd: to,
          grossRub: Number(g.gross),
          taxRub: tax,
          commissionRub: Number(g.commission),
          payoutRub: Number(g.gross), // инструктору переводим его чистую сумму
        })
        .returning({ id: schoolPayouts.id });
      if (row) created.push(row.id);
    }
    return { created: created.length, ids: created };
  });

  app.post("/payouts/:id/mark-paid", { preHandler: requireAdmin }, async (req, reply) => {
    const id = (req.params as { id: string }).id;
    const [o] = await db.select().from(schoolPayouts).where(eq(schoolPayouts.id, id)).limit(1);
    if (!o) return reply.code(404).send({ error: "not_found" });
    await db
      .update(schoolPayouts)
      .set({ status: "paid", paidAt: new Date(), updatedAt: new Date() })
      .where(eq(schoolPayouts.id, id));
    return { ok: true };
  });

  // ---------- shared zod для профиля инструктора ----------
  const toneEnum = z.enum(["primary", "yellow", "cyan", "lime", "violet"]);
  const skillSchema = z.object({
    title: z.string().min(1).max(120),
    text: z.string().min(1).max(600),
  });
  const courseSchema = z.object({
    title: z.string().min(1).max(200),
    duration: z.string().max(200).default(""),
    price: z.number().int().min(0).max(10_000_000),
    priceFrom: z.boolean().optional(),
    description: z.string().max(2000).default(""),
    includes: z.array(z.string().max(300)).max(20).optional(),
  });
  const profileSchema = z.object({
    specialties: z.array(z.string().max(60)).max(10).optional(),
    bioParagraphs: z.array(z.string().max(2000)).max(10).optional(),
    skills: z.array(skillSchema).max(20).optional(),
    courses: z.array(courseSchema).max(10).optional(),
    upcomingCourses: z.array(z.object({ title: z.string().max(200) })).max(10).optional(),
    approach: z.array(z.string().max(1000)).max(10).optional(),
    location: z
      .object({
        address: z.string().max(300),
        lat: z.number(),
        lng: z.number(),
        note: z.string().max(600).optional(),
      })
      .optional(),
    gallery: z.array(z.string().max(1000)).max(30).optional(),
  });

  // Создать/апдейт инструктора.
  app.post("/instructors", { preHandler: requireAdmin }, async (req, reply) => {
    const b = z
      .object({
        userId: z.string().uuid(),
        slug: z.string().min(2).max(64),
        displayName: z.string().min(1).max(120),
        bio: z.string().max(4000).default(""),
        city: z.string().max(120).default(""),
        moto: z.string().max(200).default(""),
        avatarUrl: z.string().max(1000).optional(),
        hourlyRateRub: z.number().int().min(0).max(1_000_000).default(0),
        tone: toneEnum.optional(),
        experience: z.number().int().min(0).max(80).optional(),
        tagline: z.string().max(300).optional(),
        profile: profileSchema.optional(),
      })
      .safeParse(req.body);
    if (!b.success) return reply.code(400).send({ error: "invalid_input", details: b.error.flatten() });
    const [row] = await db
      .insert(schoolInstructors)
      .values({ ...b.data })
      .returning();
    return { id: row!.id };
  });

  app.patch("/instructors/:id", { preHandler: requireAdmin }, async (req, reply) => {
    const id = (req.params as { id: string }).id;
    const b = z
      .object({
        displayName: z.string().min(1).max(120).optional(),
        bio: z.string().max(4000).optional(),
        city: z.string().max(120).optional(),
        moto: z.string().max(200).optional(),
        avatarUrl: z.string().max(1000).optional(),
        hourlyRateRub: z.number().int().min(0).max(1_000_000).optional(),
        active: z.boolean().optional(),
        tone: toneEnum.optional(),
        experience: z.number().int().min(0).max(80).optional(),
        tagline: z.string().max(300).optional(),
        profile: profileSchema.optional(),
      })
      .safeParse(req.body);
    if (!b.success) return reply.code(400).send({ error: "invalid_input", details: b.error.flatten() });
    const [row] = await db
      .update(schoolInstructors)
      .set({ ...b.data, updatedAt: new Date() })
      .where(eq(schoolInstructors.id, id))
      .returning();
    if (!row) return reply.code(404).send({ error: "not_found" });
    return { ok: true };
  });
}

// --------------------- shared ---------------------

type LoadedChat = {
  chat: typeof schoolChats.$inferSelect;
  role: "student" | "instructor";
  instructorId: string;
  instructorUserId: string;
  instructorName: string;
  instructorSlug: string;
};

async function loadChatForUser(chatId: string, userId: string): Promise<LoadedChat | null> {
  const [row] = await db
    .select({ chat: schoolChats, instr: schoolInstructors })
    .from(schoolChats)
    .innerJoin(schoolInstructors, eq(schoolInstructors.id, schoolChats.instructorId))
    .where(eq(schoolChats.id, chatId))
    .limit(1);
  if (!row) return null;
  const role: "student" | "instructor" | null =
    row.chat.studentId === userId ? "student" : row.instr.userId === userId ? "instructor" : null;
  if (!role) return null;
  return {
    chat: row.chat,
    role,
    instructorId: row.instr.id,
    instructorUserId: row.instr.userId,
    instructorName: row.instr.displayName,
    instructorSlug: row.instr.slug,
  };
}

function publicChatView(c: LoadedChat) {
  return {
    id: c.chat.id,
    instructorId: c.instructorId,
    instructorSlug: c.instructorSlug,
    instructorName: c.instructorName,
    studentId: c.chat.studentId,
    lastMessageAt: c.chat.lastMessageAt,
  };
}
