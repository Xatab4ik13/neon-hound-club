import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import multipart from "@fastify/multipart";

export async function buildApp() {
  const app = Fastify({
    logger: {
      transport:
        process.env.NODE_ENV === "production"
          ? undefined
          : { target: "pino-pretty", options: { translateTime: "HH:MM:ss", ignore: "pid,hostname" } },
    },
    trustProxy: true,
  });

  await app.register(cors, {
    origin: process.env.FRONTEND_ORIGIN ?? "https://hhr.pro",
    credentials: true,
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  });

  await app.register(cookie);

  await app.register(jwt, {
    secret: process.env.JWT_SECRET ?? "dev-only-secret-change-me",
    cookie: { cookieName: "hh_sid", signed: false },
  });

  await app.register(rateLimit, {
    max: 200,
    timeWindow: "1 minute",
  });

  await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } });

  app.get("/healthz", async () => ({ ok: true, ts: Date.now() }));

  const { authRoutes } = await import("./routes/auth.js");
  await app.register(authRoutes, { prefix: "/api/v1/auth" });

  const { ticketsRoutes, adminTicketsRoutes } = await import("./routes/tickets.js");
  await app.register(ticketsRoutes, { prefix: "/api/v1/tickets" });
  await app.register(adminTicketsRoutes, { prefix: "/api/v1/admin/tickets" });

  const { shopRoutes, adminShopRoutes } = await import("./routes/shop.js");
  await app.register(shopRoutes, { prefix: "/api/v1/shop" });
  await app.register(adminShopRoutes, { prefix: "/api/v1/admin/shop" });

  const { passRoutes, adminPassRoutes } = await import("./routes/pass.js");
  await app.register(passRoutes, { prefix: "/api/v1/pass" });
  await app.register(adminPassRoutes, { prefix: "/api/v1/admin/pass" });

  const { rafflesRoutes, adminRafflesRoutes } = await import("./routes/raffles.js");
  await app.register(rafflesRoutes, { prefix: "/api/v1/raffles" });
  await app.register(adminRafflesRoutes, { prefix: "/api/v1/admin/raffles" });

  const { profileRoutes, garageRoutes } = await import("./routes/profile.js");
  await app.register(profileRoutes, { prefix: "/api/v1/profile" });
  await app.register(garageRoutes, { prefix: "/api/v1/garage" });

  const { uploadsRoutes } = await import("./routes/uploads.js");
  await app.register(uploadsRoutes, { prefix: "/api/v1/uploads" });

  const { mediaRoutes } = await import("./routes/media.js");
  await app.register(mediaRoutes, { prefix: "/media" });

  const { questsRoutes, adminQuestsRoutes } = await import("./routes/quests.js");
  await app.register(questsRoutes, { prefix: "/api/v1/quests" });
  await app.register(adminQuestsRoutes, { prefix: "/api/v1/admin/quests" });

  const { adminUsersRoutes } = await import("./routes/admin-users.js");
  await app.register(adminUsersRoutes, { prefix: "/api/v1/admin/users" });

  const { newsRoutes, adminNewsRoutes } = await import("./routes/news.js");
  await app.register(newsRoutes, { prefix: "/api/v1/news" });
  await app.register(adminNewsRoutes, { prefix: "/api/v1/admin/news" });

  const { invitesRoutes } = await import("./routes/invites.js");
  await app.register(invitesRoutes, { prefix: "/api/v1/invites" });

  const { xpRoutes, adminXpRoutes } = await import("./routes/xp.js");
  await app.register(xpRoutes, { prefix: "/api/v1/xp" });
  await app.register(adminXpRoutes, { prefix: "/api/v1/admin/xp" });

  const { badgesRoutes, adminBadgesRoutes } = await import("./routes/badges.js");
  await app.register(badgesRoutes, { prefix: "/api/v1/badges" });
  await app.register(adminBadgesRoutes, { prefix: "/api/v1/admin/badges" });

  const { feedRoutes, postsRoutes, adminFeedRoutes } = await import("./routes/feed.js");
  await app.register(feedRoutes, { prefix: "/api/v1/feed" });
  await app.register(postsRoutes, { prefix: "/api/v1/posts" });
  await app.register(adminFeedRoutes, { prefix: "/api/v1/admin/feed" });

  // Создаём S3-бакет, если его ещё нет.
  try {
    const { ensureBucket } = await import("./lib/s3.js");
    await ensureBucket();
    app.log.info("s3 bucket ready");
  } catch (e) {
    app.log.error({ err: e }, "ensureBucket failed");
  }

  // Сидим стартовые квесты (идемпотентно по code).
  try {
    const { seedQuests } = await import("./lib/quests.js");
    await seedQuests();
    app.log.info("quests seeded");
  } catch (e) {
    app.log.error({ err: e }, "seedQuests failed");
  }

  return app;
}
