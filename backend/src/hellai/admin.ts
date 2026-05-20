import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { hellAiMessages, hellAiSettings, users } from "../db/schema.js";
import { requireAdmin } from "../auth/admin.js";
import { DEFAULT_SYSTEM_PROMPT } from "./gateway.js";

const settingsSchema = z.object({
  systemPrompt: z.string().min(20).max(8000),
  signature: z.string().max(200).nullable().optional(),
  bannedTopics: z.string().max(2000).nullable().optional(),
  model: z.string().min(3).max(80),
});

const ALLOWED_MODELS = [
  "google/gemini-3-flash-preview",
  "google/gemini-3.5-flash",
  "google/gemini-2.5-flash",
  "google/gemini-2.5-pro",
  "openai/gpt-5-mini",
  "openai/gpt-5",
];

export async function hellAiAdminRoutes(app: FastifyInstance) {
  app.get("/admin/hell-ai/settings", { preHandler: requireAdmin }, async () => {
    const [row] = await db.select().from(hellAiSettings).where(eq(hellAiSettings.id, 1)).limit(1);
    return {
      settings:
        row ?? {
          id: 1,
          systemPrompt: DEFAULT_SYSTEM_PROMPT,
          signature: null,
          bannedTopics: null,
          model: "google/gemini-3-flash-preview",
          updatedAt: new Date().toISOString(),
        },
      allowedModels: ALLOWED_MODELS,
    };
  });

  app.put("/admin/hell-ai/settings", { preHandler: requireAdmin }, async (req, reply) => {
    const parsed = settingsSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_input", details: parsed.error.flatten() });
    }
    if (!ALLOWED_MODELS.includes(parsed.data.model)) {
      return reply.code(400).send({ error: "model_not_allowed" });
    }
    const values = {
      id: 1,
      systemPrompt: parsed.data.systemPrompt,
      signature: parsed.data.signature ?? null,
      bannedTopics: parsed.data.bannedTopics ?? null,
      model: parsed.data.model,
      updatedAt: new Date(),
    };
    const [row] = await db
      .insert(hellAiSettings)
      .values(values)
      .onConflictDoUpdate({ target: hellAiSettings.id, set: values })
      .returning();
    return { settings: row };
  });

  // Журнал последних диалогов — для контроля качества
  app.get("/admin/hell-ai/log", { preHandler: requireAdmin }, async (req) => {
    const q = (req.query as { limit?: string }) ?? {};
    const limit = Math.min(Math.max(parseInt(q.limit ?? "60", 10) || 60, 1), 200);
    const rows = await db
      .select({
        id: hellAiMessages.id,
        userId: hellAiMessages.userId,
        userEmail: users.email,
        role: hellAiMessages.role,
        content: hellAiMessages.content,
        model: hellAiMessages.model,
        tokensIn: hellAiMessages.tokensIn,
        tokensOut: hellAiMessages.tokensOut,
        createdAt: hellAiMessages.createdAt,
      })
      .from(hellAiMessages)
      .leftJoin(users, eq(users.id, hellAiMessages.userId))
      .orderBy(desc(hellAiMessages.createdAt))
      .limit(limit);
    return { messages: rows };
  });

  // Статистика за текущий месяц
  app.get("/admin/hell-ai/stats", { preHandler: requireAdmin }, async () => {
    const [stats] = await db
      .select({
        totalQuestions: sql<number>`count(*) FILTER (WHERE ${hellAiMessages.role} = 'user')::int`,
        totalAnswers: sql<number>`count(*) FILTER (WHERE ${hellAiMessages.role} = 'assistant')::int`,
        tokensIn: sql<number>`COALESCE(SUM(${hellAiMessages.tokensIn}), 0)::int`,
        tokensOut: sql<number>`COALESCE(SUM(${hellAiMessages.tokensOut}), 0)::int`,
        uniqueUsers: sql<number>`count(DISTINCT ${hellAiMessages.userId})::int`,
      })
      .from(hellAiMessages)
      .where(sql`${hellAiMessages.createdAt} >= date_trunc('month', now())`);
    return { stats };
  });
}
