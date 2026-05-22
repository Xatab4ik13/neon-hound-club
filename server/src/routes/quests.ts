import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { quests, userQuestCompletions, QUEST_KINDS } from "../db/schema/quests.js";
import { profiles, bikes } from "../db/schema/profile.js";
import { orders } from "../db/schema/shop.js";
import { passPurchases } from "../db/schema/pass.js";
import { requireAuth, requireAdmin, type SessionPayload } from "../lib/auth.js";
import { completeQuest, getQuestByCode } from "../lib/quests.js";

// ---------- PUBLIC ----------

export async function questsRoutes(app: FastifyInstance) {
  /** GET /api/v1/quests — список активных квестов + статус прохождения для меня */
  app.get("/", { preHandler: requireAuth }, async (req) => {
    const session = req.user as SessionPayload;
    const rows = await db
      .select()
      .from(quests)
      .where(eq(quests.active, true))
      .orderBy(asc(quests.sortOrder), asc(quests.createdAt));

    const mine = await db
      .select({ questId: userQuestCompletions.questId, completedAt: userQuestCompletions.completedAt })
      .from(userQuestCompletions)
      .where(eq(userQuestCompletions.userId, session.sub));
    const mineByQuest = new Map<string, Date>(mine.map((m) => [m.questId, m.completedAt]));

    return {
      items: rows.map((q) => ({
        id: q.id,
        code: q.code,
        title: q.title,
        description: q.description,
        ticketsReward: q.ticketsReward,
        kind: q.kind,
        repeatable: q.repeatable,
        completed: mineByQuest.has(q.id),
        completedAt: mineByQuest.get(q.id) ?? null,
      })),
    };
  });

  /**
   * POST /api/v1/quests/:code/check — перепроверить условие квеста и засчитать, если выполнено.
   * Для self-claim'ов вроде `profile_complete` — фронт дёргает после сохранения профиля,
   * и если все поля заполнены, юзер тут же получает билеты.
   */
  app.post<{ Params: { code: string } }>(
    "/:code/check",
    { preHandler: requireAuth },
    async (req, reply) => {
      const session = req.user as SessionPayload;
      const quest = await getQuestByCode(req.params.code);
      if (!quest || !quest.active) return reply.code(404).send({ error: "not_found" });

      const ok = await checkAutoCondition(quest.code, session.sub);
      if (!ok) return reply.send({ credited: false, reason: "condition_not_met" });

      const res = await completeQuest(session.sub, quest.code);
      return reply.send(res);
    },
  );
}

/** Перепроверка условия для self-claim. Возвращает true, если событие фактически произошло. */
async function checkAutoCondition(code: string, userId: string): Promise<boolean> {
  switch (code) {
    case "verify_email": {
      // авто-засчитывается из auth, но дублирующая проверка не помешает
      const { users } = await import("../db/schema/users.js");
      const [u] = await db
        .select({ verified: users.emailVerified })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      return !!u?.verified;
    }
    case "profile_complete": {
      const [p] = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
      if (!p) return false;
      return Boolean(
        p.avatarUrl &&
          p.city &&
          p.city.trim().length > 0 &&
          p.phone &&
          p.phone.trim().length > 0 &&
          p.bio &&
          p.bio.trim().length >= 10,
      );
    }
    case "first_bike": {
      const [b] = await db
        .select({ id: bikes.id })
        .from(bikes)
        .where(eq(bikes.userId, userId))
        .limit(1);
      return !!b;
    }
    case "first_order": {
      const [o] = await db
        .select({ id: orders.id })
        .from(orders)
        .where(and(eq(orders.userId, userId), eq(orders.status, "paid")))
        .limit(1);
      return !!o;
    }
    case "first_pass": {
      const [p] = await db
        .select({ id: passPurchases.id })
        .from(passPurchases)
        .where(and(eq(passPurchases.userId, userId), eq(passPurchases.status, "active")))
        .limit(1);
      return !!p;
    }
    default:
      // manual или неизвестный — пусть админ засчитает руками
      return false;
  }
}

// ---------- ADMIN ----------

const createQuestSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2)
    .max(64)
    .regex(/^[a-z0-9_]+$/, "code: только a-z, 0-9, _"),
  title: z.string().trim().min(1).max(200),
  description: z.string().max(2000).default(""),
  ticketsReward: z.number().int().min(0).max(100_000),
  kind: z.enum(QUEST_KINDS).default("manual"),
  repeatable: z.boolean().default(false),
  active: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(1000).default(100),
});

const patchQuestSchema = createQuestSchema.partial().omit({ code: true });

export async function adminQuestsRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAdmin);

  app.get("/", async () => {
    const rows = await db
      .select()
      .from(quests)
      .orderBy(asc(quests.sortOrder), asc(quests.createdAt));
    return { items: rows };
  });

  app.post("/", async (req, reply) => {
    const parsed = createQuestSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_input", message: parsed.error.issues[0]?.message });
    }
    try {
      const [row] = await db.insert(quests).values(parsed.data).returning();
      return reply.code(201).send(row);
    } catch (e: any) {
      if (/unique/i.test(e?.message || "")) {
        return reply.code(409).send({ error: "code_exists", message: "Квест с таким code уже есть" });
      }
      throw e;
    }
  });

  app.patch<{ Params: { id: string } }>("/:id", async (req, reply) => {
    const parsed = patchQuestSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_input", message: parsed.error.issues[0]?.message });
    }
    const [row] = await db
      .update(quests)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(quests.id, req.params.id))
      .returning();
    if (!row) return reply.code(404).send({ error: "not_found" });
    return row;
  });

  app.delete<{ Params: { id: string } }>("/:id", async (req, reply) => {
    const [row] = await db.delete(quests).where(eq(quests.id, req.params.id)).returning({ id: quests.id });
    if (!row) return reply.code(404).send({ error: "not_found" });
    return { ok: true };
  });

  /**
   * POST /api/v1/admin/quests/:code/complete-for/:userId
   * Ручное засчитывание (manual-квесты или донасчёт за активность вне системы).
   */
  app.post<{ Params: { code: string; userId: string } }>(
    "/:code/complete-for/:userId",
    async (req, reply) => {
      const res = await completeQuest(req.params.userId, req.params.code);
      if (!res.credited) return reply.code(409).send(res);
      return reply.send(res);
    },
  );

  /** GET /api/v1/admin/quests/completions?userId=... — лог завершений */
  app.get("/completions", async (req) => {
    const q = z
      .object({ userId: z.string().uuid().optional(), limit: z.coerce.number().int().min(1).max(500).default(100) })
      .parse(req.query);
    const rows = await db
      .select()
      .from(userQuestCompletions)
      .where(q.userId ? eq(userQuestCompletions.userId, q.userId) : undefined as any)
      .orderBy(desc(userQuestCompletions.completedAt))
      .limit(q.limit);
    return { items: rows };
  });
}
