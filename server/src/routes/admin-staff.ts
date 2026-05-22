import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { desc, eq, or, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { users } from "../db/schema/users.js";
import { requireAdmin, hashPassword } from "../lib/auth.js";

/**
 * Команда админов — отдельный список от клубных юзеров.
 * Админы не показываются в /api/v1/admin/users и не имеют клубного профиля
 * для целей админки (формально запись в users есть, но в клубных списках её нет).
 */
export async function adminStaffRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAdmin);

  // GET /api/v1/admin/staff — список всех админов
  app.get("/", async () => {
    const rows = await db
      .select({
        id: users.id,
        email: users.email,
        nick: users.nick,
        role: users.role,
        blocked: users.blocked,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.role, "admin"))
      .orderBy(desc(users.createdAt));
    return { items: rows };
  });

  // POST /api/v1/admin/staff — добавить админа (email/nick/пароль)
  const createSchema = z.object({
    email: z.string().trim().toLowerCase().email().max(255),
    password: z.string().min(8).max(128),
    nick: z
      .string()
      .trim()
      .min(3)
      .max(24)
      .regex(/^[a-zA-Z0-9_]+$/, "Только латиница, цифры и _"),
  });

  app.post("/", async (req, reply) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_input", message: parsed.error.issues[0]?.message });
    }
    const { email, password, nick } = parsed.data;

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
        role: "admin",
        emailVerified: true,
        emailVerifiedAt: new Date(),
      })
      .returning({
        id: users.id,
        email: users.email,
        nick: users.nick,
        role: users.role,
        createdAt: users.createdAt,
      });

    return reply.code(201).send(created);
  });

  // DELETE /api/v1/admin/staff/:id — снять с админки (полностью удалить запись)
  app.delete<{ Params: { id: string } }>("/:id", async (req, reply) => {
    const session = req.user as { sub: string } | undefined;
    if (session?.sub === req.params.id) {
      return reply.code(400).send({ error: "cannot_delete_self" });
    }
    const [target] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, req.params.id))
      .limit(1);
    if (!target) return reply.code(404).send({ error: "not_found" });
    if (target.role !== "admin") return reply.code(400).send({ error: "not_an_admin" });

    try {
      await db.delete(users).where(eq(users.id, req.params.id));
      return { ok: true };
    } catch (err: any) {
      // У свежесозданного админа связанных записей быть не должно, но на всякий — чистим.
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
            await tx.execute(sql`UPDATE news SET created_by = NULL WHERE created_by = ${id}`);
            await tx.execute(sql`DELETE FROM profiles WHERE user_id = ${id}`);
            await tx.execute(sql`DELETE FROM users WHERE id = ${id}`);
          });
          return { ok: true };
        } catch (err2: any) {
          req.log.error({ err: err2, userId: req.params.id }, "admin staff delete cascade failed");
          return reply.code(500).send({
            error: "delete_failed",
            detail: err2?.detail ?? err2?.message ?? String(err2),
          });
        }
      }
      req.log.error({ err, userId: req.params.id }, "admin staff delete failed");
      return reply.code(500).send({
        error: "delete_failed",
        detail: err?.detail ?? err?.message ?? String(err),
      });
    }
  });
}
