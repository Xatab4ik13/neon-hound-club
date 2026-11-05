/**
 * Вход на сайт через бота: сайт создаёт одноразовый код → человек открывает бота
 * по ссылке t.me/<bot>?start=login_<код> → делится СВОИМ номером (контакт с user_id = from.id)
 * → бот находит аккаунт по телефону → сайт по коду получает сессию один раз.
 * Хранилище в памяти: коды живут 10 минут, API — один контейнер.
 */
import { randomBytes } from "node:crypto";

const TTL_MS = 10 * 60 * 1000;
type Entry = { createdAt: number; userId?: string; status: "pending" | "ok" | "not_found" | "conflict" };
const codes = new Map<string, Entry>();
const chatCode = new Map<number, { code: string; at: number }>();

function sweep() {
  const now = Date.now();
  for (const [k, v] of codes) if (now - v.createdAt > TTL_MS) codes.delete(k);
  for (const [k, v] of chatCode) if (now - v.at > TTL_MS) chatCode.delete(k);
}

export function createLoginCode(): string {
  sweep();
  const code = randomBytes(18).toString("base64url");
  codes.set(code, { createdAt: Date.now(), status: "pending" });
  return code;
}

export function isValidCode(code: string): boolean {
  sweep();
  return codes.get(code)?.status === "pending";
}

export function bindChat(telegramUserId: number, code: string) {
  chatCode.set(telegramUserId, { code, at: Date.now() });
}

export function codeForChat(telegramUserId: number): string | null {
  sweep();
  return chatCode.get(telegramUserId)?.code ?? null;
}

export function resolveCode(code: string, status: Entry["status"], userId?: string) {
  const e = codes.get(code);
  if (!e) return;
  e.status = status;
  e.userId = userId;
}

/** Забрать результат. Успешный код удаляется — вход по нему возможен один раз. */
export function takeCode(code: string): Entry | null {
  sweep();
  const e = codes.get(code);
  if (!e) return null;
  if (e.status === "ok") codes.delete(code);
  return e;
}

export function clearChat(telegramUserId: number) {
  chatCode.delete(telegramUserId);
}
