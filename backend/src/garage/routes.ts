import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { userMotorcycles } from "../db/schema.js";
import { requireAuth } from "../auth/middleware.js";

const currentYear = new Date().getFullYear();

const motorcycleSchema = z.object({
  nickname: z.string().trim().max(60).optional().nullable(),
  brand: z.string().trim().min(1).max(60),
  model: z.string().trim().min(1).max(80),
  year: z.number().int().min(1950).max(currentYear + 1),
  engineCc: z.number().int().min(50).max(3000).optional().nullable(),
  mileageKm: z.number().int().min(0).max(2_000_000).optional().nullable(),
  vin: z.string().trim().length(17).regex(/^[A-HJ-NPR-Z0-9]+$/i).optional().nullable(),
  photoUrl: z.string().url().max(1000).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  isPrimary: z.boolean().optional(),
});

const updateSchema = motorcycleSchema.partial();

export async function garageRoutes(app: FastifyInstance) {
  // Список своих мото. Primary всегда первым.
  app.get("/garage", { preHandler: requireAuth }, async (req) => {
    const userId = req.userId!;
    const bikes = await db
      .select()
      .from(userMotorcycles)
      .where(eq(userMotorcycles.userId, userId))
      .orderBy(desc(userMotorcycles.isPrimary), desc(userMotorcycles.createdAt));
    return { motorcycles: bikes };
  });

  app.post("/garage", { preHandler: requireAuth }, async (req, reply) => {
    const parsed = motorcycleSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_input", details: parsed.error.flatten() });
    const userId = req.userId!;

    // Если это первая мото — автоматически primary.
    const existing = await db
      .select({ id: userMotorcycles.id })
      .from(userMotorcycles)
      .where(eq(userMotorcycles.userId, userId))
      .limit(1);
    const isFirst = existing.length === 0;
    const wantsPrimary = parsed.data.isPrimary === true || isFirst;

    // Если ставим primary — сбросить флаг у остальных.
    if (wantsPrimary && !isFirst) {
      await db
        .update(userMotorcycles)
        .set({ isPrimary: false, updatedAt: new Date() })
        .where(and(eq(userMotorcycles.userId, userId), eq(userMotorcycles.isPrimary, true)));
    }

    const [created] = await db
      .insert(userMotorcycles)
      .values({ ...parsed.data, userId, isPrimary: wantsPrimary })
      .returning();
    return reply.code(201).send({ motorcycle: created });
  });

  app.patch("/garage/:id", { preHandler: requireAuth }, async (req, reply) => {
    const idParam = z.object({ id: z.string().uuid() }).safeParse(req.params);
    if (!idParam.success) return reply.code(400).send({ error: "invalid_id" });
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_input", details: parsed.error.flatten() });
    const userId = req.userId!;
    const { id } = idParam.data;

    const [existing] = await db
      .select()
      .from(userMotorcycles)
      .where(and(eq(userMotorcycles.id, id), eq(userMotorcycles.userId, userId)))
      .limit(1);
    if (!existing) return reply.code(404).send({ error: "not_found" });

    // Promote to primary — сначала сбросить старый primary.
    if (parsed.data.isPrimary === true && !existing.isPrimary) {
      await db
        .update(userMotorcycles)
        .set({ isPrimary: false, updatedAt: new Date() })
        .where(and(eq(userMotorcycles.userId, userId), eq(userMotorcycles.isPrimary, true)));
    }
    // Нельзя снять primary напрямую (иначе вообще без primary останется) — игнорим false.
    const patch = { ...parsed.data };
    if (patch.isPrimary === false) delete patch.isPrimary;

    const [updated] = await db
      .update(userMotorcycles)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(userMotorcycles.id, id))
      .returning();
    return reply.send({ motorcycle: updated });
  });

  app.delete("/garage/:id", { preHandler: requireAuth }, async (req, reply) => {
    const idParam = z.object({ id: z.string().uuid() }).safeParse(req.params);
    if (!idParam.success) return reply.code(400).send({ error: "invalid_id" });
    const userId = req.userId!;
    const { id } = idParam.data;

    const [deleted] = await db
      .delete(userMotorcycles)
      .where(and(eq(userMotorcycles.id, id), eq(userMotorcycles.userId, userId)))
      .returning({ id: userMotorcycles.id, wasPrimary: userMotorcycles.isPrimary });
    if (!deleted) return reply.code(404).send({ error: "not_found" });

    // Если удалили primary — назначить primary самой свежей из оставшихся.
    if (deleted.wasPrimary) {
      const [next] = await db
        .select({ id: userMotorcycles.id })
        .from(userMotorcycles)
        .where(eq(userMotorcycles.userId, userId))
        .orderBy(desc(userMotorcycles.createdAt))
        .limit(1);
      if (next) {
        await db
          .update(userMotorcycles)
          .set({ isPrimary: true, updatedAt: new Date() })
          .where(eq(userMotorcycles.id, next.id));
      }
    }
    return reply.send({ ok: true });
  });
}
