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

  return app;
}
