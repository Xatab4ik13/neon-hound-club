import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { and, desc, eq, ilike, ne, or, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { users } from "../db/schema/users.js";
import { profiles } from "../db/schema/profile.js";
import { passPurchases, PASS_CONFIG, PASS_TIERS, type PassTier } from "../db/schema/pass.js";
import { ticketsLedger } from "../db/schema/tickets.js";
import { orders } from "../db/schema/shop.js";
import { badges, userBadges } from "../db/schema/badges.js";
import { requireAdmin, hashPassword } from "../lib/auth.js";
import { getOrCreateReferralCode } from "../lib/referrals.js";
import { activatePassPurchase } from "../lib/pass.js";
import { parsePagination } from "../lib/pagination.js";


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
    const searchWhere = search
      ? or(ilike(users.email, `%${search}%`), ilike(users.nick, `%${search}%`))
      : undefined;
    // Админы — не клубные юзеры, они живут в /api/v1/admin/staff.
    const where = searchWhere
      ? and(ne(users.role, "admin"), searchWhere)
      : ne(users.role, "admin");

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
      .where(where)
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

    // Сумма потраченного в магазине: только оплаченные/отправленные/доставленные заказы.
    const [{ totalSpentRub, ordersCount }] = await db
      .select({
        totalSpentRub: sql<number>`coalesce(sum(${orders.totalRub}), 0)::int`,
        ordersCount: sql<number>`count(*)::int`,
      })
      .from(orders)
      .where(
        and(
          eq(orders.userId, u.id),
          sql`${orders.status} in ('paid','shipped','delivered')`,
        ),
      );

    const { getXpTotal, computeRank } = await import("../lib/xp.js");
    const xpTotal = await getXpTotal(u.id);
    const rank = computeRank(xpTotal);

    return {
      ...u,
      ticketsBalance: Number(balance ?? 0),
      ticketsEarned: Number(earned ?? 0),
      totalSpentRub: Number(totalSpentRub ?? 0),
      ordersCount: Number(ordersCount ?? 0),
      activePass: activePass ?? null,
      xpTotal,
      rank,
    };
  });

  // DELETE /api/v1/admin/users/:id — полное удаление
  app.delete<{ Params: { id: string } }>("/:id", async (req, reply) => {
    const session = req.user as { sub: string } | undefined;
    if (session?.sub === req.params.id) {
      return reply.code(400).send({ error: "cannot_delete_self" });
    }
    try {
      const [row] = await db
        .delete(users)
        .where(eq(users.id, req.params.id))
        .returning({ id: users.id });
      if (!row) return reply.code(404).send({ error: "not_found" });
      return { ok: true };
    } catch (err: any) {
      req.log.error({ err, userId: req.params.id }, "admin delete user failed");
      // FK violation (constraint без CASCADE на старой БД) — чистим связи руками и пробуем ещё раз
      if (err?.code === "23503") {
        try {
          await db.transaction(async (tx) => {
            const id = req.params.id;
            await tx.execute(sql`DELETE FROM user_badges WHERE user_id = ${id}`);
            await tx.execute(sql`DELETE FROM email_verifications WHERE user_id = ${id}`);
            await tx.execute(sql`DELETE FROM pass_purchases WHERE user_id = ${id}`);
            await tx.execute(sql`DELETE FROM tickets_ledger WHERE user_id = ${id}`);
            await tx.execute(sql`UPDATE tickets_ledger SET created_by = NULL WHERE created_by = ${id}`);
            await tx.execute(sql`DELETE FROM xp_ledger WHERE user_id = ${id}`);
            await tx.execute(sql`UPDATE xp_ledger SET created_by = NULL WHERE created_by = ${id}`);
            await tx.execute(sql`DELETE FROM quest_progress WHERE user_id = ${id}`);
            await tx.execute(sql`DELETE FROM referrals WHERE referrer_id = ${id} OR invited_user_id = ${id}`);
            await tx.execute(sql`DELETE FROM referral_codes WHERE user_id = ${id}`);
            await tx.execute(sql`DELETE FROM raffle_entries WHERE user_id = ${id}`);
            await tx.execute(sql`UPDATE raffles SET winner_user_id = NULL WHERE winner_user_id = ${id}`);
            await tx.execute(sql`DELETE FROM orders WHERE user_id = ${id}`);
            await tx.execute(sql`DELETE FROM post_votes WHERE user_id = ${id}`);
            await tx.execute(sql`DELETE FROM post_likes WHERE user_id = ${id}`);
            await tx.execute(sql`DELETE FROM post_comments WHERE user_id = ${id}`);
            await tx.execute(sql`DELETE FROM posts WHERE author_id = ${id}`);
            
            await tx.execute(sql`DELETE FROM profiles WHERE user_id = ${id}`);
            await tx.execute(sql`DELETE FROM users WHERE id = ${id}`);
          });
          return { ok: true };
        } catch (err2: any) {
          req.log.error({ err: err2, userId: req.params.id }, "admin delete user cascade failed");
          return reply.code(500).send({
            error: "delete_failed",
            detail: err2?.detail ?? err2?.message ?? String(err2),
          });
        }
      }
      return reply.code(500).send({
        error: "delete_failed",
        detail: err?.detail ?? err?.message ?? String(err),
      });
    }
  });

  // PATCH /api/v1/admin/users/:id — роль / блокировка
  const patchSchema = z
    .object({
      role: z.enum(["user", "blogger"]).optional(),
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
    // Админами этот endpoint не управляет — они в /api/v1/admin/staff.
    const [target] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, req.params.id))
      .limit(1);
    if (!target) return reply.code(404).send({ error: "not_found" });
    if (target.role === "admin") return reply.code(403).send({ error: "is_admin_use_staff_endpoint" });

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
    role: z.enum(["user", "blogger"]).default("user"),
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

  // POST /api/v1/admin/users/:id/gift-pass — подарить Hell Pass (priceRub=0)
  const giftPassSchema = z.object({
    tier: z.enum(PASS_TIERS),
  });
  app.post<{ Params: { id: string } }>("/:id/gift-pass", async (req, reply) => {
    const parsed = giftPassSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_input", message: parsed.error.issues[0]?.message });
    }
    const [u] = await db.select({ id: users.id }).from(users).where(eq(users.id, req.params.id)).limit(1);
    if (!u) return reply.code(404).send({ error: "not_found" });

    const tier = parsed.data.tier as PassTier;
    const cfg = PASS_CONFIG[tier];
    const [purchase] = await db
      .insert(passPurchases)
      .values({
        userId: u.id,
        tier,
        priceRub: 0, // подарок
        ticketsGranted: cfg.tickets,
        status: "pending_payment",
      })
      .returning();
    const res = await activatePassPurchase(purchase!.id);
    if (!res.ok) {
      return reply.code(500).send({ error: "activation_failed", reason: res.reason });
    }
    return { ok: true, tier, purchaseId: purchase!.id };
  });
}


