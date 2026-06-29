import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { and, desc, eq, sql } from "drizzle-orm";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { db } from "../db/client.js";
import { users } from "../db/schema/users.js";
import { profiles, bikes, deliveryAddresses, notificationPrefs } from "../db/schema/profile.js";
import { requireAuth, type SessionPayload } from "../lib/auth.js";
import { isOurS3Url, deleteByPublicUrl } from "../lib/s3.js";
import { tryCompleteQuest } from "../lib/quests.js";
import { getXpTotal, computeRank } from "../lib/xp.js";

/** Проверка: URL либо null, либо ведёт на наш S3-бакет. */
const ourS3Url = z
  .string()
  .url()
  .refine((u) => isOurS3Url(u), { message: "Файл нужно загрузить через нашу форму загрузки" });


// ---------- PROFILE ----------

const patchProfileSchema = z.object({
  phone: z.string().trim().min(5).max(32).nullable().optional(),
  city: z.string().trim().min(1).max(80).nullable().optional(),
  avatarUrl: ourS3Url.nullable().optional(),
  bio: z.string().max(1000).nullable().optional(),
  instagram: z
    .string()
    .trim()
    .max(80)
    .regex(/^[a-zA-Z0-9_.]+$/, "только латиница, цифры, _ и .")
    .nullable()
    .optional(),
  telegram: z
    .string()
    .trim()
    .max(80)
    .regex(/^[a-zA-Z0-9_]+$/, "только латиница, цифры и _")
    .nullable()
    .optional(),
  youtube: z.string().trim().max(120).nullable().optional(),
});

async function ensureProfile(userId: string) {
  // upsert no-op чтобы строка точно была
  await db
    .insert(profiles)
    .values({ userId })
    .onConflictDoNothing({ target: profiles.userId });
}

