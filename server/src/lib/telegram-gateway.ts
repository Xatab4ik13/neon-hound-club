/**
 * Тонкая обёртка над Telegram Gateway API (https://core.telegram.org/gateway/api).
 *
 * Все запросы идут с сервера, токен живёт в TELEGRAM_GATEWAY_API_TOKEN
 * и привязан к IP VPS (whitelist в кабинете Telegram Gateway).
 *
 * Логика проверки кода: мы сами генерим 6-значный код, передаём его в
 * sendVerificationMessage(code). Дальше Telegram сам валидирует ввод
 * пользователя через checkVerificationStatus(request_id, code).
 */

import { ProxyAgent, fetch as undiciFetch, type Dispatcher } from "undici";

const BASE = "https://gatewayapi.telegram.org";

let cachedDispatcher: Dispatcher | null | undefined;

function getDispatcher(): Dispatcher | undefined {
  if (cachedDispatcher !== undefined) return cachedDispatcher ?? undefined;
  const url = process.env.TELEGRAM_PROXY_URL;
  if (!url) {
    cachedDispatcher = null;
    return undefined;
  }
  cachedDispatcher = new ProxyAgent(url);
  return cachedDispatcher;
}

type GatewayResponse<T> =
  | { ok: true; result: T }
  | { ok: false; error: string };

async function call<T>(method: string, body: Record<string, unknown>): Promise<T> {
  const token = process.env.TELEGRAM_GATEWAY_API_TOKEN;
  if (!token) {
    throw new Error("TELEGRAM_GATEWAY_API_TOKEN is not configured");
  }
  const dispatcher = getDispatcher();
  const res = await undiciFetch(`${BASE}/${method}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    ...(dispatcher ? { dispatcher } : {}),
  });
  let data: GatewayResponse<T>;
  try {
    data = (await res.json()) as GatewayResponse<T>;
  } catch {
    throw new Error(`telegram_gateway_bad_response status=${res.status}`);
  }
  if (!res.ok || !data.ok) {
    const err = (data as { error?: string }).error ?? `http_${res.status}`;
    const e = new Error(`telegram_gateway:${err}`);
    (e as Error & { code?: string }).code = err;
    throw e;
  }
  return data.result;
}


export type SentVerification = {
  request_id: string;
  phone_number: string;
  request_cost: number;
  remaining_balance?: number;
  delivery_status?: { status: string; updated_at: number };
  verification_status?: { status: string; updated_at: number };
  payload?: string;
};

export async function sendVerificationMessage(opts: {
  phoneE164: string;          // "+7..."
  code: string;               // ровно цифры, 4-8 символов
  codeLength?: number;        // если не передаём code — сколько цифр сгенерит Telegram
  ttl?: number;               // секунд (60..86400)
  payload?: string;
  senderUsername?: string;
}): Promise<SentVerification> {
  const body: Record<string, unknown> = {
    phone_number: opts.phoneE164,
    code: opts.code,
    ttl: opts.ttl ?? 300,
  };
  if (opts.payload) body.payload = opts.payload;
  if (opts.senderUsername) body.sender_username = opts.senderUsername;
  return call<SentVerification>("sendVerificationMessage", body);
}

export type VerificationStatus = {
  request_id: string;
  phone_number: string;
  verification_status?: {
    status:
      | "code_valid"
      | "code_invalid"
      | "code_max_attempts_exceeded"
      | "expired"
      | string;
    updated_at: number;
  };
  delivery_status?: { status: string; updated_at: number };
};

export async function checkVerificationStatus(opts: {
  requestId: string;
  code: string;
}): Promise<VerificationStatus> {
  return call<VerificationStatus>("checkVerificationStatus", {
    request_id: opts.requestId,
    code: opts.code,
  });
}
