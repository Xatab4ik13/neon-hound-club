import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import {
  economyCategories,
  economyOperations,
  economyPartners,
} from "../db/schema/economy.js";
import { orders } from "../db/schema/shop.js";
import { passPurchases } from "../db/schema/pass.js";
import { requireAdmin, type SessionPayload } from "../lib/auth.js";

// Экономика работает в реальном времени:
//   income  = paid orders + paid Hell Pass + ручные income-операции
//   expense = ручные expense-операции
// Таблица economy_operations используется ТОЛЬКО для ручных операций.
// Авто-доходы выводятся виртуально из orders/passPurchases — без дублей и без sync.


// ---------- schemas ----------

const opCreateSchema = z.object({
  occurredAt: z.string().datetime().optional(),
  type: z.enum(["income", "expense"]),
  category: z.string().min(1).max(80),
  amountRub: z.number().int().min(1).max(100_000_000),
  note: z.string().max(500).default(""),
});

const opPatchSchema = z.object({
  occurredAt: z.string().datetime().optional(),
  category: z.string().min(1).max(80).optional(),
  amountRub: z.number().int().min(1).max(100_000_000).optional(),
  note: z.string().max(500).optional(),
});

const categoryCreateSchema = z.object({
  name: z.string().min(1).max(80),
  kind: z.enum(["income", "expense"]).default("expense"),
});

const partnerCreateSchema = z.object({
  name: z.string().min(1).max(120),
  share: z.number().int().min(0).max(100),
});

const partnerPatchSchema = partnerCreateSchema.partial();

// ---------- routes ----------