export async function profileRoutes(app: FastifyInstance) {
  // GET /api/v1/profile/me — мой профиль (с email/nick из users) + кол-во мото
  app.get("/me", { preHandler: requireAuth }, async (req) => {
    const session = req.user as SessionPayload;
    await ensureProfile(session.sub);

    const [row] = await db
      .select({
        userId: users.id,
        email: users.email,
        nick: users.nick,
        role: users.role,
        emailVerified: users.emailVerified,
        joinedAt: users.createdAt,
        phone: profiles.phone,
        phoneVerifiedAt: profiles.phoneVerifiedAt,
        city: profiles.city,
        avatarUrl: profiles.avatarUrl,
        bio: profiles.bio,
        instagram: profiles.instagram,
        telegram: profiles.telegram,
        youtube: profiles.youtube,
      })
      .from(users)
      .leftJoin(profiles, eq(profiles.userId, users.id))
      .where(eq(users.id, session.sub))
      .limit(1);

    const [{ bikesCount }] = await db
      .select({ bikesCount: sql<number>`count(*)::int` })
      .from(bikes)
      .where(eq(bikes.userId, session.sub));

    const xpTotal = await getXpTotal(session.sub);
    const rank = computeRank(xpTotal);

    return {
      ...row,
      phoneVerified: !!row?.phoneVerifiedAt,
      bikesCount,
      xpTotal,
      rank,
    };
  });

  // PATCH /api/v1/profile/me — частичное обновление.
  // ВНИМАНИЕ: поле `phone` больше нельзя задать здесь напрямую — телефон
  // ставится ТОЛЬКО через /phone/send-code → /phone/verify. Если фронт
  // (старая версия) пришлёт phone — мы молча его игнорируем.
  app.patch("/me", { preHandler: requireAuth }, async (req, reply) => {
    const parsed = patchProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_input", message: parsed.error.issues[0]?.message });
    }
    const session = req.user as SessionPayload;
    await ensureProfile(session.sub);

    // phone выпиливаем из апдейта — он управляется отдельным флоу верификации.
    const { phone: _ignored, ...patch } = parsed.data;
    void _ignored;

    // Если меняется avatarUrl — найдём старый и удалим из S3 после успешного апдейта.
    let oldAvatarToDelete: string | null = null;
    if (patch.avatarUrl !== undefined) {
      const [prev] = await db
        .select({ avatarUrl: profiles.avatarUrl })
        .from(profiles)
        .where(eq(profiles.userId, session.sub))
        .limit(1);
      if (prev?.avatarUrl && prev.avatarUrl !== patch.avatarUrl) {
        oldAvatarToDelete = prev.avatarUrl;
      }
    }

    await db
      .update(profiles)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(profiles.userId, session.sub));

    if (oldAvatarToDelete) await deleteByPublicUrl(oldAvatarToDelete);

    // Квест: профиль заполнен + есть мото в гараже.
    await tryCompleteQuest(session.sub, "profile_and_bike");

    return { ok: true };
  });

  // ============================================================
  // PHONE VERIFICATION (Telegram Gateway)
  // ============================================================

  app.post("/phone/send-code", { preHandler: requireAuth }, async (req, reply) => {
    const session = req.user as SessionPayload;
    const schema = z.object({ phone: z.string().trim().min(5).max(32) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_input", message: "Укажи номер" });
    }

    const { normalizeToE164, checkSendRateLimit, logSend, generate6digitCode, isPhoneTakenByOther, CODE_TTL_SEC } =
      await import("../lib/phone-verify.js");
    const { sendVerificationMessage } = await import("../lib/telegram-gateway.js");

    const e164 = normalizeToE164(parsed.data.phone);
    if (!e164) {
      return reply
        .code(400)
        .send({ error: "invalid_phone", message: "Укажи корректный номер в международном формате" });
    }

    if (await isPhoneTakenByOther(e164, session.sub)) {
      return reply
        .code(409)
        .send({ error: "phone_taken", message: "Этот номер уже привязан к другому аккаунту" });
    }

    const ip = req.ip ?? null;
    const limit = await checkSendRateLimit({ phoneE164: e164, ip });
    if (!limit.ok) {
      return reply
        .code(429)
        .header("Retry-After", String(limit.retryAfterSec))
        .send({ error: "rate_limited", message: "Слишком часто. Подожди немного.", retryAfterSec: limit.retryAfterSec });
    }

    const code = generate6digitCode();
    let sent;
    try {
      sent = await sendVerificationMessage({
        phoneE164: e164,
        code,
        ttl: CODE_TTL_SEC,
        payload: `verify:${session.sub}`,
      });
    } catch (e) {
      const err = e as Error & { code?: string };
      req.log.error({ err }, "telegram gateway send failed");
      const status = err.code === "FLOOD_WAIT" ? 429 : 502;
      return reply.code(status).send({ error: err.code ?? "gateway_failed", message: "Не удалось отправить код" });
    }

    await db.insert(phoneVerifications).values({
      userId: session.sub,
      phoneE164: e164,
      purpose: "verify",
      requestId: sent.request_id,
      expiresAt: new Date(Date.now() + CODE_TTL_SEC * 1000),
    });
    await logSend({ phoneE164: e164, ip, purpose: "verify" });

    return reply.send({
      ok: true,
      requestId: sent.request_id,
      expiresInSec: CODE_TTL_SEC,
      phoneMasked: e164.replace(/(\+\d{2})\d+(\d{2})$/, "$1•••$2"),
    });
  });

  app.post("/phone/verify", { preHandler: requireAuth }, async (req, reply) => {
    const session = req.user as SessionPayload;
    const schema = z.object({
      requestId: z.string().min(1).max(200),
      code: z.string().trim().regex(/^\d{4,8}$/),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_input", message: "Неверный код" });
    }

    const { findActiveVerification, isPhoneTakenByOther, MAX_ATTEMPTS } = await import("../lib/phone-verify.js");
    const { checkVerificationStatus } = await import("../lib/telegram-gateway.js");

    const row = await findActiveVerification(parsed.data.requestId);
    if (!row || row.userId !== session.sub || row.purpose !== "verify") {
      return reply.code(404).send({ error: "request_not_found", message: "Код устарел, запроси новый" });
    }
    if (row.attempts >= MAX_ATTEMPTS) {
      return reply.code(429).send({ error: "too_many_attempts", message: "Слишком много попыток" });
    }

    let status;
    try {
      status = await checkVerificationStatus({ requestId: row.requestId, code: parsed.data.code });
    } catch (e) {
      const err = e as Error & { code?: string };
      req.log.error({ err }, "telegram check failed");
      return reply.code(502).send({ error: "gateway_failed", message: "Ошибка проверки кода" });
    }

    await db
      .update(phoneVerifications)
      .set({ attempts: row.attempts + 1 })
      .where(eq(phoneVerifications.id, row.id));

    const vstatus = status.verification_status?.status;
    if (vstatus !== "code_valid") {
      const map: Record<string, { code: number; msg: string }> = {
        code_invalid: { code: 400, msg: "Неверный код" },
        code_max_attempts_exceeded: { code: 429, msg: "Слишком много попыток" },
        expired: { code: 410, msg: "Код истёк, запроси новый" },
      };
      const m = map[vstatus ?? ""] ?? { code: 400, msg: "Не удалось подтвердить код" };
      return reply.code(m.code).send({ error: vstatus ?? "code_failed", message: m.msg });
    }

    // Финальная проверка анти-мультиак (между send и verify номер мог занять кто-то ещё).
    if (await isPhoneTakenByOther(row.phoneE164, session.sub)) {
      return reply
        .code(409)
        .send({ error: "phone_taken", message: "Этот номер уже привязан к другому аккаунту" });
    }

    const phoneE164Digits = row.phoneE164.replace(/\D/g, "");
    await db
      .update(profiles)
      .set({
        phone: row.phoneE164,
        phoneE164: phoneE164Digits,
        phoneVerifiedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(profiles.userId, session.sub));

    await db
      .update(phoneVerifications)
      .set({ consumedAt: new Date() })
      .where(eq(phoneVerifications.id, row.id));

    // Если телефон только что появился — пробуем активировать реферал.
    try {
      const { activateReferral } = await import("../lib/referrals.js");
      await activateReferral(session.sub);
    } catch (e) {
      req.log.error({ err: e }, "activateReferral on phone verify failed");
    }

    return reply.send({ ok: true, phoneVerified: true });
  });



  // GET /api/v1/profile/:nick — публичный (для шеринга профиля)
  app.get<{ Params: { nick: string } }>("/:nick", async (req, reply) => {
    const [u] = await db
      .select({ id: users.id, nick: users.nick, createdAt: users.createdAt, role: users.role })
      .from(users)
      .where(sql`lower(${users.nick}) = lower(${req.params.nick})`)
      .limit(1);
    if (!u) return reply.code(404).send({ error: "not_found" });

    const [p] = await db.select().from(profiles).where(eq(profiles.userId, u.id)).limit(1);
    const [primary] = await db
      .select()
      .from(bikes)
      .where(and(eq(bikes.userId, u.id), eq(bikes.isPrimary, true)))
      .limit(1);
    const [{ bikesCount }] = await db
      .select({ bikesCount: sql<number>`count(*)::int` })
      .from(bikes)
      .where(eq(bikes.userId, u.id));

    const xpTotal = await getXpTotal(u.id);
    const rank = computeRank(xpTotal);

    return {
      nick: u.nick,
      role: u.role,
      joinedAt: u.createdAt,
      city: p?.city ?? null,
      avatarUrl: p?.avatarUrl ?? null,
      bio: p?.bio ?? null,
      instagram: p?.instagram ?? null,
      telegram: p?.telegram ?? null,
      youtube: p?.youtube ?? null,
      bikesCount,
      xpTotal,
      rank,
      primaryBike: primary
        ? {
            brand: primary.brand,
            model: primary.model,
            year: primary.year,
            nickname: primary.nickname,
            photo: primary.photos[0] ?? null,
          }
        : null,
    };
  });

  // ============================================================
  // DELIVERY ADDRESS (СДЭК)
  // ============================================================

  const addressSchema = z.object({
    fullName: z.string().trim().max(120).default(""),
    phone: z.string().trim().max(32).default(""),
    city: z.string().trim().max(80).default(""),
    postalCode: z.string().trim().max(16).default(""),
    pickupPoint: z.string().trim().max(500).default(""),
    comment: z.string().trim().max(500).default(""),
  });

  app.get("/me/address", { preHandler: requireAuth }, async (req) => {
    const session = req.user as SessionPayload;
    const [row] = await db
      .select()
      .from(deliveryAddresses)
      .where(eq(deliveryAddresses.userId, session.sub))
      .limit(1);
    return (
      row ?? {
        userId: session.sub,
        fullName: "",
        phone: "",
        city: "",
        postalCode: "",
        pickupPoint: "",
        comment: "",
      }
    );
  });

  app.put("/me/address", { preHandler: requireAuth }, async (req, reply) => {
    const parsed = addressSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_input", message: parsed.error.issues[0]?.message });
    }
    const session = req.user as SessionPayload;
    await db
      .insert(deliveryAddresses)
      .values({ userId: session.sub, ...parsed.data })
      .onConflictDoUpdate({
        target: deliveryAddresses.userId,
        set: { ...parsed.data, updatedAt: new Date() },
      });
    return { ok: true };
  });

  // ============================================================
  // NOTIFICATION PREFS
  // ============================================================

  const notifSchema = z.object({
    emailRaffles: z.boolean().optional(),
    emailOrders: z.boolean().optional(),
    emailNews: z.boolean().optional(),
    pushRaffles: z.boolean().optional(),
    pushOrders: z.boolean().optional(),
    pushNews: z.boolean().optional(),
  });

  const defaultPrefs = {
    emailRaffles: true,
    emailOrders: true,
    emailNews: false,
    pushRaffles: true,
    pushOrders: true,
    pushNews: false,
  };

  app.get("/me/notifications", { preHandler: requireAuth }, async (req) => {
    const session = req.user as SessionPayload;
    const [row] = await db
      .select()
      .from(notificationPrefs)
      .where(eq(notificationPrefs.userId, session.sub))
      .limit(1);
    return row ?? { userId: session.sub, ...defaultPrefs };
  });

  app.put("/me/notifications", { preHandler: requireAuth }, async (req, reply) => {
    const parsed = notifSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_input", message: parsed.error.issues[0]?.message });
    }
    const session = req.user as SessionPayload;
    await db
      .insert(notificationPrefs)
      .values({ userId: session.sub, ...defaultPrefs, ...parsed.data })
      .onConflictDoUpdate({
        target: notificationPrefs.userId,
        set: { ...parsed.data, updatedAt: new Date() },
      });
    return { ok: true };
  });
}

