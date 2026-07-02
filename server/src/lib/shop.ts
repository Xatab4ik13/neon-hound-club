import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { orders, orderItems, products, cartItems, type ProductKind } from "../db/schema/shop.js";
import { users } from "../db/schema/users.js";
import { userStickerPacks } from "../db/schema/stickers.js";
import { ticketCredit } from "./tickets.js";
import { awardXp } from "./xp.js";
import { tryCompleteQuest } from "./quests.js";
import { getActivePassPerks } from "./pass.js";
import { sendMail } from "./mailer.js";
import { orderConfirmedTemplate, type DigitalItem } from "./email-templates/order-confirmed.js";
import { cdek, CDEK_TARIFFS, type CdekDeliveryMode } from "./cdek.js";

const FRONTEND_ORIGIN = (process.env.FRONTEND_ORIGIN || "https://hhr.pro").replace(/\/$/, "");

export class OrderCreateError extends Error {
  code: string;
  status: number;
  productId?: string;
  constructor(code: string, message: string, status = 400, productId?: string) {
    super(message);
    this.code = code;
    this.status = status;
    this.productId = productId;
  }
}

export type CreateOrderInput = {
  items: Array<{ productId: string; qty: number; size?: string }>;
  shipping: {
    fio: string;
    phone: string;
    city: string;
    address: string;
    postalCode?: string;
    /** Код города в СДЭК — обязателен для physical/preorder. */
    cdekCityCode?: number | null;
    /** Код ПВЗ (если mode='pvz'). */
    cdekPvzCode?: string | null;
    /** Человекочитаемый адрес ПВЗ — снапшот. */
    cdekPvzAddress?: string | null;
    /** 'pvz' | 'courier' | 'none'. 'none' для virtual/digital. */
    mode?: "pvz" | "courier" | "none";
  };
  comment?: string;
};

export async function createOrderFromCartForUser(
  userId: string,
  input: Omit<CreateOrderInput, "items">,
): Promise<{ orderId: string }> {
  const rows = await db
    .select({
      productId: cartItems.productId,
      qty: cartItems.qty,
      size: cartItems.size,
    })
    .from(cartItems)
    .where(eq(cartItems.userId, userId));

  if (rows.length === 0) {
    throw new OrderCreateError("cart_empty", "Корзина пустая");
  }

  return createOrderForUser(userId, {
    ...input,
    items: rows.map((row) => ({
      productId: row.productId,
      qty: row.qty,
      size: row.size ?? undefined,
    })),
  });
}

/**
 * Создаёт заказ для юзера: грузит товары, валидирует размеры/остатки, считает скидку
 * по активному Hell Pass, резервирует остатки и пишет orders+order_items.
 * Дополнительно: рассчитывает стоимость доставки СДЭК на сервере (фронту не доверяем).
 * Бросает OrderCreateError с понятным сообщением и HTTP-кодом.
 */
