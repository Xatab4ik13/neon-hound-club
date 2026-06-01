/**
 * Тонкий клиент Raiffeisenbank e-commerce API (https://pay.raif.ru/doc/ecom.html).
 *
 * У нас ОДНА объединённая торговая точка (карты + СБП в одном мерчанте):
 *   env: RAIF_PUBLIC_ID + RAIF_SECRET_KEY
 *
 * Метод оплаты выбирает юзер кнопкой на фронте; на бек это влияет только
 * на поле `paymentMethods` в запросе createOrder:
 *   - "card" → ["ACQUIRING"]
 *   - "sbp"  → ["SBP"]
 *
 * Подпись вебхука всегда проверяется единственным секретом RAIF_SECRET_KEY.
 * Уведомления приходят с IP 193.28.44.23.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

const API_URL = (process.env.RAIF_API_URL || "https://pay.raif.ru").replace(/\/$/, "");

export type RaifMethod = "card" | "sbp";

type Account = { publicId: string; secretKey: string };

function getMainAccount(): Account | null {
  const pub = process.env.RAIF_PUBLIC_ID ?? "";
  const sec = process.env.RAIF_SECRET_KEY ?? "";
  if (!pub || !sec) return null;
  return { publicId: pub, secretKey: sec };
}

export function isRaifConfigured(_method: RaifMethod = "card"): boolean {
  return Boolean(getMainAccount());
}

export function getConfiguredMethods(): RaifMethod[] {
  return getMainAccount() ? ["card", "sbp"] : [];
}

export function getAccount(_method: RaifMethod): Account | null {
  return getMainAccount();
}

export type RaifCreateOrderParams = {
  /** Какой способ оплаты предложить на форме банка. */
  method: RaifMethod;
  /** Наш internal id платежа (UUID). Пойдёт как id заказа в Райф. <=40 chars [A-Za-z0-9-_.]. */
  orderId: string;
  /** Сумма в рублях. */
  amountRub: number;
  /** Комментарий (<=140 chars). */
  comment: string;
  successUrl: string;
  failUrl: string;
  /** Доп. поля (попадают в реестр). */
  extra?: Record<string, string>;
};

export type RaifOrderResponse = {
  id: string;
  amount: number;
  status?: { value: string; date: string };
  payformUrl?: string;
};

export class RaifApiError extends Error {
  constructor(public status: number, public code: string, message: string, public raw?: unknown) {
    super(message);
  }
}

/** POST /api/v1/merchants/{publicId}/orders — создать заказ и получить ссылку на форму. */
export async function createOrder(p: RaifCreateOrderParams): Promise<RaifOrderResponse> {
  const acc = getMainAccount();
  if (!acc) {
    throw new RaifApiError(500, "not_configured", "Райф не сконфигурирован в env");
  }

  const body: Record<string, unknown> = {
    id: p.orderId,
    amount: p.amountRub,
    comment: p.comment.slice(0, 140),
    paymentMethods: [p.method === "sbp" ? "SBP" : "ACQUIRING"],
    returnUrls: {
      successUrl: p.successUrl,
      failUrl: p.failUrl,
    },
  };
  if (p.extra && Object.keys(p.extra).length > 0) {
    body.extra = p.extra;
  }

  const url = `${API_URL}/api/v1/merchants/${encodeURIComponent(acc.publicId)}/orders`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${acc.secretKey}`,
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }

  if (!res.ok) {
    const errObj = (json && typeof json === "object" ? json : {}) as {
      code?: string;
      message?: string;
    };
    throw new RaifApiError(
      res.status,
      errObj.code || `http_${res.status}`,
      errObj.message || `Raif API error: HTTP ${res.status}`,
      json,
    );
  }

  return json as RaifOrderResponse;
}

/**
 * Проверка подписи входящего webhook (X-Api-Signature-SHA256).
 * Секрет — единственный RAIF_SECRET_KEY объединённой торговой точки.
 */
export function verifyPaymentCallback(
  body: Record<string, unknown>,
  signature: string | undefined,
  secretKey: string,
): boolean {
  if (!signature || !secretKey) return false;
  const data = (body.data ?? {}) as Record<string, unknown>;
  const order = (data.order ?? {}) as Record<string, unknown>;
  const status = (data.status ?? {}) as Record<string, unknown>;

  const amount = data.amount;
  const publicId = data.publicId;
  const orderId = order.id;
  const statusValue = status.value;
  const statusDate = status.date;

  if (
    amount === undefined ||
    publicId === undefined ||
    orderId === undefined ||
    statusValue === undefined ||
    statusDate === undefined
  ) {
    return false;
  }

  const controlString = [amount, publicId, orderId, statusValue, statusDate]
    .map((v) => String(v))
    .join("|");

  const expected = createHmac("sha256", secretKey).update(controlString, "utf8").digest("hex");
  const incoming = signature.toLowerCase();
  if (incoming.length !== expected.length) return false;

  try {
    return timingSafeEqual(Buffer.from(incoming, "utf8"), Buffer.from(expected, "utf8"));
  } catch {
    return false;
  }
}

/** Маппинг статусов Райффайзена → наши внутренние. */
export function mapRaifStatus(
  s: string | undefined,
): "new" | "pending" | "authorized" | "confirmed" | "rejected" {
  switch ((s || "").toUpperCase()) {
    case "SUCCESS":
    case "COMPLETED":
      return "confirmed";
    case "AUTHORIZED":
    case "HOLD":
      return "authorized";
    case "DECLINED":
    case "REJECTED":
    case "CANCELLED":
    case "CANCELED":
    case "EXPIRED":
    case "FAILED":
      return "rejected";
    case "NEW":
    case "CREATED":
      return "new";
    default:
      return "pending";
  }
}
