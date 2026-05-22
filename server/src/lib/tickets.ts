import { and, eq, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { ticketsLedger, type TicketSource } from "../db/schema/tickets.js";

/** Текущий баланс билетов у юзера (SUM по леджеру). */
export async function getTicketBalance(userId: string): Promise<number> {
  const [row] = await db
    .select({ balance: sql<number>`coalesce(sum(${ticketsLedger.amount}), 0)::int` })
    .from(ticketsLedger)
    .where(eq(ticketsLedger.userId, userId));
  return row?.balance ?? 0;
}

export interface CreditOptions {
  userId: string;
  amount: number; // > 0 — начисление, < 0 — списание
  source: TicketSource;
  reason: string;
  refType?: string;
  refId?: string;
  createdBy?: string | null;
  /**
   * Если задан и в ledger уже есть строка с такими же (refType, refId, source) — операция не повторится.
   * Используем для дедупа (квест нельзя засчитать дважды, бонус за один заказ — один раз).
   */
  idempotent?: boolean;
}

/**
 * Создать запись в леджере.
 * Возвращает созданную строку или null, если сработал idempotent-дедуп.
 */
export async function ticketCredit(opts: CreditOptions) {
  if (!Number.isInteger(opts.amount) || opts.amount === 0) {
    throw new Error("amount must be a non-zero integer");
  }

  if (opts.idempotent && opts.refType && opts.refId) {
    const [existing] = await db
      .select({ id: ticketsLedger.id })
      .from(ticketsLedger)
      .where(
        and(
          eq(ticketsLedger.userId, opts.userId),
          eq(ticketsLedger.source, opts.source),
          eq(ticketsLedger.refType, opts.refType),
          eq(ticketsLedger.refId, opts.refId),
        ),
      )
      .limit(1);
    if (existing) return null;
  }

  const [row] = await db
    .insert(ticketsLedger)
    .values({
      userId: opts.userId,
      amount: opts.amount,
      source: opts.source,
      reason: opts.reason,
      refType: opts.refType,
      refId: opts.refId,
      createdBy: opts.createdBy ?? null,
    })
    .returning();

  return row;
}