// ---------- GARAGE ----------

const createBikeSchema = z.object({
  brand: z.string().trim().min(1).max(64),
  model: z.string().trim().min(1).max(80),
  year: z.number().int().min(1900).max(new Date().getFullYear() + 1).nullable().optional(),
  engineCc: z.number().int().min(1).max(10000).nullable().optional(),
  color: z.string().trim().max(40).nullable().optional(),
  nickname: z.string().trim().max(60).nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
  mileage: z.string().trim().max(40).nullable().optional(),
  purchaseDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "ожидается yyyy-mm-dd")
    .nullable()
    .optional(),
  mods: z.array(z.string().trim().min(1).max(80)).max(50).default([]),
  photos: z.array(ourS3Url).max(20).default([]),
  isPrimary: z.boolean().default(false),
});

const patchBikeSchema = createBikeSchema.partial();

export async function garageRoutes(app: FastifyInstance) {
  // GET /api/v1/garage — мои мото (primary первым)
  app.get("/", { preHandler: requireAuth }, async (req) => {
    const session = req.user as SessionPayload;
    const rows = await db
      .select()
      .from(bikes)
      .where(eq(bikes.userId, session.sub))
      .orderBy(desc(bikes.isPrimary), desc(bikes.createdAt));
    return { items: rows };
  });

  // GET /api/v1/garage/:id
  app.get<{ Params: { id: string } }>("/:id", { preHandler: requireAuth }, async (req, reply) => {
    const session = req.user as SessionPayload;
    const [b] = await db.select().from(bikes).where(eq(bikes.id, req.params.id)).limit(1);
    if (!b || b.userId !== session.sub) return reply.code(404).send({ error: "not_found" });
    return b;
  });

  // POST /api/v1/garage — добавить
  app.post("/", { preHandler: requireAuth }, async (req, reply) => {
    const parsed = createBikeSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_input", message: parsed.error.issues[0]?.message });
    }
    const session = req.user as SessionPayload;
    const d = parsed.data;

    // если первый байк юзера — автоматически делаем primary
    const [{ c }] = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(bikes)
      .where(eq(bikes.userId, session.sub));
    const shouldBePrimary = d.isPrimary || c === 0;

    // снимаем primary с других, если ставим primary
    if (shouldBePrimary) {
      await db
        .update(bikes)
        .set({ isPrimary: false })
        .where(and(eq(bikes.userId, session.sub), eq(bikes.isPrimary, true)));
    }

    const [row] = await db
      .insert(bikes)
      .values({
        userId: session.sub,
        brand: d.brand,
        model: d.model,
        year: d.year ?? null,
        engineCc: d.engineCc ?? null,
        color: d.color ?? null,
        nickname: d.nickname ?? null,
        notes: d.notes ?? null,
        mileage: d.mileage ?? null,
        purchaseDate: d.purchaseDate ?? null,
        mods: d.mods,
        photos: d.photos,
        isPrimary: shouldBePrimary,
      })
      .returning();

    // Квест: профиль заполнен + есть мото в гараже.
    await tryCompleteQuest(session.sub, "profile_and_bike");

    return reply.code(201).send(row);
  });

  // PATCH /api/v1/garage/:id
  app.patch<{ Params: { id: string } }>("/:id", { preHandler: requireAuth }, async (req, reply) => {
    const parsed = patchBikeSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_input", message: parsed.error.issues[0]?.message });
    }
    const session = req.user as SessionPayload;
    const [b] = await db.select().from(bikes).where(eq(bikes.id, req.params.id)).limit(1);
    if (!b || b.userId !== session.sub) return reply.code(404).send({ error: "not_found" });

    const d = parsed.data;
    if (d.isPrimary === true) {
      await db
        .update(bikes)
        .set({ isPrimary: false })
        .where(and(eq(bikes.userId, session.sub), eq(bikes.isPrimary, true)));
    }

    // Если photos обновили — удалим из S3 ушедшие фото.
    let removedPhotos: string[] = [];
    if (d.photos !== undefined) {
      const newSet = new Set(d.photos);
      removedPhotos = b.photos.filter((u) => !newSet.has(u));
    }

    const [row] = await db
      .update(bikes)
      .set({ ...d, updatedAt: new Date() })
      .where(eq(bikes.id, req.params.id))
      .returning();

    for (const url of removedPhotos) await deleteByPublicUrl(url);

    return row;
  });

  // DELETE /api/v1/garage/:id
  app.delete<{ Params: { id: string } }>("/:id", { preHandler: requireAuth }, async (req, reply) => {
    const session = req.user as SessionPayload;
    const [b] = await db.select().from(bikes).where(eq(bikes.id, req.params.id)).limit(1);
    if (!b || b.userId !== session.sub) return reply.code(404).send({ error: "not_found" });

    await db.delete(bikes).where(eq(bikes.id, req.params.id));

    // Подчистим фото в S3.
    for (const url of b.photos ?? []) await deleteByPublicUrl(url);


    // если удалили primary и остались другие — назначим самого свежего основным
    if (b.isPrimary) {
      const [next] = await db
        .select({ id: bikes.id })
        .from(bikes)
        .where(eq(bikes.userId, session.sub))
        .orderBy(desc(bikes.createdAt))
        .limit(1);
      if (next) {
        await db.update(bikes).set({ isPrimary: true, updatedAt: new Date() }).where(eq(bikes.id, next.id));
      }
    }
    return { ok: true };
  });

  // POST /api/v1/garage/:id/primary — назначить основным
  app.post<{ Params: { id: string } }>("/:id/primary", { preHandler: requireAuth }, async (req, reply) => {
    const session = req.user as SessionPayload;
    const [b] = await db.select().from(bikes).where(eq(bikes.id, req.params.id)).limit(1);
    if (!b || b.userId !== session.sub) return reply.code(404).send({ error: "not_found" });

    await db
      .update(bikes)
      .set({ isPrimary: false })
      .where(and(eq(bikes.userId, session.sub), eq(bikes.isPrimary, true)));
    await db.update(bikes).set({ isPrimary: true, updatedAt: new Date() }).where(eq(bikes.id, req.params.id));
    return { ok: true };
  });
}
