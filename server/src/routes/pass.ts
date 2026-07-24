import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { passPurchases, PASS_CONFIG, PASS_DURATION_DAYS, PASS_TIERS } from "../db/schema/pass.js";
import { users } from "../db/schema/users.js";
import { profiles } from "../db/schema/profile.js";
import { payments } from "../db/schema/payments.js";
import { requireAuth, requireAdmin, type SessionPayload } from "../lib/auth.js";
import {
  activatePassPurchase,
  createPassPurchase,
  expireOldPasses,
  getActivePass,
  getPassHistory,
  PassPurchaseError,
  revokePass,
} from "../lib/pass.js";
import { createPaymentForPass, PaymentInitError } from "../lib/payments.js";
import { isRaifConfigured } from "../lib/raif.js";

// ---------- USER ----------

const purchaseSchema = z.object({
  tier: z.enum(PASS_TIERS),
  method: z.enum(["card", "sbp"]).optional(),
});

export async function passRoutes(app: FastifyInstance) {
  // GET /api/v1/pass/tiers — публичный прайс/состав по тирам
  app.get("/tiers", async () => {
    return {
      durationDays: 30,
      tiers: Object.entries(PASS_CONFIG).map(([tier, cfg]) => ({
        tier,
        priceRub: cfg.priceRub,
        tickets: cfg.tickets,
        aiQuestions: cfg.aiQuestions, // null = без лимита
      })),
    };
  });

  // GET /api/v1/pass/me — текущий активный пасс + история + daysLeft
  app.get("/me", { preHandler: requireAuth }, async (req) => {
    const session = req.user as SessionPayload;
    const active = await getActivePass(session.sub);
    const history = await getPassHistory(session.sub, 20);
    let daysLeft: number | null = null;
    if (active?.expiresAt) {
      const ms = new Date(active.expiresAt).getTime() - Date.now();
      daysLeft = Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
    }
    return { active, history, daysLeft, durationDays: PASS_DURATION_DAYS };
  });

  // POST /api/v1/pass/purchase — создать запись pending_payment и сразу инициировать
  // платёж в Т-Банке (если терминал сконфигурирован). Возвращает paymentUrl для редиректа.
  app.post("/purchase", { preHandler: requireAuth }, async (req, reply) => {
    const parsed = purchaseSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_input", message: parsed.error.issues[0]?.message });
    }
    const session = req.user as SessionPayload;
    try {
      const purchase = await createPassPurchase(session.sub, parsed.data.tier);
      const method = parsed.data.method ?? "card";
      let paymentUrl: string | null = null;
      if (isRaifConfigured(method)) {
        try {
          const p = await createPaymentForPass(purchase.id, session.sub, method);
          paymentUrl = p.paymentUrl;
        } catch (e) {
          // Платёжка отвалилась — purchase остаётся pending_payment, юзер увидит ошибку.
          if (e instanceof PaymentInitError) {
            return reply.code(502).send({
              error: e.code,
              message: e.message,
              purchase,
            });
          }
          throw e;
        }
      }
      return reply.code(201).send({ purchase, paymentUrl });
    } catch (e) {
      if (e instanceof PassPurchaseError) {
        return reply.code(409).send({ error: e.code, message: e.message });
      }
      throw e;
    }
  });
}

// ---------- ADMIN ----------

const activateSchema = z.object({ purchaseId: z.string().uuid() });
const revokeSchema = z.object({ purchaseId: z.string().uuid() });

