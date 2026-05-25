/**
 * Высокоуровневая обвязка над Т-Банком:
 *   - создать платёж для pass/order (createPaymentFor*)
 *   - обработать Notification (handleTbankNotification)
 *
 * Идемпотентность: на каждый ref (pass/order) живёт один активный платёж
 * (status в new/pending/authorized). Если он уже есть — переиспользуем.
 * Повторный CONFIRMED-вебхук не двоит активацию (это уже гарантируют
 * activatePassPurchase и markOrderPaid).
 */
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../db/client.js";
import { payments, type Payment } from "../db/schema/payments.js";
import { passPurchases } from "../db/schema/pass.js";
import { orders } from "../db/schema/shop.js";
import { activatePassPurchase } from "./pass.js";
import { markOrderPaid } from "./shop.js";
import {
  initPayment,
  getPaymentState,
  verifyNotification,
  mapTbankStatus,
  isTbankConfigured,
} from "./tbank.js";

const SUCCESS_URL =
  process.env.TBANK_SUCCESS_URL || `${process.env.FRONTEND_ORIGIN || "https://hhr.pro"}/pay/success`;
const FAIL_URL =
  process.env.TBANK_FAIL_URL || `${process.env.FRONTEND_ORIGIN || "https://hhr.pro"}/pay/fail`;
const NOTIFICATION_URL =
  process.env.TBANK_NOTIFICATION_URL ||
  `${(process.env.BACKEND_PUBLIC_URL || "https://api.hhr.pro").replace(/\/$/, "")}/api/v1/payments/tbank/webhook`;

export class PaymentInitError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

const ACTIVE_STATUSES = ["new", "pending", "authorized"] as const;

async function findActivePayment(refType: "pass" | "order", refId: string): Promise<Payment | null> {
  const [row] = await db
    .select()
    .from(payments)
    .where(
      and(
        eq(payments.refType, refType),
        eq(payments.refId, refId),
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
 * Возвращает { payment, paymentUrl } для редиректа на платёжную страницу.
 */
export async function createPaymentForPass(
  purchaseId: string,
  userId: string,
): Promise<{ payment: Payment; paymentUrl: string }> {
  if (!isTbankConfigured()) {
    throw new PaymentInitError("payments_not_configured", "Оплата сейчас недоступна");
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

  const existing = await findActivePayment("pass", purchase.id);
  if (existing && existing.paymentUrl) return { payment: existing, paymentUrl: existing.paymentUrl };

  // Создаём нашу запись заранее — её id и пойдёт как OrderId в Т-Банк.
  const [created] = await db
    .insert(payments)
    .values({
      provider: "tbank",
      refType: "pass",
      refId: purchase.id,
      userId,
      amountRub: purchase.priceRub,
      status: "new",
    })
    .returning();

  const init = await initPayment({
    orderId: created!.id,
    amountRub: purchase.priceRub,
    description: `Hell Pass ${purchase.tier.toUpperCase()} — 30 дней`,
    successUrl: withPaymentId(SUCCESS_URL, created!.id),
    failUrl: withPaymentId(FAIL_URL, created!.id),
    notificationUrl: NOTIFICATION_URL,
    data: { userId, refType: "pass", refId: purchase.id },
  });

  if (!init.Success || !init.PaymentURL || !init.PaymentId) {
    await db
      .update(payments)
      .set({
        status: "rejected",
        rawInit: init as unknown as Record<string, unknown>,
        updatedAt: new Date(),
      })
      .where(eq(payments.id, created!.id));
    throw new PaymentInitError(
      init.ErrorCode || "init_failed",
      init.Message || init.Details || "Не удалось создать платёж",
    );
  }

  const [updated] = await db
    .update(payments)
    .set({
      providerPaymentId: init.PaymentId,
      paymentUrl: init.PaymentURL,
      status: "pending",
      rawInit: init as unknown as Record<string, unknown>,
      updatedAt: new Date(),
    })
    .where(eq(payments.id, created!.id))
    .returning();

  return { payment: updated!, paymentUrl: init.PaymentURL };
}

/** То же самое для заказа мерча. */
export async function createPaymentForOrder(
  orderId: string,
  userId: string,
): Promise<{ payment: Payment; paymentUrl: string }> {
  if (!isTbankConfigured()) {
    throw new PaymentInitError("payments_not_configured", "Оплата сейчас недоступна");
  }
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) throw new PaymentInitError("order_not_found", "Заказ не найден");
  if (order.userId !== userId) throw new PaymentInitError("forbidden", "Чужой заказ");
  if (order.status !== "pending_payment") {
    throw new PaymentInitError("order_not_payable", `Заказ уже ${order.status}`);
  }

  const existing = await findActivePayment("order", order.id);
  if (existing && existing.paymentUrl) return { payment: existing, paymentUrl: existing.paymentUrl };

  const [created] = await db
    .insert(payments)
    .values({
      provider: "tbank",
      refType: "order",
      refId: order.id,
      userId,
      amountRub: order.totalRub,
      status: "new",
    })
    .returning();

  const init = await initPayment({
    orderId: created!.id,
    amountRub: order.totalRub,
    description: `Заказ #${order.id.slice(0, 8).toUpperCase()} в магазине HELLHOUND`,
    successUrl: withPaymentId(SUCCESS_URL, created!.id),
    failUrl: withPaymentId(FAIL_URL, created!.id),
    notificationUrl: NOTIFICATION_URL,
    customerEmail: undefined,
    customerPhone: order.shipping?.phone,
    data: { userId, refType: "order", refId: order.id },
  });

  if (!init.Success || !init.PaymentURL || !init.PaymentId) {
    await db
      .update(payments)
      .set({
        status: "rejected",
        rawInit: init as unknown as Record<string, unknown>,
        updatedAt: new Date(),
      })
      .where(eq(payments.id, created!.id));
    throw new PaymentInitError(
      init.ErrorCode || "init_failed",
      init.Message || init.Details || "Не удалось создать платёж",
    );
  }

  const [updated] = await db
    .update(payments)
    .set({
      providerPaymentId: init.PaymentId,
      paymentUrl: init.PaymentURL,
      status: "pending",
      rawInit: init as unknown as Record<string, unknown>,
      updatedAt: new Date(),
    })
    .where(eq(payments.id, created!.id))
    .returning();

  return { payment: updated!, paymentUrl: init.PaymentURL };
}

/**
 * Обработать Notification от Т-Банка.
 *   1. Подпись (Token).
 *   2. Найти наш payments row по providerPaymentId.
 *   3. Сверить со /GetState (защита на случай утечки пароля).
 *   4. Если статус CONFIRMED — активировать pass или заказ (idempotent).
 *   5. Обновить наш статус + raw_last_notification.
 *
 * Возвращает true, если можно отвечать клиенту "OK" (т.е. вебхук принят).
 * false — подпись не сошлась или произошла фатальная ошибка (тогда Т-Банк ретраит).
 */
export async function handleTbankNotification(body: Record<string, unknown>): Promise<boolean> {
  if (!isTbankConfigured()) return false;
  if (!verifyNotification(body)) return false;

  const providerPaymentId = String(body.PaymentId ?? "");
  if (!providerPaymentId) return false;

  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.providerPaymentId, providerPaymentId))
    .limit(1);
  if (!payment) return false;

  // Сверка с банком (на случай поддельной подписи).
  const state = await getPaymentState(providerPaymentId);
  const trustedStatus = state.Success ? state.Status : (body.Status as string | undefined);
  const mapped = mapTbankStatus(trustedStatus);

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
  };
}
