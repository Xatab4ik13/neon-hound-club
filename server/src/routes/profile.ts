import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { users } from "../db/schema/users.js";
import { profiles, bikes } from "../db/schema/profile.js";
import { requireAuth, type SessionPayload } from "../lib/auth.js";
import { isOurS3Url, deleteByPublicUrl } from "../lib/s3.js";
import { tryCompleteQuest } from "../lib/quests.js";

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

    return { ...row, bikesCount };
  });

  // PATCH /api/v1/profile/me — частичное обновление
  app.patch("/me", { preHandler: requireAuth }, async (req, reply) => {
    const parsed = patchProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_input", message: parsed.error.issues[0]?.message });
    }
    const session = req.user as SessionPayload;
    await ensureProfile(session.sub);

    // Если меняется avatarUrl — найдём старый и удалим из S3 после успешного апдейта.
    let oldAvatarToDelete: string | null = null;
    if (parsed.data.avatarUrl !== undefined) {
      const [prev] = await db
        .select({ avatarUrl: profiles.avatarUrl })
        .from(profiles)
        .where(eq(profiles.userId, session.sub))
        .limit(1);
      if (prev?.avatarUrl && prev.avatarUrl !== parsed.data.avatarUrl) {
        oldAvatarToDelete = prev.avatarUrl;
      }
    }

    await db
      .update(profiles)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(profiles.userId, session.sub));

    if (oldAvatarToDelete) await deleteByPublicUrl(oldAvatarToDelete);

    // Условный квест: профиль заполнен (аватар + город + телефон + bio >=10).
    await tryCompleteQuest(session.sub, "profile_complete");

    return { ok: true };
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

    // Квест: первая мото в гараже.
    if (c === 0) await tryCompleteQuest(session.sub, "first_bike");

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
