/**
 * Авто-синхронизация статусов накладных СДЭК.
 * Дёргается из setInterval раз в час (см. server/src/index.ts).
 *
 * Логика:
 *   1. Берём все заказы с заполненным cdek_uuid и статусом НЕ в {delivered, cancelled, refunded}.
 *   2. Для каждого зовём cdek.getOrder, обновляем cdek_track / cdek_status_*.
 *   3. Если в СДЭК пришёл финальный статус — поднимаем order.status:
 *        - DELIVERED → "delivered"
 *        - появился cdek_number и order.status === "paid" → "shipped"
 *   4. Ошибки на отдельном заказе не валят весь прогон — логируем и идём дальше.
 */
import { and, eq, isNotNull, notInArray } from "drizzle-orm";
import { db } from "../db/client.js";
import { orders } from "../db/schema/shop.js";
import { cdek } from "./cdek.js";

const TERMINAL_ORDER_STATUSES = ["delivered", "cancelled", "refunded"] as const;
const DELIVERED_CDEK_CODES = new Set(["DELIVERED"]);

export type CdekSyncResult = {
  scanned: number;
  updated: number;
  promoted: { shipped: number; delivered: number };
  errors: number;
};

export async function syncCdekStatuses(opts: { limit?: number } = {}): Promise<CdekSyncResult> {
  const limit = opts.limit ?? 200;
  const rows = await db
    .select({
      id: orders.id,
      status: orders.status,
      cdekUuid: orders.cdekUuid,
      cdekTrack: orders.cdekTrack,
      cdekStatusCode: orders.cdekStatusCode,
    })
    .from(orders)
    .where(
      and(
        isNotNull(orders.cdekUuid),
        notInArray(orders.status, TERMINAL_ORDER_STATUSES as unknown as string[]),
      ),
    )
    .limit(limit);

  const result: CdekSyncResult = {
    scanned: rows.length,
    updated: 0,
    promoted: { shipped: 0, delivered: 0 },
    errors: 0,
  };

  for (const row of rows) {
    if (!row.cdekUuid) continue;
    try {
      const info = await cdek.getOrder(row.cdekUuid);
      const sameTrack = (info.cdekNumber ?? null) === (row.cdekTrack ?? null);
      const sameStatus = (info.statusCode ?? null) === (row.cdekStatusCode ?? null);
      if (sameTrack && sameStatus) continue;

      const patch: Record<string, unknown> = {
        cdekTrack: info.cdekNumber ?? row.cdekTrack,
        cdekStatusCode: info.statusCode,
        cdekStatusName: info.statusName,
        cdekStatusAt: new Date(),
        updatedAt: new Date(),
      };

      if (info.statusCode && DELIVERED_CDEK_CODES.has(info.statusCode) && row.status !== "delivered") {
        patch.status = "delivered";
        result.promoted.delivered += 1;
      } else if (info.cdekNumber && !row.cdekTrack && row.status === "paid") {
        patch.status = "shipped";
        result.promoted.shipped += 1;
      }

      await db.update(orders).set(patch).where(eq(orders.id, row.id));
      result.updated += 1;
    } catch (e) {
      result.errors += 1;
      // eslint-disable-next-line no-console
      console.error("[cdek-sync] order", row.id, e instanceof Error ? e.message : e);
    }
  }

  return result;
}
