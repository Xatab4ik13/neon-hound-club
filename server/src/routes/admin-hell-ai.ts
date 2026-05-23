// /api/v1/admin/hell-ai/* — настройки модели, статистика, журнал.

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { requireAdmin, type SessionPayload } from "../lib/auth.js";
import { aiSettings, aiMessages, ALLOWED_AI_MODELS } from "../db/schema/hell-ai.js";
import { users } from "../db/schema/users.js";
import { loadAiSettings } from "../lib/hell-ai.js";

const putSchema = z.object({
  systemPrompt: z.string().min(10).max(20000),
  signature: z.string().max(200).nullable().optional(),
  bannedTopics: z.string().max(2000).nullable().optional(),
  model: z.enum(ALLOWED_AI_MODELS),
});

function settingsDto(row: typeof aiSettings.$inferSelect) {
  return {
    id: row.id,
    systemPrompt: row.systemPrompt,
    signature: row.signature,
    bannedTopics: row.bannedTopics,
    model: row.model,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function adminHellAiRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAdmin);

  // GET /settings — текущие настройки + список разрешённых моделей.
  app.get("/settings", async () => {
    const row = await loadAiSettings();
    return { settings: settingsDto(row), allowedModels: [...ALLOWED_AI_MODELS] };
  });

  // PUT /settings — обновить.
  app.put("/settings", async (req, reply) => {
    const session = req.user as SessionPayload;
    const parsed = putSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid", message: parsed.error.issues[0]?.message });
    }
    const [row] = await db
      .insert(aiSettings)
      .values({
        id: 1,
        systemPrompt: parsed.data.systemPrompt,
        signature: parsed.data.signature ?? null,
        bannedTopics: parsed.data.bannedTopics ?? null,
        model: parsed.data.model,
        updatedAt: new Date(),
        updatedBy: session.sub,
      })
      .onConflictDoUpdate({
        target: aiSettings.id,
        set: {
          systemPrompt: parsed.data.systemPrompt,
          signature: parsed.data.signature ?? null,
          bannedTopics: parsed.data.bannedTopics ?? null,
          model: parsed.data.model,
          updatedAt: new Date(),
          updatedBy: session.sub,
        },
      })
      .returning();
    return { settings: settingsDto(row!), allowedModels: [...ALLOWED_AI_MODELS] };
  });

  // GET /stats — последние 30 дней.
  app.get("/stats", async () => {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [row] = await db
      .select({
        totalQuestions: sql<number>`count(*) filter (where ${aiMessages.role} = 'user')::int`,
        totalAnswers: sql<number>`count(*) filter (where ${aiMessages.role} = 'assistant' and ${aiMessages.error} = false)::int`,
        tokensIn: sql<number>`coalesce(sum(${aiMessages.tokensIn}), 0)::int`,
        tokensOut: sql<number>`coalesce(sum(${aiMessages.tokensOut}), 0)::int`,
        uniqueUsers: sql<number>`count(distinct ${aiMessages.userId})::int`,
      })
      .from(aiMessages)
      .where(gte(aiMessages.createdAt, since));
    return {
      stats: {
        totalQuestions: row?.totalQuestions ?? 0,
        totalAnswers: row?.totalAnswers ?? 0,
        tokensIn: row?.tokensIn ?? 0,
        tokensOut: row?.tokensOut ?? 0,
        uniqueUsers: row?.uniqueUsers ?? 0,
      },
    };
  });

  // GET /log?limit=40 — последние сообщения для контроля качества.
  app.get<{ Querystring: { limit?: string } }>("/log", async (req) => {
    const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 40) || 40));
    const rows = await db
      .select({
        id: aiMessages.id,
        userId: aiMessages.userId,
        userEmail: users.email,
        role: aiMessages.role,
        content: aiMessages.content,
        model: aiMessages.model,
        tokensIn: aiMessages.tokensIn,
        tokensOut: aiMessages.tokensOut,
        createdAt: aiMessages.createdAt,
      })
      .from(aiMessages)
      .leftJoin(users, eq(users.id, aiMessages.userId))
      .orderBy(desc(aiMessages.createdAt))
      .limit(limit);
    return {
      messages: rows.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  });
}
