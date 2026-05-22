import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../db/client.js";
import { users } from "../db/schema/users.js";
import { eq } from "drizzle-orm";
import { requireAuth, type SessionPayload } from "../lib/auth.js";
import {
  getOrCreateReferralCode,
  listMyReferrals,
  REFERRAL_CONFIG,
  findReferrerByCode,
} from "../lib/referrals.js";

export async function invitesRoutes(app: FastifyInstance) {
  /** GET /api/v1/invites/me — мой реф-код + список приглашённых + статы */
  app.get("/me", { preHandler: requireAuth }, async (req) => {
    const session = req.user as SessionPayload;
    const [me] = await db.select({ nick: users.nick }).from(users).where(eq(users.id, session.sub)).limit(1);
    const code = await getOrCreateReferralCode(session.sub, me?.nick ?? "rider");
    const { items, totals } = await listMyReferrals(session.sub);
    return {
      code,
      rewardTickets: REFERRAL_CONFIG.rewardTickets,
      totals,
      items,
    };
  });

  /** GET /api/v1/invites/check?code=xxx — проверить, что код валиден (для лендинга /?ref=) */
  app.get("/check", async (req) => {
    const q = z.object({ code: z.string().min(1).max(40) }).safeParse((req.query as object) ?? {});
    if (!q.success) return { valid: false };
    const referrerId = await findReferrerByCode(q.data.code);
    return { valid: !!referrerId };
  });
}
