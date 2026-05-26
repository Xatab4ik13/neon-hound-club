// /api/v1/dadata/* — прокси к DaData Suggestions API.
// Ключ DADATA_API_KEY храним только на бэке, фронт ходит без авторизации
// (с rate-limit). Поддерживаем типы: fio, email, address, party, bank.

import type { FastifyInstance } from "fastify";
import { z } from "zod";

const ALLOWED = new Set(["fio", "email", "address", "party", "bank"] as const);
type SuggestType = "fio" | "email" | "address" | "party" | "bank";

const bodySchema = z.object({
  query: z.string().trim().min(1).max(200),
  count: z.number().int().min(1).max(20).optional(),
  // произвольные параметры DaData (locations, from_bound, to_bound, parts и т.д.)
  // ограничиваем размером объекта, чтобы не давать злоупотреблять.
  params: z.record(z.string(), z.any()).optional(),
});

export async function dadataRoutes(app: FastifyInstance) {
  app.post<{ Params: { type: string } }>(
    "/suggest/:type",
    {
      config: {
        rateLimit: { max: 60, timeWindow: "1 minute" },
      },
    },
    async (req, reply) => {
      const type = req.params.type as SuggestType;
      if (!ALLOWED.has(type)) {
        return reply.code(400).send({ error: "bad_type", message: "Unsupported suggest type" });
      }
      const token = process.env.DADATA_API_KEY;
      if (!token) {
        req.log.error("DADATA_API_KEY is not configured");
        return reply.code(500).send({ error: "not_configured", message: "DaData is not configured on server" });
      }
      const parsed = bodySchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: "bad_request", message: parsed.error.message });
      }
      const { query, count, params } = parsed.data;

      const payload: Record<string, unknown> = { query, count: count ?? 7, ...(params ?? {}) };

      try {
        const res = await fetch(
          `https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/${type}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
              Authorization: `Token ${token}`,
            },
            body: JSON.stringify(payload),
          },
        );
        const text = await res.text();
        if (!res.ok) {
          req.log.warn({ status: res.status, body: text.slice(0, 300) }, "dadata upstream error");
          return reply.code(502).send({ error: "upstream_error", message: `DaData ${res.status}` });
        }
        reply.header("Cache-Control", "private, max-age=10");
        return reply.type("application/json").send(text);
      } catch (e) {
        req.log.error({ err: e }, "dadata fetch failed");
        return reply.code(502).send({ error: "upstream_unreachable", message: "DaData unreachable" });
      }
    },
  );
}
