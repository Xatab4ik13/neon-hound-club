/**
 * Тонкий клиент Т-Банк Acquiring API (https://securepay.tinkoff.ru/v2).
 *
 * Поддержка: Init (создать платёж + получить PaymentURL), GetState (сверка статуса),
 * verifyNotification (проверка подписи входящего вебхука).
 *
 * Подпись (Token) считается так:
 *   - берём все top-level пары body
 *   - ИСКЛЮЧАЕМ вложенные объекты/массивы (DATA, Receipt, Items, Token)
 *   - добавляем { Password: <terminal_password> }
 *   - сортируем по ключу
 *   - конкатенируем ТОЛЬКО значения (true/false → "true"/"false", числа → строкой)
 *   - SHA-256 → hex (lowercase)
 *
 * Это формат Т-Банка и для Init, и для проверки Notification.
 */
import { createHash } from "node:crypto";

const API_URL = (process.env.TBANK_API_URL || "https://securepay.tinkoff.ru/v2").replace(/\/$/, "");
const TERMINAL_KEY = process.env.TBANK_TERMINAL_KEY ?? "";
const PASSWORD = process.env.TBANK_PASSWORD ?? "";

export function isTbankConfigured(): boolean {
  return Boolean(TERMINAL_KEY && PASSWORD);
}

type Primitive = string | number | boolean;

/** Расчёт Token для Т-Банка. body — top-level поля Init (или Notification). */
export function computeToken(body: Record<string, unknown>, password = PASSWORD): string {
  const flat: Record<string, Primitive> = {};
  for (const [k, v] of Object.entries(body)) {
    if (k === "Token") continue;
    // Вложенные объекты и массивы в подпись НЕ входят.
    if (v === null || v === undefined) continue;
    if (typeof v === "object") continue;
    flat[k] = v as Primitive;
  }
  flat.Password = password;
  const sorted = Object.keys(flat).sort();
  const joined = sorted.map((k) => stringifyValue(flat[k])).join("");
  return createHash("sha256").update(joined, "utf8").digest("hex");
}

function stringifyValue(v: Primitive): string {
  if (typeof v === "boolean") return v ? "true" : "false";
  return String(v);
}

export type InitParams = {
  /** Наш internal id платежа — будет в Notification как OrderId. */
  orderId: string;
  /** Сумма в рублях (int). Будет переведена в копейки. */
  amountRub: number;
  description: string;
  successUrl: string;
  failUrl: string;
  notificationUrl: string;
  customerEmail?: string;
  customerPhone?: string;
  /** Произвольные мета-данные. Не входят в подпись. */
  data?: Record<string, string>;
};

export type InitResponse = {
  Success: boolean;
  ErrorCode: string;
  Message?: string;
  Details?: string;
  TerminalKey?: string;
  Status?: string;
  PaymentId?: string;
  OrderId?: string;
  Amount?: number;
  PaymentURL?: string;
};

/** POST /Init — создаёт платёж, возвращает PaymentURL для редиректа. */
export async function initPayment(p: InitParams): Promise<InitResponse> {
  if (!isTbankConfigured()) {
    throw new Error("TBANK_TERMINAL_KEY / TBANK_PASSWORD не заданы в env");
  }
  const body: Record<string, unknown> = {
    TerminalKey: TERMINAL_KEY,
    Amount: Math.round(p.amountRub * 100),
    OrderId: p.orderId,
    Description: p.description.slice(0, 250),
    SuccessURL: p.successUrl,
    FailURL: p.failUrl,
    NotificationURL: p.notificationUrl,
  };
  if (p.customerEmail || p.customerPhone || p.data) {
    body.DATA = {
      ...(p.customerEmail ? { Email: p.customerEmail } : {}),
      ...(p.customerPhone ? { Phone: p.customerPhone } : {}),
      ...(p.data ?? {}),
    };
  }
  body.Token = computeToken(body);

  // TODO: когда подключим Атол.онлайн как онлайн-кассу — собираем здесь Receipt
  // для 54-ФЗ. Сейчас не передаём (касса не подключена).

  const res = await fetch(`${API_URL}/Init`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as InitResponse;
  return json;
}

export type GetStateResponse = {
  Success: boolean;
  ErrorCode: string;
  Message?: string;
  Details?: string;
  TerminalKey?: string;
  Status?: string;
  PaymentId?: string;
  OrderId?: string;
  Amount?: number;
};

/** POST /GetState — серверная сверка статуса (защита от подделки вебхука). */
export async function getPaymentState(paymentId: string): Promise<GetStateResponse> {
  if (!isTbankConfigured()) {
    throw new Error("TBANK_TERMINAL_KEY / TBANK_PASSWORD не заданы в env");
  }
  const body: Record<string, unknown> = {
    TerminalKey: TERMINAL_KEY,
    PaymentId: paymentId,
  };
  body.Token = computeToken(body);
  const res = await fetch(`${API_URL}/GetState`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return (await res.json()) as GetStateResponse;
}

/**
 * Проверка подписи Notification.
 * body — тело вебхука как пришло (плоский объект с Token внутри).
 */
export function verifyNotification(body: Record<string, unknown>): boolean {
  const incoming = typeof body.Token === "string" ? body.Token : "";
  if (!incoming) return false;
  const expected = computeToken(body);
  // sha256 hex одинаковой длины — обычное сравнение безопасно.
  return incoming.toLowerCase() === expected.toLowerCase();
}

/** Маппинг статусов Т-Банка → наши внутренние. */
export function mapTbankStatus(s: string | undefined): "new" | "pending" | "authorized" | "confirmed" | "rejected" {
  switch (s) {
    case "AUTHORIZED":
      return "authorized";
    case "CONFIRMED":
      return "confirmed";
    case "REJECTED":
    case "CANCELED":
    case "DEADLINE_EXPIRED":
    case "REVERSED":
      return "rejected";
    case "NEW":
      return "new";
    default:
      return "pending";
  }
}
