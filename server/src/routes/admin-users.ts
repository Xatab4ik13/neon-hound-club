import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { users } from "../db/schema/users.js";
import { profiles } from "../db/schema/profile.js";
import { passPurchases } from "../db/schema/pass.js";
import { ticketsLedger } from "../db/schema/tickets.js";
import { badges, userBadges } from "../db/schema/badges.js";
import { requireAdmin, hashPassword } from "../lib/auth.js";
import { getOrCreateReferralCode } from "../lib/referrals.js";


/**
 * Админка юзеров: список + поиск, карточка с агрегатами, смена роли, блокировка.
 * Поля профиля (city, avatar, joinedAt) подтягиваются JOIN'ом по profiles.
 */
export async function adminUsersRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAdmin);

  // GET /api/v1/admin/users?q=&limit=
  app.get("/", async (req) => {
    const q = z
      .object({
        q: z.string().trim().max(120).optional(),
        limit: z.coerce.number().int().min(1).max(200).default(50),
      })
      .parse(req.query ?? {});

    const search = q.q?.toLowerCase();
    const where = search
      ? or(ilike(users.email, `%${search}%`), ilike(users.nick, `%${search}%`))
      : undefined;

    const rows = await db
      .select({
        id: users.id,
        email: users.email,
        nick: users.nick,
        role: users.role,
        emailVerified: users.emailVerified,
        blocked: users.blocked,
        createdAt: users.createdAt,
        city: profiles.city,
        avatarUrl: profiles.avatarUrl,
        phone: profiles.phone,
      })
      .from(users)
      .leftJoin(profiles, eq(profiles.userId, users.id))
      .where(where ?? sql`true`)
      .orderBy(desc(users.createdAt))
      .limit(q.limit);

    return { items: rows };
  });

  // GET /api/v1/admin/users/:id — карточка с агрегатами
  app.get<{ Params: { id: string } }>("/:id", async (req, reply) => {
    const [u] = await db
      .select({
        id: users.id,
        email: users.email,
        nick: users.nick,
        role: users.role,
        emailVerified: users.emailVerified,
        blocked: users.blocked,
        blockedAt: users.blockedAt,
        createdAt: users.createdAt,
        city: profiles.city,
        avatarUrl: profiles.avatarUrl,
        phone: profiles.phone,
        bio: profiles.bio,
      })
      .from(users)
      .leftJoin(profiles, eq(profiles.userId, users.id))
      .where(eq(users.id, req.params.id))
      .limit(1);

    if (!u) return reply.code(404).send({ error: "not_found" });

    const [{ balance }] = await db
      .select({ balance: sql<number>`coalesce(sum(${ticketsLedger.amount}), 0)::int` })
      .from(ticketsLedger)
      .where(eq(ticketsLedger.userId, u.id));

    const [{ earned }] = await db
      .select({
        earned: sql<number>`coalesce(sum(case when ${ticketsLedger.amount} > 0 then ${ticketsLedger.amount} else 0 end), 0)::int`,
      })
      .from(ticketsLedger)
      .where(eq(ticketsLedger.userId, u.id));

    const [activePass] = await db
      .select()
      .from(passPurchases)
      .where(and(eq(passPurchases.userId, u.id), eq(passPurchases.status, "active")))
      .orderBy(desc(passPurchases.paidAt))
      .limit(1);

    return {
      ...u,
      ticketsBalance: Number(balance ?? 0),
      ticketsEarned: Number(earned ?? 0),
      activePass: activePass ?? null,
    };
  });

  // PATCH /api/v1/admin/users/:id — роль / блокировка
  const patchSchema = z
    .object({
      role: z.enum(["user", "admin", "blogger"]).optional(),
      blocked: z.boolean().optional(),
    })
    .refine((v) => v.role !== undefined || v.blocked !== undefined, {
      message: "Нечего обновлять",
    });

  app.patch<{ Params: { id: string } }>("/:id", async (req, reply) => {
    const parsed = patchSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_input", message: parsed.error.issues[0]?.message });
    }
    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (parsed.data.role !== undefined) patch.role = parsed.data.role;
    if (parsed.data.blocked !== undefined) {
      patch.blocked = parsed.data.blocked;
      patch.blockedAt = parsed.data.blocked ? new Date() : null;
    }
    const [row] = await db
      .update(users)
      .set(patch)
      .where(eq(users.id, req.params.id))
      .returning({
        id: users.id,
        email: users.email,
        nick: users.nick,
        role: users.role,
        blocked: users.blocked,
      });
    if (!row) return reply.code(404).send({ error: "not_found" });
    return row;
  });

  // POST /api/v1/admin/users — создать юзера вручную (без письма-подтверждения)
  const createSchema = z.object({
    email: z.string().trim().toLowerCase().email().max(255),
    password: z.string().min(8).max(128),
    nick: z
      .string()
      .trim()
      .min(3)
      .max(24)
      .regex(/^[a-zA-Z0-9_]+$/, "Только латиница, цифры и _"),
    role: z.enum(["user", "admin", "blogger"]).default("user"),
    emailVerified: z.boolean().default(true),
  });

  app.post("/", async (req, reply) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_input", message: parsed.error.issues[0]?.message });
    }
    const { email, password, nick, role, emailVerified } = parsed.data;

    const existing = await db
      .select({ id: users.id, email: users.email, nick: users.nick })
      .from(users)
      .where(or(eq(users.email, email), sql`lower(${users.nick}) = lower(${nick})`))
      .limit(1);
    if (existing.length) {
      const code = existing[0].email === email ? "email_taken" : "nick_taken";
      return reply.code(409).send({ error: code });
    }

    const passwordHash = await hashPassword(password);
    const [created] = await db
      .insert(users)
      .values({
        email,
        passwordHash,
        nick,
        role,
        emailVerified,
        emailVerifiedAt: emailVerified ? new Date() : null,
      })
      .returning({ id: users.id, email: users.email, nick: users.nick, role: users.role });

    await getOrCreateReferralCode(created.id, created.nick);
    return reply.code(201).send(created);
  });

  // GET /api/v1/admin/users/:id/badges — значки конкретного юзера
  app.get<{ Params: { id: string } }>("/:id/badges", async (req) => {
    const rows = await db
      .select({
        id: userBadges.id,
        badgeId: badges.id,
        code: badges.code,
        name: badges.name,
        rarity: badges.rarity,
        category: badges.category,
        awardedAt: userBadges.awardedAt,
      })
      .from(userBadges)
      .innerJoin(badges, eq(badges.id, userBadges.badgeId))
      .where(eq(userBadges.userId, req.params.id))
      .orderBy(desc(userBadges.awardedAt));
    return { items: rows };
  });
}

