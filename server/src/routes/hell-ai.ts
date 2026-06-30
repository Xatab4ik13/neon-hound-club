// /api/v1/hell-ai/* — публичный endpoint для юзеров клуба.

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { and, eq, gt, gte, sql, desc, isNull } from "drizzle-orm";
import { db } from "../db/client.js";
import { requireAuth, type SessionPayload } from "../lib/auth.js";
import { aiMessages } from "../db/schema/hell-ai.js";
import { passPurchases } from "../db/schema/pass.js";
import { systemSettings } from "../db/schema/economy.js";
import {
  loadAiSettings,
  loadUserGarage,
  buildSystemPrompt,
  AI_LIMITS_DEFAULT,
  TIER_PRIMARY_MODEL,
  FREE_PER_DAY,
  FREE_MODEL,
  type AiLimits,
} from "../lib/hell-ai.js";
import { chatCompletion, streamChatCompletion, OpenRouterError, type ChatMessage } from "../lib/openrouter.js";
import { acquireGlobalSlot, releaseGlobalSlot, acquireUserLock, releaseUserLock, AiBusyError, AiUserBusyError } from "../lib/ai-throttle.js";
import { addQuestProgress } from "../lib/quests.js";

const askSchema = z.object({
  question: z.string().trim().min(2).max(2000),
  bikeId: z.string().uuid().optional(),
  chatId: z.string().max(64).optional(),
});

type TierKey = "silver" | "gold" | "platinum";
const DAY_MS = 24 * 60 * 60 * 1000;

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

/** Кол-во user-сообщений юзера в скользящем окне 24h. Если passId=null — считаем free-вопросы. */
async function countUsed24h(userId: string, passId: string | null): Promise<number> {
  const since = new Date(Date.now() - DAY_MS);
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(aiMessages)
    .where(
      and(
        eq(aiMessages.userId, userId),
        eq(aiMessages.role, "user"),
        passId === null ? isNull(aiMessages.passId) : eq(aiMessages.passId, passId),
        gte(aiMessages.createdAt, since),
      ),
    );
  return row?.n ?? 0;
}

/** ISO-время, когда «освободится» первый слот в окне 24h. null = окно пустое. */
async function nextResetAt(userId: string, passId: string | null): Promise<string | null> {
  const since = new Date(Date.now() - DAY_MS);
  const [row] = await db
    .select({ ts: aiMessages.createdAt })
    .from(aiMessages)
    .where(
      and(
        eq(aiMessages.userId, userId),
        eq(aiMessages.role, "user"),
        passId === null ? isNull(aiMessages.passId) : eq(aiMessages.passId, passId),
        gte(aiMessages.createdAt, since),
      ),
    )
    .orderBy(aiMessages.createdAt)
    .limit(1);
  if (!row) return null;
  return new Date(row.ts.getTime() + DAY_MS).toISOString();
}

/** Резолв контекста запроса. Возвращает либо ошибку (status+code+msg) либо параметры запроса. */
type Resolved =
  | { ok: false; status: number; error: string; message: string }
  | {
      ok: true;
      isStaff: boolean;
      passIdForInsert: string | null;
      model: string;
    };

async function resolveAskContext(session: SessionPayload): Promise<Resolved> {
  const isStaff = session.role === "admin" || session.role === "blogger";
  if (isStaff) {
    return { ok: true, isStaff: true, passIdForInsert: null, model: TIER_PRIMARY_MODEL.platinum };
  }
  const pass = await getActivePass(session.sub);
  if (!pass) {
    const used = await countUsed24h(session.sub, null);
    if (used >= FREE_PER_DAY) {
      return {
        ok: false,
        status: 429,
        error: "free_limit_reached",
        message: `Бесплатные ${FREE_PER_DAY} вопроса в сутки исчерпаны. Активируй Hell Pass — Silver / Gold / Platinum.`,
      };
    }
    return { ok: true, isStaff: false, passIdForInsert: null, model: FREE_MODEL };
  }
  const limits = await loadLimits();
  const tier = pass.tier as TierKey;
  const limit = limits[tier];
  const used = await countUsed24h(session.sub, pass.id);
  if (used >= limit) {
    return {
      ok: false,
      status: 429,
      error: "limit_reached",
      message: `Лимит ${limit} вопросов в сутки исчерпан. Слоты освобождаются по скользящему окну 24 часа.`,
    };
  }
  return { ok: true, isStaff: false, passIdForInsert: pass.id, model: TIER_PRIMARY_MODEL[tier] };
}


