import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq, or, sql } from "drizzle-orm";
import crypto from "node:crypto";
import { db } from "../db/client.js";
import { users } from "../db/schema/users.js";
import { emailVerificationTokens } from "../db/schema/email-verification.js";
import {
  hashPassword,
  verifyPassword,
  setSessionCookie,
  clearSessionCookie,
  requireAuth,
  type SessionPayload,
} from "../lib/auth.js";
import { sendMail } from "../lib/mailer.js";
import { verifyEmailTemplate } from "../lib/email-templates/verify.js";
import { tryCompleteQuest } from "../lib/quests.js";
import { attachReferral, activateReferral, getOrCreateReferralCode } from "../lib/referrals.js";
import { awardXp } from "../lib/xp.js";

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
  ref: z.string().trim().max(40).optional(),
});

const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

const resendSchema = z.object({ email: emailSchema });

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

function frontendBase(): string {
  return (process.env.FRONTEND_ORIGIN ?? "https://hhr.pro").replace(/\/$/, "");
}

function makeVerificationToken() {
  const raw = crypto.randomBytes(32).toString("hex"); // 64 hex chars
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  return { raw, hash };
}

async function issueAndSendVerification(userId: string, email: string, nick: string) {
  const { raw, hash } = makeVerificationToken();
  await db.insert(emailVerificationTokens).values({
    userId,
    tokenHash: hash,
    expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
  });
  const verifyUrl = `${frontendBase()}/verify-email?token=${raw}`;
  const { subject, html, text } = verifyEmailTemplate({ nick, verifyUrl });
  try {
    await sendMail({ to: email, subject, html, text });
  } catch (err) {
    // не валим регистрацию из-за SMTP; юзер сможет нажать "Отправить заново"
    console.error("[mailer] send failed", err);
  }
}