export async function adminEconomyRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAdmin);

  /** Сводный обзор + последние операции. */
  app.get("/overview", async (req) => {
    const q = z
      .object({
        from: z.string().datetime().optional(),
        to: z.string().datetime().optional(),
      })
      .parse((req.query as object) ?? {});

    // Дотягиваем авто-операции на лету (дёшево при наличии unique index).
    await syncEconomyAutoIncome();

    const conds = [] as any[];
    if (q.from) conds.push(gte(economyOperations.occurredAt, new Date(q.from)));
    if (q.to) conds.push(lte(economyOperations.occurredAt, new Date(q.to)));
    const where = conds.length ? and(...conds) : undefined;

    const [incomeRow] = await db
      .select({ total: sql<number>`COALESCE(SUM(${economyOperations.amountRub}), 0)::int` })
      .from(economyOperations)
      .where(where ? and(where, eq(economyOperations.type, "income")) : eq(economyOperations.type, "income"));

    const [expenseRow] = await db
      .select({ total: sql<number>`COALESCE(SUM(${economyOperations.amountRub}), 0)::int` })
      .from(economyOperations)
      .where(where ? and(where, eq(economyOperations.type, "expense")) : eq(economyOperations.type, "expense"));

    // P&L по месяцам (последние 6).
    const monthly = await db.execute<{
      month: string;
      income: number;
      expense: number;
    }>(sql`
      SELECT
        to_char(date_trunc('month', occurred_at), 'YYYY-MM') AS month,
        COALESCE(SUM(amount_rub) FILTER (WHERE type='income'), 0)::int AS income,
        COALESCE(SUM(amount_rub) FILTER (WHERE type='expense'), 0)::int AS expense
      FROM economy_operations
      WHERE occurred_at >= now() - interval '6 months'
      GROUP BY 1
      ORDER BY 1
    `);

    return {
      income: incomeRow?.total ?? 0,
      expense: expenseRow?.total ?? 0,
      profit: (incomeRow?.total ?? 0) - (expenseRow?.total ?? 0),
      monthly: monthly.map((m: any) => ({
        month: m.month,
        income: Number(m.income) || 0,
        expense: Number(m.expense) || 0,
      })),
    };
  });

  /** Операции — список. */
  app.get("/operations", async (req) => {
    const q = z
      .object({
        type: z.enum(["income", "expense", "all"]).default("all"),
        category: z.string().max(80).optional(),
        limit: z.coerce.number().int().min(1).max(500).default(200),
      })
      .parse((req.query as object) ?? {});

    await syncEconomyAutoIncome();

    const conds = [] as any[];
    if (q.type !== "all") conds.push(eq(economyOperations.type, q.type));
    if (q.category) conds.push(eq(economyOperations.category, q.category));
    const where = conds.length ? and(...conds) : undefined;

    const items = await db
      .select()
      .from(economyOperations)
      .where(where)
      .orderBy(desc(economyOperations.occurredAt))
      .limit(q.limit);

    return { items };
  });

  app.post("/operations", async (req, reply) => {
    const session = req.user as SessionPayload;
    const parsed = opCreateSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid", message: parsed.error.issues[0]?.message });
    const data = parsed.data;
    const [row] = await db
      .insert(economyOperations)
      .values({
        occurredAt: data.occurredAt ? new Date(data.occurredAt) : new Date(),
        type: data.type,
        category: data.category,
        amountRub: data.amountRub,
        note: data.note,
        source: "manual",
        createdBy: session.sub,
      })
      .returning();
    return row;
  });

  app.patch<{ Params: { id: string } }>("/operations/:id", async (req, reply) => {
    const parsed = opPatchSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid" });
    const [cur] = await db.select().from(economyOperations).where(eq(economyOperations.id, req.params.id)).limit(1);
    if (!cur) return reply.code(404).send({ error: "not_found" });
    if (cur.source === "auto") return reply.code(400).send({ error: "auto_locked", message: "Авто-операции нельзя править" });
    const patch: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.occurredAt) patch.occurredAt = new Date(parsed.data.occurredAt);
    const [row] = await db
      .update(economyOperations)
      .set(patch)
      .where(eq(economyOperations.id, req.params.id))
      .returning();
    return row;
  });

  app.delete<{ Params: { id: string } }>("/operations/:id", async (req, reply) => {
    const [cur] = await db.select().from(economyOperations).where(eq(economyOperations.id, req.params.id)).limit(1);
    if (!cur) return reply.code(404).send({ error: "not_found" });
    if (cur.source === "auto") return reply.code(400).send({ error: "auto_locked", message: "Авто-операции нельзя удалять" });
    await db.delete(economyOperations).where(eq(economyOperations.id, req.params.id));
    return { ok: true };
  });

  /** Категории. */
  app.get("/categories", async () => {
    const items = await db.select().from(economyCategories).orderBy(economyCategories.kind, economyCategories.name);
    return { items };
  });

  app.post("/categories", async (req, reply) => {
    const parsed = categoryCreateSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid" });
    try {
      const [row] = await db.insert(economyCategories).values({ ...parsed.data, isSystem: false }).returning();
      return row;
    } catch (e: any) {
      if (String(e?.code) === "23505") return reply.code(409).send({ error: "exists" });
      throw e;
    }
  });

  app.delete<{ Params: { id: string } }>("/categories/:id", async (req, reply) => {
    const [cur] = await db.select().from(economyCategories).where(eq(economyCategories.id, req.params.id)).limit(1);
    if (!cur) return reply.code(404).send({ error: "not_found" });
    if (cur.isSystem) return reply.code(400).send({ error: "system_locked" });
    await db.delete(economyCategories).where(eq(economyCategories.id, req.params.id));
    return { ok: true };
  });

  /** Партнёры. */
  app.get("/partners", async () => {
    const items = await db.select().from(economyPartners).orderBy(economyPartners.sort, economyPartners.createdAt);
    const totalShare = items.reduce((s, p) => s + p.share, 0);
    return { items, totalShare };
  });

  app.post("/partners", async (req, reply) => {
    const parsed = partnerCreateSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid" });
    const [row] = await db.insert(economyPartners).values(parsed.data).returning();
    return row;
  });

  app.patch<{ Params: { id: string } }>("/partners/:id", async (req, reply) => {
    const parsed = partnerPatchSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid" });
    const [row] = await db
      .update(economyPartners)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(economyPartners.id, req.params.id))
      .returning();
    if (!row) return reply.code(404).send({ error: "not_found" });
    return row;
  });

  app.delete<{ Params: { id: string } }>("/partners/:id", async (req, reply) => {
    const r = await db.delete(economyPartners).where(eq(economyPartners.id, req.params.id)).returning({ id: economyPartners.id });
    if (!r.length) return reply.code(404).send({ error: "not_found" });
    return { ok: true };
  });
}
