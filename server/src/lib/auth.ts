import type { FastifyReply, FastifyRequest } from "fastify";
import bcrypt from "bcryptjs";

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
    sameSite: "lax" as const,
    path: "/",
    // В проде .hhr.pro — куку видят и hhr.pro, и api.hhr.pro.
    // В dev оставляем undefined (текущий хост).
    domain: process.env.COOKIE_DOMAIN || undefined,
    maxAge: TOKEN_TTL_DAYS * 24 * 60 * 60,
  };
}

/** preHandler: подгружает сессию из cookie. Не падает, если её нет. */
export async function loadSession(req: FastifyRequest): Promise<void> {
  try {
    await req.jwtVerify();
  } catch {
    // нет/невалидная — оставляем req.user undefined
  }
}

/** preHandler: требует валидную сессию, иначе 401. */
export async function requireAuth(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    await req.jwtVerify();
  } catch {
    reply.code(401).send({ error: "unauthorized", message: "Требуется вход" });
  }
}

/** preHandler: требует роль admin. */
export async function requireAdmin(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    await req.jwtVerify();
    const u = req.user as SessionPayload;
    if (u.role !== "admin") {
      reply.code(403).send({ error: "forbidden", message: "Только для админа" });
    }
  } catch {
    reply.code(401).send({ error: "unauthorized", message: "Требуется вход" });
  }
}