export async function createOrderForUser(
  userId: string,
  input: CreateOrderInput,
): Promise<{ orderId: string }> {
  const { items, shipping, comment } = input;

  const productIds = items.map((i) => i.productId);
  const dbProducts = await db
    .select()
    .from(products)
    .where(and(inArray(products.id, productIds), eq(products.active, true)));

  if (dbProducts.length !== productIds.length) {
    throw new OrderCreateError("product_unavailable", "Один из товаров недоступен");
  }

  const productMap = new Map(dbProducts.map((p) => [p.id, p]));
  let subtotalRub = 0;
  let bonusTotal = 0;
  const itemSnapshots = items.map((i) => {
    const p = productMap.get(i.productId)!;
    subtotalRub += p.priceRub * i.qty;
    bonusTotal += p.bonusTickets * i.qty;
    const hasSizes = Array.isArray(p.sizes) && p.sizes.length > 0;
    if (hasSizes && !i.size) {
      throw new OrderCreateError("size_required", `Выбери размер для «${p.title}»`, 400, p.id);
    }
    if (hasSizes && i.size && !(p.sizes as any[]).some((s) => s.label === i.size)) {
      throw new OrderCreateError("size_invalid", `Неверный размер для «${p.title}»`, 400, p.id);
    }
    return {
      productId: p.id,
      titleSnapshot: p.title,
      priceRubSnapshot: p.priceRub,
      bonusTicketsSnapshot: p.bonusTickets,
      qty: i.qty,
      sizeSnapshot: hasSizes ? i.size ?? null : null,
      kindSnapshot: (p.kind ?? "physical") as ProductKind,
    };
  });

  // ---------- СДЭК: расчёт доставки на сервере ----------
  // physical/preorder требуют city+(pvz или адрес курьера); virtual/digital — none.
  const kinds = new Set(itemSnapshots.map((s) => s.kindSnapshot));
  const needShipping = kinds.has("physical") || kinds.has("preorder");
  let shippingMode: "pvz" | "courier" | "none" = "none";
  let shippingPriceRub = 0;
  let cdekTariffCode: number | null = null;

  if (needShipping) {
    const mode = shipping.mode ?? "pvz";
    if (mode === "none") {
      throw new OrderCreateError("shipping_mode_required", "Выбери способ доставки", 400);
    }
    if (!shipping.cdekCityCode || shipping.cdekCityCode <= 0) {
      throw new OrderCreateError("cdek_city_required", "Выбери город доставки", 400);
    }
    if (mode === "pvz" && !shipping.cdekPvzCode) {
      throw new OrderCreateError("cdek_pvz_required", "Выбери пункт выдачи СДЭК", 400);
    }
    if (mode === "courier" && (!shipping.address || shipping.address.trim().length < 5)) {
      throw new OrderCreateError("shipping_address_required", "Укажи адрес доставки", 400);
    }

    const packages: Array<{ weightG: number; lengthCm: number; widthCm: number; heightCm: number }> = [];
    for (const it of items) {
      const p = productMap.get(it.productId)!;
      if (p.kind === "virtual" || p.kind === "digital") continue;
      if (!p.weightG || !p.lengthCm || !p.widthCm || !p.heightCm) {
        throw new OrderCreateError(
          "product_missing_dimensions",
          `У товара «${p.title}» не заданы вес/габариты — напиши в поддержку`,
          409,
          p.id,
        );
      }
      for (let k = 0; k < it.qty; k++) {
        packages.push({
          weightG: p.weightG,
          lengthCm: p.lengthCm,
          widthCm: p.widthCm,
          heightCm: p.heightCm,
        });
      }
    }
    try {
      const calc = await cdek.calculate({
        toCityCode: shipping.cdekCityCode,
        mode: mode as CdekDeliveryMode,
        packages,
      });
      shippingPriceRub = calc.totalSum;
      cdekTariffCode = calc.tariffCode;
      shippingMode = mode;
    } catch (e) {
      throw new OrderCreateError(
        "cdek_calc_failed",
        "Не удалось рассчитать доставку СДЭК. Попробуй ещё раз.",
        502,
      );
    }
  }

  // ---------- Скидка Pass и итог ----------
  const perks = await getActivePassPerks(userId);
  const discountPct = perks.shopDiscountPct;
  const discountRub = Math.floor((subtotalRub * discountPct) / 100);
  const goodsAfterDiscount = Math.max(0, subtotalRub - discountRub);
  const totalRub = goodsAfterDiscount + shippingPriceRub;

  // ---------- Резерв остатков ----------
  for (const i of items) {
    const p = productMap.get(i.productId)!;
    const hasSizes = Array.isArray(p.sizes) && p.sizes.length > 0;
    if (hasSizes && i.size) {
      const ok = await decrementSizeStockIfTracked(i.productId, i.size, i.qty);
      if (!ok) {
        throw new OrderCreateError(
          "out_of_stock",
          `«${p.title}» (${i.size}) закончился`,
          409,
          p.id,
        );
      }
    } else {
      if (p.stock !== null && p.stock < i.qty) {
        throw new OrderCreateError("out_of_stock", `«${p.title}» закончился`, 409, p.id);
      }
      const ok = await decrementStockIfTracked(i.productId, i.qty);
      if (!ok) {
        throw new OrderCreateError("out_of_stock", "Кто-то успел раньше, попробуй ещё раз", 409);
      }
    }
  }

  // Сводка типов для фильтра в /club/orders.
  let kindSummary: string = "physical";
  if (kinds.size === 1) kindSummary = [...kinds][0];
  else kindSummary = "mixed";

  // Снапшот адреса доставки в jsonb (включая СДЭК-поля).
  const shippingSnapshot = {
    fio: shipping.fio,
    phone: shipping.phone,
    city: shipping.city,
    address: shipping.address,
    postalCode: shipping.postalCode,
    cdekCityCode: shipping.cdekCityCode ?? null,
    cdekPvzCode: shipping.cdekPvzCode ?? null,
    cdekPvzAddress: shipping.cdekPvzAddress ?? null,
    mode: shippingMode,
  };

  const [order] = await db
    .insert(orders)
    .values({
      userId,
      status: "pending_payment",
      subtotalRub,
      discountPct,
      discountRub,
      totalRub,
      bonusTicketsTotal: bonusTotal,
      shipping: shippingSnapshot as any,
      comment: comment ?? null,
      shippingPriceRub,
      shippingMode,
      cdekTariffCode: cdekTariffCode ?? undefined,
      kindSummary,
      // Дедлайн оплаты — 2 часа. Дальше воркер expireUnpaidOrders снесёт.
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
    })
    .returning();

  await db
    .insert(orderItems)
    .values(itemSnapshots.map((s) => ({ ...s, orderId: order!.id })));

  return { orderId: order!.id };
}


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
  // "Оплаченные и активные" статусы — заказ уже проведён (билеты начислены, деньги учтены).
  // Повторный вебхук не должен всё пересчитать заново, но проверку начислений оставляем идемпотентной.
  const alreadyPaid =
    order.status === "paid" ||
    order.status === "awaiting_stock" ||
    order.status === "ready_to_ship" ||
    order.status === "waybill_created" ||
    order.status === "shipped" ||
    order.status === "delivered";
  if (alreadyPaid) {
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

  // Если в заказе есть хотя бы одна позиция-предзаказ — идём в awaiting_stock,
  // иначе сразу paid (собираем и отправляем).
  const itemKinds = await db
    .select({ kind: products.kind })
    .from(orderItems)
    .leftJoin(products, eq(orderItems.productId, products.id))
    .where(eq(orderItems.orderId, orderId));
  const hasPreorder = itemKinds.some((r) => r.kind === "preorder");
  const nextStatus = hasPreorder ? "awaiting_stock" : "paid";

  await db
    .update(orders)
    .set({ status: nextStatus, paidAt: new Date(), updatedAt: new Date() })
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

  // Письмо «заказ принят». Не блокируем оплату на ошибке отправки.
  try {
    await sendOrderConfirmedEmail(order.id);
  } catch (err) {
    console.error("[order-confirmed mail] send failed", err);
  }

  return { ok: true };
}

