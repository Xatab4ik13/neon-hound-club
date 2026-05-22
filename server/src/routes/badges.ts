import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { and, eq, desc, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { badges, userBadges, BADGE_RARITIES, BADGE_CATEGORIES } from "../db/schema/badges.js";
import { users } from "../db/schema/users.js";
import { requireAuth, requireAdmin, type SessionPayload } from "../lib/auth.js";

const createSchema = z.object({
  code: z.string().min(2).max(64).regex(/^[a-z0-9_-]+$/),
  name: z.string().min(1).max(120),
  description: z.string().max(2000).default(""),
  rarity: z.enum(BADGE_RARITIES),
  category: z.enum(BADGE_CATEGORIES),
  issue: z.string().max(16).nullable().optional(),
  mintedOf: z.number().int().min(0).nullable().optional(),
  active: z.boolean().default(true),
});
const patchSchema = createSchema.partial();

export async function badgesRoutes(app: FastifyInstance) {
  /** GET /api/v1/badges — публичный каталог активных */
  app.get("/", async () => {
    const rows = await db.select().from(badges).where(eq(badges.active, true)).orderBy(desc(badges.createdAt));
    return { items: rows };
  });

  /** GET /api/v1/badges/me — мои бейджи */
  app.get("/me", { preHandler: requireAuth }, async (req) => {
    const session = req.user as SessionPayload;
    const rows = await db
      .select({
        id: userBadges.id,
        badgeId: badges.id,
        code: badges.code,
        name: badges.name,
        description: badges.description,
        rarity: badges.rarity,
        category: badges.category,
        issue: badges.issue,
        mintedOf: badges.mintedOf,
        pinned: userBadges.pinned,
        awardedAt: userBadges.awardedAt,
      })
      .from(userBadges)
      .innerJoin(badges, eq(badges.id, userBadges.badgeId))
      .where(eq(userBadges.userId, session.sub))
      .orderBy(desc(userBadges.awardedAt));
    return { items: rows };
  });

  /** PATCH /api/v1/badges/me/:badgeId — закрепить/открепить (до 3 закреплённых) */
  app.patch<{ Params: { badgeId: string } }>("/me/:badgeId", { preHandler: requireAuth }, async (req, reply) => {
    const parsed = z.object({ pinned: z.boolean() }).safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid" });
    const session = req.user as SessionPayload;

    if (parsed.data.pinned) {
      const [{ cnt }] = await db
        .select({ cnt: sql<number>`count(*)::int` })
        .from(userBadges)
        .where(and(eq(userBadges.userId, session.sub), eq(userBadges.pinned, true)));
      if ((cnt ?? 0) >= 3) return reply.code(409).send({ error: "max_pinned", message: "Можно закрепить максимум 3 значка" });
    }
    const [row] = await db
      .update(userBadges)
      .set({ pinned: parsed.data.pinned })
      .where(and(eq(userBadges.userId, session.sub), eq(userBadges.badgeId, req.params.badgeId)))
      .returning();
    if (!row) return reply.code(404).send({ error: "not_owned" });
    return row;
  });
}

export async function adminBadgesRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAdmin);

  app.get("/", async () => {
    const rows = await db.select().from(badges).orderBy(desc(badges.createdAt));
    return { items: rows };
  });

  app.post("/", async (req, reply) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid", message: parsed.error.issues[0]?.message });
    try {
      const [row] = await db.insert(badges).values(parsed.data).returning();
      return row;
    } catch (e: any) {
      if (String(e?.code) === "23505") return reply.code(409).send({ error: "code_taken" });
      throw e;
    }
  });

  app.patch<{ Params: { id: string } }>("/:id", async (req, reply) => {
    const parsed = patchSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid" });
    const [row] = await db.update(badges).set(parsed.data).where(eq(badges.id, req.params.id)).returning();
    if (!row) return reply.code(404).send({ error: "not_found" });
    return row;
  });

  app.delete<{ Params: { id: string } }>("/:id", async (req, reply) => {
    const [row] = await db.delete(badges).where(eq(badges.id, req.params.id)).returning({ id: badges.id });
    if (!row) return reply.code(404).send({ error: "not_found" });
    return { ok: true };
  });

  /** POST /api/v1/admin/badges/award — выдать значок юзеру по нику */
  app.post("/award", async (req, reply) => {
    const parsed = z.object({ nick: z.string().min(1).max(64), badgeCode: z.string().min(1).max(64) }).safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid" });
    const [u] = await db.select({ id: users.id }).from(users).where(eq(users.nick, parsed.data.nick)).limit(1);
    if (!u) return reply.code(404).send({ error: "user_not_found" });
    const [b] = await db.select({ id: badges.id }).from(badges).where(eq(badges.code, parsed.data.badgeCode)).limit(1);
    if (!b) return reply.code(404).send({ error: "badge_not_found" });

    const [row] = await db
      .insert(userBadges)
      .values({ userId: u.id, badgeId: b.id })
      .onConflictDoNothing()
      .returning();
    return { ok: true, awarded: !!row };
  });

  /** DELETE /api/v1/admin/badges/award — отобрать */
  app.delete("/award", async (req, reply) => {
    const parsed = z.object({ nick: z.string().min(1).max(64), badgeCode: z.string().min(1).max(64) }).safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid" });
    const [u] = await db.select({ id: users.id }).from(users).where(eq(users.nick, parsed.data.nick)).limit(1);
    const [b] = await db.select({ id: badges.id }).from(badges).where(eq(badges.code, parsed.data.badgeCode)).limit(1);
    if (!u || !b) return reply.code(404).send({ error: "not_found" });
    await db.delete(userBadges).where(and(eq(userBadges.userId, u.id), eq(userBadges.badgeId, b.id)));
    return { ok: true };
  });
}
