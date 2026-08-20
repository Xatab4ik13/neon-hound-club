import { and, desc, eq, gt, ne, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import {
  passPurchases,
  PASS_CONFIG,
  PASS_DURATION_DAYS,
  PASS_PENDING_TTL_MINUTES,
  type PassTier,
} from "../db/schema/pass.js";
import { userStickerPacks } from "../db/schema/stickers.js";
import { ticketCredit } from "./tickets.js";
import { awardXp } from "./xp.js";

/** Стикерпаки, которые выдаются бесплатно при активации Hell Pass (любой тир). */
const PASS_STICKER_PACKS = ["special", "hell-minions"] as const;

/** Иерархия тиров. Чем выше число — тем выше тир. Используется для запрета даунгрейда. */
export const TIER_RANK: Record<PassTier, number> = {
  silver: 1,
  gold: 2,
  platinum: 3,
};

export class PassPurchaseError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

/**
 * Создать запись о покупке пасса (pending_payment).
 * Правила:
 *  - если у юзера активен пасс ВЫШЕ тиром — запрещаем (downgrade_not_allowed).
 *  - тот же тир разрешён = продление (+30 дней к остатку при активации).
 *  - тир выше разрешён = апгрейд (+30 дней к остатку, новый пакет билетов).
 * Реальная оплата подключится позже — пока админ активирует руками или вебхуком.
 */
export async function createPassPurchase(userId: string, tier: PassTier) {
  const active = await getActivePass(userId);
  if (active) {
    const activeRank = TIER_RANK[active.tier as PassTier] ?? 0;
    const newRank = TIER_RANK[tier];
    if (newRank < activeRank) {
      throw new PassPurchaseError(
        "downgrade_not_allowed",
        `У тебя уже активен ${(active.tier as string).toUpperCase()} — нельзя купить тир ниже. Дождись окончания текущего пасса.`,
      );
    }
  }
  const cfg = PASS_CONFIG[tier];
  // Апгрейд: из цены нового тира вычитаем то, что юзер уже заплатил за активные
  // пассы ниже тиром. Бесплатные (спин/грант) стоили 0 — зачёта не дают.
  const credit = await getUpgradeCreditRub(userId, tier);
  const priceRub = Math.max(0, cfg.priceRub - credit);
  const [row] = await db
    .insert(passPurchases)
    .values({
      userId,
      tier,
      priceRub,
      ticketsGranted: cfg.tickets,
      status: "pending_payment",
      source: "purchase",
    })
    .returning();
  return row!;
}

/**
 * Активировать пасс (после оплаты).
 * - status -> 'active', paid_at = now()
 * - expires_at = max(active.expires_at, now) + 30 дней
 *   (если у юзера уже есть активный пасс — продлеваем от его остатка;
 *    апгрейд = тот же механизм, плюс новый пакет билетов)
 * - предыдущий активный пасс юзера помечается как 'superseded'
 * - начислить tickets_granted в ledger идемпотентно (refType='pass_purchase', refId=purchase.id).
 * Безопасно вызывать повторно (двойной вебхук).
 */
export async function activatePassPurchase(purchaseId: string): Promise<{ ok: boolean; reason?: string }> {
  const [p] = await db.select().from(passPurchases).where(eq(passPurchases.id, purchaseId)).limit(1);
  if (!p) return { ok: false, reason: "not_found" };
  if (p.status === "cancelled") return { ok: false, reason: "cancelled" };

  if (p.status !== "active") {
    const now = new Date();
    // База для отсчёта: остаток текущего активного пасса (если есть), иначе сейчас.
    const [otherActive] = await db
      .select()
      .from(passPurchases)
      .where(
        and(
          eq(passPurchases.userId, p.userId),
          eq(passPurchases.status, "active"),
          gt(passPurchases.expiresAt, now),
          ne(passPurchases.id, p.id),
        ),
      )
      .orderBy(desc(passPurchases.expiresAt))
      .limit(1);

    const base = otherActive?.expiresAt && otherActive.expiresAt > now ? otherActive.expiresAt : now;
    const expiresAt = new Date(base.getTime() + PASS_DURATION_DAYS * 24 * 60 * 60 * 1000);

    await db
      .update(passPurchases)
      .set({ status: "active", paidAt: now, expiresAt })
      .where(eq(passPurchases.id, purchaseId));

    // Старый активный пасс помечаем как замещённый — но ТОЛЬКО если новый тир
    // не ниже. Иначе бесплатный silver «съедал» бы купленный platinum.
    const otherRank = otherActive ? (TIER_RANK[otherActive.tier as PassTier] ?? 0) : 0;
    if (otherActive && (TIER_RANK[p.tier as PassTier] ?? 0) >= otherRank) {
      await db
        .update(passPurchases)
        .set({ status: "superseded" })
        .where(eq(passPurchases.id, otherActive.id));
    }
  }


  if (p.ticketsGranted > 0) {
    await ticketCredit({
      userId: p.userId,
      amount: p.ticketsGranted,
      source: "pass_monthly", // источник сохраняем как 'pass_monthly' — это «начисление по пассу»
      reason: `Hell Pass ${p.tier}: пакет билетов`,
      refType: "pass_purchase",
      refId: p.id,
      idempotent: true,
    });
  }

  // +XP за активацию пасса по тиру (idempotent по purchase.id)
  const tierXp: Record<string, number> = { silver: 50, gold: 150, platinum: 400 };
  const xp = tierXp[p.tier] ?? 50;
  await awardXp({
    userId: p.userId,
    amount: xp,
    source: "pass_monthly",
    reason: `Hell Pass ${p.tier}`,
    refType: "pass_purchase",
    refId: p.id,
    idempotent: true,
  });

  // Автовыдача стикерпаков за пасс (идемпотентно через уникальный индекс user_id+pack_slug).
  for (const slug of PASS_STICKER_PACKS) {
    await db
      .insert(userStickerPacks)
      .values({ userId: p.userId, packSlug: slug, source: "pass" })
      .onConflictDoNothing({ target: [userStickerPacks.userId, userStickerPacks.packSlug] });
  }

  // first_pass больше не квест — активация пасса даёт билеты + бонусный XP выше.

  return { ok: true };
}

/**
 * Текущий активный пасс юзера (если есть).
 * Активный = status='active' И expires_at > now().
 * Возвращаем самый поздний по expiresAt (если вдруг два — что нормально, если юзер купил впрок).
 */
export async function getActivePasses(userId: string) {
  return db
    .select()
    .from(passPurchases)
    .where(
      and(
        eq(passPurchases.userId, userId),
        eq(passPurchases.status, "active"),
        gt(passPurchases.expiresAt, new Date()),
      ),
    )
    .orderBy(desc(passPurchases.expiresAt));
}

export async function getActivePass(userId: string) {
  const rows = await getActivePasses(userId);
  if (!rows.length) return null;
  // Тир юзера = САМЫЙ ВЫСОКИЙ из активных. Иначе бесплатный SILVER из рулетки
  // «перекрывал» бы купленный PLATINUM (тот самый баг с даунгрейдом).
  let best = rows[0]!;
  for (const r of rows) {
    const a = TIER_RANK[r.tier as PassTier] ?? 0;
    const b = TIER_RANK[best.tier as PassTier] ?? 0;
    if (a > b || (a === b && (r.expiresAt?.getTime() ?? 0) > (best.expiresAt?.getTime() ?? 0))) best = r;
  }
  return best;
}

/**
 * Зачёт при апгрейде: сумма фактически уплаченного за активные пассы НИЖЕ тиром.
 * Silver 490 + Gold 1290 -> Platinum 2190 стоит 410 ₽. Бесплатные пассы = 0.
 */
export async function getUpgradeCreditRub(userId: string, target: PassTier): Promise<number> {
  const rows = await getActivePasses(userId);
  const targetRank = TIER_RANK[target];
  return rows
    .filter((r) => (TIER_RANK[r.tier as PassTier] ?? 0) < targetRank)
    .reduce((sum, r) => sum + (r.priceRub ?? 0), 0);
}

/** История покупок пасса. */
export async function getPassHistory(userId: string, limit = 20) {
  return db
    .select()
    .from(passPurchases)
    .where(eq(passPurchases.userId, userId))
    .orderBy(desc(passPurchases.createdAt))
    .limit(limit);
}

/**
 * Помечает истёкшие пассы как 'expired'. Дёргать кроном раз в день (или из nginx-cron).
 * Возвращает количество обновлённых.
 */
export async function expireOldPasses(): Promise<number> {
  const res = await db
    .update(passPurchases)
    .set({ status: "expired" })
    .where(and(eq(passPurchases.status, "active"), sql`${passPurchases.expiresAt} <= now()`))
    .returning({ id: passPurchases.id });
  return res.length;
}

/**
 * Отозвать пасс вручную (админ). Активный -> expired мгновенно, pending_payment -> cancelled.
 * Возвращает обновлённую запись или null, если такой записи нет.
 */
export async function revokePass(purchaseId: string) {
  const [row] = await db.select().from(passPurchases).where(eq(passPurchases.id, purchaseId)).limit(1);
  if (!row) return null;
  const nextStatus =
    row.status === "active" ? "expired" : row.status === "pending_payment" ? "cancelled" : row.status;
  if (nextStatus === row.status) return row;
  const [updated] = await db
    .update(passPurchases)
    .set({
      status: nextStatus,
      expiresAt: nextStatus === "expired" ? new Date() : row.expiresAt,
    })
    .where(eq(passPurchases.id, purchaseId))
    .returning();
  return updated ?? row;
}

/**
 * Перки активного Hell Pass на момент действия.
 *  - xpMultiplier: множитель XP за челленджи/квесты (1.0 без пасса)
 *  - shopDiscountPct: % скидки на мерч (0 без пасса)
 */
export const PASS_PERKS: Record<PassTier, { xpMultiplier: number; shopDiscountPct: number }> = {
  silver: { xpMultiplier: 1.25, shopDiscountPct: 5 },
  gold: { xpMultiplier: 1.5, shopDiscountPct: 10 },
  platinum: { xpMultiplier: 2, shopDiscountPct: 15 },
};

export async function getActivePassPerks(userId: string): Promise<{
  tier: PassTier | null;
  xpMultiplier: number;
  shopDiscountPct: number;
}> {
  const pass = await getActivePass(userId);
  if (!pass) return { tier: null, xpMultiplier: 1, shopDiscountPct: 0 };
  const tier = pass.tier as PassTier;
  const perks = PASS_PERKS[tier];
  return { tier, ...perks };
}

/**
 * Удаляет «мёртвые» заявки на пасс: status='pending_payment' старше PASS_PENDING_TTL_MINUTES.
 * Человек нажал «оплатить» и не заплатил — через час запись пропадает, чтобы админка
 * не забивалась мусором. Возвращает количество удалённых.
 */
export async function cleanupStalePendingPasses(): Promise<number> {
  const res = await db
    .delete(passPurchases)
    .where(
      and(
        eq(passPurchases.status, "pending_payment"),
        sql`${passPurchases.createdAt} < now() - interval '${sql.raw(String(PASS_PENDING_TTL_MINUTES))} minutes'`,
      ),
    )
    .returning({ id: passPurchases.id });
  return res.length;
}
