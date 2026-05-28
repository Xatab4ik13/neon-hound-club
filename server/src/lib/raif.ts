/**
 * Тонкий клиент Raiffeisenbank e-commerce API (https://pay.raif.ru/doc/ecom.html).
 *
 * Поддержка:
 *   - createOrder — POST /api/v1/merchants/{publicId}/orders → возвращает payformUrl
 *   - verifyPaymentCallback — проверка HMAC-SHA-256 подписи входящего webhook
 *
 * Авторизация исходящих запросов: Authorization: Bearer <RAIF_SECRET_KEY>.
 *
 * Подпись webhook (заголовок X-Api-Signature-SHA256) для уведомления об оплате (v3):
 *   контрольная строка: data.amount|data.publicId|data.order.id|data.status.value|data.status.date
 *   HMAC-SHA-256(secretKey, контрольная строка) → hex(lowercase).
 *
 * Уведомления приходят с IP 193.28.44.23.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

const API_URL = (process.env.RAIF_API_URL || "https://pay.raif.ru").replace(/\/$/, "");
const PUBLIC_ID = process.env.RAIF_PUBLIC_ID ?? "";
const SECRET_KEY = process.env.RAIF_SECRET_KEY ?? "";

export function isRaifConfigured(): boolean {
  return Boolean(PUBLIC_ID && SECRET_KEY);
}

export function getRaifPublicId(): string {
  return PUBLIC_ID;
}

export type RaifCreateOrderParams = {
  /** Наш internal id платежа (UUID). Пойдёт как id заказа в Райф. <=40 chars [A-Za-z0-9-_.]. */
  orderId: string;
  /** Сумма в рублях (целое или с копейками). Райф принимает number. */
  amountRub: number;
  /** Комментарий (<=140 chars). */
  comment: string;
  successUrl: string;
  failUrl: string;
  /** Платёжные методы. По умолчанию — карты + СБП. */
  paymentMethods?: Array<"ACQUIRING" | "SBP">;
  /** Доп. поля key-value (попадают в реестр). */
  extra?: Record<string, string>;
};

export type RaifOrderResponse = {
  id: string;
  amount: number;
  status?: { value: string; date: string };
  payformUrl?: string;
  // ... остальные поля игнорируем
};

export class RaifApiError extends Error {
  constructor(public status: number, public code: string, message: string, public raw?: unknown) {
    super(message);
  }
}

/** POST /api/v1/merchants/{publicId}/orders — создать заказ и получить ссылку на форму. */
export async function createOrder(p: RaifCreateOrderParams): Promise<RaifOrderResponse> {
  if (!isRaifConfigured()) {
    throw new Error("RAIF_PUBLIC_ID / RAIF_SECRET_KEY не заданы в env");
  }
  const body: Record<string, unknown> = {
    id: p.orderId,
    amount: p.amountRub,
    comment: p.comment.slice(0, 140),
    paymentMethods: p.paymentMethods ?? ["ACQUIRING", "SBP"],
    returnUrls: {
      successUrl: p.successUrl,
      failUrl: p.failUrl,
    },
  };
  if (p.extra && Object.keys(p.extra).length > 0) {
    body.extra = p.extra;
  }

  const url = `${API_URL}/api/v1/merchants/${encodeURIComponent(PUBLIC_ID)}/orders`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SECRET_KEY}`,
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
 * Проверка подписи входящего webhook об оплате (v3).
 * body — уже распарсенный JSON, signature — значение заголовка X-Api-Signature-SHA256.
 */
export function verifyPaymentCallback(
  body: Record<string, unknown>,
  signature: string | undefined,
): boolean {
  if (!signature || !SECRET_KEY) return false;
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

  const expected = createHmac("sha256", SECRET_KEY).update(controlString, "utf8").digest("hex");
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
