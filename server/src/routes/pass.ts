import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { passPurchases, PASS_CONFIG, PASS_DURATION_DAYS, PASS_TIERS } from "../db/schema/pass.js";
import { requireAuth, requireAdmin, type SessionPayload } from "../lib/auth.js";
import {
  activatePassPurchase,
  createPassPurchase,
  expireOldPasses,
  getActivePass,
  getPassHistory,
  PassPurchaseError,
} from "../lib/pass.js";

// ---------- USER ----------

const purchaseSchema = z.object({
  tier: z.enum(PASS_TIERS),
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

  // POST /api/v1/pass/purchase — создать запись pending_payment
  // Реальная оплата через платёжку придёт позже и дёрнет activatePassPurchase из вебхука.
  app.post("/purchase", { preHandler: requireAuth }, async (req, reply) => {
    const parsed = purchaseSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_input", message: parsed.error.issues[0]?.message });
    }
    const session = req.user as SessionPayload;
    try {
      const purchase = await createPassPurchase(session.sub, parsed.data.tier);
      return reply.code(201).send({
        purchase,
        // TODO: тут вернём ссылку на оплату, когда подключим ЮKassa / CloudPayments
        paymentUrl: null,
      });
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

export async function adminPassRoutes(app: FastifyInstance) {
  // GET /api/v1/admin/pass/list?status=...
  app.get("/list", { preHandler: requireAdmin }, async (req) => {
    const q = z
      .object({
        status: z.enum(["pending_payment", "active", "expired", "cancelled"]).optional(),
        limit: z.coerce.number().int().min(1).max(200).default(50),
      })
      .parse(req.query ?? {});
    const where = q.status ? eq(passPurchases.status, q.status) : undefined;
    const rows = await db
      .select()
      .from(passPurchases)
      .where(where ?? (undefined as any))
      .orderBy(desc(passPurchases.createdAt))
      .limit(q.limit);
    return { items: rows };
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

  // POST /api/v1/admin/pass/expire-old — прогнать истёкшие. Дёргать кроном раз в день.
  app.post("/expire-old", { preHandler: requireAdmin }, async () => {
    const count = await expireOldPasses();
    return { ok: true, expired: count };
  });
}
