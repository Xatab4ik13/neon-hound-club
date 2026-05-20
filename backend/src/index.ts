import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { env, corsOrigins } from "./env.js";
import { authRoutes } from "./auth/routes.js";
import { passRoutes } from "./pass/routes.js";

const app = Fastify({ logger: true, trustProxy: true });

await app.register(helmet, { contentSecurityPolicy: false });
await app.register(cookie);
await app.register(cors, {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // curl / healthcheck
    if (corsOrigins.includes(origin)) return cb(null, true);
    if (/^https:\/\/[a-z0-9-]+\.lovable\.app$/.test(origin)) return cb(null, true);
    return cb(new Error("origin_not_allowed"), false);
  },
  credentials: true,
});
await app.register(rateLimit, { max: 100, timeWindow: "1 minute" });

app.get("/health", async () => ({ ok: true }));
await app.register(authRoutes);
await app.register(passRoutes);

app.listen({ port: env.PORT, host: "0.0.0.0" }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
