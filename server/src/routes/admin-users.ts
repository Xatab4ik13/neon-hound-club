import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { and, asc, desc, eq, ilike, ne, or, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { users } from "../db/schema/users.js";
import { profiles } from "../db/schema/profile.js";
import { passPurchases, PASS_CONFIG, PASS_TIERS, type PassTier } from "../db/schema/pass.js";
import { ticketsLedger } from "../db/schema/tickets.js";
import { orders } from "../db/schema/shop.js";
import { badges, userBadges } from "../db/schema/badges.js";
import { userStickerPacks } from "../db/schema/stickers.js";
import { pushSubscriptions } from "../db/schema/push.js";
import { requireAdmin, hashPassword } from "../lib/auth.js";
import { getOrCreateReferralCode } from "../lib/referrals.js";
import { activatePassPurchase } from "../lib/pass.js";
import { parsePagination } from "../lib/pagination.js";

// Список платных стикерпаков, которые админ может дарить.
// Должен совпадать с ALL_PACK_SLUGS в server/src/routes/stickers.ts.
const GIFTABLE_STICKER_PACKS = [
  { slug: "special", title: "Special" },
  { slug: "hell-minions", title: "Hell Minions" },
] as const;
const STICKER_PACK_SLUGS = GIFTABLE_STICKER_PACKS.map((p) => p.slug) as [string, ...string[]];


/**
 * Админка юзеров: список + поиск, карточка с агрегатами, смена роли, блокировка.
 * Поля профиля (city, avatar, joinedAt) подтягиваются JOIN'ом по profiles.
 */
export async function adminUsersRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAdmin);

  // GET /api/v1/admin/users?q=&page=&pageSize=&sort=&dir=&role=
  app.get("/", async (req) => {
    const q = z
      .object({
        q: z.string().trim().max(120).optional(),
        sort: z
          .enum([
            "nick",
            "email",
            "city",
            "role",
            "emailVerified",
            "phoneVerified",
            "status",
            "lastSeenAt",
            "hasPush",
            "createdAt",
          ])
          .optional()
          .default("createdAt"),
        dir: z.enum(["asc", "desc"]).optional().default("desc"),
        role: z.enum(["user", "blogger"]).optional(),
      })
      .parse(req.query ?? {});
    const { page, pageSize, offset } = parsePagination(req.query);

    const search = q.q?.toLowerCase();
    const searchWhere = search
      ? or(ilike(users.email, `%${search}%`), ilike(users.nick, `%${search}%`))
      : undefined;
    // Админы — не клубные юзеры, они живут в /api/v1/admin/staff.
    const conditions = [ne(users.role, "admin")];
    if (searchWhere) conditions.push(searchWhere);
    if (q.role) conditions.push(eq(users.role, q.role));
    const where = conditions.length === 1 ? conditions[0] : and(...conditions);


    // Маппинг колонки сортировки на SQL-выражение.
    const phoneVerifiedExpr = sql`(${profiles.phoneVerifiedAt} IS NOT NULL)`;
    const hasPushExpr = sql<boolean>`EXISTS (SELECT 1 FROM ${pushSubscriptions} ps WHERE ps.user_id = ${users.id})`;
    // status: сначала заблокированные (true), потом активные — единый признак для сортировки.
    const statusExpr = sql`${users.blocked}`;
    const sortMap = {
      nick: sql`lower(${users.nick})`,
      email: sql`lower(${users.email})`,
      city: sql`lower(coalesce(${profiles.city}, ''))`,
      role: users.role,
      emailVerified: users.emailVerified,
      phoneVerified: phoneVerifiedExpr,
      status: statusExpr,
      lastSeenAt: sql`${users.lastSeenAt} NULLS LAST`,
      hasPush: hasPushExpr,
      createdAt: users.createdAt,
    } as const;
    const sortCol = sortMap[q.sort];
    const orderExpr = q.dir === "asc" ? asc(sortCol as any) : desc(sortCol as any);
    // Стабильный вторичный порядок, чтобы пагинация не «прыгала» при равных значениях.
    const orderBy = [orderExpr, desc(users.createdAt)];

    const [rows, totalRows] = await Promise.all([
      db
        .select({
          id: users.id,
          email: users.email,
          nick: users.nick,
          role: users.role,
          emailVerified: users.emailVerified,
          phoneVerified: phoneVerifiedExpr.as("phone_verified"),
          blocked: users.blocked,
          createdAt: users.createdAt,
          lastSeenAt: users.lastSeenAt,
          hasPush: hasPushExpr.as("has_push"),
          city: profiles.city,
          avatarUrl: profiles.avatarUrl,
          phone: profiles.phone,
        })
        .from(users)
        .leftJoin(profiles, eq(profiles.userId, users.id))
        .where(where)
        .orderBy(...orderBy)
        .limit(pageSize)
        .offset(offset),
      db
        .select({ c: sql<number>`count(*)::int` })
        .from(users)
        .where(where),
    ]);

    return { items: rows, total: totalRows[0]?.c ?? 0, page, pageSize };
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
        phoneVerified: sql<boolean>`(${profiles.phoneVerifiedAt} IS NOT NULL)`.as(
          "phone_verified",
        ),
        blocked: users.blocked,
        blockedAt: users.blockedAt,
        createdAt: users.createdAt,
        lastSeenAt: users.lastSeenAt,
        hasPush: sql<boolean>`EXISTS (SELECT 1 FROM ${pushSubscriptions} ps WHERE ps.user_id = ${users.id})`.as(
          "has_push",
        ),
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
          sql`${orders.status} in ('paid','awaiting_stock','ready_to_ship','waybill_created','shipped','delivered')`,
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

  // GET /api/v1/admin/users/sticker-packs — список паков, которые админ может подарить
  app.get("/sticker-packs", async () => {
    return { items: GIFTABLE_STICKER_PACKS };
  });

  // POST /api/v1/admin/users/:id/gift-stickers — подарить стикерпак
  const giftStickersSchema = z.object({
    packSlug: z.enum(STICKER_PACK_SLUGS),
  });
  app.post<{ Params: { id: string } }>("/:id/gift-stickers", async (req, reply) => {
    const parsed = giftStickersSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_input", message: parsed.error.issues[0]?.message });
    }
    const [u] = await db.select({ id: users.id }).from(users).where(eq(users.id, req.params.id)).limit(1);
    if (!u) return reply.code(404).send({ error: "not_found" });

    try {
      await db
        .insert(userStickerPacks)
        .values({ userId: u.id, packSlug: parsed.data.packSlug, source: "gift" })
        .onConflictDoNothing();
    } catch (err: any) {
      req.log.error({ err }, "gift stickers failed");
      return reply.code(500).send({ error: "gift_failed" });
    }
    return { ok: true, packSlug: parsed.data.packSlug };
  });
}


