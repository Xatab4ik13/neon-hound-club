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
import { createPassPurchase, PassPurchaseError } from "../lib/pass.js";
import { PASS_TIERS } from "../db/schema/pass.js";
import { createOrderForUser, OrderCreateError } from "../lib/shop.js";

const idSchema = z.object({ id: z.string().uuid() });
const initBodySchema = z
  .object({ method: z.enum(PAYMENT_METHODS).optional() })
  .optional();

const FRONTEND = (process.env.FRONTEND_ORIGIN || "https://hhr.pro").replace(/\/$/, "");

/** Безопасно строим URL отката с ?payment_error=... — даже если FRONTEND кривой. */
function errorRedirect(path: string, message: string): string {
  try {
    const url = new URL(path, FRONTEND);
    url.searchParams.set("payment_error", message);
    return url.toString();
  } catch {
    return `${FRONTEND}${path}?payment_error=${encodeURIComponent(message)}`;
  }
}

// /redirect — единая точка входа для всех платежей.
// Принимает application/x-www-form-urlencoded ИЛИ application/json.
// Делает всё за один HTTP-цикл и отвечает 303 на платёжную форму банка.
// Это единственный надёжный способ открыть банк на iOS/Android PWA:
// форма-POST с прямого клика — нативный top-level navigation, который
// не режется блокировщиками popup/cross-origin рестрикциями.
const passRedirectSchema = z.object({
  target: z.literal("pass"),
  tier: z.enum(PASS_TIERS),
  method: z.enum(PAYMENT_METHODS).optional(),
});

const orderItemSchema = z.object({
  productId: z.string().uuid(),
  qty: z.coerce.number().int().min(1).max(50),
  size: z.string().trim().min(1).max(24).optional(),
});

const orderRedirectSchema = z.object({
  target: z.literal("order"),
  // items приходят JSON-строкой в форме; в JSON-режиме — массив.
  items: z.union([
    z.string().min(2),
    z.array(orderItemSchema).min(1).max(20),
  ]),
  shipping_fio: z.string().trim().min(2).max(120),
  shipping_phone: z.string().trim().min(5).max(32),
  shipping_city: z.string().trim().min(1).max(80),
  shipping_address: z.string().trim().min(3).max(300),
  shipping_postal_code: z.string().trim().min(3).max(16).optional(),
  comment: z.string().trim().max(1000).optional(),
  method: z.enum(PAYMENT_METHODS).optional(),
});

export async function paymentsRoutes(app: FastifyInstance) {
  app.get("/methods", async () => {
    return {
      card: isRaifConfigured("card"),
      sbp: isRaifConfigured("sbp"),
    };
  });

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

  app.post("/redirect", { preHandler: requireAuth }, async (req, reply) => {
    const session = req.user as SessionPayload;
    const body = (req.body ?? {}) as Record<string, unknown>;
    const target = String(body.target ?? "");

    if (target === "pass") {
      const parsed = passRedirectSchema.safeParse(body);
      if (!parsed.success) {
        return reply.redirect(errorRedirect("/club/hell-pass", "Неверные данные"), 303);
      }
      const { tier } = parsed.data;
      const method = parsed.data.method ?? "card";
      try {
        const purchase = await createPassPurchase(session.sub, tier);
        const r = await createPaymentForPass(purchase.id, session.sub, method);
        return reply.redirect(r.paymentUrl, 303);
      } catch (e) {
        const msg =
          e instanceof PassPurchaseError || e instanceof PaymentInitError
            ? e.message
            : "Не удалось открыть оплату";
        if (!(e instanceof PassPurchaseError || e instanceof PaymentInitError)) {
          req.log.error({ err: e }, "pass redirect failed");
        }
        return reply.redirect(errorRedirect(`/club/hell-pass/${tier}`, msg), 303);
      }
    }

    if (target === "order") {
      const parsed = orderRedirectSchema.safeParse(body);
      if (!parsed.success) {
        return reply.redirect(
          errorRedirect("/club/checkout", parsed.error.issues[0]?.message ?? "Неверные данные"),
          303,
        );
      }
      const method = parsed.data.method ?? "card";
      let items: Array<{ productId: string; qty: number; size?: string }>;
      try {
        const raw =
          typeof parsed.data.items === "string"
            ? JSON.parse(parsed.data.items)
            : parsed.data.items;
        items = z.array(orderItemSchema).min(1).max(20).parse(raw);
      } catch {
        return reply.redirect(errorRedirect("/club/checkout", "Корзина пустая"), 303);
      }

      try {
        const { orderId } = await createOrderForUser(session.sub, {
          items,
          shipping: {
            fio: parsed.data.shipping_fio,
            phone: parsed.data.shipping_phone,
            city: parsed.data.shipping_city,
            address: parsed.data.shipping_address,
            postalCode: parsed.data.shipping_postal_code,
          },
          comment: parsed.data.comment,
        });
        const r = await createPaymentForOrder(orderId, session.sub, method);
        return reply.redirect(r.paymentUrl, 303);
      } catch (e) {
        const msg =
          e instanceof OrderCreateError || e instanceof PaymentInitError
            ? e.message
            : "Не удалось открыть оплату";
        if (!(e instanceof OrderCreateError || e instanceof PaymentInitError)) {
          req.log.error({ err: e }, "order redirect failed");
        }
        return reply.redirect(errorRedirect("/club/checkout", msg), 303);
      }
    }

    return reply.redirect(errorRedirect("/club", "Неизвестный тип платежа"), 303);
  });

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
