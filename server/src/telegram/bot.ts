/**
 * Бот @hhr_probot: Bot API напрямую (токен TELEGRAM_BOT_TOKEN, опц. прокси TELEGRAM_PROXY_URL).
 */
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { ProxyAgent, fetch as undiciFetch, type Dispatcher } from "undici";

const token = () => (process.env.TELEGRAM_BOT_TOKEN ?? "").trim();
export const TG_WEBAPP_URL = (process.env.TG_WEBAPP_URL || "https://tg.hhr.pro").replace(/\/$/, "");

let dispatcher: Dispatcher | null | undefined;
function getDispatcher() {
  if (dispatcher === undefined) dispatcher = process.env.TELEGRAM_PROXY_URL ? new ProxyAgent(process.env.TELEGRAM_PROXY_URL) : null;
  return dispatcher ?? undefined;
}

export async function botCall(method: string, body: Record<string, unknown>): Promise<unknown> {
  const t = token();
  if (!t) throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  const d = getDispatcher();
  const res = await undiciFetch(`https://api.telegram.org/bot${t}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    ...(d ? { dispatcher: d } : {}),
  });
  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; description?: string; result?: unknown };
  if (!data.ok) throw new Error(`telegram ${method} failed [${res.status}]: ${data.description ?? ""}`);
  return data.result;
}

export async function sendMessage(chatId: number | string, text: string, extra: Record<string, unknown> = {}) {
  return botCall("sendMessage", { chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true, ...extra });
}

const BOT_USERNAME = (process.env.TG_BOT_USERNAME || "hhr_probot").replace(/^@/, "");

/** Кнопка открывает главное мини-приложение бота сразу на весь экран (настраивается в BotFather). */
export function openAppButton(text = "Открыть") {
  return { reply_markup: { inline_keyboard: [[{ text, url: `https://t.me/${BOT_USERNAME}?startapp=open&mode=fullscreen` }]] } };
}

/** Секрет вебхука бота — производный от токена, хранить отдельно не нужно. */
export function webhookSecret(): string {
  return createHash("sha256").update(`hhr-tg-webhook:${token()}`).digest("hex").slice(0, 64);
}

/** Чаты админов для уведомлений об оплатах: TG_ADMIN_CHAT_IDS=123,456 */
export function adminChatIds(): string[] {
  return (process.env.TG_ADMIN_CHAT_IDS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
}

export type TgWebAppUser = { id: number; first_name?: string; last_name?: string; username?: string };

/**
 * Проверка initData Telegram WebApp (https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app).
 * Возвращает пользователя или null.
 */
export function verifyInitData(initData: string, maxAgeSec = 24 * 3600): TgWebAppUser | null {
  const t = token();
  if (!t || !initData) return null;
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return null;
  params.delete("hash");
  const check = [...params.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join("\n");
  const secret = createHmac("sha256", "WebAppData").update(t).digest();
  const expected = createHmac("sha256", secret).update(check).digest("hex");
  if (expected.length !== hash.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(hash))) return null;
  const authDate = Number(params.get("auth_date"));
  if (!authDate || Date.now() / 1000 - authDate > maxAgeSec) return null;
  try {
    return JSON.parse(params.get("user") ?? "null");
  } catch {
    return null;
  }
}

export function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
