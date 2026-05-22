import { and, desc, eq, gt, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { passPurchases, PASS_CONFIG, PASS_DURATION_DAYS, type PassTier } from "../db/schema/pass.js";
import { ticketCredit } from "./tickets.js";
import { awardXp } from "./xp.js";
import { tryCompleteQuest } from "./quests.js";

/**
 * Создать запись о покупке пасса (pending_payment).
 * Реальная оплата подключится позже — пока админ активирует руками или вебхуком.
 */
export async function createPassPurchase(userId: string, tier: PassTier) {
  const cfg = PASS_CONFIG[tier];
  const [row] = await db
    .insert(passPurchases)
    .values({
      userId,
      tier,
      priceRub: cfg.priceRub,
      ticketsGranted: cfg.tickets,
      status: "pending_payment",
    })
    .returning();
  return row!;
}

/**
 * Активировать пасс (после оплаты).
 * - status -> 'active', paid_at = now(), expires_at = now() + 30 дней.
 * - начислить tickets_granted в ledger идемпотентно (refType='pass_purchase', refId=purchase.id).
 * Безопасно вызывать повторно (двойной вебхук).
 */
export async function activatePassPurchase(purchaseId: string): Promise<{ ok: boolean; reason?: string }> {
  const [p] = await db.select().from(passPurchases).where(eq(passPurchases.id, purchaseId)).limit(1);
  if (!p) return { ok: false, reason: "not_found" };
  if (p.status === "cancelled") return { ok: false, reason: "cancelled" };

  if (p.status !== "active") {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + PASS_DURATION_DAYS * 24 * 60 * 60 * 1000);
    await db
      .update(passPurchases)
      .set({ status: "active", paidAt: now, expiresAt })
      .where(eq(passPurchases.id, purchaseId));
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

  // Квест: первая активация пасса любого тира.
  await tryCompleteQuest(p.userId, "first_pass");

  return { ok: true };
}

/**
 * Текущий активный пасс юзера (если есть).
 * Активный = status='active' И expires_at > now().
 * Возвращаем самый поздний по expiresAt (если вдруг два — что нормально, если юзер купил впрок).
 */
export async function getActivePass(userId: string) {
  const [row] = await db
    .select()
    .from(passPurchases)
    .where(and(eq(passPurchases.userId, userId), eq(passPurchases.status, "active"), gt(passPurchases.expiresAt, new Date())))
    .orderBy(desc(passPurchases.expiresAt))
    .limit(1);
  return row ?? null;
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
