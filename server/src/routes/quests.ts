import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "../db/client.js";
import {
  quests,
  userQuestCompletions,
  questProgress,
  QUEST_KINDS,
  QUEST_CATEGORIES,
} from "../db/schema/quests.js";
import { profiles, bikes } from "../db/schema/profile.js";
import { orders, PAID_ORDER_STATUSES } from "../db/schema/shop.js";
import { users } from "../db/schema/users.js";
import { requireAuth, requireAdmin, type SessionPayload } from "../lib/auth.js";
import {
  completeQuest,
  getQuestByCode,
  periodKeyFor,
} from "../lib/quests.js";

// ---------- PUBLIC ----------

export async function questsRoutes(app: FastifyInstance) {
  /** GET /api/v1/quests — список активных квестов + статус и прогресс для меня */
  app.get("/", { preHandler: requireAuth }, async (req) => {
    const session = req.user as SessionPayload;

    // Узнаём роль (для фильтрации blogger-only).
    const [me] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, session.sub))
      .limit(1);
    const isBlogger = me?.role === "blogger" || me?.role === "admin";

    const rows = await db
      .select()
      .from(quests)
      .where(eq(quests.active, true))
      .orderBy(asc(quests.sortOrder), asc(quests.createdAt));

    const visible = rows.filter((q) => !q.bloggerOnly || isBlogger);
    const ids = visible.map((q) => q.id);

    // Все мои completions по этим квестам (за любые period_key).
    const mine = ids.length
      ? await db
          .select({
            questId: userQuestCompletions.questId,
            periodKey: userQuestCompletions.periodKey,
            completedAt: userQuestCompletions.completedAt,
          })
          .from(userQuestCompletions)
          .where(
            and(
              eq(userQuestCompletions.userId, session.sub),
              inArray(userQuestCompletions.questId, ids),
            ),
          )
      : [];

    const completionsByQuest = new Map<string, typeof mine>();
    for (const m of mine) {
      const arr = completionsByQuest.get(m.questId) ?? [];
      arr.push(m);
      completionsByQuest.set(m.questId, arr);
    }

    // Прогресс по quest_progress (для monthly/ladder).
    const progressRows = ids.length
      ? await db
          .select()
          .from(questProgress)
          .where(
            and(
              eq(questProgress.userId, session.sub),
              inArray(questProgress.questId, ids),
            ),
          )
      : [];
    const progressByQuest = new Map<string, (typeof progressRows)[number]>();
    for (const p of progressRows) {
      // оставляем строку для нужного period_key (для monthly — текущий месяц).
      progressByQuest.set(`${p.questId}:${p.periodKey}`, p);
    }

    return {
      items: visible.map((q) => {
        const periodKey = periodKeyFor(q.kind);
        const completions = completionsByQuest.get(q.id) ?? [];
        const completedNow =
          q.kind === "ladder"
            ? false
            : completions.some((c) => c.periodKey === periodKey);
        const lastCompletion = completions
          .filter((c) => q.kind === "ladder" || c.periodKey === periodKey)
          .sort((a, b) => +new Date(b.completedAt) - +new Date(a.completedAt))[0];

        const progRow = progressByQuest.get(`${q.id}:${periodKey}`);

        return {
          id: q.id,
          code: q.code,
          title: q.title,
          description: q.description,
          category: q.category,
          kind: q.kind,
          xpReward: q.xpReward,
          ticketsReward: q.ticketsReward,
          goal: q.goal,
          unit: q.unit,
          actionLabel: q.actionLabel,
          actionTo: q.actionTo,
          bonusNote: q.bonusNote,
          bloggerOnly: q.bloggerOnly,
          ladder: q.ladder,
          progress: progRow?.progress ?? 0,
          lastLadderStep: progRow?.lastLadderStep ?? 0,
          periodKey,
          completed: completedNow,
          completedAt: lastCompletion?.completedAt ?? null,
        };
      }),
    };
  });

  /**
   * POST /api/v1/quests/:code/check — перепроверить условие и засчитать.
   * Используется фронтом как «ручная проверка» для self-claim квестов
   * (`profile_and_bike`, `pwa_install`, и т.п.).
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

  /**
   * POST /api/v1/quests/pwa_install/confirm — пометить установку PWA.
   * Фронт дёргает после успешного `beforeinstallprompt` (Android/Desktop)
   * или после ручного подтверждения юзером на iOS.
   */
  app.post("/pwa_install/confirm", { preHandler: requireAuth }, async (req, reply) => {
    const session = req.user as SessionPayload;
    const res = await completeQuest(session.sub, "pwa_install");
    return reply.send(res);
  });
}

