// Напоминания пушами: HellSpin (23:00 МСК), истечение Hell Pass, истечение капсулы ×2.
// Дедуп через таблицу push_reminders (user_id + kind + ref_key).

import { and, eq, gt, isNotNull, lt, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { pushSubscriptions } from "../db/schema/push.js";
import { pushReminders } from "../db/schema/push-reminders.js";
import { passPurchases } from "../db/schema/pass.js";
import { users } from "../db/schema/users.js";
import { spinDaily } from "../db/schema/spin.js";
import { mskDate, SPINS_PER_DAY } from "./spin.js";
import { pushToAll, pushToUsers, type PushPayload } from "./push.js";

/** Помечает напоминание отправленным. false — уже отправляли раньше. */
async function claim(userId: string, kind: string, refKey: string): Promise<boolean> {
  const rows = await db
    .insert(pushReminders)
    .values({ userId, kind, refKey })
    .onConflictDoNothing()
    .returning({ id: pushReminders.id });
  return rows.length > 0;
}

async function sendOnce(userId: string, kind: string, refKey: string, payload: PushPayload) {
  if (!(await claim(userId, kind, refKey))) return false;
  await pushToUsers([userId], payload);
  return true;
}

/** Пуш всем о новой новости в ленте. */
export async function pushNewsPublished(post: { id: string; title: string }): Promise<void> {
  await pushToAll({
    title: "Новость в ленте",
    body: post.title,
    url: "/club",
    tag: `news-${post.id}`,
  });
}

/**
 * 23:00 МСК: напоминаем тем, у кого остались непрокрученные спины.
 * Берём только юзеров с push-подпиской (без неё доступа к рулетке всё равно нет).
 */
export async function remindUnusedSpins(): Promise<number> {
  const day = mskDate();

  const rows = await db
    .selectDistinct({
      userId: pushSubscriptions.userId,
      tier: sql<string | null>`(
        select p.tier from pass_purchases p
        where p.user_id = ${pushSubscriptions.userId}
          and p.status = 'active'
          and p.expires_at > now()
        order by p.expires_at desc limit 1
      )`,
      used: spinDaily.used,
      bonus: spinDaily.bonus,
    })
    .from(pushSubscriptions)
    .leftJoin(
      spinDaily,
      and(eq(spinDaily.userId, pushSubscriptions.userId), eq(spinDaily.spinDate, day)),
    )
    .where(isNotNull(pushSubscriptions.userId));

  let sent = 0;
  const seen = new Set<string>();
  for (const r of rows) {
    const userId = r.userId;
    if (!userId || seen.has(userId)) continue;
    seen.add(userId);

    const tier = (r.tier ?? "none") as keyof typeof SPINS_PER_DAY;
    const allowed = (SPINS_PER_DAY[tier] ?? SPINS_PER_DAY.none) + (r.bonus ?? 0);
    const left = allowed - (r.used ?? 0);
    if (left <= 0) continue;

    const ok = await sendOnce(userId, "spin_daily", day, {
      title: "HellSpin ждёт",
      body:
        left === 1
          ? "У тебя остался 1 непрокрученный спин — до полуночи он сгорит."
          : `У тебя ${left} непрокрученных спинов — до полуночи они сгорят.`,
      url: "/club/spin",
      tag: "spin-daily",
    });
    if (ok) sent++;
  }
  return sent;
}

/** Hell Pass истекает в течение 24 часов — предупреждаем один раз. */
export async function remindPassExpiring(): Promise<number> {
  const soon = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const rows = await db
    .select({
      id: passPurchases.id,
      userId: passPurchases.userId,
      tier: passPurchases.tier,
      expiresAt: passPurchases.expiresAt,
    })
    .from(passPurchases)
    .where(
      and(
        eq(passPurchases.status, "active"),
        isNotNull(passPurchases.expiresAt),
        gt(passPurchases.expiresAt, new Date()),
        lt(passPurchases.expiresAt, soon),
      ),
    );

  let sent = 0;
  for (const r of rows) {
    const hours = Math.max(
      1,
      Math.round(((r.expiresAt as Date).getTime() - Date.now()) / (60 * 60 * 1000)),
    );
    const ok = await sendOnce(r.userId, "pass_expiring", r.id, {
      title: "Hell Pass заканчивается",
      body: `Твой ${r.tier.toUpperCase()} Pass истекает через ${hours} ч. Продлить можно в клубе.`,
      url: "/club/hell-pass",
      tag: `pass-exp-${r.id}`,
    });
    if (ok) sent++;
  }
  return sent;
}

/** Капсула ×2 догорает (меньше 3 часов) и ещё не потрачена. */
export async function remindBoostExpiring(): Promise<number> {
  const soon = new Date(Date.now() + 3 * 60 * 60 * 1000);
  const rows = await db
    .select({ id: users.id, until: users.ticketBoostUntil })
    .from(users)
    .where(
      and(
        isNotNull(users.ticketBoostUntil),
        gt(users.ticketBoostUntil, new Date()),
        lt(users.ticketBoostUntil, soon),
      ),
    );

  let sent = 0;
  for (const r of rows) {
    const until = r.until as Date;
    const mins = Math.max(1, Math.round((until.getTime() - Date.now()) / 60_000));
    const left = mins >= 60 ? `${Math.round(mins / 60)} ч` : `${mins} мин`;
    const ok = await sendOnce(r.id, "boost_expiring", until.toISOString(), {
      title: "Капсула ×2 догорает",
      body: `Осталось ${left}: купи цифровой товар и получи двойные билеты.`,
      url: "/club/shop",
      tag: "boost-expiring",
    });
    if (ok) sent++;
  }
  return sent;
}

/** true, если сейчас 23:00–23:04 по МСК. */
export function isMskSpinReminderWindow(d = new Date()): boolean {
  const msk = new Date(d.getTime() + 180 * 60_000);
  return msk.getUTCHours() === 23 && msk.getUTCMinutes() < 5;
}

/** Единый тик планировщика напоминаний. Вызывается раз в минуту. */
export async function runReminderTick(): Promise<{ spins: number; pass: number; boost: number }> {
  const out = { spins: 0, pass: 0, boost: 0 };
  if (isMskSpinReminderWindow()) out.spins = await remindUnusedSpins();
  const minute = new Date().getUTCMinutes();
  if (minute % 15 === 0) out.boost = await remindBoostExpiring();
  if (minute === 5) out.pass = await remindPassExpiring();
  return out;
}
