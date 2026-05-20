import type { FastifyReply, FastifyRequest } from "fastify";
import { SESSION_COOKIE, verifySession } from "./jwt.js";

declare module "fastify" {
  interface FastifyRequest {
    userId?: string;
  }
}

export async function requireAuth(req: FastifyRequest, reply: FastifyReply) {
  const token = req.cookies[SESSION_COOKIE];
  if (!token) return reply.code(401).send({ error: "unauthorized" });
  const session = await verifySession(token);
  if (!session) return reply.code(401).send({ error: "unauthorized" });
  req.userId = session.userId;
}