export async function hellAiRoutes(app: FastifyInstance) {
  // Статус: текущий тир, лимит, осталось.
  app.get("/status", { preHandler: requireAuth }, async (req) => {
    const session = req.user as SessionPayload;
    // admin / blogger — безлимит без пасса
    if (session.role === "admin" || session.role === "blogger") {
      return { tier: "staff", limit: -1, used: 0, left: -1, unlimited: true, expiresAt: null, resetAt: null };
    }
    const pass = await getActivePass(session.sub);

    // Без активного Pass — free-режим: 3 вопроса / 24h.
    if (!pass) {
      const used = await countUsed24h(session.sub, null);
      const left = Math.max(0, FREE_PER_DAY - used);
      const resetAt = used > 0 ? await nextResetAt(session.sub, null) : null;
      return {
        tier: "free",
        limit: FREE_PER_DAY,
        used,
        left,
        unlimited: false,
        expiresAt: null,
        resetAt,
      };
    }

    // С активным Pass — лимит per-24h по этому пассу.
    const limits = await loadLimits();
    const tier = pass.tier as TierKey;
    const limit = limits[tier];
    const used = await countUsed24h(session.sub, pass.id);
    const resetAt = used > 0 ? await nextResetAt(session.sub, pass.id) : null;
    // Platinum: для UI показываем как «безлимит», пока не упёрся в hard-cap.
    const showUnlimited = tier === "platinum" && used < limit;
    return {
      tier,
      limit: showUnlimited ? -1 : limit,
      used,
      left: showUnlimited ? -1 : Math.max(0, limit - used),
      unlimited: showUnlimited,
      expiresAt: pass.expiresAt?.toISOString() ?? null,
      resetAt,
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

    const ctx = await resolveAskContext(session);
    if (!ctx.ok) {
      return reply.code(ctx.status).send({ error: ctx.error, message: ctx.message });
    }
    const { isStaff, passIdForInsert, model: modelForRequest } = ctx;


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

        // Лестница Hell AI — +1 вопрос. Не блокируем ответ при ошибке прогресса.
        addQuestProgress(session.sub, "hell_ai_ladder", 1).catch(() => null);

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

    // Throttle: per-user lock + глобальный семафор. До открытия SSE,
    // чтобы клиент получил нормальный JSON 409/503.
    try {
      acquireUserLock(session.sub);
    } catch (e) {
      const err = e as AiUserBusyError;
      return reply.code(409).send({ error: "user_busy", message: err.message });
    }
    let gotSlot = false;
    try {
      await acquireGlobalSlot();
      gotSlot = true;
    } catch (e) {
      releaseUserLock(session.sub);
      const err = e as AiBusyError;
      return reply.code(503).send({ error: "ai_busy", message: err.message });
    }

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
        addQuestProgress(session.sub, "hell_ai_ladder", 1).catch(() => null);
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
      if (gotSlot) releaseGlobalSlot();
      releaseUserLock(session.sub);
    }
  });

  // Список чатов юзера (последние 100). Title = первое user-сообщение.
  app.get("/chats", { preHandler: requireAuth }, async (req) => {
    const session = req.user as SessionPayload;
    const rows = await db.execute(sql`
      SELECT
        m.chat_id AS "chatId",
        MAX(m.created_at) AS "updatedAt",
        MIN(m.created_at) AS "createdAt",
        (SELECT content FROM ai_messages
          WHERE user_id = ${session.sub} AND chat_id = m.chat_id AND role = 'user'
          ORDER BY created_at ASC LIMIT 1) AS "title",
        (SELECT bike_id FROM ai_messages
          WHERE user_id = ${session.sub} AND chat_id = m.chat_id AND bike_id IS NOT NULL
          ORDER BY created_at DESC LIMIT 1) AS "bikeId",
        COUNT(*)::int AS "messageCount"
      FROM ai_messages m
      WHERE m.user_id = ${session.sub} AND m.chat_id IS NOT NULL
      GROUP BY m.chat_id
      ORDER BY MAX(m.created_at) DESC
      LIMIT 100
    `);
    const items = (rows as unknown as { rows: Array<Record<string, unknown>> }).rows ?? (rows as unknown as Array<Record<string, unknown>>);
    return {
      chats: (items as Array<Record<string, unknown>>).map((r) => ({
        id: String(r.chatId),
        title: r.title ? String(r.title).slice(0, 80) : "Новый чат",
        bikeId: r.bikeId ? String(r.bikeId) : null,
        messageCount: Number(r.messageCount ?? 0),
        createdAt: r.createdAt ? new Date(r.createdAt as string).toISOString() : null,
        updatedAt: r.updatedAt ? new Date(r.updatedAt as string).toISOString() : null,
      })),
    };
  });

  // Сообщения одного чата в порядке возрастания.
  app.get("/chats/:id", { preHandler: requireAuth }, async (req, reply) => {
    const session = req.user as SessionPayload;
    const { id } = req.params as { id: string };
    if (!id || id.length > 64) return reply.code(400).send({ error: "invalid_id" });
    const rows = await db
      .select({
        id: aiMessages.id,
        role: aiMessages.role,
        content: aiMessages.content,
        bikeId: aiMessages.bikeId,
        error: aiMessages.error,
        createdAt: aiMessages.createdAt,
      })
      .from(aiMessages)
      .where(and(eq(aiMessages.userId, session.sub), eq(aiMessages.chatId, id)))
      .orderBy(aiMessages.createdAt);
    return {
      chatId: id,
      messages: rows.map((r) => ({
        id: r.id,
        role: r.role,
        content: r.content,
        bikeId: r.bikeId,
        error: r.error,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  });

  // Удалить чат целиком.
  app.delete("/chats/:id", { preHandler: requireAuth }, async (req, reply) => {
    const session = req.user as SessionPayload;
    const { id } = req.params as { id: string };
    if (!id || id.length > 64) return reply.code(400).send({ error: "invalid_id" });
    await db
      .delete(aiMessages)
      .where(and(eq(aiMessages.userId, session.sub), eq(aiMessages.chatId, id)));
    return { ok: true };
  });
}