export async function adminPassRoutes(app: FastifyInstance) {
  // GET /api/v1/admin/pass/list?status=&tier=&q=&limit=
  // Возвращает записи с прикреплённым nick/email юзера — для админского управления подписками.
  app.get("/list", { preHandler: requireAdmin }, async (req) => {
    const q = z
      .object({
        status: z.enum(["pending_payment", "active", "expired", "cancelled", "superseded"]).optional(),
        tier: z.enum(PASS_TIERS).optional(),
        q: z.string().trim().min(1).max(64).optional(),
        limit: z.coerce.number().int().min(1).max(200).default(100),
      })
      .parse(req.query ?? {});

    const conds = [];
    if (q.status) conds.push(eq(passPurchases.status, q.status));
    if (q.tier) conds.push(eq(passPurchases.tier, q.tier));
    if (q.q) {
      const like = `%${q.q}%`;
      conds.push(or(ilike(users.nick, like), ilike(users.email, like))!);
    }

    const rows = await db
      .select({
        id: passPurchases.id,
        userId: passPurchases.userId,
        tier: passPurchases.tier,
        priceRub: passPurchases.priceRub,
        ticketsGranted: passPurchases.ticketsGranted,
        status: passPurchases.status,
        createdAt: passPurchases.createdAt,
        paidAt: passPurchases.paidAt,
        expiresAt: passPurchases.expiresAt,
        nick: users.nick,
        email: users.email,
        avatarUrl: users.avatarUrl,
      })
      .from(passPurchases)
      .innerJoin(users, eq(users.id, passPurchases.userId))
      .where(conds.length ? and(...conds) : (undefined as any))
      .orderBy(desc(passPurchases.createdAt))
      .limit(q.limit);
    return { items: rows };
  });

  // GET /api/v1/admin/pass/stats — сводка для карточек в админке.
  app.get("/stats", { preHandler: requireAdmin }, async () => {
    const nowMs = Date.now();
    const now = new Date(nowMs).toISOString();
    const d30 = new Date(nowMs - 30 * 24 * 60 * 60 * 1000).toISOString();
    const d7next = new Date(nowMs + 7 * 24 * 60 * 60 * 1000).toISOString();

    const activeByTier = await db
      .select({
        tier: passPurchases.tier,
        c: sql<number>`COUNT(*)::int`,
      })
      .from(passPurchases)
      .where(and(eq(passPurchases.status, "active"), sql`${passPurchases.expiresAt} >= ${now}::timestamptz`))
      .groupBy(passPurchases.tier);

    const [pending] = await db
      .select({ c: sql<number>`COUNT(*)::int` })
      .from(passPurchases)
      .where(eq(passPurchases.status, "pending_payment"));

    const [expiring7] = await db
      .select({ c: sql<number>`COUNT(*)::int` })
      .from(passPurchases)
      .where(
        and(
          eq(passPurchases.status, "active"),
          sql`${passPurchases.expiresAt} >= ${now}::timestamptz`,
          sql`${passPurchases.expiresAt} < ${d7next}::timestamptz`,
        ),
      );

    // Выручка за 30 дней по Hell Pass — confirmed платежи с refType='pass'.
    const [revenue30d] = await db
      .select({ total: sql<number>`COALESCE(SUM(${payments.amountRub}), 0)::int` })
      .from(payments)
      .where(
        and(
          eq(payments.status, "confirmed"),
          eq(payments.refType, "pass"),
          sql`${payments.updatedAt} >= ${d30}::timestamptz`,
        ),
      );

    const byTier: Record<string, number> = { silver: 0, gold: 0, platinum: 0 };
    for (const r of activeByTier) byTier[r.tier as string] = r.c;

    return {
      activeByTier: byTier,
      activeTotal: byTier.silver + byTier.gold + byTier.platinum,
      pendingCount: pending?.c ?? 0,
      expiringWithin7d: expiring7?.c ?? 0,
      revenue30dRub: revenue30d?.total ?? 0,
    };
  });

  // POST /api/v1/admin/pass/activate — активировать вручную (или вебхук оплаты)
  app.post("/activate", { preHandler: requireAdmin }, async (req, reply) => {
    const parsed = activateSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_input", message: parsed.error.issues[0]?.message });
    }
    const r = await activatePassPurchase(parsed.data.purchaseId);
    if (!r.ok) return reply.code(400).send({ error: r.reason });
    const [updated] = await db.select().from(passPurchases).where(eq(passPurchases.id, parsed.data.purchaseId)).limit(1);
    return { ok: true, purchase: updated };
  });

  // POST /api/v1/admin/pass/revoke — принудительно закрыть пасс (active -> expired, pending -> cancelled).
  app.post("/revoke", { preHandler: requireAdmin }, async (req, reply) => {
    const parsed = revokeSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_input", message: parsed.error.issues[0]?.message });
    }
    const updated = await revokePass(parsed.data.purchaseId);
    if (!updated) return reply.code(404).send({ error: "not_found" });
    return { ok: true, purchase: updated };
  });

  // POST /api/v1/admin/pass/expire-old — прогнать истёкшие. Дёргать кроном раз в день.
  app.post("/expire-old", { preHandler: requireAdmin }, async () => {
    const count = await expireOldPasses();
    return { ok: true, expired: count };
  });
}
