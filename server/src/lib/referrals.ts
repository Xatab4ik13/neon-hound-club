import { and, eq, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { referralCodes, referrals } from "../db/schema/referrals.js";
import { users } from "../db/schema/users.js";
import { ticketCredit } from "./tickets.js";
import { awardXp } from "./xp.js";
import { tryCompleteQuest } from "./quests.js";

const REFERRAL_REWARD_TICKETS = 1;
const REFERRAL_JOINED_XP = 50;
const REFERRAL_ACTIVATION_XP = 200;

/** Нормализует реф-код. */
export function normalizeRefCode(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 40);
}

/** Получить (или создать) реф-код пользователя. По умолчанию — slug ника. */
export async function getOrCreateReferralCode(userId: string, nick: string): Promise<string> {
  const [existing] = await db.select().from(referralCodes).where(eq(referralCodes.userId, userId)).limit(1);
  if (existing) return existing.code;

  const base = normalizeRefCode(nick) || "rider";
  let code = base;
  let attempt = 0;
  // защита от коллизий
  while (true) {
    const [taken] = await db.select({ userId: referralCodes.userId }).from(referralCodes).where(eq(referralCodes.code, code)).limit(1);
    if (!taken) break;
    attempt += 1;
    code = `${base}${attempt}`;
    if (attempt > 99) {
      code = `${base}${Math.random().toString(36).slice(2, 6)}`;
      break;
    }
  }
  await db.insert(referralCodes).values({ userId, code }).onConflictDoNothing();
  const [row] = await db.select().from(referralCodes).where(eq(referralCodes.userId, userId)).limit(1);
  return row!.code;
}

/** Найти владельца реф-кода. */
export async function findReferrerByCode(rawCode: string): Promise<string | null> {
  const code = normalizeRefCode(rawCode);
  if (!code) return null;
  const [row] = await db.select({ userId: referralCodes.userId }).from(referralCodes).where(eq(referralCodes.code, code)).limit(1);
  return row?.userId ?? null;
}

/** Привязать нового юзера к рефереру при регистрации. */
export async function attachReferral(invitedUserId: string, rawCode: string): Promise<void> {
  const referrerId = await findReferrerByCode(rawCode);
  if (!referrerId || referrerId === invitedUserId) return;
  const code = normalizeRefCode(rawCode);
  await db
    .insert(referrals)
    .values({ referrerId, invitedUserId, code, status: "joined" })
    .onConflictDoNothing();

  // +XP рефереру за регистрацию друга (idempotent по invitedUserId)
  await awardXp({
    userId: referrerId,
    amount: REFERRAL_JOINED_XP,
    source: "referral_joined",
    reason: "Друг зарегистрировался по реф-ссылке",
    refType: "referral_invited",
    refId: invitedUserId,
    idempotent: true,
  });
}

/** Активировать реферала (например, после verify_email) — обоим по билету + XP рефереру. */
export async function activateReferral(invitedUserId: string): Promise<void> {
  const [row] = await db.select().from(referrals).where(eq(referrals.invitedUserId, invitedUserId)).limit(1);
  if (!row || row.status === "active") return;

  await db
    .update(referrals)
    .set({ status: "active", activatedAt: new Date(), ticketsRewarded: REFERRAL_REWARD_TICKETS })
    .where(eq(referrals.id, row.id));

  // +1 билет рефереру (idempotent)
  await ticketCredit({
    userId: row.referrerId,
    amount: REFERRAL_REWARD_TICKETS,
    source: "admin",
    reason: "Бонус за приглашение друга",
    refType: "referral_active",
    refId: invitedUserId,
    idempotent: true,
  });
  // +1 билет приглашённому
  await ticketCredit({
    userId: invitedUserId,
    amount: REFERRAL_REWARD_TICKETS,
    source: "admin",
    reason: "Бонус за регистрацию по реф-ссылке",
    refType: "referral_welcome",
    refId: invitedUserId,
    idempotent: true,
  });
  // +XP за активацию
  await awardXp({
    userId: row.referrerId,
    amount: REFERRAL_ACTIVATION_XP,
    source: "referral_purchase",
    reason: "Друг активировал аккаунт",
    refType: "referral_active",
    refId: invitedUserId,
    idempotent: true,
  });
}

export async function listMyReferrals(userId: string) {
  const rows = await db
    .select({
      id: referrals.id,
      nick: users.nick,
      status: referrals.status,
      ticketsRewarded: referrals.ticketsRewarded,
      joinedAt: referrals.joinedAt,
      activatedAt: referrals.activatedAt,
    })
    .from(referrals)
    .innerJoin(users, eq(users.id, referrals.invitedUserId))
    .where(eq(referrals.referrerId, userId))
    .orderBy(sql`${referrals.joinedAt} desc`);

  const [totals] = await db
    .select({
      total: sql<number>`count(*)::int`,
      active: sql<number>`sum(case when ${referrals.status} = 'active' then 1 else 0 end)::int`,
      tickets: sql<number>`coalesce(sum(${referrals.ticketsRewarded}), 0)::int`,
    })
    .from(referrals)
    .where(eq(referrals.referrerId, userId));

  return { items: rows, totals: totals ?? { total: 0, active: 0, tickets: 0 } };
}

export const REFERRAL_CONFIG = {
  rewardTickets: REFERRAL_REWARD_TICKETS,
  joinedXp: REFERRAL_JOINED_XP,
  activationXp: REFERRAL_ACTIVATION_XP,
};