/**
 * Шлёт письмо «заказ принят» по orderId.
 * Для digital-товаров добавляет блок со ссылками на скачивание.
 */
async function sendOrderConfirmedEmail(orderId: string): Promise<void> {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) return;
  const [user] = await db
    .select({ email: users.email, nick: users.nick })
    .from(users)
    .where(eq(users.id, order.userId))
    .limit(1);
  if (!user?.email) return;

  const items = await db
    .select({
      productId: orderItems.productId,
      title: orderItems.titleSnapshot,
      price: orderItems.priceRubSnapshot,
      qty: orderItems.qty,
    })
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));

  // Подтягиваем digital-файлы для позиций.
  const productIds = items.map((i) => i.productId).filter((x): x is string => !!x);
  const digitalItems: DigitalItem[] = [];
  if (productIds.length > 0) {
    const prods = await db
      .select({
        id: products.id,
        kind: products.kind,
        digitalFileUrl: products.digitalFileUrl,
        digitalFileName: products.digitalFileName,
      })
      .from(products)
      .where(inArray(products.id, productIds));
    const byId = new Map(prods.map((p) => [p.id, p]));
    for (const it of items) {
      const p = it.productId ? byId.get(it.productId) : undefined;
      if (p && p.kind === "digital" && p.digitalFileUrl) {
        digitalItems.push({
          title: it.title,
          url: p.digitalFileUrl,
          fileName: p.digitalFileName,
        });
      }
    }
  }

  const { subject, html, text } = orderConfirmedTemplate({
    nick: user.nick,
    orderNumber: `HHR-${order.id.slice(0, 8).toUpperCase()}`,
    orderUrl: `${FRONTEND_ORIGIN}/club/orders/${order.id}`,
    items: items.map((i) => ({ title: i.title, qty: i.qty, sumRub: i.price * i.qty })),
    totalRub: order.totalRub,
    ticketsBonus: order.bonusTicketsTotal,
    digitalItems,
  });

  await sendMail({ to: user.email, subject, html, text });
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