/** Перепроверка условия для self-claim. Возвращает true, если событие фактически произошло. */
async function checkAutoCondition(code: string, userId: string): Promise<boolean> {
  switch (code) {
    case "profile_and_bike": {
      const [p] = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
      if (!p) return false;
      const profileFull = Boolean(
        p.avatarUrl &&
          p.city && p.city.trim().length > 0 &&
          p.phone && p.phone.trim().length > 0 &&
          p.bio && p.bio.trim().length >= 10,
      );
      if (!profileFull) return false;
      const [b] = await db.select({ id: bikes.id }).from(bikes).where(eq(bikes.userId, userId)).limit(1);
      return !!b;
    }
    case "shop_order": {
      const [o] = await db
        .select({ id: orders.id })
        .from(orders)
        .where(
          and(
            eq(orders.userId, userId),
            inArray(orders.status, PAID_ORDER_STATUSES as unknown as string[]),
          ),
        )
        .limit(1);
      return !!o;
    }
    case "pwa_install":
      // фронт сам отвечает за подтверждение; через /check засчитывать не даём
      return false;
    default:
      // monthly/ladder автоматически закрываются через addQuestProgress
      return false;
  }
}

// ---------- ADMIN ----------

const ladderSchema = z.array(
  z.object({ at: z.number().int().min(1), xp: z.number().int().min(0).max(100_000) }),
).max(20);

const createQuestSchema = z.object({
  code: z.string().trim().min(2).max(64).regex(/^[a-z0-9_]+$/, "code: только a-z, 0-9, _"),
  title: z.string().trim().min(1).max(200),
  description: z.string().max(2000).default(""),
  category: z.enum(QUEST_CATEGORIES).default("onboarding"),
  kind: z.enum(QUEST_KINDS).default("one_time"),
  xpReward: z.number().int().min(0).max(100_000).default(0),
  ticketsReward: z.number().int().min(0).max(100_000).default(0),
  goal: z.number().int().min(1).max(100_000).default(1),
  unit: z.string().max(32).default(""),
  actionLabel: z.string().max(64).nullable().optional(),
  actionTo: z.string().max(128).nullable().optional(),
  bonusNote: z.string().max(160).nullable().optional(),
  ladder: ladderSchema.nullable().optional(),
  bloggerOnly: z.boolean().default(false),
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
      const d = parsed.data;
      const [row] = await db
        .insert(quests)
        .values({
          ...d,
          repeatable: d.kind === "monthly" || d.kind === "ladder",
        })
        .returning();
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
    const d = parsed.data;
    const update: Record<string, unknown> = { ...d, updatedAt: new Date() };
    if (d.kind) update.repeatable = d.kind === "monthly" || d.kind === "ladder";
    const [row] = await db.update(quests).set(update).where(eq(quests.id, req.params.id)).returning();
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
    const qb = db.select().from(userQuestCompletions).$dynamic();
    if (q.userId) qb.where(eq(userQuestCompletions.userId, q.userId));
    const rows = await qb.orderBy(desc(userQuestCompletions.completedAt)).limit(q.limit);
    return { items: rows };
  });
}
