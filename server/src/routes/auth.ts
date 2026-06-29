import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq, or, sql } from "drizzle-orm";
import crypto from "node:crypto";
import { db } from "../db/client.js";
import { users } from "../db/schema/users.js";
import { profiles } from "../db/schema/profile.js";
import { emailVerificationTokens } from "../db/schema/email-verification.js";
import {
  hashPassword,
  verifyPassword,
  setSessionCookie,
  clearSessionCookie,
  setAdminSessionCookie,
  clearAdminSessionCookie,
  requireAuth,
  requireAdmin,
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

async function issueAndSendVerification(userId: string, email: string, nick: string): Promise<boolean> {
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
    return true;
  } catch (err) {
    // не валим регистрацию из-за SMTP; фронт покажет «не доставлено, попробуй позже»
    console.error("[mailer] send failed for", email, err);
    return false;
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

    const mailDelivered = await issueAndSendVerification(created.id, created.email, created.nick);

    // Без авто-логина: ждём подтверждения email.
    return reply.code(201).send({
      ok: true,
      pendingVerification: true,
      email: created.email,
      mailDelivered,
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

    // Админам клубный вход запрещён — для них отдельная форма /admin
    // и отдельная cookie hh_admin_sid. Иначе админ, залогинившись через
    // /admin, светил бы свой профиль в шапке клуба.
    if (u.role === "admin") {
      return reply.code(403).send({
        error: "admin_use_admin_login",
        message: "Войди в админку через /admin",
      });
    }

    const payload: SessionPayload = { sub: u.id, role: u.role as SessionPayload["role"], nick: u.nick };
    await setSessionCookie(reply, payload);

    return reply.send({
      user: { id: u.id, email: u.email, nick: u.nick, role: u.role },
    });
  });

  // ===== Админский вход (отдельная cookie hh_admin_sid) =====
  app.post("/admin/login", async (req, reply) => {
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
    if (u.role !== "admin") {
      return reply.code(403).send({ error: "forbidden", message: "Этот аккаунт не админ" });
    }

    const payload: SessionPayload = { sub: u.id, role: "admin", nick: u.nick };
    await setAdminSessionCookie(reply, payload);

    return reply.send({
      user: { id: u.id, email: u.email, nick: u.nick, role: u.role },
    });
  });

  app.post("/admin/logout", async (_req, reply) => {
    clearAdminSessionCookie(reply);
    return reply.send({ ok: true });
  });

  app.get("/admin/me", { preHandler: requireAdmin }, async (req, reply) => {
    const session = req.user as SessionPayload;
    const [u] = await db
      .select({
        id: users.id,
        email: users.email,
        nick: users.nick,
        role: users.role,
      })
      .from(users)
      .where(eq(users.id, session.sub))
      .limit(1);
    if (!u) {
      clearAdminSessionCookie(reply);
      return reply.code(401).send({ error: "unauthorized", message: "Сессия устарела" });
    }
    return reply.send({ user: u });
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
      // verify_email больше не квест — оставляем только бонусный XP ниже.
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

    // anti-enumeration: всегда ok. mailDelivered отдаём чтобы фронт мог
    // отличить «отправили снова» от «и снова не доставлено».
    const [u] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    let mailDelivered = true;
    if (u && !u.emailVerified) {
      mailDelivered = await issueAndSendVerification(u.id, u.email, u.nick);
    }
    return reply.send({ ok: true, mailDelivered });
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

    // Подтянуть статус телефона из profiles — нужно фронту, чтобы заранее
    // показывать баннер «подтверди номер» в местах, где это обязательно
    // (например, вход в розыгрыш).
    const [prof] = await db
      .select({ phoneE164: profiles.phoneE164 })
      .from(profiles)
      .where(eq(profiles.userId, session.sub))
      .limit(1);

    return reply.send({ user: { ...u, phoneVerified: !!prof?.phoneE164 } });
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

  // ============================================================
  // ВХОД ПО НОМЕРУ ТЕЛЕФОНА + ПАРОЛЬ
  // Только для юзеров с phone_verified_at IS NOT NULL.
  // ============================================================
  app.post("/login-by-phone", async (req, reply) => {
    const schema = z.object({
      phone: z.string().trim().min(5).max(32),
      password: passwordSchema,
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_input", message: "Проверь номер и пароль" });
    }

    const { normalizeToE164 } = await import("../lib/phone-verify.js");
    const e164 = normalizeToE164(parsed.data.phone);
    if (!e164) {
      return reply.code(400).send({ error: "invalid_phone", message: "Неверный формат номера" });
    }
    const digits = e164.replace(/\D/g, "");

    const [hit] = await db
      .select({
        id: users.id,
        email: users.email,
        nick: users.nick,
        role: users.role,
        passwordHash: users.passwordHash,
        blocked: users.blocked,
        emailVerified: users.emailVerified,
      })
      .from(users)
      .innerJoin(profiles, eq(profiles.userId, users.id))
      .where(and(eq(profiles.phoneE164, digits), sql`${profiles.phoneVerifiedAt} IS NOT NULL`))
      .limit(1);

    if (!hit || !(await verifyPassword(parsed.data.password, hit.passwordHash))) {
      return reply.code(401).send({ error: "invalid_credentials", message: "Неверный номер или пароль" });
    }
    if (hit.blocked) {
      return reply.code(403).send({ error: "user_blocked", message: "Аккаунт заблокирован" });
    }
    if (hit.role === "admin") {
      return reply.code(403).send({ error: "admin_use_admin_login", message: "Войди через /admin" });
    }

    const payload: SessionPayload = { sub: hit.id, role: hit.role as SessionPayload["role"], nick: hit.nick };
    await setSessionCookie(reply, payload);
    return reply.send({ user: { id: hit.id, email: hit.email, nick: hit.nick, role: hit.role } });
  });

  // ============================================================
  // ВОССТАНОВЛЕНИЕ ПАРОЛЯ ЧЕРЕЗ TELEGRAM (по подтверждённому телефону)
  // 1) /recovery/phone/send-code  → отправляем код в Telegram
  // 2) /recovery/phone/verify     → проверяем код, возвращаем recoveryToken (jwt 10 мин)
  // 3) /recovery/reset-password   → меняем пароль по recoveryToken
  //
  // Фронт сам показывает кнопку «не пришёл код — через email» через 60 сек.
  // ============================================================
  app.post("/recovery/phone/send-code", async (req, reply) => {
    const schema = z.object({ phone: z.string().trim().min(5).max(32) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_input", message: "Неверный номер" });
    }

    const { normalizeToE164, checkSendRateLimit, logSend, generate6digitCode, CODE_TTL_SEC } =
      await import("../lib/phone-verify.js");
    const { sendVerificationMessage } = await import("../lib/telegram-gateway.js");
    const { phoneVerifications } = await import("../db/schema/phone-verifications.js");

    const e164 = normalizeToE164(parsed.data.phone);
    // anti-enumeration: всегда успешный ответ, реально шлём только если юзер найден.
    const fakeOk = reply.send.bind(reply);
    const okBody = { ok: true, expiresInSec: CODE_TTL_SEC };

    if (!e164) return fakeOk(okBody);
    const digits = e164.replace(/\D/g, "");

    const [hit] = await db
      .select({ id: users.id, blocked: users.blocked })
      .from(users)
      .innerJoin(profiles, eq(profiles.userId, users.id))
      .where(and(eq(profiles.phoneE164, digits), sql`${profiles.phoneVerifiedAt} IS NOT NULL`))
      .limit(1);
    if (!hit || hit.blocked) return fakeOk(okBody);

    const ip = req.ip ?? null;
    const limit = await checkSendRateLimit({ phoneE164: e164, ip });
    if (!limit.ok) {
      return reply
        .code(429)
        .header("Retry-After", String(limit.retryAfterSec))
        .send({ error: "rate_limited", retryAfterSec: limit.retryAfterSec });
    }

    const code = generate6digitCode();
    try {
      const sent = await sendVerificationMessage({
        phoneE164: e164,
        code,
        ttl: CODE_TTL_SEC,
        payload: `recovery:${hit.id}`,
      });
      await db.insert(phoneVerifications).values({
        userId: hit.id,
        phoneE164: e164,
        purpose: "recovery",
        requestId: sent.request_id,
        expiresAt: new Date(Date.now() + CODE_TTL_SEC * 1000),
      });
      await logSend({ phoneE164: e164, ip, purpose: "recovery" });
      return reply.send({ ok: true, requestId: sent.request_id, expiresInSec: CODE_TTL_SEC });
    } catch (e) {
      req.log.error({ err: e }, "recovery send failed");
      return reply.code(502).send({ error: "gateway_failed", message: "Не удалось отправить код" });
    }
  });

  app.post("/recovery/phone/verify", async (req, reply) => {
    const schema = z.object({
      requestId: z.string().min(1).max(200),
      code: z.string().trim().regex(/^\d{4,8}$/),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_input", message: "Неверный код" });
    }

    const { findActiveVerification, MAX_ATTEMPTS } = await import("../lib/phone-verify.js");
    const { checkVerificationStatus } = await import("../lib/telegram-gateway.js");
    const { phoneVerifications } = await import("../db/schema/phone-verifications.js");

    const row = await findActiveVerification(parsed.data.requestId);
    if (!row || !row.userId || row.purpose !== "recovery") {
      return reply.code(404).send({ error: "request_not_found", message: "Код устарел, запроси новый" });
    }
    if (row.attempts >= MAX_ATTEMPTS) {
      return reply.code(429).send({ error: "too_many_attempts", message: "Слишком много попыток" });
    }

    let status;
    try {
      status = await checkVerificationStatus({ requestId: row.requestId, code: parsed.data.code });
    } catch (e) {
      req.log.error({ err: e }, "recovery check failed");
      return reply.code(502).send({ error: "gateway_failed", message: "Ошибка проверки кода" });
    }

    await db
      .update(phoneVerifications)
      .set({ attempts: row.attempts + 1 })
      .where(eq(phoneVerifications.id, row.id));

    if (status.verification_status?.status !== "code_valid") {
      const s = status.verification_status?.status;
      const map: Record<string, { code: number; msg: string }> = {
        code_invalid: { code: 400, msg: "Неверный код" },
        code_max_attempts_exceeded: { code: 429, msg: "Слишком много попыток" },
        expired: { code: 410, msg: "Код истёк" },
      };
      const m = map[s ?? ""] ?? { code: 400, msg: "Не удалось подтвердить код" };
      return reply.code(m.code).send({ error: s ?? "code_failed", message: m.msg });
    }

    await db
      .update(phoneVerifications)
      .set({ consumedAt: new Date() })
      .where(eq(phoneVerifications.id, row.id));

    // Короткоживущий jwt со scope=password_reset, 10 минут.
    const recoveryToken = await reply.jwtSign(
      { sub: row.userId, scope: "password_reset" },
      { expiresIn: "10m" },
    );
    return reply.send({ ok: true, recoveryToken });
  });

  app.post("/recovery/reset-password", async (req, reply) => {
    const schema = z.object({
      recoveryToken: z.string().min(10),
      newPassword: passwordSchema,
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_input", message: parsed.error.issues[0]?.message });
    }
    let decoded: { sub: string; scope?: string };
    try {
      decoded = await app.jwt.verify(parsed.data.recoveryToken);
    } catch {
      return reply.code(401).send({ error: "invalid_token", message: "Токен истёк, начни заново" });
    }
    if (decoded.scope !== "password_reset" || !decoded.sub) {
      return reply.code(401).send({ error: "invalid_token", message: "Неверный токен" });
    }

    const newHash = await hashPassword(parsed.data.newPassword);
    const updated = await db
      .update(users)
      .set({ passwordHash: newHash, updatedAt: new Date() })
      .where(eq(users.id, decoded.sub))
      .returning({ id: users.id });
    if (updated.length === 0) {
      return reply.code(404).send({ error: "user_not_found" });
    }
    return reply.send({ ok: true });
  });
}
