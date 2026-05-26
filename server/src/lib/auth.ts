import type { FastifyReply, FastifyRequest } from "fastify";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { users } from "../db/schema/users.js";

const COOKIE_NAME = "hh_sid";
const TOKEN_TTL_DAYS = 30;

export interface SessionPayload {
  sub: string; // user id
  role: "user" | "admin" | "blogger";
  nick: string;
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/** Логин: подписываем JWT и кладём в httpOnly cookie на родительский домен. */
export async function setSessionCookie(
  reply: FastifyReply,
  payload: SessionPayload,
): Promise<string> {
  const token = await reply.jwtSign(payload, { expiresIn: `${TOKEN_TTL_DAYS}d` });
  reply.setCookie(COOKIE_NAME, token, cookieOptions());
  return token;
}

export function clearSessionCookie(reply: FastifyReply): void {
  reply.clearCookie(COOKIE_NAME, cookieOptions());
}

function cookieOptions() {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProd,
    // Для Lovable preview фронт и API находятся на разных доменах,
    // поэтому браузер не отправит cookie в XHR/fetch при SameSite=Lax.
    // В проде включаем None+Secure, чтобы админка и превью могли ходить к API.
    sameSite: (isProd ? "none" : "lax") as const,
    path: "/",
    // В проде .hhr.pro — куку видят и hhr.pro, и api.hhr.pro.
    // В dev оставляем undefined (текущий хост).
    domain: process.env.COOKIE_DOMAIN || undefined,
    maxAge: TOKEN_TTL_DAYS * 24 * 60 * 60,
  };
}

async function hydrateFreshSession(req: FastifyRequest): Promise<SessionPayload | null> {
  const tokenUser = req.user as SessionPayload;
  const [row] = await db
    .select({ id: users.id, role: users.role, nick: users.nick })
    .from(users)
    .where(eq(users.id, tokenUser.sub))
    .limit(1);

  if (!row) return null;

  const fresh: SessionPayload = {
    sub: row.id,
    role: row.role as SessionPayload["role"],
    nick: row.nick,
  };

  (req as FastifyRequest & { user: SessionPayload }).user = fresh;
  return fresh;
}

/** preHandler: подгружает сессию из cookie. Не падает, если её нет. */
export async function loadSession(req: FastifyRequest): Promise<void> {
  try {
    await req.jwtVerify();
    await hydrateFreshSession(req);
  } catch {
    // нет/невалидная — оставляем req.user undefined
  }
}

/** preHandler: требует валидную сессию, иначе 401. */
export async function requireAuth(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    await req.jwtVerify();
    const fresh = await hydrateFreshSession(req);
    if (!fresh) {
      return reply.code(401).send({ error: "unauthorized", message: "Сессия устарела" });
    }
  } catch {
    return reply.code(401).send({ error: "unauthorized", message: "Требуется вход" });
  }
}

/** preHandler: требует роль admin. */
export async function requireAdmin(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    await req.jwtVerify();
    const u = await hydrateFreshSession(req);
    if (!u) {
      return reply.code(401).send({ error: "unauthorized", message: "Сессия устарела" });
    }
    if (u.role !== "admin") {
      return reply.code(403).send({ error: "forbidden", message: "Только для админа" });
    }
  } catch {
    return reply.code(401).send({ error: "unauthorized", message: "Требуется вход" });
  }
}

/** preHandler: требует роль blogger или admin. */
export async function requireBloggerOrAdmin(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    await req.jwtVerify();
    const u = await hydrateFreshSession(req);
    if (!u) {
      return reply.code(401).send({ error: "unauthorized", message: "Сессия устарела" });
    }
    if (u.role !== "admin" && u.role !== "blogger") {
      return reply.code(403).send({ error: "forbidden", message: "Только для блогера" });
    }
  } catch {
    return reply.code(401).send({ error: "unauthorized", message: "Требуется вход" });
  }
}
