// VIP-чат: персональная переписка подписчика с блогером (Hell).
//
// Два неймспейса роутов в одном файле:
//   /api/v1/vip-chat          — со стороны юзера (один тред со «своим» блогером).
//   /api/v1/blogger/chats     — со стороны блогера (список входящих + диалог).
//
// Доступ:
//   Сейчас — любой авторизованный клубный юзер может писать.
//   TODO: закрыть под Platinum Hell Pass — заменить canUseVipChat() на проверку
//   активного паса тира platinum (см. lib/pass.ts).
//
// Пуши:
//   Юзер написал → пуш блогеру.
//   Блогер ответил → пуш юзеру.

import type { FastifyInstance } from "fastify";
import { and, asc, desc, eq, gt, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client.js";
import {
  vipChatThreads,
  vipChatMessages,
  type VipChatSenderRole,
} from "../db/schema/vip-chat.js";
import { users } from "../db/schema/users.js";
import { requireAuth, requireBloggerOrAdmin, type SessionPayload } from "../lib/auth.js";
import { pushToUsers } from "../lib/push.js";
import { getActivePass } from "../lib/pass.js";

const MAX_TEXT = 4000;
const MAX_STICKER = 120;

const sendSchema = z
  .object({
    text: z.string().trim().max(MAX_TEXT).optional(),
    sticker: z.string().trim().max(MAX_STICKER).optional(),
    imageUrl: z
      .string()
      .trim()
      .max(1000)
      .refine((s) => /^https?:\/\//i.test(s), { message: "imageUrl должен быть http(s)://" })
      .optional(),
  })
  .refine((v) => !!(v.text?.length || v.sticker || v.imageUrl), {
    message: "Пустое сообщение",
  });

// ─── Хелперы ────────────────────────────────────────────────────────

/** VIP-чат открыт только владельцам активного Hell Pass тира Platinum. */
async function canUseVipChat(userId: string): Promise<boolean> {
  const pass = await getActivePass(userId);
  return pass?.tier === "platinum";
}

/** Резолвит «главного блогера» — того, кому пишет юзер. Пока — самый старый
 *  пользователь с role='blogger'. Позже можно вынести в runtime-config. */
async function resolvePrimaryBlogger(): Promise<{ id: string; nick: string } | null> {
  const [row] = await db
    .select({ id: users.id, nick: users.nick })
    .from(users)
    .where(and(eq(users.role, "blogger"), eq(users.blocked, false)))
    .orderBy(asc(users.createdAt))
    .limit(1);
  return row ?? null;
}

function previewOf(text?: string | null, sticker?: string | null, imageUrl?: string | null): string {
  if (text && text.length > 0) return text.slice(0, 200);
  if (sticker) return "🎨 Стикер";
  if (imageUrl) return "📷 Фото";
  return "";
}

async function findOrCreateThread(userId: string, bloggerId: string) {
  const [existing] = await db
    .select()
    .from(vipChatThreads)
    .where(and(eq(vipChatThreads.userId, userId), eq(vipChatThreads.bloggerId, bloggerId)))
    .limit(1);
  if (existing) return existing;
  const [created] = await db
    .insert(vipChatThreads)
    .values({ userId, bloggerId })
    .returning();
  return created;
}

async function loadThreadMessages(threadId: string, limit: number) {
  const rows = await db
    .select({
      id: vipChatMessages.id,
      senderId: vipChatMessages.senderId,
      senderRole: vipChatMessages.senderRole,
      text: vipChatMessages.text,
      sticker: vipChatMessages.sticker,
      imageUrl: vipChatMessages.imageUrl,
      readAt: vipChatMessages.readAt,
      createdAt: vipChatMessages.createdAt,
    })
    .from(vipChatMessages)
    .where(eq(vipChatMessages.threadId, threadId))
    .orderBy(desc(vipChatMessages.createdAt))
    .limit(limit);
  // Отдаём в хронологическом порядке (старые сверху).
  return rows.reverse();
}

// ─── USER SIDE: /api/v1/vip-chat ─────────────────────────────────────

export async function vipChatRoutes(app: FastifyInstance) {
  // Тред + последние N сообщений со «своим» блогером.
  app.get("/thread", { preHandler: requireAuth }, async (req, reply) => {
    const session = req.user as SessionPayload;
    if (!(await canUseVipChat(session.sub))) {
      return reply.code(403).send({ error: "vip_chat_locked", message: "Доступно с Hell Pass Platinum" });
    }
    const blogger = await resolvePrimaryBlogger();
    if (!blogger) return reply.code(404).send({ error: "no_blogger" });
    const thread = await findOrCreateThread(session.sub, blogger.id);
    const messages = await loadThreadMessages(thread.id, 200);
    return {
      thread: {
        id: thread.id,
        unread: thread.userUnread,
        lastMessageAt: thread.lastMessageAt,
      },
      blogger,
      messages,
    };
  });

  // Отправить сообщение блогеру.
  app.post("/messages", { preHandler: requireAuth }, async (req, reply) => {
    const session = req.user as SessionPayload;
    if (!(await canUseVipChat(session.sub))) {
      return reply.code(403).send({ error: "vip_chat_locked" });
    }
    const parsed = sendSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_input", message: parsed.error.issues[0]?.message });
    }
    const blogger = await resolvePrimaryBlogger();
    if (!blogger) return reply.code(404).send({ error: "no_blogger" });

    const thread = await findOrCreateThread(session.sub, blogger.id);
    const preview = previewOf(parsed.data.text, parsed.data.sticker, parsed.data.imageUrl);
    const [msg] = await db
      .insert(vipChatMessages)
      .values({
        threadId: thread.id,
        senderId: session.sub,
        senderRole: "user",
        text: parsed.data.text ?? null,
        sticker: parsed.data.sticker ?? null,
        imageUrl: parsed.data.imageUrl ?? null,
      })
      .returning();

    await db
      .update(vipChatThreads)
      .set({
        lastMessageAt: msg.createdAt,
        lastMessagePreview: preview,
        lastMessageRole: "user",
        bloggerUnread: sql`${vipChatThreads.bloggerUnread} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(vipChatThreads.id, thread.id));

    // Пуш блогеру. Ошибку не роняем — сообщение уже сохранено.
    try {
      await pushToUsers([blogger.id], {
        title: `VIP-чат · ${session.nick}`,
        body: preview || "Новое сообщение",
        url: `/blogger/chats/${session.sub}`,
        tag: `vip-chat:${thread.id}`,
      });
    } catch {
      /* noop */
    }

    return { ok: true, message: msg };
  });

  // Отметить входящие (от блогера) прочитанными.
  app.post("/thread/read", { preHandler: requireAuth }, async (req, reply) => {
    const session = req.user as SessionPayload;
    const blogger = await resolvePrimaryBlogger();
    if (!blogger) return reply.code(404).send({ error: "no_blogger" });
    const thread = await findOrCreateThread(session.sub, blogger.id);

    await db
      .update(vipChatMessages)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(vipChatMessages.threadId, thread.id),
          eq(vipChatMessages.senderRole, "blogger"),
          // readAt IS NULL
          sql`${vipChatMessages.readAt} is null`,
        ),
      );
    await db
      .update(vipChatThreads)
      .set({ userUnread: 0, updatedAt: new Date() })
      .where(eq(vipChatThreads.id, thread.id));

    return { ok: true };
  });
}

// ─── BLOGGER SIDE: /api/v1/blogger/chats ─────────────────────────────

export async function bloggerVipChatRoutes(app: FastifyInstance) {
  // Список тредов блогера — как Telegram-инбокс.
  app.get("/", { preHandler: requireBloggerOrAdmin }, async (req) => {
    const session = req.user as SessionPayload;
    const rows = await db
      .select({
        threadId: vipChatThreads.id,
        userId: vipChatThreads.userId,
        lastMessageAt: vipChatThreads.lastMessageAt,
        lastMessagePreview: vipChatThreads.lastMessagePreview,
        lastMessageRole: vipChatThreads.lastMessageRole,
        bloggerUnread: vipChatThreads.bloggerUnread,
        peerNick: users.nick,
        peerAvatar: sql<string | null>`null`, // TODO: подтянуть из profiles.avatar_url
      })
      .from(vipChatThreads)
      .innerJoin(users, eq(users.id, vipChatThreads.userId))
      .where(eq(vipChatThreads.bloggerId, session.sub))
      .orderBy(desc(vipChatThreads.lastMessageAt))
      .limit(200);
    return { items: rows };
  });

  // Диалог с конкретным юзером.
  app.get<{ Params: { userId: string } }>(
    "/:userId",
    { preHandler: requireBloggerOrAdmin },
    async (req, reply) => {
      const session = req.user as SessionPayload;
      const params = z.object({ userId: z.string().uuid() }).safeParse(req.params);
      if (!params.success) return reply.code(400).send({ error: "invalid_id" });

      const [peer] = await db
        .select({ id: users.id, nick: users.nick })
        .from(users)
        .where(eq(users.id, params.data.userId))
        .limit(1);
      if (!peer) return reply.code(404).send({ error: "user_not_found" });

      const thread = await findOrCreateThread(peer.id, session.sub);
      const messages = await loadThreadMessages(thread.id, 300);
      return {
        thread: {
          id: thread.id,
          unread: thread.bloggerUnread,
          lastMessageAt: thread.lastMessageAt,
        },
        peer,
        messages,
      };
    },
  );

  // Отправить ответ юзеру.
  app.post<{ Params: { userId: string } }>(
    "/:userId/messages",
    { preHandler: requireBloggerOrAdmin },
    async (req, reply) => {
      const session = req.user as SessionPayload;
      const params = z.object({ userId: z.string().uuid() }).safeParse(req.params);
      if (!params.success) return reply.code(400).send({ error: "invalid_id" });
      const parsed = sendSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: "invalid_input", message: parsed.error.issues[0]?.message });
      }

      const [peer] = await db
        .select({ id: users.id, nick: users.nick })
        .from(users)
        .where(eq(users.id, params.data.userId))
        .limit(1);
      if (!peer) return reply.code(404).send({ error: "user_not_found" });

      const thread = await findOrCreateThread(peer.id, session.sub);
      const preview = previewOf(parsed.data.text, parsed.data.sticker, parsed.data.imageUrl);

      const [msg] = await db
        .insert(vipChatMessages)
        .values({
          threadId: thread.id,
          senderId: session.sub,
          senderRole: "blogger",
          text: parsed.data.text ?? null,
          sticker: parsed.data.sticker ?? null,
          imageUrl: parsed.data.imageUrl ?? null,
        })
        .returning();

      await db
        .update(vipChatThreads)
        .set({
          lastMessageAt: msg.createdAt,
          lastMessagePreview: preview,
          lastMessageRole: "blogger",
          userUnread: sql`${vipChatThreads.userUnread} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(vipChatThreads.id, thread.id));

      // Пуш юзеру.
      try {
        await pushToUsers([peer.id], {
          title: `${session.nick} · VIP-чат`,
          body: preview || "Новое сообщение",
          url: "/club/vip-chat",
          tag: `vip-chat:${thread.id}`,
        });
      } catch {
        /* noop */
      }

      return { ok: true, message: msg };
    },
  );

  // Отметить входящие от юзера прочитанными.
  app.post<{ Params: { userId: string } }>(
    "/:userId/read",
    { preHandler: requireBloggerOrAdmin },
    async (req, reply) => {
      const session = req.user as SessionPayload;
      const params = z.object({ userId: z.string().uuid() }).safeParse(req.params);
      if (!params.success) return reply.code(400).send({ error: "invalid_id" });

      const [existing] = await db
        .select()
        .from(vipChatThreads)
        .where(
          and(
            eq(vipChatThreads.userId, params.data.userId),
            eq(vipChatThreads.bloggerId, session.sub),
          ),
        )
        .limit(1);
      if (!existing) return { ok: true };

      await db
        .update(vipChatMessages)
        .set({ readAt: new Date() })
        .where(
          and(
            eq(vipChatMessages.threadId, existing.id),
            eq(vipChatMessages.senderRole, "user"),
            sql`${vipChatMessages.readAt} is null`,
          ),
        );
      await db
        .update(vipChatThreads)
        .set({ bloggerUnread: 0, updatedAt: new Date() })
        .where(eq(vipChatThreads.id, existing.id));

      return { ok: true };
    },
  );
}

// В некоторых кодовых базах предупреждают о неиспользованных импортах — держим здесь.
void gt;
void ne;
