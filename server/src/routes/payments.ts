import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth, type SessionPayload } from "../lib/auth.js";
import {
  createPaymentForOrder,
  createPaymentForPass,
  getPaymentStatusForUser,
  handleTbankNotification,
  PaymentInitError,
} from "../lib/payments.js";

const idSchema = z.object({ id: z.string().uuid() });

export async function paymentsRoutes(app: FastifyInstance) {
  // POST /api/v1/payments/pass/:id/init — создать платёж для покупки Pass.
  app.post<{ Params: { id: string } }>(
    "/pass/:id/init",
    { preHandler: requireAuth },
    async (req, reply) => {
      const parsed = idSchema.safeParse(req.params);
      if (!parsed.success) return reply.code(400).send({ error: "invalid_id" });
      const session = req.user as SessionPayload;
      try {
        const r = await createPaymentForPass(parsed.data.id, session.sub);
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
  app.post<{ Params: { id: string } }>(
    "/order/:id/init",
    { preHandler: requireAuth },
    async (req, reply) => {
      const parsed = idSchema.safeParse(req.params);
      if (!parsed.success) return reply.code(400).send({ error: "invalid_id" });
      const session = req.user as SessionPayload;
      try {
        const r = await createPaymentForOrder(parsed.data.id, session.sub);
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

  // POST /api/v1/payments/tbank/webhook — Notification от Т-Банка.
  // Без auth. Ответ строго текстом "OK" — иначе банк ретраит.
  app.post("/tbank/webhook", async (req, reply) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    try {
      const ok = await handleTbankNotification(body);
      if (!ok) {
        req.log.warn({ body }, "tbank webhook rejected");
        return reply.code(400).type("text/plain").send("ERR");
      }
      return reply.code(200).type("text/plain").send("OK");
    } catch (e) {
      req.log.error({ err: e, body }, "tbank webhook crashed");
      // 500 → банк ретраит, что нам и нужно при временной ошибке БД.
      return reply.code(500).type("text/plain").send("ERR");
    }
  });
}
