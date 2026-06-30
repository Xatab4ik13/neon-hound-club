import type { FastifyReply, FastifyRequest } from "fastify";
import bcrypt from "bcryptjs";
import { and, eq, or, isNull, lt, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { users } from "../db/schema/users.js";

// Клубная и админская cookie — РАЗНЫЕ.
// Логин в админку не должен светить админский профиль в клубе и наоборот.
// Обе живут на Path=/ родительского домена .hhr.pro, но бэк строго
// разделяет: клубные хэндлеры читают только hh_sid, админские — hh_admin_sid.
const COOKIE_NAME = "hh_sid";
const ADMIN_COOKIE_NAME = "hh_admin_sid";
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

/** Клубная сессия. Ставится при /auth/login обычного юзера/блогера. */
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

/** Админская сессия. Ставится ТОЛЬКО при /auth/admin/login. */
export async function setAdminSessionCookie(
  reply: FastifyReply,
  payload: SessionPayload,
): Promise<string> {
  const token = await reply.jwtSign(payload, { expiresIn: `${TOKEN_TTL_DAYS}d` });
  reply.setCookie(ADMIN_COOKIE_NAME, token, cookieOptions());
  return token;
}

export function clearAdminSessionCookie(reply: FastifyReply): void {
  reply.clearCookie(ADMIN_COOKIE_NAME, cookieOptions());
}

function cookieOptions() {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProd,
    // Для Lovable preview фронт и API находятся на разных доменах,
    // поэтому браузер не отправит cookie в XHR/fetch при SameSite=Lax.
    // В проде включаем None+Secure, чтобы админка и превью могли ходить к API.
    sameSite: (isProd ? "none" : "lax") as "none" | "lax",
    path: "/",
    // В проде .hhr.pro — куку видят и hhr.pro, и api.hhr.pro.
    // В dev оставляем undefined (текущий хост).
    domain: process.env.COOKIE_DOMAIN || undefined,
    maxAge: TOKEN_TTL_DAYS * 24 * 60 * 60,
  };
}

async function hydrateFreshSession(
  req: FastifyRequest,
  sub: string,
): Promise<SessionPayload | null> {
  const [row] = await db
    .select({ id: users.id, role: users.role, nick: users.nick })
    .from(users)
    .where(eq(users.id, sub))
    .limit(1);

  if (!row) return null;

  const fresh: SessionPayload = {
    sub: row.id,
    role: row.role as SessionPayload["role"],
    nick: row.nick,
  };

  (req as FastifyRequest & { user: SessionPayload }).user = fresh;

  // Throttled "last seen" — обновляем не чаще раза в 30 сек, чтобы не нагружать БД.
  // Ошибки глотаем — это не должно ломать запрос.
  void db
    .update(users)
    .set({ lastSeenAt: new Date() })
    .where(
      and(
        eq(users.id, row.id),
        or(
          isNull(users.lastSeenAt),
          lt(users.lastSeenAt, sql`now() - interval '30 seconds'`),
        ),
      ),
    )
    .catch(() => {});

  return fresh;
}

/** preHandler: подгружает КЛУБНУЮ сессию из cookie. Не падает, если её нет. */
export async function loadSession(req: FastifyRequest): Promise<void> {
  try {
    await req.jwtVerify(); // читает hh_sid (см. конфиг плагина в app.ts)
    const tokenUser = req.user as SessionPayload;
    await hydrateFreshSession(req, tokenUser.sub);
  } catch {
    // нет/невалидная — оставляем req.user undefined
  }
}

/** preHandler: требует валидную КЛУБНУЮ сессию, иначе 401. */
export async function requireAuth(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    await req.jwtVerify();
    const tokenUser = req.user as SessionPayload;
    const fresh = await hydrateFreshSession(req, tokenUser.sub);
    if (!fresh) {
      return reply.code(401).send({ error: "unauthorized", message: "Сессия устарела" });
    }
  } catch {
    return reply.code(401).send({ error: "unauthorized", message: "Требуется вход" });
  }
}

/** Верифицируем токен из админской cookie вручную — плагин @fastify/jwt
 *  настроен на hh_sid, поэтому req.jwtVerify() сюда не подходит. */
async function verifyAdminToken(req: FastifyRequest): Promise<SessionPayload | null> {
  const token = req.cookies[ADMIN_COOKIE_NAME];
  if (!token) return null;
  try {
    const decoded = await req.server.jwt.verify<SessionPayload>(token);
    return decoded;
  } catch {
    return null;
  }
}

/** preHandler: требует валидную АДМИНСКУЮ сессию (отдельная cookie). */
export async function requireAdmin(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const decoded = await verifyAdminToken(req);
  if (!decoded) {
    return reply.code(401).send({ error: "unauthorized", message: "Требуется вход в админку" });
  }
  const fresh = await hydrateFreshSession(req, decoded.sub);
  if (!fresh) {
    return reply.code(401).send({ error: "unauthorized", message: "Сессия устарела" });
  }
  if (fresh.role !== "admin") {
    return reply.code(403).send({ error: "forbidden", message: "Только для админа" });
  }
}

/** preHandler: требует роль blogger или admin (через КЛУБНУЮ cookie — блогер
 *  работает внутри клуба). Админ при этом тоже может, если у него есть клубная
 *  сессия; админка же продолжает требовать hh_admin_sid через requireAdmin. */
export async function requireBloggerOrAdmin(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    await req.jwtVerify();
    const tokenUser = req.user as SessionPayload;
    const u = await hydrateFreshSession(req, tokenUser.sub);
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
