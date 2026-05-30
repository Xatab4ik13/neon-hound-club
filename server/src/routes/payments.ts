import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth, type SessionPayload } from "../lib/auth.js";
import {
  createPaymentForOrder,
  createPaymentForPass,
  getPaymentStatusForUser,
  handleRaifNotification,
  PaymentInitError,
} from "../lib/payments.js";
import { isRaifConfigured } from "../lib/raif.js";
import { PAYMENT_METHODS } from "../db/schema/payments.js";

const idSchema = z.object({ id: z.string().uuid() });
const initBodySchema = z
  .object({ method: z.enum(PAYMENT_METHODS).optional() })
  .optional();

export async function paymentsRoutes(app: FastifyInstance) {
  // GET /api/v1/payments/methods — какие способы оплаты сконфигурированы на бэке.
  // Используется фронтом, чтобы решить, показывать ли кнопку СБП.
  app.get("/methods", async () => {
    return {
      card: isRaifConfigured("card"),
      sbp: isRaifConfigured("sbp"),
    };
  });

  // POST /api/v1/payments/pass/:id/init — создать платёж для покупки Pass.
  app.post<{ Params: { id: string }; Body: { method?: "card" | "sbp" } }>(
    "/pass/:id/init",
    { preHandler: requireAuth },
    async (req, reply) => {
      const parsed = idSchema.safeParse(req.params);
      if (!parsed.success) return reply.code(400).send({ error: "invalid_id" });
      const bodyParsed = initBodySchema.safeParse(req.body ?? {});
      if (!bodyParsed.success) return reply.code(400).send({ error: "invalid_method" });
      const method = bodyParsed.data?.method ?? "card";
      const session = req.user as SessionPayload;
      try {
        const r = await createPaymentForPass(parsed.data.id, session.sub, method);
        return reply.code(201).send({ paymentId: r.payment.id, paymentUrl: r.paymentUrl });
      } catch (e) {
        if (e instanceof PaymentInitError) {
          return reply.code(400).send({ error: e.code, message: e.message });
        }
        req.log.error({ err: e }, "createPaymentForPass failed");
        return reply.code(500).send({ error: "payment_init_failed", message: "Не удалось создать платёж" });
      }
    },
  );

  // POST /api/v1/payments/order/:id/init — создать платёж для заказа мерча.
  app.post<{ Params: { id: string }; Body: { method?: "card" | "sbp" } }>(
    "/order/:id/init",
    { preHandler: requireAuth },
    async (req, reply) => {
      const parsed = idSchema.safeParse(req.params);
      if (!parsed.success) return reply.code(400).send({ error: "invalid_id" });
      const bodyParsed = initBodySchema.safeParse(req.body ?? {});
      if (!bodyParsed.success) return reply.code(400).send({ error: "invalid_method" });
      const method = bodyParsed.data?.method ?? "card";
      const session = req.user as SessionPayload;
      try {
        const r = await createPaymentForOrder(parsed.data.id, session.sub, method);
        return reply.code(201).send({ paymentId: r.payment.id, paymentUrl: r.paymentUrl });
      } catch (e) {
        if (e instanceof PaymentInitError) {
          return reply.code(400).send({ error: e.code, message: e.message });
        }
        req.log.error({ err: e }, "createPaymentForOrder failed");
        return reply.code(500).send({ error: "payment_init_failed", message: "Не удалось создать платёж" });
      }
    },
  );

  // GET /api/v1/payments/:id/status — фронт поллит после редиректа на /pay/success.
  app.get<{ Params: { id: string } }>(
    "/:id/status",
    { preHandler: requireAuth },
    async (req, reply) => {
      const parsed = idSchema.safeParse(req.params);
      if (!parsed.success) return reply.code(400).send({ error: "invalid_id" });
      const session = req.user as SessionPayload;
      const row = await getPaymentStatusForUser(parsed.data.id, session.sub);
      if (!row) return reply.code(404).send({ error: "not_found" });
      return row;
    },
  );

  // POST /api/v1/payments/raif/webhook — Notification от Райффайзена.
  // Подпись в заголовке X-Api-Signature-SHA256. IP 193.28.44.23.
  // Webhook URL у ОБЕИХ торговых точек (card и sbp) в ЛК Райфа — этот один.
  app.post("/raif/webhook", async (req, reply) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const signature =
      (req.headers["x-api-signature-sha256"] as string | undefined) ??
      (req.headers["X-Api-Signature-SHA256"] as string | undefined);
    try {
      const ok = await handleRaifNotification(body, signature);
      if (!ok) {
        req.log.warn({ body }, "raif webhook rejected (bad signature or unknown payment)");
        return reply.code(400).send({ error: "invalid_signature" });
      }
      return reply.code(200).send({ ok: true });
    } catch (e) {
      req.log.error({ err: e, body }, "raif webhook crashed");
      return reply.code(500).send({ error: "internal" });
    }
  });
}
