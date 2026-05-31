import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { loadSession, requireAuth, type SessionPayload } from "../lib/auth.js";
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
import { createOrderForUser, createOrderFromCartForUser, OrderCreateError } from "../lib/shop.js";

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

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function paymentRedirectDocument(url: string): string {
  const safeUrl = escapeHtml(url);
  const jsUrl = JSON.stringify(url);

  return `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta http-equiv="refresh" content="0;url=${safeUrl}" />
    <title>Переход к оплате</title>
    <style>
      :root { color-scheme: light dark; }
      body {
        margin: 0;
        min-height: 100dvh;
        display: grid;
        place-items: center;
        padding: 24px;
        font: 16px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #0f0f10;
        color: #f5f5f5;
      }
      main { max-width: 420px; text-align: center; }
      a { color: #f5f5f5; }
    </style>
  </head>
  <body>
    <main>
      <p>Переходим к оплате…</p>
      <p><a href="${safeUrl}" rel="noopener noreferrer">Если не открылось — нажми сюда</a></p>
    </main>
    <script>
      const url = ${jsUrl};
      try { window.location.replace(url); } catch {}
      setTimeout(() => {
        try { window.location.href = url; } catch {}
      }, 60);
    </script>
  </body>
</html>`;
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
  // items может прийти из старого фронта, но основной источник правды теперь серверная корзина.
  items: z
    .union([z.string().min(2), z.array(orderItemSchema).min(1).max(20)])
    .optional(),
  shipping_fio: z.string().trim().min(2).max(120),
  shipping_phone: z.string().trim().min(5).max(32),
  shipping_city: z.string().trim().min(1).max(80),
  shipping_address: z.string().trim().min(3).max(300),
  shipping_postal_code: z.string().trim().min(3).max(16).optional(),
  comment: z.string().trim().max(1000).optional(),
  method: z.enum(PAYMENT_METHODS).optional(),
});

// Оплата уже существующего заказа (со страницы /club/orders/$id).
const orderExistingRedirectSchema = z.object({
  target: z.literal("order_existing"),
  order_id: z.string().uuid(),
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

  app.post("/redirect", { preHandler: loadSession }, async (req, reply) => {
    const session = req.user as SessionPayload | undefined;
    const body = (req.body ?? {}) as Record<string, unknown>;
    const target = String(body.target ?? "");

    // PWA-friendly режим: фронт просит JSON и сам делает window.open(paymentUrl).
    // Триггерится либо Accept: application/json, либо явным X-PWA: 1.
    const wantsJson =
      (req.headers["x-pwa"] as string | undefined) === "1" ||
      String(req.headers["accept"] ?? "").includes("application/json");

    const replyOk = (url: string) =>
      wantsJson
        ? reply.code(200).send({ paymentUrl: url })
        : reply
            .code(200)
            .header("content-type", "text/html; charset=utf-8")
            .header("cache-control", "no-store, max-age=0")
            .send(paymentRedirectDocument(url));
    const replyErr = (path: string, message: string) =>
      wantsJson
        ? reply.code(400).send({ error: "payment_init_failed", message })
        : reply.redirect(errorRedirect(path, message), 303);

    if (!session) {
      // На login с возвратом — куда вернуть, зависит от target.
      const back =
        target === "pass"
          ? `/club/hell-pass${typeof body.tier === "string" ? "/" + body.tier : ""}`
          : "/club/checkout";
      if (wantsJson) {
        return reply.code(401).send({ error: "unauthorized", message: "Войди заново" });
      }
      const url = new URL("/login", FRONTEND);
      url.searchParams.set("redirect", back);
      // Чтобы юзер на /login понимал, что его выкинуло из-за оплаты, а не сам пришёл.
      url.searchParams.set("payment_error", "Сессия истекла — войди заново и попробуй оплатить.");
      return reply.redirect(url.toString(), 303);
    }


    if (target === "pass") {
      const parsed = passRedirectSchema.safeParse(body);
      if (!parsed.success) {
        return replyErr("/club/hell-pass", "Неверные данные");
      }
      const { tier } = parsed.data;
      const method = parsed.data.method ?? "card";
      try {
        const purchase = await createPassPurchase(session.sub, tier);
        const r = await createPaymentForPass(purchase.id, session.sub, method);
        return replyOk(r.paymentUrl);
      } catch (e) {
        const msg =
          e instanceof PassPurchaseError || e instanceof PaymentInitError
            ? e.message
            : "Не удалось открыть оплату";
        if (!(e instanceof PassPurchaseError || e instanceof PaymentInitError)) {
          req.log.error({ err: e }, "pass redirect failed");
        }
        return replyErr(`/club/hell-pass/${tier}`, msg);
      }
    }

    if (target === "order") {
      const parsed = orderRedirectSchema.safeParse(body);
      if (!parsed.success) {
        return replyErr("/club/checkout", parsed.error.issues[0]?.message ?? "Неверные данные");
      }
      const method = parsed.data.method ?? "card";

      try {
        let orderId: string;
        if (Array.isArray(parsed.data.items) || typeof parsed.data.items === "string") {
          const raw =
            typeof parsed.data.items === "string"
              ? JSON.parse(parsed.data.items)
              : parsed.data.items;
          const items = z.array(orderItemSchema).min(1).max(20).parse(raw);
          ({ orderId } = await createOrderForUser(session.sub, {
            items,
            shipping: {
              fio: parsed.data.shipping_fio,
              phone: parsed.data.shipping_phone,
              city: parsed.data.shipping_city,
              address: parsed.data.shipping_address,
              postalCode: parsed.data.shipping_postal_code,
            },
            comment: parsed.data.comment,
          }));
        } else {
          ({ orderId } = await createOrderFromCartForUser(session.sub, {
            shipping: {
              fio: parsed.data.shipping_fio,
              phone: parsed.data.shipping_phone,
              city: parsed.data.shipping_city,
              address: parsed.data.shipping_address,
              postalCode: parsed.data.shipping_postal_code,
            },
            comment: parsed.data.comment,
          }));
        }
        const r = await createPaymentForOrder(orderId, session.sub, method);
        return replyOk(r.paymentUrl);
      } catch (e) {
        const msg =
          e instanceof OrderCreateError || e instanceof PaymentInitError
            ? e.message
            : "Не удалось открыть оплату";
        if (!(e instanceof OrderCreateError || e instanceof PaymentInitError)) {
          req.log.error({ err: e }, "order redirect failed");
        }
        return replyErr("/club/checkout", msg);
      }
    }

    if (target === "order_existing") {
      const parsed = orderExistingRedirectSchema.safeParse(body);
      if (!parsed.success) {
        return replyErr("/club/orders", "Неверный заказ");
      }
      const method = parsed.data.method ?? "card";
      try {
        const r = await createPaymentForOrder(parsed.data.order_id, session.sub, method);
        return replyOk(r.paymentUrl);
      } catch (e) {
        const msg = e instanceof PaymentInitError ? e.message : "Не удалось открыть оплату";
        if (!(e instanceof PaymentInitError)) {
          req.log.error({ err: e }, "order_existing redirect failed");
        }
        return replyErr(`/club/orders/${parsed.data.order_id}`, msg);
      }
    }

    return replyErr("/club", "Неизвестный тип платежа");
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
