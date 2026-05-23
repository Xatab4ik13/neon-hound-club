// Push-уведомления: подписки + отправка.
//
// Конфиг в env:
//   VAPID_PUBLIC_KEY    — публичный VAPID-ключ (тот же, что в src/lib/push.ts)
//   VAPID_PRIVATE_KEY   — приватный, секрет
//   VAPID_SUBJECT       — mailto:owner@hhr.pro (или https-URL)
//
// Если переменные не заданы — отправка пушей просто skip'ается, подписки
// сохраняются. Это удобно для постепенного раскатывания.

import webpush from "web-push";
import { eq, inArray } from "drizzle-orm";
import { db } from "../db/client.js";
import { pushSubscriptions } from "../db/schema/push.js";

let configured = false;
function ensureConfigured(): boolean {
  if (configured) return true;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const prv = process.env.VAPID_PRIVATE_KEY;
  const sub = process.env.VAPID_SUBJECT || "mailto:owner@hhr.pro";
  if (!pub || !prv) return false;
  webpush.setVapidDetails(sub, pub, prv);
  configured = true;
  return true;
}

export type PushPayload = {
  title: string;
  body?: string;
  url?: string;
  tag?: string;
  icon?: string;
  data?: Record<string, unknown>;
};

async function sendOne(
  sub: { endpoint: string; p256dh: string; auth: string },
  payload: PushPayload,
): Promise<boolean> {
  try {
    await webpush.sendNotification(
      {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      },
      JSON.stringify(payload),
      { TTL: 60 * 60 * 24 },
    );
    return true;
  } catch (err: unknown) {
    const status = (err as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) {
      // Подписка протухла — удаляем.
      await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, sub.endpoint));
    }
    return false;
  }
}

/** Отправить пуш всем подписчикам. Используется для «новый розыгрыш», «новый пост», «новые товары». */
export async function pushToAll(payload: PushPayload): Promise<{ sent: number; total: number }> {
  if (!ensureConfigured()) return { sent: 0, total: 0 };
  const subs = await db.select().from(pushSubscriptions);
  let sent = 0;
  await Promise.all(
    subs.map(async (s) => {
      if (await sendOne(s, payload)) sent++;
    }),
  );
  return { sent, total: subs.length };
}

/** Отправить пуш конкретным пользователям. */
export async function pushToUsers(userIds: string[], payload: PushPayload): Promise<number> {
  if (!ensureConfigured() || userIds.length === 0) return 0;
  const subs = await db
    .select()
    .from(pushSubscriptions)
    .where(inArray(pushSubscriptions.userId, userIds));
  let sent = 0;
  await Promise.all(
    subs.map(async (s) => {
      if (await sendOne(s, payload)) sent++;
    }),
  );
  return sent;
}
