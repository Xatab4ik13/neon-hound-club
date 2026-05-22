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

  return app;
}
