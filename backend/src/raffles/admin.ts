import type { FastifyInstance } from "fastify";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client.js";
import {
  raffleEntries,
  rafflePrizes,
  raffleWinners,
  raffles,
} from "../db/schema.js";
import { requireAdmin } from "../auth/admin.js";

const raffleSchema = z.object({
  slug: z.string().min(1).max(80).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(160),
  description: z.string().max(4000).optional().nullable(),
  coverUrl: z.string().url().optional().nullable(),
  ticketCost: z.number().int().min(1).max(1000).default(1),
  endsAt: z.string().datetime(),
  isPublished: z.boolean().default(true),
});

const prizeSchema = z.object({
  name: z.string().min(1).max(200),
  qty: z.number().int().min(1).max(10000),
  sortOrder: z.number().int().min(0).max(1000).default(0),
});

export async function rafflesAdminRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAdmin);

  // ===== розыгрыши =====
  app.post("/admin/raffles", async (req, reply) => {
    const parsed = raffleSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_input", details: parsed.error.format() });
    const [row] = await db
      .insert(raffles)
      .values({ ...parsed.data, endsAt: new Date(parsed.data.endsAt) })
      .returning();
    return reply.code(201).send({ raffle: row });
  });

  app.patch<{ Params: { id: string } }>("/admin/raffles/:id", async (req, reply) => {
    const parsed = raffleSchema.partial().safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_input" });
    const patch: Record<string, unknown> = { ...parsed.data, updatedAt: new Date() };
    if (parsed.data.endsAt) patch.endsAt = new Date(parsed.data.endsAt);
    const [row] = await db
      .update(raffles)
      .set(patch)
      .where(eq(raffles.id, req.params.id))
      .returning();
    if (!row) return reply.code(404).send({ error: "not_found" });
    return { raffle: row };
  });

  app.delete<{ Params: { id: string } }>("/admin/raffles/:id", async (req, reply) => {
    const [row] = await db.delete(raffles).where(eq(raffles.id, req.params.id)).returning();
    if (!row) return reply.code(404).send({ error: "not_found" });
    return { ok: true };
  });

  // ===== призы =====
  app.post<{ Params: { id: string } }>("/admin/raffles/:id/prizes", async (req, reply) => {
    const parsed = prizeSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_input" });
    const [row] = await db
      .insert(rafflePrizes)
      .values({ ...parsed.data, raffleId: req.params.id })
      .returning();
    return reply.code(201).send({ prize: row });
  });

  app.patch<{ Params: { id: string; prizeId: string } }>(
    "/admin/raffles/:id/prizes/:prizeId",
    async (req, reply) => {
      const parsed = prizeSchema.partial().safeParse(req.body);
      if (!parsed.success) return reply.code(400).send({ error: "invalid_input" });
      const [row] = await db
        .update(rafflePrizes)
        .set(parsed.data)
        .where(
          and(
            eq(rafflePrizes.id, req.params.prizeId),
            eq(rafflePrizes.raffleId, req.params.id),
          ),
        )
        .returning();
      if (!row) return reply.code(404).send({ error: "not_found" });
      return { prize: row };
    },
  );

  app.delete<{ Params: { id: string; prizeId: string } }>(
    "/admin/raffles/:id/prizes/:prizeId",
    async (req, reply) => {
      const [row] = await db
        .delete(rafflePrizes)
        .where(
          and(
            eq(rafflePrizes.id, req.params.prizeId),
            eq(rafflePrizes.raffleId, req.params.id),
          ),
        )
        .returning();
      if (!row) return reply.code(404).send({ error: "not_found" });
      return { ok: true };
    },
  );

  // ===== розыгрыш приза (честный рандом) =====
  // Выбираем случайную строку из raffle_entries → пишем победителя → удаляем эту строку.
  // Одна строка = один билет. Так выигравший билет «выбывает», как в текущем фронте.
  app.post<{ Params: { id: string; prizeId: string } }>(
    "/admin/raffles/:id/prizes/:prizeId/draw",
    async (req, reply) => {
      const raffleId = req.params.id;
      const prizeId = req.params.prizeId;

      const result = await db.transaction(async (tx) => {
        const [prize] = await tx
          .select()
          .from(rafflePrizes)
          .where(and(eq(rafflePrizes.id, prizeId), eq(rafflePrizes.raffleId, raffleId)))
          .limit(1);
        if (!prize) return { error: "prize_not_found" as const };

        const [winnersCount] = await tx
          .select({ c: sql<number>`COUNT(*)::int` })
          .from(raffleWinners)
          .where(eq(raffleWinners.prizeId, prizeId));
        if ((winnersCount?.c ?? 0) >= prize.qty)
          return { error: "prize_exhausted" as const };

        // FOR UPDATE SKIP LOCKED — на случай параллельных розыгрышей
        const candidates = await tx.execute<{ id: string; user_id: string }>(sql`
          SELECT id, user_id FROM ${raffleEntries}
          WHERE raffle_id = ${raffleId}
          ORDER BY random()
          LIMIT 1
          FOR UPDATE SKIP LOCKED
        `);
        const pick = candidates.rows[0];
        if (!pick) return { error: "no_entries" as const };

        await tx.delete(raffleEntries).where(eq(raffleEntries.id, pick.id));
        const [winner] = await tx
          .insert(raffleWinners)
          .values({ raffleId, prizeId, userId: pick.user_id })
          .returning();
        return { winner };
      });

      if ("error" in result) {
        const code =
          result.error === "prize_not_found"
            ? 404
            : result.error === "no_entries"
              ? 409
              : 409;
        return reply.code(code).send({ error: result.error });
      }
      return reply.code(201).send(result);
    },
  );
}
