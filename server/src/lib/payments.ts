/**
 * Высокоуровневая обвязка над платёжкой (Raiffeisenbank e-commerce):
 *   - createPaymentFor{Pass,Order} — создать платёж и получить ссылку на форму
 *   - handleRaifNotification — обработать вебхук
 *
 * У нас две торговые точки (card / sbp) — фронт выбирает кнопкой,
 * метод сохраняется в payments.method и используется при проверке вебхука.
 *
 * Идемпотентность: на каждый ref (pass/order) + method живёт один активный
 * платёж (status в new/pending/authorized). Карточный и СБП-платёжи на тот же
 * заказ — это разные мерчанты, поэтому хранятся параллельно.
 */
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../db/client.js";
import { payments, type Payment, type PaymentMethod } from "../db/schema/payments.js";
import { passPurchases } from "../db/schema/pass.js";
import { orders } from "../db/schema/shop.js";
import { activatePassPurchase } from "./pass.js";
import { markOrderPaid } from "./shop.js";
import {
  createOrder,
  verifyPaymentCallback,
  mapRaifStatus,
  isRaifConfigured,
  getAccount,
  RaifApiError,
} from "./raif.js";

const FRONTEND = (process.env.FRONTEND_ORIGIN || "https://hhr.pro").replace(/\/$/, "");
const SUCCESS_URL = process.env.RAIF_SUCCESS_URL || `${FRONTEND}/pay/success`;
const FAIL_URL = process.env.RAIF_FAIL_URL || `${FRONTEND}/pay/fail`;

export class PaymentInitError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

const ACTIVE_STATUSES = ["new", "pending", "authorized"] as const;

async function findActivePayment(
  refType: "pass" | "order",
  refId: string,
  method: PaymentMethod,
): Promise<Payment | null> {
  const [row] = await db
    .select()
    .from(payments)
    .where(
      and(
        eq(payments.refType, refType),
        eq(payments.refId, refId),
        eq(payments.method, method),
        inArray(payments.status, ACTIVE_STATUSES as unknown as string[]),
      ),
    )
    .limit(1);
  return row ?? null;
}

/** Аппендим query-параметр ?p=<paymentId> к success/fail, чтобы фронт мог запросить статус. */
function withPaymentId(url: string, paymentId: string): string {
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}p=${encodeURIComponent(paymentId)}`;
}

/**
 * Создать (или вернуть существующий) платёж для покупки Hell Pass.
 */
export async function createPaymentForPass(
  purchaseId: string,
  userId: string,
  method: PaymentMethod = "card",
): Promise<{ payment: Payment; paymentUrl: string }> {
  if (!isRaifConfigured(method)) {
    throw new PaymentInitError(
      "payments_not_configured",
      method === "sbp" ? "Оплата через СБП сейчас недоступна" : "Оплата сейчас недоступна",
    );
  }
  const [purchase] = await db
    .select()
    .from(passPurchases)
    .where(eq(passPurchases.id, purchaseId))
    .limit(1);
  if (!purchase) throw new PaymentInitError("purchase_not_found", "Заявка на Pass не найдена");
  if (purchase.userId !== userId) throw new PaymentInitError("forbidden", "Чужая заявка");
  if (purchase.status !== "pending_payment") {
    throw new PaymentInitError("purchase_not_payable", `Заявка уже ${purchase.status}`);
  }

  const existing = await findActivePayment("pass", purchase.id, method);
  if (existing && existing.paymentUrl) return { payment: existing, paymentUrl: existing.paymentUrl };

  const [created] = await db
    .insert(payments)
    .values({
      provider: "raif",
      refType: "pass",
      refId: purchase.id,
      userId,
      amountRub: purchase.priceRub,
      method,
      status: "new",
    })
    .returning();

  try {
    const order = await createOrder({
      method,
      orderId: created!.id,
      amountRub: purchase.priceRub,
      comment: `Hell Pass ${purchase.tier.toUpperCase()} - 30 dney`,
      successUrl: withPaymentId(SUCCESS_URL, created!.id),
      failUrl: withPaymentId(FAIL_URL, created!.id),
      extra: { userId, refType: "pass", refId: purchase.id },
    });
    if (!order.payformUrl) {
      throw new RaifApiError(502, "no_payform_url", "Райффайзен не вернул payformUrl", order);
    }
    const [updated] = await db
      .update(payments)
      .set({
        providerPaymentId: order.id,
        paymentUrl: order.payformUrl,
        status: "pending",
        rawInit: order as unknown as Record<string, unknown>,
        updatedAt: new Date(),
      })
      .where(eq(payments.id, created!.id))
      .returning();
    return { payment: updated!, paymentUrl: order.payformUrl };
  } catch (e) {
    const errorDetail =
      e instanceof RaifApiError
        ? { code: e.code, status: e.status, message: e.message, raw: e.raw }
        : { message: String(e) };
    // eslint-disable-next-line no-console
    console.error("[raif.createOrder] pass payment init failed", {
      paymentId: created!.id,
      method,
      ...errorDetail,
    });
    await db
      .update(payments)
      .set({
        status: "rejected",
        rawInit: { error: errorDetail } as Record<string, unknown>,
        updatedAt: new Date(),
      })
      .where(eq(payments.id, created!.id));
    if (e instanceof RaifApiError) {
      throw new PaymentInitError(e.code, `Райф: ${e.message}`);
    }
    throw new PaymentInitError("init_failed", "Не удалось создать платёж");
  }
}

/** То же самое для заказа мерча. */
export async function createPaymentForOrder(
  orderId: string,
  userId: string,
  method: PaymentMethod = "card",
): Promise<{ payment: Payment; paymentUrl: string }> {
  if (!isRaifConfigured(method)) {
    throw new PaymentInitError(
      "payments_not_configured",
      method === "sbp" ? "Оплата через СБП сейчас недоступна" : "Оплата сейчас недоступна",
    );
  }
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) throw new PaymentInitError("order_not_found", "Заказ не найден");
  if (order.userId !== userId) throw new PaymentInitError("forbidden", "Чужой заказ");
  if (order.status !== "pending_payment") {
    throw new PaymentInitError("order_not_payable", `Заказ уже ${order.status}`);
  }

  const existing = await findActivePayment("order", order.id, method);
  if (existing && existing.paymentUrl) return { payment: existing, paymentUrl: existing.paymentUrl };

  const [created] = await db
    .insert(payments)
    .values({
      provider: "raif",
      refType: "order",
      refId: order.id,
      userId,
      amountRub: order.totalRub,
      method,
      status: "new",
    })
    .returning();

  try {
    const raifOrder = await createOrder({
      method,
      orderId: created!.id,
      amountRub: order.totalRub,
      comment: `Заказ #${order.id.slice(0, 8).toUpperCase()} в магазине HELLHOUND`,
      successUrl: withPaymentId(SUCCESS_URL, created!.id),
      failUrl: withPaymentId(FAIL_URL, created!.id),
      extra: { userId, refType: "order", refId: order.id },
    });
    if (!raifOrder.payformUrl) {
      throw new RaifApiError(502, "no_payform_url", "Райффайзен не вернул payformUrl", raifOrder);
    }
    const [updated] = await db
      .update(payments)
      .set({
        providerPaymentId: raifOrder.id,
        paymentUrl: raifOrder.payformUrl,
        status: "pending",
        rawInit: raifOrder as unknown as Record<string, unknown>,
        updatedAt: new Date(),
      })
      .where(eq(payments.id, created!.id))
      .returning();
    return { payment: updated!, paymentUrl: raifOrder.payformUrl };
  } catch (e) {
    const errorDetail =
      e instanceof RaifApiError
        ? { code: e.code, status: e.status, message: e.message, raw: e.raw }
        : { message: String(e) };
    // eslint-disable-next-line no-console
    console.error("[raif.createOrder] order payment init failed", {
      paymentId: created!.id,
      method,
      ...errorDetail,
    });
    await db
      .update(payments)
      .set({
        status: "rejected",
        rawInit: { error: errorDetail } as Record<string, unknown>,
        updatedAt: new Date(),
      })
      .where(eq(payments.id, created!.id));
    if (e instanceof RaifApiError) {
      throw new PaymentInitError(e.code, `Райф: ${e.message}`);
    }
    throw new PaymentInitError("init_failed", "Не удалось создать платёж");
  }
}

