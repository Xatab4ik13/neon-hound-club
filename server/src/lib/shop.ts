import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { orders, orderItems, products } from "../db/schema/shop.js";
import { userStickerPacks } from "../db/schema/stickers.js";
import { ticketCredit } from "./tickets.js";
import { awardXp } from "./xp.js";
import { tryCompleteQuest } from "./quests.js";

/**
 * После оплаты — выдаём пользователю все стикер-паки, привязанные к товарам заказа.
 * Идемпотентно (uniq на user_id+pack_slug).
 */
async function grantStickerPacksFromOrder(orderId: string, userId: string): Promise<void> {
  const items = await db
    .select({ productId: orderItems.productId })
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));
  const productIds = items.map((i) => i.productId).filter((x): x is string => !!x);
  if (productIds.length === 0) return;
  const rows = await db
    .select({ slug: products.stickerPackSlug })
    .from(products)
    .where(and(inArray(products.id, productIds), sql`${products.stickerPackSlug} IS NOT NULL`));
  for (const r of rows) {
    if (!r.slug) continue;
    await db
      .insert(userStickerPacks)
      .values({ userId, packSlug: r.slug, source: "purchase", refOrderId: orderId })
      .onConflictDoNothing();
  }
}


/**
 * Помечаем заказ оплаченным.
 * - переводим status -> 'paid'
 * - выставляем paid_at
 * - начисляем bonus_tickets_total в ledger (идемпотентно по (refType=order, refId=orderId, source=product_bonus))
 *
 * Безопасно вызывать повторно (например, при повторном вебхуке оплаты) —
 * билеты не задвоятся благодаря idempotent-дедупу в ticketCredit.
 *
 * NOTE: реальная платёжка появится позже (ЮKassa/CloudPayments) и будет дёргать эту функцию из вебхука.
 */
export async function markOrderPaid(orderId: string): Promise<{ ok: boolean; reason?: string }> {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) return { ok: false, reason: "order_not_found" };
  if (order.status === "paid" || order.status === "shipped" || order.status === "delivered") {
    // уже оплачен ранее — всё равно перепроверим начисление билетов (idempotent)
    if (order.bonusTicketsTotal > 0) {
      await ticketCredit({
        userId: order.userId,
        amount: order.bonusTicketsTotal,
        source: "product_bonus",
        reason: `Бонус за заказ #${order.id.slice(0, 8)}`,
        refType: "order",
        refId: order.id,
        idempotent: true,
      });
    }
    await grantStickerPacksFromOrder(order.id, order.userId);
    return { ok: true };
  }
  if (order.status === "cancelled" || order.status === "refunded") {
    return { ok: false, reason: "order_terminal_state" };
  }

  await db
    .update(orders)
    .set({ status: "paid", paidAt: new Date(), updatedAt: new Date() })
    .where(eq(orders.id, orderId));

  if (order.bonusTicketsTotal > 0) {
    await ticketCredit({
      userId: order.userId,
      amount: order.bonusTicketsTotal,
      source: "product_bonus",
      reason: `Бонус за заказ #${order.id.slice(0, 8)}`,
      refType: "order",
      refId: order.id,
      idempotent: true,
    });
  }

  // +XP: 1 XP за 100 ₽
  const xp = Math.max(10, Math.floor((order.totalRub ?? 0) / 100));
  await awardXp({
    userId: order.userId,
    amount: xp,
    source: "merch_purchase",
    reason: `Покупка мерча #${order.id.slice(0, 8)}`,
    refType: "order",
    refId: order.id,
    idempotent: true,
  });

  // Квест: оплаченный заказ за месяц (monthly).
  await tryCompleteQuest(order.userId, "shop_order");

  // Выдаём стикер-паки за товары заказа.
  await grantStickerPacksFromOrder(order.id, order.userId);

  return { ok: true };
}

/**
 * Возврат оплаченного заказа: status -> 'refunded', снимаем начисленные ранее билеты
 * компенсирующей строкой (тоже idempotent — по другому refType, чтобы не конфликтовать с начислением).
 */
export async function refundOrder(orderId: string): Promise<{ ok: boolean; reason?: string }> {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) return { ok: false, reason: "order_not_found" };
  if (order.status !== "paid" && order.status !== "shipped" && order.status !== "delivered") {
    return { ok: false, reason: "order_not_paid" };
  }

  await db
    .update(orders)
    .set({ status: "refunded", updatedAt: new Date() })
    .where(eq(orders.id, orderId));

  if (order.bonusTicketsTotal > 0) {
    await ticketCredit({
      userId: order.userId,
      amount: -order.bonusTicketsTotal,
      source: "refund",
      reason: `Возврат заказа #${order.id.slice(0, 8)}`,
      refType: "order_refund",
      refId: order.id,
      idempotent: true,
    });
  }
  return { ok: true };
}

/**
 * Загрузить заказ с позициями (для GET одного заказа).
 */
export async function getOrderWithItems(orderId: string) {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) return null;
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  return { ...order, items };
}

/**
 * Проверка остатка и резервирование (уменьшение stock) для товара с лимитом.
 * Если stock = null — без учёта. Если stock < qty — кидаем ошибку.
 * Делается ОДНИМ атомарным UPDATE с проверкой остатка.
 */
export async function decrementStockIfTracked(productId: string, qty: number): Promise<boolean> {
  const res = await db
    .update(products)
    .set({ stock: sql`${products.stock} - ${qty}`, updatedAt: new Date() })
    .where(and(eq(products.id, productId), sql`${products.stock} IS NOT NULL AND ${products.stock} >= ${qty}`))
    .returning({ id: products.id });
  // если товар без учёта остатков — апдейт ничего не вернёт, но это норм
  const [productRow] = await db
    .select({ stock: products.stock })
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);
  if (!productRow) return false;
  if (productRow.stock === null) return true; // без учёта
  return res.length > 0;
}
