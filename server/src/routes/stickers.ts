import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { userStickerPacks } from "../db/schema/stickers.js";
import { requireAuth, type SessionPayload } from "../lib/auth.js";

// Список всех платных паков. Блогер/админ получают их бесплатно — даже без
// записи в user_sticker_packs. Когда добавим новый пак — дописать сюда.
const ALL_PACK_SLUGS = ["special"] as const;

export async function stickersRoutes(app: FastifyInstance) {
  // GET /api/v1/stickers/me — список slug'ов паков, доступных пользователю.
  app.get("/me", { preHandler: requireAuth }, async (req) => {
    const session = req.user as SessionPayload;

    // Блогер и админ — все паки бесплатно.
    if (session.role === "blogger" || session.role === "admin") {
      return { packs: [...ALL_PACK_SLUGS] };
    }

    const rows = await db
      .select({ packSlug: userStickerPacks.packSlug })
      .from(userStickerPacks)
      .where(eq(userStickerPacks.userId, session.sub));
    return { packs: rows.map((r) => r.packSlug) };
  });
}
