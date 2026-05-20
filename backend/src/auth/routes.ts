import type { FastifyInstance } from "fastify";
import { z } from "zod";
import argon2 from "argon2";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { users, profiles } from "../db/schema.js";
import { SESSION_COOKIE, signSession } from "./jwt.js";
import { requireAuth } from "./middleware.js";
import { env } from "../env.js";

const credentialsSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(200),
});

const registerSchema = credentialsSchema.extend({
  displayName: z.string().min(1).max(80),
});

function setSessionCookie(reply: Parameters<Parameters<FastifyInstance["post"]>[2]>[1], token: string) {
  reply.setCookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "none",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    domain: env.COOKIE_DOMAIN || undefined,
  });
}

export async function authRoutes(app: FastifyInstance) {
  app.post("/auth/register", async (req, reply) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_input", details: parsed.error.flatten() });
    const { email, password, displayName } = parsed.data;

    const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (existing.length) return reply.code(409).send({ error: "email_taken" });

    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    const [created] = await db.insert(users).values({ email, passwordHash }).returning({ id: users.id });
    await db.insert(profiles).values({ userId: created.id, displayName });

    const token = await signSession(created.id);
    setSessionCookie(reply, token);
    return reply.code(201).send({ user: { id: created.id, email, displayName } });
  });

  app.post("/auth/login", async (req, reply) => {
    const parsed = credentialsSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_input" });
    const { email, password } = parsed.data;

    const [row] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!row) return reply.code(401).send({ error: "invalid_credentials" });
    const ok = await argon2.verify(row.passwordHash, password);
    if (!ok) return reply.code(401).send({ error: "invalid_credentials" });

    const token = await signSession(row.id);
    setSessionCookie(reply, token);
    const [profile] = await db.select().from(profiles).where(eq(profiles.userId, row.id)).limit(1);
    return reply.send({ user: { id: row.id, email: row.email, displayName: profile?.displayName ?? null } });
  });

  app.post("/auth/logout", async (_req, reply) => {
    reply.clearCookie(SESSION_COOKIE, { path: "/", domain: env.COOKIE_DOMAIN || undefined });
    return reply.send({ ok: true });
  });

  app.get("/auth/me", { preHandler: requireAuth }, async (req, reply) => {
    const userId = req.userId!;
    const [row] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!row) return reply.code(404).send({ error: "not_found" });
    const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
    return reply.send({
      user: { id: row.id, email: row.email, displayName: profile?.displayName ?? null, avatarUrl: profile?.avatarUrl ?? null },
    });
  });
}
