import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { xpEvents } from "../db/schema/xp.js";
import { users } from "../db/schema/users.js";
import { requireAuth, requireAdmin, type SessionPayload } from "../lib/auth.js";
import { awardXp, computeRank, getXpTotal, XP_SOURCES } from "../lib/xp.js";

export async function xpRoutes(app: FastifyInstance) {
  /** GET /api/v1/xp/me — мой XP + текущий ранг + прогресс */
  app.get("/me", { preHandler: requireAuth }, async (req) => {
    const session = req.user as SessionPayload;
    const total = await getXpTotal(session.sub);
    return computeRank(total);
  });

  /** GET /api/v1/xp/history — мой XP лог */
  app.get("/history", { preHandler: requireAuth }, async (req) => {
    const session = req.user as SessionPayload;
    const q = z.object({ limit: z.coerce.number().int().min(1).max(100).default(50) }).parse((req.query as object) ?? {});
    const rows = await db
      .select()
      .from(xpEvents)
      .where(eq(xpEvents.userId, session.sub))
      .orderBy(desc(xpEvents.createdAt))
      .limit(q.limit);
    return { items: rows };
  });
}

export async function adminXpRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAdmin);

  /** POST /api/v1/admin/xp/grant — ручное начисление/списание XP по нику */
  app.post("/grant", async (req, reply) => {
    const parsed = z
      .object({
        nick: z.string().min(1).max(64),
        amount: z.number().int(),
        reason: z.string().min(1).max(500),
      })
      .safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid" });
    const session = req.user as SessionPayload;

    const [u] = await db.select({ id: users.id }).from(users).where(eq(users.nick, parsed.data.nick)).limit(1);
    if (!u) return reply.code(404).send({ error: "user_not_found" });

    const row = await awardXp({
      userId: u.id,
      amount: parsed.data.amount,
      source: "admin",
      reason: parsed.data.reason,
      createdBy: session.sub,
    });
    return { ok: true, event: row };
  });
}
