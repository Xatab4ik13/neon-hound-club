import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { pushSubscriptions } from "../db/schema/push.js";
import { loadSession, requireAdmin, type SessionPayload } from "../lib/auth.js";
import { pushToAll } from "../lib/push.js";

const subscribeSchema = z.object({
  endpoint: z.string().url().max(2048),
  keys: z.object({
    p256dh: z.string().min(1).max(512),
    auth: z.string().min(1).max(512),
  }),
});

const unsubscribeSchema = z.object({
  endpoint: z.string().url().max(2048),
});

export async function pushRoutes(app: FastifyInstance) {
  app.get("/config", async () => {
    const publicKey = (process.env.VAPID_PUBLIC_KEY ?? "").trim();
    return {
      enabled: Boolean(publicKey),
      publicKey: publicKey || null,
    };
  });

  // Подписаться (можно и без логина — анонимный девайс).
  app.post("/subscribe", { preHandler: loadSession }, async (req, reply) => {
    const parsed = subscribeSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "bad_request", message: "Неверный формат подписки" });
    }
    const session = req.user as SessionPayload | undefined;
    const ua = (req.headers["user-agent"] ?? "").slice(0, 500) || null;

    await db
      .insert(pushSubscriptions)
      .values({
        userId: session?.sub ?? null,
        endpoint: parsed.data.endpoint,
        p256dh: parsed.data.keys.p256dh,
        auth: parsed.data.keys.auth,
        userAgent: ua,
      })
      .onConflictDoUpdate({
        target: pushSubscriptions.endpoint,
        set: {
          userId: session?.sub ?? null,
          p256dh: parsed.data.keys.p256dh,
          auth: parsed.data.keys.auth,
          userAgent: ua,
          lastSeenAt: new Date(),
        },
      });

    return { ok: true };
  });

  app.post("/unsubscribe", async (req, reply) => {
    const parsed = unsubscribeSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "bad_request", message: "endpoint required" });
    }
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, parsed.data.endpoint));
    return { ok: true };
  });

  // Админский тест.
  app.post("/test", { preHandler: requireAdmin }, async () => {
    return pushToAll({
      title: "HELLHOUND — тест",
      body: "Если ты это видишь — пуши работают.",
      url: "/club",
      tag: "test",
    });
  });
}
