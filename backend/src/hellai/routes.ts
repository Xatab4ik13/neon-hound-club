import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import {
  hellAiMessages,
  hellAiSettings,
  subscriptions,
  subscriptionTiers,
  userMotorcycles,
} from "../db/schema.js";
import { requireAuth } from "../auth/middleware.js";
import { AiError, DEFAULT_SYSTEM_PROMPT, callAi, type ChatMsg } from "./gateway.js";

const askSchema = z.object({
  question: z.string().trim().min(2).max(2000),
  bikeId: z.string().uuid().optional(),
});

function startOfMonth(): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

async function getSettings() {
  const [row] = await db.select().from(hellAiSettings).where(eq(hellAiSettings.id, 1)).limit(1);
  if (row) return row;
  // создаём дефолтную строку при первом обращении
  const [created] = await db
    .insert(hellAiSettings)
    .values({ id: 1, systemPrompt: DEFAULT_SYSTEM_PROMPT, model: "google/gemini-3-flash-preview" })
    .returning();
  return created;
}

async function getUserTierLimit(userId: string): Promise<{ tier: string | null; limit: number }> {
  const [sub] = await db
    .select({ tier: subscriptions.tier })
    .from(subscriptions)
    .where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, "active")))
    .orderBy(desc(subscriptions.startedAt))
    .limit(1);
  if (!sub) return { tier: null, limit: 0 };
  const [t] = await db
    .select({ limit: subscriptionTiers.aiMonthlyLimit })
    .from(subscriptionTiers)
    .where(eq(subscriptionTiers.tier, sub.tier));
  return { tier: sub.tier, limit: t?.limit ?? 0 };
}

async function getMonthUsage(userId: string): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(hellAiMessages)
    .where(
      and(
        eq(hellAiMessages.userId, userId),
        eq(hellAiMessages.role, "user"),
        gte(hellAiMessages.createdAt, startOfMonth()),
      ),
    );
  return row?.n ?? 0;
}

function bikeContext(b: typeof userMotorcycles.$inferSelect | undefined): string {
  if (!b) return "У юзера в гараже мото не указан — задай уточняющий вопрос (марка/модель/год).";
  const parts = [
    `${b.brand} ${b.model} ${b.year}`,
    b.engineCc ? `${b.engineCc} см³` : null,
    b.mileageKm != null ? `пробег ${b.mileageKm.toLocaleString("ru-RU")} км` : "пробег не указан",
  ].filter(Boolean);
  let s = `У юзера в гараже: ${parts.join(", ")}.`;
  if (b.notes?.trim()) s += ` Модификации/заметки: ${b.notes.trim()}.`;
  return s;
}

export async function hellAiRoutes(app: FastifyInstance) {
  // Мой статус: тир, лимит, использовано
  app.get("/hell-ai/me", { preHandler: requireAuth }, async (req) => {
    const userId = req.userId!;
    const { tier, limit } = await getUserTierLimit(userId);
    const used = await getMonthUsage(userId);
    const unlimited = limit === -1;
    return {
      tier,
      limit, // -1 = ∞
      used,
      left: unlimited ? null : Math.max(0, limit - used),
      canAsk: unlimited || used < limit,
    };
  });

  // История последних N сообщений (для возможной ленты в UI)
  app.get("/hell-ai/history", { preHandler: requireAuth }, async (req) => {
    const userId = req.userId!;
    const rows = await db
      .select()
      .from(hellAiMessages)
      .where(eq(hellAiMessages.userId, userId))
      .orderBy(desc(hellAiMessages.createdAt))
      .limit(40);
    return { messages: rows.reverse() };
  });

  // Спросить
  app.post("/hell-ai/ask", { preHandler: requireAuth }, async (req, reply) => {
    const parsed = askSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_input", details: parsed.error.flatten() });
    }
    const userId = req.userId!;

    // 1. Проверка тира и лимита
    const { tier, limit } = await getUserTierLimit(userId);
    if (!tier) {
      return reply.code(403).send({
        error: "no_active_pass",
        message: "Hell AI доступен с Hell Pass. Активируй любой тир.",
      });
    }
    const used = await getMonthUsage(userId);
    const unlimited = limit === -1;
    if (!unlimited && used >= limit) {
      return reply.code(429).send({
        error: "monthly_limit_reached",
        message: `Лимит ${limit} вопросов в этом месяце исчерпан. Апгрейд тира снимает лимит.`,
        tier,
        limit,
        used,
      });
    }

    // 2. Контекст байка
    let bike: typeof userMotorcycles.$inferSelect | undefined;
    if (parsed.data.bikeId) {
      const [row] = await db
        .select()
        .from(userMotorcycles)
        .where(and(eq(userMotorcycles.id, parsed.data.bikeId), eq(userMotorcycles.userId, userId)))
        .limit(1);
      bike = row;
    } else {
      const [row] = await db
        .select()
        .from(userMotorcycles)
        .where(and(eq(userMotorcycles.userId, userId), eq(userMotorcycles.isPrimary, true)))
        .limit(1);
      bike = row;
    }

    // 3. Сборка system prompt
    const settings = await getSettings();
    const sysParts = [settings.systemPrompt, bikeContext(bike)];
    if (settings.bannedTopics?.trim()) {
      sysParts.push(`Дополнительно нельзя обсуждать: ${settings.bannedTopics.trim()}.`);
    }
    const messages: ChatMsg[] = [
      { role: "system", content: sysParts.join("\n\n") },
      { role: "user", content: parsed.data.question },
    ];

    // 4. Вызов
    try {
      const result = await callAi(settings.model, messages);
      const answer = settings.signature?.trim()
        ? `${result.text}\n\n— ${settings.signature.trim()}`
        : result.text;

      // 5. Сохраняем оба сообщения
      await db.insert(hellAiMessages).values([
        {
          userId,
          role: "user",
          content: parsed.data.question,
          bikeId: bike?.id ?? null,
        },
        {
          userId,
          role: "assistant",
          content: answer,
          bikeId: bike?.id ?? null,
          model: settings.model,
          tokensIn: result.tokensIn,
          tokensOut: result.tokensOut,
        },
      ]);

      return {
        answer,
        tier,
        limit,
        used: used + 1,
        left: unlimited ? null : Math.max(0, limit - used - 1),
      };
    } catch (e) {
      if (e instanceof AiError) {
        return reply.code(e.status).send({ error: e.code, message: e.message });
      }
      app.log.error(e);
      return reply.code(500).send({ error: "internal", message: "Hell AI временно недоступен" });
    }
  });
}
