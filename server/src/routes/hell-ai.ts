// /api/v1/hell-ai/* — публичный endpoint для юзеров клуба.

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { and, eq, gt, gte, sql, desc } from "drizzle-orm";
import { db } from "../db/client.js";
import { requireAuth, type SessionPayload } from "../lib/auth.js";
import { aiMessages } from "../db/schema/hell-ai.js";
import { passPurchases } from "../db/schema/pass.js";
import { systemSettings } from "../db/schema/economy.js";
import { loadAiSettings, loadUserGarage, buildSystemPrompt, AI_LIMITS_DEFAULT, TIER_PRIMARY_MODEL, PLATINUM_FALLBACK_MODEL, type AiLimits } from "../lib/hell-ai.js";
import { chatCompletion, streamChatCompletion, OpenRouterError, type ChatMessage } from "../lib/openrouter.js";
import { acquireGlobalSlot, releaseGlobalSlot, acquireUserLock, releaseUserLock, AiBusyError, AiUserBusyError, aiThrottleStats } from "../lib/ai-throttle.js";

const askSchema = z.object({
  question: z.string().trim().min(2).max(2000),
  bikeId: z.string().uuid().optional(),
  chatId: z.string().max(64).optional(),
});

type TierKey = "silver" | "gold" | "platinum";

async function loadLimits(): Promise<AiLimits> {
  const [row] = await db.select().from(systemSettings).where(eq(systemSettings.key, "hell_ai")).limit(1);
  if (!row) return AI_LIMITS_DEFAULT;
  const v = row.value as { limit_silver?: number; limit_gold?: number; limit_platinum?: number } | null;
  return {
    silver: v?.limit_silver ?? AI_LIMITS_DEFAULT.silver,
    gold: v?.limit_gold ?? AI_LIMITS_DEFAULT.gold,
    platinum: v?.limit_platinum ?? AI_LIMITS_DEFAULT.platinum,
  };
}

async function getActivePass(userId: string) {
  const [row] = await db
    .select()
    .from(passPurchases)
    .where(
      and(
        eq(passPurchases.userId, userId),
        eq(passPurchases.status, "active"),
        gt(passPurchases.expiresAt, new Date()),
      ),
    )
    .orderBy(desc(passPurchases.expiresAt))
    .limit(1);
  return row ?? null;
}

async function countUsed(userId: string, since: Date): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(aiMessages)
    .where(and(eq(aiMessages.userId, userId), eq(aiMessages.role, "user"), gte(aiMessages.createdAt, since)));
  return row?.n ?? 0;
}