export async function authRoutes(app: FastifyInstance) {
  app.post("/register", async (req, reply) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_input", message: parsed.error.issues[0]?.message ?? "bad input" });
    }
    const { email, password, nick, ref } = parsed.data;

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
      .returning({ id: users.id, email: users.email, nick: users.nick });

    // Создаём реф-код новому юзеру и подвязываем к рефереру, если есть ?ref=.
    await getOrCreateReferralCode(created.id, created.nick);
    if (ref) {
      try { await attachReferral(created.id, ref); } catch (e) { req.log.error({ err: e }, "attachReferral failed"); }
    }

    await issueAndSendVerification(created.id, created.email, created.nick);

    // Без авто-логина: ждём подтверждения email.
    return reply.code(201).send({
      ok: true,
      pendingVerification: true,
      email: created.email,
    });
  });

  app.post("/login", async (req, reply) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_input", message: "Проверь email и пароль" });
    }
    const { email, password } = parsed.data;

    const [u] = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (!u || !(await verifyPassword(password, u.passwordHash))) {
      return reply.code(401).send({ error: "invalid_credentials", message: "Неверный email или пароль" });
    }

    if (u.blocked) {
      return reply.code(403).send({ error: "user_blocked", message: "Аккаунт заблокирован" });
    }

    if (!u.emailVerified) {
      return reply.code(403).send({
        error: "email_not_verified",
        message: "Подтверди email — мы отправили ссылку на почту",
        email: u.email,
      });
    }

    const payload: SessionPayload = { sub: u.id, role: u.role as SessionPayload["role"], nick: u.nick };
    await setSessionCookie(reply, payload);

    return reply.send({
      user: { id: u.id, email: u.email, nick: u.nick, role: u.role },
    });
  });

  // GET чтобы можно было кликать прямо из письма
  app.get("/verify-email", async (req, reply) => {
    const token = z.string().length(64).regex(/^[a-f0-9]+$/).safeParse((req.query as { token?: string })?.token);
    if (!token.success) {
      return reply.code(400).send({ error: "invalid_token", message: "Неверная ссылка" });
    }
    const hash = crypto.createHash("sha256").update(token.data).digest("hex");

    // Берём токен по хешу БЕЗ фильтра usedAt — почтовики (Mail.ru, Yandex,
    // Gmail) автоматически префетчат ссылку для антифишинг-сканирования
    // и сжигают её до клика пользователя. Допускаем повторное использование
    // в течение срока жизни токена (24ч).
    const [row] = await db
      .select()
      .from(emailVerificationTokens)
      .where(eq(emailVerificationTokens.tokenHash, hash))
      .limit(1);

    if (!row || row.expiresAt.getTime() < Date.now()) {
      return reply.code(400).send({ error: "invalid_or_expired", message: "Ссылка недействительна или истекла" });
    }

    const wasAlreadyUsed = row.usedAt !== null;

    if (!wasAlreadyUsed) {
      await db.update(emailVerificationTokens).set({ usedAt: new Date() }).where(eq(emailVerificationTokens.id, row.id));
    }

    const [u] = wasAlreadyUsed
      ? await db
          .select({ id: users.id, email: users.email, nick: users.nick, role: users.role })
          .from(users)
          .where(eq(users.id, row.userId))
          .limit(1)
      : await db
          .update(users)
          .set({ emailVerified: true, emailVerifiedAt: new Date(), updatedAt: new Date() })
          .where(eq(users.id, row.userId))
          .returning({ id: users.id, email: users.email, nick: users.nick, role: users.role });

    if (!u) return reply.code(404).send({ error: "user_not_found" });

    // авто-логин после подтверждения
    const payload: SessionPayload = { sub: u.id, role: u.role as SessionPayload["role"], nick: u.nick };
    await setSessionCookie(reply, payload);

    // Квесты/XP/рефералка — только при первой настоящей активации
    if (!wasAlreadyUsed) {
      await tryCompleteQuest(u.id, "verify_email");
      await awardXp({
        userId: u.id,
        amount: 50,
        source: "verify_email",
        reason: "Подтверждён email",
        refType: "user",
        refId: u.id,
        idempotent: true,
      });
      try { await activateReferral(u.id); } catch (e) { req.log.error({ err: e }, "activateReferral failed"); }
    }

    return reply.send({ ok: true, user: u });
  });

  app.post("/resend-verification", async (req, reply) => {
    const parsed = resendSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_input", message: "Неверный email" });
    }
    const { email } = parsed.data;

    // anti-enumeration: всегда ok
    const [u] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (u && !u.emailVerified) {
      await issueAndSendVerification(u.id, u.email, u.nick);
    }
    return reply.send({ ok: true });
  });

  app.post("/logout", async (_req, reply) => {
    clearSessionCookie(reply);
    return reply.send({ ok: true });
  });

  app.get("/me", { preHandler: requireAuth }, async (req, reply) => {
    const session = req.user as SessionPayload;
    const [u] = await db
      .select({
        id: users.id,
        email: users.email,
        nick: users.nick,
        role: users.role,
        emailVerified: users.emailVerified,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, session.sub))
      .limit(1);

    if (!u) {
      clearSessionCookie(reply);
      return reply.code(401).send({ error: "unauthorized", message: "Сессия устарела" });
    }
    return reply.send({ user: u });
  });

  // POST /auth/change-password — смена пароля авторизованного юзера
  app.post("/change-password", { preHandler: requireAuth }, async (req, reply) => {
    const schema = z.object({
      currentPassword: z.string().min(1).max(128),
      newPassword: passwordSchema,
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_input", message: parsed.error.issues[0]?.message });
    }
    const session = req.user as SessionPayload;
    const [u] = await db.select().from(users).where(eq(users.id, session.sub)).limit(1);
    if (!u) return reply.code(401).send({ error: "unauthorized" });
    const ok = await verifyPassword(parsed.data.currentPassword, u.passwordHash);
    if (!ok) return reply.code(400).send({ error: "wrong_password", message: "Текущий пароль неверный" });
    const newHash = await hashPassword(parsed.data.newPassword);
    await db
      .update(users)
      .set({ passwordHash: newHash, updatedAt: new Date() })
      .where(eq(users.id, session.sub));
    return reply.send({ ok: true });
  });

  // DELETE /auth/me — удалить свой аккаунт (cascade удалит профиль/байки/адрес/прочее)
  app.delete("/me", { preHandler: requireAuth }, async (req, reply) => {
    const schema = z.object({ confirmNick: z.string().min(1).max(64) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_input", message: "Нужно подтверждение ника" });
    }
    const session = req.user as SessionPayload;
    const [u] = await db.select().from(users).where(eq(users.id, session.sub)).limit(1);
    if (!u) return reply.code(401).send({ error: "unauthorized" });
    if (u.nick.toLowerCase() !== parsed.data.confirmNick.trim().toLowerCase()) {
      return reply.code(400).send({ error: "nick_mismatch", message: "Ник не совпадает" });
    }
    await db.delete(users).where(eq(users.id, session.sub));
    clearSessionCookie(reply);
    return reply.send({ ok: true });
  });
}
