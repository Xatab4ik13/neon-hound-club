import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq, or, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { users } from "../db/schema/users.js";
import {
  hashPassword,
  verifyPassword,
  setSessionCookie,
  clearSessionCookie,
  requireAuth,
  type SessionPayload,
} from "../lib/auth.js";

const emailSchema = z.string().trim().toLowerCase().email().max(255);
const passwordSchema = z.string().min(8).max(128);
const nickSchema = z
  .string()
  .trim()
  .min(3)
  .max(32)
  .regex(/^[a-zA-Z0-9_]+$/, "только латиница, цифры и _");

const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  nick: nickSchema,
});

const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export async function authRoutes(app: FastifyInstance) {
  app.post("/register", async (req, reply) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_input", message: parsed.error.issues[0]?.message ?? "bad input" });
    }
    const { email, password, nick } = parsed.data;

    const existing = await db
      .select({ id: users.id, email: users.email, nick: users.nick })
      .from(users)
      .where(or(eq(users.email, email), sql`lower(${users.nick}) = lower(${nick})`))
      .limit(1);

    if (existing[0]) {
      const code = existing[0].email === email ? "email_taken" : "nick_taken";
      return reply.code(409).send({ error: code, message: code === "email_taken" ? "Email уже занят" : "Ник уже занят" });
    }

    const passwordHash = await hashPassword(password);
    const [created] = await db
      .insert(users)
      .values({ email, passwordHash, nick })
      .returning({ id: users.id, email: users.email, nick: users.nick, role: users.role });

    const payload: SessionPayload = { sub: created.id, role: created.role as "user" | "admin", nick: created.nick };
    await setSessionCookie(reply, payload);

    return reply.code(201).send({ user: created });
  });

  app.post("/login", async (req, reply) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_input", message: "Проверь email и пароль" });
    }
    const { email, password } = parsed.data;

    const [u] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!u || !(await verifyPassword(password, u.passwordHash))) {
      return reply.code(401).send({ error: "invalid_credentials", message: "Неверный email или пароль" });
    }

    const payload: SessionPayload = { sub: u.id, role: u.role as "user" | "admin", nick: u.nick };
    await setSessionCookie(reply, payload);

    return reply.send({
      user: { id: u.id, email: u.email, nick: u.nick, role: u.role },
    });
  });

  app.post("/logout", async (_req, reply) => {
    clearSessionCookie(reply);
    return reply.send({ ok: true });
  });

  app.get("/me", { preHandler: requireAuth }, async (req, reply) => {
    const session = req.user as SessionPayload;
    const [u] = await db
      .select({ id: users.id, email: users.email, nick: users.nick, role: users.role, createdAt: users.createdAt })
      .from(users)
      .where(eq(users.id, session.sub))
      .limit(1);

    if (!u) {
      clearSessionCookie(reply);
      return reply.code(401).send({ error: "unauthorized", message: "Сессия устарела" });
    }
    return reply.send({ user: u });
  });
}
