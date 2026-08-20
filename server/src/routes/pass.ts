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
  cleanupStalePendingPasses,
  expireOldPasses,
  getActivePass,
  getPassHistory,
  getUpgradeCreditRub,
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
    // Цена каждого тира лично для этого юзера: при апгрейде вычитаем то,
    // что он уже заплатил за активные пассы ниже тиром.
    const prices: Record<string, { priceRub: number; creditRub: number }> = {};
    for (const tier of PASS_TIERS) {
      const creditRub = await getUpgradeCreditRub(session.sub, tier);
      prices[tier] = {
        creditRub,
        priceRub: Math.max(0, PASS_CONFIG[tier].priceRub - creditRub),
      };
    }
    return { active, history, daysLeft, durationDays: PASS_DURATION_DAYS, prices };
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
        source: z.enum(["purchase", "spin", "streak", "grant"]).optional(),
        q: z.string().trim().min(1).max(64).optional(),
        limit: z.coerce.number().int().min(1).max(200).default(100),
      })
      .parse(req.query ?? {});

    const conds = [];
    if (q.status) conds.push(eq(passPurchases.status, q.status));
    if (q.tier) conds.push(eq(passPurchases.tier, q.tier));
    if (q.source) conds.push(eq(passPurchases.source, q.source));
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
        source: passPurchases.source,
        createdAt: passPurchases.createdAt,
        paidAt: passPurchases.paidAt,
        expiresAt: passPurchases.expiresAt,
        nick: users.nick,
        email: users.email,
        avatarUrl: profiles.avatarUrl,
      })
      .from(passPurchases)
      .innerJoin(users, eq(users.id, passPurchases.userId))
      .leftJoin(profiles, eq(profiles.userId, passPurchases.userId))
      .where(conds.length ? and(...conds) : (undefined as any))
      .orderBy(desc(passPurchases.createdAt))
      .limit(q.limit);
    return { items: rows };
  });

  // GET /api/v1/admin/pass/stats — сводка для карточек в админке.
  app.get("/stats", { preHandler: requireAdmin }, async () => {
    // Перед подсчётом чистим просроченные заявки — так «Ждут оплаты» всегда честное.
    await cleanupStalePendingPasses();
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

    // Активные пассы по источнику: купленные vs выданные рулеткой/календарём.
    const activeBySource = await db
      .select({ source: passPurchases.source, c: sql<number>`COUNT(*)::int` })
      .from(passPurchases)
      .where(and(eq(passPurchases.status, "active"), sql`${passPurchases.expiresAt} >= ${now}::timestamptz`))
      .groupBy(passPurchases.source);

    const bySource: Record<string, number> = { purchase: 0, spin: 0, streak: 0, grant: 0 };
    for (const r of activeBySource) bySource[r.source as string] = r.c;

    // ---- Повторные покупки. Считаем только реальные покупки (source='purchase' + оплачено). ----
    const repeatRows = await db.execute<{
      buyers: number;
      repeat_buyers: number;
      purchases: number;
      b1: number;
      b2: number;
      b3: number;
      b4plus: number;
      avg_gap_days: number;
      repeat_30d: number;
    }>(sql`
      WITH paid AS (
        SELECT user_id, paid_at
        FROM pass_purchases
        WHERE source = 'purchase' AND paid_at IS NOT NULL
      ),
      agg AS (
        SELECT user_id,
               COUNT(*)::int AS cnt,
               MIN(paid_at) AS first_at,
               MAX(paid_at) AS last_at
        FROM paid
        GROUP BY user_id
      ),
      repeat30 AS (
        SELECT COUNT(*)::int AS c
        FROM paid p
        WHERE p.paid_at >= now() - interval '30 days'
          AND EXISTS (
            SELECT 1 FROM paid q
            WHERE q.user_id = p.user_id AND q.paid_at < p.paid_at
          )
      )
      SELECT
        COUNT(*)::int AS buyers,
        COUNT(*) FILTER (WHERE cnt > 1)::int AS repeat_buyers,
        COALESCE(SUM(cnt), 0)::int AS purchases,
        COUNT(*) FILTER (WHERE cnt = 1)::int AS b1,
        COUNT(*) FILTER (WHERE cnt = 2)::int AS b2,
        COUNT(*) FILTER (WHERE cnt = 3)::int AS b3,
        COUNT(*) FILTER (WHERE cnt >= 4)::int AS b4plus,
        COALESCE(
          AVG(EXTRACT(EPOCH FROM (last_at - first_at)) / 86400.0 / GREATEST(cnt - 1, 1))
            FILTER (WHERE cnt > 1),
          0
        )::float AS avg_gap_days,
        (SELECT c FROM repeat30) AS repeat_30d
      FROM agg
    `);
    const rr = (repeatRows as any)[0] ?? {};
    const buyers = Number(rr.buyers ?? 0);
    const repeatBuyers = Number(rr.repeat_buyers ?? 0);
    const purchases = Number(rr.purchases ?? 0);

    // Топ повторных покупателей — кто платит чаще всех.
    const topRepeat = await db.execute<{
      user_id: string;
      nick: string;
      email: string;
      purchases: number;
      total_rub: number;
      last_at: string;
    }>(sql`
      SELECT p.user_id,
             u.nick,
             u.email,
             COUNT(*)::int AS purchases,
             COALESCE(SUM(p.price_rub), 0)::int AS total_rub,
             MAX(p.paid_at) AS last_at
      FROM pass_purchases p
      JOIN users u ON u.id = p.user_id
      WHERE p.source = 'purchase' AND p.paid_at IS NOT NULL
      GROUP BY p.user_id, u.nick, u.email
      HAVING COUNT(*) > 1
      ORDER BY COUNT(*) DESC, MAX(p.paid_at) DESC
      LIMIT 10
    `);

    const byTier: Record<string, number> = { silver: 0, gold: 0, platinum: 0 };
    for (const r of activeByTier) byTier[r.tier as string] = r.c;

    return {
      activeByTier: byTier,
      activeTotal: byTier.silver + byTier.gold + byTier.platinum,
      activeBySource: bySource,
      pendingCount: pending?.c ?? 0,
      expiringWithin7d: expiring7?.c ?? 0,
      revenue30dRub: revenue30d?.total ?? 0,
      repeat: {
        buyers,
        repeatBuyers,
        purchases,
        repeatRatePct: buyers > 0 ? Math.round((repeatBuyers / buyers) * 1000) / 10 : 0,
        avgPurchasesPerBuyer: buyers > 0 ? Math.round((purchases / buyers) * 100) / 100 : 0,
        avgGapDays: Math.round(Number(rr.avg_gap_days ?? 0) * 10) / 10,
        repeatLast30d: Number(rr.repeat_30d ?? 0),
        distribution: {
          one: Number(rr.b1 ?? 0),
          two: Number(rr.b2 ?? 0),
          three: Number(rr.b3 ?? 0),
          fourPlus: Number(rr.b4plus ?? 0),
        },
        top: ((topRepeat as any[]) ?? []).map((r) => ({
          userId: r.user_id as string,
          nick: r.nick as string,
          email: r.email as string,
          purchases: Number(r.purchases),
          totalRub: Number(r.total_rub),
          lastAt: r.last_at ? new Date(r.last_at).toISOString() : null,
        })),
      },
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

  // POST /api/v1/admin/pass/cleanup-pending — удалить неоплаченные заявки старше часа.
  app.post("/cleanup-pending", { preHandler: requireAdmin }, async () => {
    const removed = await cleanupStalePendingPasses();
    return { ok: true, removed };
  });

  // POST /api/v1/admin/pass/expire-old — прогнать истёкшие. Дёргать кроном раз в день.
  app.post("/expire-old", { preHandler: requireAdmin }, async () => {
    const count = await expireOldPasses();
    return { ok: true, expired: count };
  });
}