export async function hellAiRoutes(app: FastifyInstance) {
  // Статус: текущий тир, лимит, осталось.
  app.get("/status", { preHandler: requireAuth }, async (req) => {
    const session = req.user as SessionPayload;
    // admin / blogger — безлимит без пасса
    if (session.role === "admin" || session.role === "blogger") {
      return { tier: "staff", limit: -1, used: 0, left: -1, unlimited: true, expiresAt: null };
    }
    const pass = await getActivePass(session.sub);
    const limits = await loadLimits();
    if (!pass) return { tier: null, limit: 0, used: 0, left: 0, unlimited: false };
    const tier = pass.tier as TierKey;
    const limit = limits[tier];
    const since = pass.paidAt ?? pass.createdAt;
    const used = await countUsed(session.sub, since);
    // Platinum: после лимита фолбэк на быструю модель — для клиента это «безлимит».
    const unlimited = tier === "platinum";
    return {
      tier,
      limit: unlimited ? -1 : limit,
      used,
      left: unlimited ? -1 : Math.max(0, limit - used),
      unlimited,
      expiresAt: pass.expiresAt?.toISOString() ?? null,
    };
  });

  // Спросить Hell AI.
  app.post("/ask", { preHandler: requireAuth }, async (req, reply) => {
    const session = req.user as SessionPayload;
    const parsed = askSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid", message: parsed.error.issues[0]?.message ?? "bad input" });
    }
    const { question, bikeId, chatId } = parsed.data;

    const isStaff = session.role === "admin" || session.role === "blogger";

    // 1. Проверка активного Pass (стафф пропускает).
    let pass: Awaited<ReturnType<typeof getActivePass>> | null = null;
    // Модель для этого запроса — выбираем по тиру, с учётом лимита (для platinum).
    let modelForRequest: string = TIER_PRIMARY_MODEL.silver;
    if (!isStaff) {
      pass = await getActivePass(session.sub);
      if (!pass) {
        return reply.code(403).send({
          error: "no_pass",
          message: "Hell AI доступен с активным Hell Pass. Активируй любой тир.",
        });
      }

      const limits = await loadLimits();
      const tier = pass.tier as TierKey;
      const limit = limits[tier];
      const since = pass.paidAt ?? pass.createdAt;
      const used = await countUsed(session.sub, since);

      if (tier === "platinum") {
        // Platinum: после лимита переключаемся на быструю модель, отвечаем без счётчика.
        modelForRequest = used >= limit ? PLATINUM_FALLBACK_MODEL : TIER_PRIMARY_MODEL.platinum;
      } else {
        modelForRequest = TIER_PRIMARY_MODEL[tier];
        if (used >= limit) {
          return reply.code(429).send({
            error: "limit_reached",
            message: `Лимит ${limit} вопросов на этот период исчерпан. Обновится при покупке следующего Pass.`,
          });
        }
      }
    } else {
      // Стафф — основная модель из настроек админки (резерв на «потестить»).
      modelForRequest = TIER_PRIMARY_MODEL.platinum;
    }

    // 3. Контекст и system prompt.
    const settings = await loadAiSettings();
    const garage = await loadUserGarage(session.sub);
    const systemPrompt = buildSystemPrompt({
      basePrompt: settings.systemPrompt || "",
      signature: settings.signature,
      bannedTopics: settings.bannedTopics,
      garage,
      activeBikeId: bikeId ?? null,
      isStaff,
    });

    // 4. История последних 10 пар сообщений в рамках текущего chatId (если задан).
    let history: ChatMessage[] = [];
    if (chatId) {
      const rows = await db
        .select({ role: aiMessages.role, content: aiMessages.content })
        .from(aiMessages)
        .where(and(eq(aiMessages.userId, session.sub), eq(aiMessages.chatId, chatId)))
        .orderBy(desc(aiMessages.createdAt))
        .limit(20);
      history = rows
        .reverse()
        .map((r) => ({ role: r.role as "user" | "assistant", content: r.content }));
    }

    const messages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...history,
      { role: "user", content: question },
    ];

    // 5. Throttle: per-user lock (защита от F5-спама) + глобальный семафор
    // на одновременные вызовы OpenRouter (защита от 429 при пиках).
    try {
      acquireUserLock(session.sub);
    } catch (e) {
      const err = e as AiUserBusyError;
      return reply.code(409).send({ error: "user_busy", message: err.message });
    }
    let gotSlot = false;
    try {
      try {
        await acquireGlobalSlot();
        gotSlot = true;
      } catch (e) {
        const err = e as AiBusyError;
        return reply.code(503).send({ error: "ai_busy", message: err.message });
      }

      // 6. Логируем вопрос (учитывается в лимите). model для аналитики, наружу не отдаём.
      await db.insert(aiMessages).values({
        userId: session.sub,
        chatId: chatId ?? null,
        role: "user",
        content: question,
        bikeId: bikeId ?? null,
        model: modelForRequest,
      });

      // 7. Вызов модели. Клиенту НЕ возвращаем имя модели — для него это «Hell AI».
      try {
        const result = await chatCompletion({
          model: modelForRequest,
          messages,
          temperature: 0.6,
          maxTokens: 900,
        });

        await db.insert(aiMessages).values({
          userId: session.sub,
          chatId: chatId ?? null,
          role: "assistant",
          content: result.answer,
          bikeId: bikeId ?? null,
          model: result.model,
          tokensIn: result.tokensIn,
          tokensOut: result.tokensOut,
        });

        return { answer: result.answer };
      } catch (e) {
        const err = e as OpenRouterError;
        const status = err.status ?? 502;
        const message = err.message || "AI временно недоступен";
        await db.insert(aiMessages).values({
          userId: session.sub,
          chatId: chatId ?? null,
          role: "assistant",
          content: `[ERROR] ${message}`,
          bikeId: bikeId ?? null,
          model: modelForRequest,
          error: true,
        });
        // Откатываем счётчик: удаляем последний user-вопрос за последние 10 сек.
        await db
          .delete(aiMessages)
          .where(
            and(
              eq(aiMessages.userId, session.sub),
              eq(aiMessages.role, "user"),
              eq(aiMessages.content, question),
              gte(aiMessages.createdAt, new Date(Date.now() - 10_000)),
            ),
          );
        return reply.code(status >= 400 && status < 600 ? 502 : 502).send({
          error: "ai_failed",
          message,
        });
      }
    } finally {
      if (gotSlot) releaseGlobalSlot();
      releaseUserLock(session.sub);
    }
  });

  // Стрим ответа через SSE. Тот же контракт что /ask, но toкены текут по `event: delta`.
  // Завершается `event: done` или `event: error`. Откат счётчика — как в /ask.
  app.post("/ask-stream", { preHandler: requireAuth }, async (req, reply) => {
    const session = req.user as SessionPayload;
    const parsed = askSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid", message: parsed.error.issues[0]?.message ?? "bad input" });
    }
    const { question, bikeId, chatId } = parsed.data;
    const isStaff = session.role === "admin" || session.role === "blogger";

    let modelForRequest: string = TIER_PRIMARY_MODEL.silver;
    if (!isStaff) {
      const pass = await getActivePass(session.sub);
      if (!pass) {
        return reply.code(403).send({ error: "no_pass", message: "Hell AI доступен с активным Hell Pass. Активируй любой тир." });
      }
      const limits = await loadLimits();
      const tier = pass.tier as TierKey;
      const limit = limits[tier];
      const since = pass.paidAt ?? pass.createdAt;
      const used = await countUsed(session.sub, since);
      if (tier === "platinum") {
        modelForRequest = used >= limit ? PLATINUM_FALLBACK_MODEL : TIER_PRIMARY_MODEL.platinum;
      } else {
        modelForRequest = TIER_PRIMARY_MODEL[tier];
        if (used >= limit) {
          return reply.code(429).send({ error: "limit_reached", message: `Лимит ${limit} вопросов на этот период исчерпан. Обновится при покупке следующего Pass.` });
        }
      }
    } else {
      modelForRequest = TIER_PRIMARY_MODEL.platinum;
    }

    const settings = await loadAiSettings();
    const garage = await loadUserGarage(session.sub);
    const systemPrompt = buildSystemPrompt({
      basePrompt: settings.systemPrompt || "",
      signature: settings.signature,
      bannedTopics: settings.bannedTopics,
      garage,
      activeBikeId: bikeId ?? null,
      isStaff,
    });

    let history: ChatMessage[] = [];
    if (chatId) {
      const rows = await db
        .select({ role: aiMessages.role, content: aiMessages.content })
        .from(aiMessages)
        .where(and(eq(aiMessages.userId, session.sub), eq(aiMessages.chatId, chatId)))
        .orderBy(desc(aiMessages.createdAt))
        .limit(20);
      history = rows
        .reverse()
        .map((r) => ({ role: r.role as "user" | "assistant", content: r.content }));
    }

    const messages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...history,
      { role: "user", content: question },
    ];

    // Логируем вопрос (учитывается в лимите).
    await db.insert(aiMessages).values({
      userId: session.sub,
      chatId: chatId ?? null,
      role: "user",
      content: question,
      bikeId: bikeId ?? null,
      model: modelForRequest,
    });

    // Открываем SSE.
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });

    const send = (event: string, data: unknown) => {
      reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    // Отмена клиентом.
    const ac = new AbortController();
    req.raw.on("close", () => {
      if (!reply.raw.writableEnded) ac.abort();
    });

    // keep-alive каждые 15 сек, чтобы прокси не закрывали соединение.
    const ka = setInterval(() => {
      try { reply.raw.write(`: ka\n\n`); } catch { /* noop */ }
    }, 15_000);

    let finalAnswer = "";
    let finalModel = modelForRequest;
    let tokensIn: number | null = null;
    let tokensOut: number | null = null;

    try {
      const gen = streamChatCompletion({
        model: modelForRequest,
        messages,
        temperature: 0.6,
        maxTokens: 900,
        signal: ac.signal,
      });
      while (true) {
        const { value, done } = await gen.next();
        if (done) {
          if (value) {
            finalAnswer = value.answer;
            finalModel = value.model;
            tokensIn = value.tokensIn;
            tokensOut = value.tokensOut;
          }
          break;
        }
        finalAnswer += value;
        send("delta", { t: value });
      }

      // Сохраняем итоговый ответ (если что-то получили).
      if (finalAnswer.trim()) {
        await db.insert(aiMessages).values({
          userId: session.sub,
          chatId: chatId ?? null,
          role: "assistant",
          content: finalAnswer,
          bikeId: bikeId ?? null,
          model: finalModel,
          tokensIn,
          tokensOut,
        });
        send("done", { ok: true });
      } else {
        // ничего не пришло — считаем ошибкой и откатываем счётчик
        await db
          .delete(aiMessages)
          .where(
            and(
              eq(aiMessages.userId, session.sub),
              eq(aiMessages.role, "user"),
              eq(aiMessages.content, question),
              gte(aiMessages.createdAt, new Date(Date.now() - 10_000)),
            ),
          );
        send("error", { message: "Пустой ответ от модели" });
      }
    } catch (e) {
      const aborted = (e as { name?: string })?.name === "AbortError";
      const err = e as OpenRouterError;
      const message = aborted
        ? "Отменено"
        : (err?.message || "AI временно недоступен");

      if (!aborted) {
        await db.insert(aiMessages).values({
          userId: session.sub,
          chatId: chatId ?? null,
          role: "assistant",
          content: `[ERROR] ${message}`,
          bikeId: bikeId ?? null,
          model: modelForRequest,
          error: true,
        });
      }
      // Откатываем счётчик и при отмене, и при ошибке.
      await db
        .delete(aiMessages)
        .where(
          and(
            eq(aiMessages.userId, session.sub),
            eq(aiMessages.role, "user"),
            eq(aiMessages.content, question),
            gte(aiMessages.createdAt, new Date(Date.now() - 10_000)),
          ),
        );
      try { send("error", { message, aborted }); } catch { /* noop */ }
    } finally {
      clearInterval(ka);
      try { reply.raw.end(); } catch { /* noop */ }
    }
  });
}
