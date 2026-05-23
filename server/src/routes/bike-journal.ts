import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { bikes } from "../db/schema/profile.js";
import {
  bikeServiceEntries,
  bikeRides,
  bikeDocuments,
} from "../db/schema/bike-journal.js";
import { requireAuth, type SessionPayload } from "../lib/auth.js";
import { isOurS3Url, deleteByPublicUrl } from "../lib/s3.js";
import { addQuestProgress } from "../lib/quests.js";

const SERVICE_TYPES = ["oil", "chain", "tires", "brakes", "to", "filter", "other"] as const;
const DOC_TYPES = ["osago", "kasko", "to", "sts", "pts", "license"] as const;

const ourS3Url = z.string().url().refine((u) => isOurS3Url(u), {
  message: "Файл нужно загрузить через нашу форму загрузки",
});
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "ожидается yyyy-mm-dd");

async function assertOwnsBike(userId: string, bikeId: string): Promise<boolean> {
  const [b] = await db.select({ id: bikes.id }).from(bikes).where(eq(bikes.id, bikeId)).limit(1);
  if (!b) return false;
  const [own] = await db
    .select({ id: bikes.id })
    .from(bikes)
    .where(and(eq(bikes.id, bikeId), eq(bikes.userId, userId)))
    .limit(1);
  return !!own;
}

// ---------- SERVICE ----------

const createServiceSchema = z.object({
  bikeId: z.string().uuid(),
  type: z.enum(SERVICE_TYPES),
  date: isoDate,
  mileage: z.number().int().min(0).max(10_000_000),
  note: z.string().max(2000).optional().nullable(),
});

// ---------- RIDES ----------

const createRideSchema = z.object({
  bikeId: z.string().uuid(),
  date: isoDate,
  km: z.number().int().min(0).max(100_000),
  note: z.string().max(2000).optional().nullable(),
});

// ---------- DOCUMENTS ----------

const createDocSchema = z.object({
  bikeId: z.string().uuid(),
  type: z.enum(DOC_TYPES),
  number: z.string().trim().max(80).optional().nullable(),
  issueDate: isoDate.optional().nullable(),
  expiryDate: isoDate.optional().nullable(),
  photos: z.array(ourS3Url).max(10).default([]),
  note: z.string().max(2000).optional().nullable(),
});
const patchDocSchema = createDocSchema.partial().omit({ bikeId: true });