/**
 * Атомарно списывает остаток у выбранного размера в jsonb-массиве sizes.
 * Если у размера stock=null — считается безлимитным (UPDATE проходит без изменений).
 */
export async function decrementSizeStockIfTracked(
  productId: string,
  sizeLabel: string,
  qty: number,
): Promise<boolean> {
  const res = await db.execute(sql`
    UPDATE products
    SET sizes = (
      SELECT jsonb_agg(
        CASE WHEN (s->>'label') = ${sizeLabel} AND (s->'stock') IS NOT NULL AND (s->>'stock') <> 'null'
             THEN jsonb_set(s, '{stock}', to_jsonb(((s->>'stock')::int) - ${qty}))
             ELSE s END
      )
      FROM jsonb_array_elements(sizes) s
    ),
    updated_at = now()
    WHERE id = ${productId}
      AND EXISTS (
        SELECT 1 FROM jsonb_array_elements(sizes) s
        WHERE (s->>'label') = ${sizeLabel}
          AND ((s->'stock') IS NULL OR (s->>'stock') = 'null' OR ((s->>'stock')::int) >= ${qty})
      )
    RETURNING id
  `);
  return (res.length ?? (res as any).rowCount ?? 0) > 0;
}

/**
 * Возвращает остаток на товар (если stock не null).
 * Используется при отмене / экспирации заказа.
 */
export async function incrementStockIfTracked(productId: string, qty: number): Promise<void> {
  await db
    .update(products)
    .set({ stock: sql`${products.stock} + ${qty}`, updatedAt: new Date() })
    .where(and(eq(products.id, productId), sql`${products.stock} IS NOT NULL`));
}

/**
 * Возвращает остаток на конкретный размер в jsonb-массиве sizes.
 * Размеры с stock=null (безлимит) остаются без изменений.
 */
export async function incrementSizeStockIfTracked(
  productId: string,
  sizeLabel: string,
  qty: number,
): Promise<void> {
  await db.execute(sql`
    UPDATE products
    SET sizes = (
      SELECT jsonb_agg(
        CASE WHEN (s->>'label') = ${sizeLabel} AND (s->'stock') IS NOT NULL AND (s->>'stock') <> 'null'
             THEN jsonb_set(s, '{stock}', to_jsonb(((s->>'stock')::int) + ${qty}))
             ELSE s END
      )
      FROM jsonb_array_elements(sizes) s
    ),
    updated_at = now()
    WHERE id = ${productId}
  `);
}

/**
 * Возвращает остатки на товары/размеры по позициям заказа.
 * Используется при ручной отмене (юзером или админом) и при истечении заказа.
 * Не трогает сам заказ — только остатки. Вызывающий должен сам гарантировать
 * однократность (через DELETE заказа или через переход в cancelled один раз).
 */
export async function restockOrder(orderId: string): Promise<void> {
  const items = await db
    .select({
      productId: orderItems.productId,
      qty: orderItems.qty,
      size: orderItems.sizeSnapshot,
    })
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));

  for (const it of items) {
    if (!it.productId) continue;
    if (it.size) await incrementSizeStockIfTracked(it.productId, it.size, it.qty);
    else await incrementStockIfTracked(it.productId, it.qty);
  }
}

/**
 * Воркер: находит pending_payment-заказы с истёкшим expires_at, возвращает
 * остатки на товары/размеры и сносит сами заказы (с каскадом на order_items).
 * Возвращает количество удалённых заказов.
 */
export async function expireUnpaidOrders(): Promise<number> {
  const expired = await db
    .select({ id: orders.id })
    .from(orders)
    .where(
      and(
        eq(orders.status, "pending_payment"),
        sql`${orders.expiresAt} IS NOT NULL AND ${orders.expiresAt} < now()`,
      ),
    )
    .limit(100);

  if (expired.length === 0) return 0;

  let removed = 0;
  for (const { id } of expired) {
    await restockOrder(id);
    // order_items удалятся каскадно через FK on delete cascade
    const res = await db
      .delete(orders)
      .where(and(eq(orders.id, id), eq(orders.status, "pending_payment")))
      .returning({ id: orders.id });
    if (res.length > 0) removed += 1;
  }
  return removed;
}
