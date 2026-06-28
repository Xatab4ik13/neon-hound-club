import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq, inArray } from "drizzle-orm";
import { db } from "../db/client.js";
import { systemSettings } from "../db/schema/economy.js";
import { loadSession, requireAdmin, type SessionPayload } from "../lib/auth.js";

const PUBLIC_KEYS = ["maintenance", "club"] as const;
const ALL_KEYS = ["maintenance", "club", "hell_ai", "admin_alerts", "tax"] as const;
type Key = (typeof ALL_KEYS)[number];

const valueSchemas: Record<Key, z.ZodType<any>> = {
  maintenance: z.object({
    enabled: z.boolean(),
    message: z.string().max(500).default(""),
  }),
  club: z.object({
    name: z.string().min(1).max(120),
    contact_email: z.string().email().or(z.literal("")).default(""),
    support_url: z.string().url().or(z.literal("")).default(""),
  }),
  hell_ai: z.object({
    limit_silver: z.number().int().min(0).max(100000),
    limit_gold: z.number().int().min(0).max(100000),
    limit_platinum: z.number().int().min(-1).max(100000), // -1 = ∞
  }),
  admin_alerts: z.object({
    new_orders: z.boolean(),
    new_users: z.boolean(),
  }),
  tax: z.object({
    // УСН доходы. 0 = не считать налог.
    rate_percent: z.number().min(0).max(50),
  }),
};

async function loadAll(keys: readonly string[]) {
  const rows = await db.select().from(systemSettings).where(inArray(systemSettings.key, keys as string[]));
  const map: Record<string, unknown> = {};
  for (const r of rows) map[r.key] = r.value;
  return map;
}

/** Публичный endpoint — отдаёт только безопасные ключи (maintenance, club). */
export async function systemRoutes(app: FastifyInstance) {
  app.addHook("preHandler", loadSession);
  app.get("/", async () => {
    const map = await loadAll(PUBLIC_KEYS);
    return map;
  });
}

/** Админ — GET/PUT всех ключей. */
export async function adminSettingsRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAdmin);

  app.get("/", async () => {
    const map = await loadAll(ALL_KEYS);
    return map;
  });

  app.put<{ Params: { key: string } }>("/:key", async (req, reply) => {
    const session = req.user as SessionPayload;
    const key = req.params.key as Key;
    if (!(ALL_KEYS as readonly string[]).includes(key)) {
      return reply.code(400).send({ error: "unknown_key" });
    }
    const parsed = valueSchemas[key].safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid", message: parsed.error.issues[0]?.message });
    }
    const [row] = await db
      .insert(systemSettings)
      .values({ key, value: parsed.data, updatedBy: session.sub })
      .onConflictDoUpdate({
        target: systemSettings.key,
        set: { value: parsed.data, updatedAt: new Date(), updatedBy: session.sub },
      })
      .returning();
    return row;
  });
}
