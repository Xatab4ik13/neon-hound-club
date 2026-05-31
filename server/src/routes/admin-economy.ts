import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import {
  economyCategories,
  economyOperations,
  economyPartners,
} from "../db/schema/economy.js";
import { payments } from "../db/schema/payments.js";
import { requireAdmin, type SessionPayload } from "../lib/auth.js";

// Экономика — единый источник истины: payments.status='confirmed'.
// Это реально подтверждённые банком деньги. Заказы/Pass, активированные
// вручную без оплаты, в выручку НЕ попадают (это и есть смысл «реальных денег»).
//   income  = confirmed payments + ручные income-операции
//             ref_type='order' → категория "Магазин"
//             ref_type='pass'  → категория "Hell Pass"
//   expense = ручные expense-операции
// Таблица economy_operations используется ТОЛЬКО для ручных операций.


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

  /** Сводный обзор. Income считается реал-тайм из orders + pass + manual income. */
  app.get("/overview", async (req) => {
    const q = z
      .object({
        from: z.string().datetime().optional(),
        to: z.string().datetime().optional(),
      })
      .parse((req.query as object) ?? {});

    const fromDate = q.from ? new Date(q.from) : null;
    const toDate = q.to ? new Date(q.to) : null;

    // ---- Авто-доходы: подтверждённые платежи (реальные деньги от банка).
    //      Дата платежа = payments.updated_at (момент подтверждения).
    const payConds = [eq(payments.status, "confirmed")] as any[];
    if (fromDate) payConds.push(gte(payments.updatedAt, fromDate));
    if (toDate) payConds.push(lte(payments.updatedAt, toDate));
    const [paymentsIncome] = await db
      .select({ total: sql<number>`COALESCE(SUM(${payments.amountRub}), 0)::int` })
      .from(payments)
      .where(and(...payConds));


    // ---- Ручные операции ----
    const manualConds = [] as any[];
    if (fromDate) manualConds.push(gte(economyOperations.occurredAt, fromDate));
    if (toDate) manualConds.push(lte(economyOperations.occurredAt, toDate));
    const manualWhere = manualConds.length ? and(...manualConds) : undefined;

    const [manualIncome] = await db
      .select({ total: sql<number>`COALESCE(SUM(${economyOperations.amountRub}), 0)::int` })
      .from(economyOperations)
      .where(manualWhere ? and(manualWhere, eq(economyOperations.type, "income")) : eq(economyOperations.type, "income"));

    const [manualExpense] = await db
      .select({ total: sql<number>`COALESCE(SUM(${economyOperations.amountRub}), 0)::int` })
      .from(economyOperations)
      .where(manualWhere ? and(manualWhere, eq(economyOperations.type, "expense")) : eq(economyOperations.type, "expense"));

    const income = (paymentsIncome?.total ?? 0) + (manualIncome?.total ?? 0);
    const expense = manualExpense?.total ?? 0;

    // ---- P&L по месяцам (последние 6) ----
    const monthly = await db.execute<{
      month: string;
      income: number;
      expense: number;
    }>(sql`
      WITH months AS (
        SELECT to_char(date_trunc('month', m), 'YYYY-MM') AS month
        FROM generate_series(date_trunc('month', now()) - interval '5 months', date_trunc('month', now()), interval '1 month') AS m
      ),
      pay_m AS (
        SELECT to_char(date_trunc('month', updated_at), 'YYYY-MM') AS month,
               SUM(amount_rub)::int AS amount
        FROM payments
        WHERE status = 'confirmed'
          AND updated_at >= date_trunc('month', now()) - interval '5 months'
        GROUP BY 1
      ),
      manual_m AS (
        SELECT to_char(date_trunc('month', occurred_at), 'YYYY-MM') AS month,
               COALESCE(SUM(amount_rub) FILTER (WHERE type='income'), 0)::int AS income,
               COALESCE(SUM(amount_rub) FILTER (WHERE type='expense'), 0)::int AS expense
        FROM economy_operations
        WHERE occurred_at >= date_trunc('month', now()) - interval '5 months'
        GROUP BY 1
      )
      SELECT
        months.month,
        (COALESCE(pay_m.amount, 0) + COALESCE(manual_m.income, 0))::int AS income,
        COALESCE(manual_m.expense, 0)::int AS expense
      FROM months
      LEFT JOIN pay_m USING (month)
      LEFT JOIN manual_m USING (month)
      ORDER BY months.month
    `);

    return {
      income,
      expense,
      profit: income - expense,
      monthly: monthly.map((m: any) => ({
        month: m.month,
        income: Number(m.income) || 0,
        expense: Number(m.expense) || 0,
      })),
    };
  });

  /** Операции — список (виртуальные авто из confirmed payments + ручные). */
  app.get("/operations", async (req) => {
    const q = z
      .object({
        type: z.enum(["income", "expense", "all"]).default("all"),
        category: z.string().max(80).optional(),
        limit: z.coerce.number().int().min(1).max(500).default(200),
      })
      .parse((req.query as object) ?? {});

    const items: Array<{
      id: string;
      occurredAt: Date;
      type: "income" | "expense";
      category: string;
      amountRub: number;
      note: string;
      source: "auto" | "manual";
      refType: string | null;
      refId: string | null;
      createdBy: string | null;
      createdAt: Date;
    }> = [];

    // Авто: подтверждённые платежи (реальные деньги от банка).
    if (q.type !== "expense") {
      const conds = [eq(payments.status, "confirmed")] as any[];
      if (q.category === "Магазин") conds.push(eq(payments.refType, "order"));
      else if (q.category === "Hell Pass") conds.push(eq(payments.refType, "pass"));
      else if (q.category) {
        // запрошена ручная категория — авто-операции не подходят
        conds.push(sql`false`);
      }

      const rows = await db
        .select({
          id: payments.id,
          amountRub: payments.amountRub,
          updatedAt: payments.updatedAt,
          refType: payments.refType,
          refId: payments.refId,
        })
        .from(payments)
        .where(and(...conds))
        .orderBy(desc(payments.updatedAt))
        .limit(q.limit);

      for (const r of rows) {
        const isPass = r.refType === "pass";
        items.push({
          id: `pay:${r.id}`,
          occurredAt: r.updatedAt,
          type: "income",
          category: isPass ? "Hell Pass" : "Магазин",
          amountRub: r.amountRub,
          note: isPass
            ? `Hell Pass #${r.refId.slice(0, 8)}`
            : `Заказ #${r.refId.slice(0, 8)}`,
          source: "auto",
          refType: r.refType,
          refId: r.refId,
          createdBy: null,
          createdAt: r.updatedAt,
        });
      }
    }


    // Ручные операции
    const conds = [eq(economyOperations.source, "manual")] as any[];
    if (q.type !== "all") conds.push(eq(economyOperations.type, q.type));
    if (q.category) conds.push(eq(economyOperations.category, q.category));
    const manualRows = await db
      .select()
      .from(economyOperations)
      .where(and(...conds))
      .orderBy(desc(economyOperations.occurredAt))
      .limit(q.limit);
    for (const r of manualRows) {
      items.push({
        id: r.id,
        occurredAt: r.occurredAt,
        type: r.type as "income" | "expense",
        category: r.category,
        amountRub: r.amountRub,
        note: r.note ?? "",
        source: "manual",
        refType: r.refType,
        refId: r.refId,
        createdBy: r.createdBy,
        createdAt: r.createdAt,
      });
    }

    items.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
    return { items: items.slice(0, q.limit) };
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
