import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { userStickerPacks } from "../db/schema/stickers.js";
import { requireAuth, type SessionPayload } from "../lib/auth.js";

export async function stickersRoutes(app: FastifyInstance) {
  // GET /api/v1/stickers/me — список slug'ов паков, доступных пользователю.
  app.get("/me", { preHandler: requireAuth }, async (req) => {
    const session = req.user as SessionPayload;
    const rows = await db
      .select({ packSlug: userStickerPacks.packSlug })
      .from(userStickerPacks)
      .where(eq(userStickerPacks.userId, session.sub));
    return { packs: rows.map((r) => r.packSlug) };
  });
}