/**
 * Обработать Notification от Райффайзена (Уведомление об оплате v3).
 *   1. Найти наш payments row по providerPaymentId (= data.order.id).
 *   2. По payment.method взять секрет нужной торговой точки.
 *   3. Проверить HMAC-SHA-256 подпись этим секретом.
 *   4. Сверить сумму, обновить статус, активировать pass/order при SUCCESS.
 */
export async function handleRaifNotification(
  body: Record<string, unknown>,
  signature: string | undefined,
): Promise<boolean> {
  const event = body.event as string | undefined;

  const data = (body.data ?? {}) as Record<string, unknown>;
  const order = (data.order ?? {}) as Record<string, unknown>;
  const status = (data.status ?? {}) as Record<string, unknown>;
  const providerPaymentId = String(order.id ?? "");
  if (!providerPaymentId) return false;

  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.providerPaymentId, providerPaymentId))
    .limit(1);
  if (!payment) return false;

  const method = (payment.method as PaymentMethod) || "card";
  const acc = getAccount(method);
  if (!acc) return false;

  if (!verifyPaymentCallback(body, signature, acc.secretKey)) return false;

  // Если это не событие платежа — подпись валидна, отвечаем 200, ничего не делаем.
  if (event && event !== "PAYMENT") return true;

  // Сверка суммы — клиент мог изменить сумму на форме.
  const incomingAmount = Number(data.amount);
  if (!Number.isFinite(incomingAmount) || Math.round(incomingAmount) !== payment.amountRub) {
    await db
      .update(payments)
      .set({
        status: "rejected",
        rawLastNotification: body as Record<string, unknown>,
        updatedAt: new Date(),
      })
      .where(eq(payments.id, payment.id));
    return true;
  }

  const mapped = mapRaifStatus(status.value as string | undefined);
  await db
    .update(payments)
    .set({
      status: mapped,
      rawLastNotification: body as Record<string, unknown>,
      updatedAt: new Date(),
    })
    .where(eq(payments.id, payment.id));

  if (mapped === "confirmed") {
    if (payment.refType === "pass") {
      await activatePassPurchase(payment.refId);
    } else if (payment.refType === "order") {
      await markOrderPaid(payment.refId);
    }
  }

  return true;
}

/** Для фронта на /pay/success — поллит статус по нашему payments.id. */
export async function getPaymentStatusForUser(paymentId: string, userId: string) {
  const [row] = await db.select().from(payments).where(eq(payments.id, paymentId)).limit(1);
  if (!row || row.userId !== userId) return null;
  return {
    id: row.id,
    status: row.status,
    refType: row.refType,
    refId: row.refId,
    amountRub: row.amountRub,
    method: row.method,
  };
}
