import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "production"]).default("production"),
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32, "JWT_SECRET должен быть ≥32 символов"),
  CORS_ORIGINS: z.string().default(""),
  COOKIE_DOMAIN: z.string().optional(),
  // Hell AI. Опционально: если не задан — Hell AI вернёт 503.
  LOVABLE_API_KEY: z.string().optional(),
});

export const env = schema.parse(process.env);
export const corsOrigins = env.CORS_ORIGINS.split(",").map((s) => s.trim()).filter(Boolean);
