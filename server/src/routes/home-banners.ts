// /api/v1/home/banners — публичный список активных баннеров для карусели на /club.
// /api/v1/admin/home/banners/* — CRUD для админа.

import type { FastifyInstance } from "fastify";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client.js";
import { homeBanners } from "../db/schema/home-banners.js";
import { requireAdmin } from "../lib/auth.js";

// ctaHref: или внутренний путь вида /club/shop, или https-URL.
const hrefSchema = z
  .string()
  .trim()
  .min(1)
  .max(300)
  .refine((s) => s.startsWith("/") || /^https?:\/\//i.test(s), {
    message: "Ссылка должна начинаться с '/' (внутренняя) или 'http(s)://' (внешняя)",
  });

const bannerInputSchema = z.object({
  title: z.string().trim().min(1).max(120),
  eyebrow: z.string().trim().max(120).default(""),
  ctaLabel: z.string().trim().min(1).max(40).default("Открыть"),
  ctaHref: hrefSchema,
  imageUrl: z.string().trim().url().max(1000),
  sort: z.number().int().min(0).max(9999).default(0),
  active: z.boolean().default(true),
});

const bannerPatchSchema = bannerInputSchema.partial();

function zodMessage(error: z.ZodError) {
  return error.issues[0]?.message ?? "Проверь поля баннера";
}

export async function homeBannersRoutes(app: FastifyInstance) {
  // Публично: только активные, отсортированные.
  app.get("/", async () => {
    const rows = await db
      .select()
      .from(homeBanners)
      .where(eq(homeBanners.active, true))
      .orderBy(asc(homeBanners.sort), asc(homeBanners.createdAt));
    return { banners: rows };
  });
}

export async function adminHomeBannersRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAdmin);

  // Полный список (включая выключенные).
  app.get("/", async () => {
    const rows = await db
      .select()
      .from(homeBanners)
      .orderBy(asc(homeBanners.sort), asc(homeBanners.createdAt));
    return { banners: rows };
  });

  app.post("/", async (req, reply) => {
    const parsed = bannerInputSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: "invalid_input",
        message: zodMessage(parsed.error),
        details: parsed.error.flatten(),
      });
    }
    const [created] = await db.insert(homeBanners).values(parsed.data).returning();
    return reply.code(201).send({ banner: created });
  });

  app.patch<{ Params: { id: string } }>("/:id", async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const parsed = bannerPatchSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: "invalid_input",
        message: zodMessage(parsed.error),
        details: parsed.error.flatten(),
      });
    }
    const [updated] = await db
      .update(homeBanners)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(homeBanners.id, id))
      .returning();
    if (!updated) return reply.code(404).send({ error: "not_found" });
    return { banner: updated };
  });

  app.delete<{ Params: { id: string } }>("/:id", async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const [deleted] = await db.delete(homeBanners).where(eq(homeBanners.id, id)).returning();
    if (!deleted) return reply.code(404).send({ error: "not_found" });
    return { ok: true };
  });
}
