import type { FastifyReply, FastifyRequest } from "fastify";
import { and, eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { userRoles } from "../db/schema.js";
import { requireAuth } from "./middleware.js";

export async function requireAdmin(req: FastifyRequest, reply: FastifyReply) {
  await requireAuth(req, reply);
  if (reply.sent) return;
  const userId = req.userId!;
  const [row] = await db
    .select({ userId: userRoles.userId })
    .from(userRoles)
    .where(and(eq(userRoles.userId, userId), eq(userRoles.role, "admin")))
    .limit(1);
  if (!row) return reply.code(403).send({ error: "forbidden" });
}