export async function bikeJournalRoutes(app: FastifyInstance) {
  // GET /api/v1/garage/journal → { service, rides } по всем моим байкам
  app.get("/journal", { preHandler: requireAuth }, async (req) => {
    const session = req.user as SessionPayload;
    const [service, rides] = await Promise.all([
      db
        .select()
        .from(bikeServiceEntries)
        .where(eq(bikeServiceEntries.userId, session.sub))
        .orderBy(desc(bikeServiceEntries.date), desc(bikeServiceEntries.createdAt)),
      db
        .select()
        .from(bikeRides)
        .where(eq(bikeRides.userId, session.sub))
        .orderBy(desc(bikeRides.date), desc(bikeRides.createdAt)),
    ]);
    return { service, rides };
  });

  app.post("/service", { preHandler: requireAuth }, async (req, reply) => {
    const parsed = createServiceSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_input", message: parsed.error.issues[0]?.message });
    const session = req.user as SessionPayload;
    if (!(await assertOwnsBike(session.sub, parsed.data.bikeId))) {
      return reply.code(404).send({ error: "bike_not_found" });
    }
    const [row] = await db
      .insert(bikeServiceEntries)
      .values({
        userId: session.sub,
        bikeId: parsed.data.bikeId,
        type: parsed.data.type,
        date: parsed.data.date,
        mileage: parsed.data.mileage,
        note: parsed.data.note ?? null,
      })
      .returning();
    return reply.code(201).send(row);
  });

  app.delete<{ Params: { id: string } }>("/service/:id", { preHandler: requireAuth }, async (req, reply) => {
    const session = req.user as SessionPayload;
    const [row] = await db.select().from(bikeServiceEntries).where(eq(bikeServiceEntries.id, req.params.id)).limit(1);
    if (!row || row.userId !== session.sub) return reply.code(404).send({ error: "not_found" });
    await db.delete(bikeServiceEntries).where(eq(bikeServiceEntries.id, req.params.id));
    return { ok: true };
  });

  app.post("/rides", { preHandler: requireAuth }, async (req, reply) => {
    const parsed = createRideSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_input", message: parsed.error.issues[0]?.message });
    const session = req.user as SessionPayload;
    if (!(await assertOwnsBike(session.sub, parsed.data.bikeId))) {
      return reply.code(404).send({ error: "bike_not_found" });
    }
    const [row] = await db
      .insert(bikeRides)
      .values({
        userId: session.sub,
        bikeId: parsed.data.bikeId,
        date: parsed.data.date,
        km: parsed.data.km,
        note: parsed.data.note ?? null,
      })
      .returning();
    // Квест: 500 км за месяц (monthly).
    if (parsed.data.km > 0) {
      await addQuestProgress(session.sub, "ride_500km", parsed.data.km).catch(() => null);
    }
    return reply.code(201).send(row);
  });

  app.delete<{ Params: { id: string } }>("/rides/:id", { preHandler: requireAuth }, async (req, reply) => {
    const session = req.user as SessionPayload;
    const [row] = await db.select().from(bikeRides).where(eq(bikeRides.id, req.params.id)).limit(1);
    if (!row || row.userId !== session.sub) return reply.code(404).send({ error: "not_found" });
    await db.delete(bikeRides).where(eq(bikeRides.id, req.params.id));
    return { ok: true };
  });

  // ---------- DOCUMENTS ----------

  app.get("/documents", { preHandler: requireAuth }, async (req) => {
    const session = req.user as SessionPayload;
    const docs = await db
      .select()
      .from(bikeDocuments)
      .where(eq(bikeDocuments.userId, session.sub))
      .orderBy(desc(bikeDocuments.createdAt));
    return { docs };
  });

  app.post("/documents", { preHandler: requireAuth }, async (req, reply) => {
    const parsed = createDocSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_input", message: parsed.error.issues[0]?.message });
    const session = req.user as SessionPayload;
    if (!(await assertOwnsBike(session.sub, parsed.data.bikeId))) {
      return reply.code(404).send({ error: "bike_not_found" });
    }
    const [row] = await db
      .insert(bikeDocuments)
      .values({
        userId: session.sub,
        bikeId: parsed.data.bikeId,
        type: parsed.data.type,
        number: parsed.data.number ?? null,
        issueDate: parsed.data.issueDate ?? null,
        expiryDate: parsed.data.expiryDate ?? null,
        photos: parsed.data.photos ?? [],
        note: parsed.data.note ?? null,
      })
      .returning();
    return reply.code(201).send(row);
  });

  app.patch<{ Params: { id: string } }>("/documents/:id", { preHandler: requireAuth }, async (req, reply) => {
    const parsed = patchDocSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_input", message: parsed.error.issues[0]?.message });
    const session = req.user as SessionPayload;
    const [existing] = await db.select().from(bikeDocuments).where(eq(bikeDocuments.id, req.params.id)).limit(1);
    if (!existing || existing.userId !== session.sub) return reply.code(404).send({ error: "not_found" });

    let removedPhotos: string[] = [];
    if (parsed.data.photos !== undefined) {
      const newSet = new Set(parsed.data.photos ?? []);
      removedPhotos = (existing.photos ?? []).filter((u) => !newSet.has(u));
    }

    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (parsed.data.type !== undefined) patch.type = parsed.data.type;
    if (parsed.data.number !== undefined) patch.number = parsed.data.number;
    if (parsed.data.issueDate !== undefined) patch.issueDate = parsed.data.issueDate;
    if (parsed.data.expiryDate !== undefined) patch.expiryDate = parsed.data.expiryDate;
    if (parsed.data.photos !== undefined) patch.photos = parsed.data.photos ?? [];
    if (parsed.data.note !== undefined) patch.note = parsed.data.note;

    const [row] = await db
      .update(bikeDocuments)
      .set(patch)
      .where(eq(bikeDocuments.id, req.params.id))
      .returning();

    for (const url of removedPhotos) await deleteByPublicUrl(url);
    return row;
  });

  app.delete<{ Params: { id: string } }>("/documents/:id", { preHandler: requireAuth }, async (req, reply) => {
    const session = req.user as SessionPayload;
    const [row] = await db.select().from(bikeDocuments).where(eq(bikeDocuments.id, req.params.id)).limit(1);
    if (!row || row.userId !== session.sub) return reply.code(404).send({ error: "not_found" });
    await db.delete(bikeDocuments).where(eq(bikeDocuments.id, req.params.id));
    for (const url of row.photos ?? []) await deleteByPublicUrl(url);
    return { ok: true };
  });
}
