import crypto from "node:crypto";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { db } from "../db/client.js";
import { phoneSendLog, phoneVerifications } from "../db/schema/phone-verifications.js";
import { profiles } from "../db/schema/profile.js";

export const CODE_TTL_SEC = 300;
export const MAX_ATTEMPTS = 3;

export function generate6digitCode(): string {
  // 100000..999999 — равномерно
  return String(crypto.randomInt(100000, 1000000));
}

/**
 * Принимаем "+7...", "8...", "7..." — возвращаем валидный E.164 со знаком "+".
 * null если номер невалидный.
 */
export function normalizeToE164(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // Если без "+", добавим (и заменим ведущую 8 на 7 для РФ-формата).
  let candidate = trimmed;
  if (!candidate.startsWith("+")) {
    const digits = candidate.replace(/\D/g, "");
    if (!digits) return null;
    const fixed = digits.startsWith("8") && digits.length === 11 ? "7" + digits.slice(1) : digits;
    candidate = "+" + fixed;
  }
  const parsed = parsePhoneNumberFromString(candidate);
  if (!parsed || !parsed.isValid()) return null;
  return parsed.number; // E.164 с "+"
}

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSec: number; reason: string };

/**
 * Проверка лимитов перед платной отправкой SMS:
 *  - 60s между запросами на тот же номер
 *  - 10 запросов в сутки на тот же номер
 *  - 5 запросов в час с того же IP
 */
export async function checkSendRateLimit(opts: {
  phoneE164: string;
  ip: string | null;
}): Promise<RateLimitResult> {
  const now = Date.now();
  const oneMinAgo = new Date(now - 60_000);
  const oneHourAgo = new Date(now - 3_600_000);
  const oneDayAgo = new Date(now - 86_400_000);

  const [last] = await db
    .select({ sentAt: phoneSendLog.sentAt })
    .from(phoneSendLog)
    .where(and(eq(phoneSendLog.phoneE164, opts.phoneE164), gt(phoneSendLog.sentAt, oneMinAgo)))
    .orderBy(sql`${phoneSendLog.sentAt} DESC`)
    .limit(1);
  if (last) {
    const retry = Math.max(1, 60 - Math.floor((now - last.sentAt.getTime()) / 1000));
    return { ok: false, retryAfterSec: retry, reason: "too_frequent" };
  }

  const [{ dayCount }] = await db
    .select({ dayCount: sql<number>`count(*)::int` })
    .from(phoneSendLog)
    .where(and(eq(phoneSendLog.phoneE164, opts.phoneE164), gt(phoneSendLog.sentAt, oneDayAgo)));
  if (dayCount >= 10) {
    return { ok: false, retryAfterSec: 3600, reason: "daily_limit" };
  }

  if (opts.ip) {
    const [{ ipCount }] = await db
      .select({ ipCount: sql<number>`count(*)::int` })
      .from(phoneSendLog)
      .where(and(sql`${phoneSendLog.ip} = ${opts.ip}::inet`, gt(phoneSendLog.sentAt, oneHourAgo)));
    if (ipCount >= 5) {
      return { ok: false, retryAfterSec: 600, reason: "ip_limit" };
    }
  }

  return { ok: true };
}

export async function logSend(opts: { phoneE164: string; ip: string | null; purpose: string }) {
  await db.insert(phoneSendLog).values({
    phoneE164: opts.phoneE164,
    ip: opts.ip,
    purpose: opts.purpose,
  });
}

/** Если этот номер уже подтверждён за другим юзером — true. */
export async function isPhoneTakenByOther(phoneE164: string, excludeUserId: string | null): Promise<boolean> {
  const rows = await db
    .select({ userId: profiles.userId })
    .from(profiles)
    .where(and(eq(profiles.phoneE164, phoneE164.replace(/\D/g, "")), sql`${profiles.phoneVerifiedAt} IS NOT NULL`))
    .limit(2);
  if (rows.length === 0) return false;
  if (excludeUserId && rows.length === 1 && rows[0].userId === excludeUserId) return false;
  return true;
}

/** Активная (не использованная и не протухшая) запись для request_id. */
export async function findActiveVerification(requestId: string) {
  const [row] = await db
    .select()
    .from(phoneVerifications)
    .where(
      and(
        eq(phoneVerifications.requestId, requestId),
        isNull(phoneVerifications.consumedAt),
        gt(phoneVerifications.expiresAt, new Date()),
      ),
    )
    .limit(1);
  return row ?? null;
}
