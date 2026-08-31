// Промокоды: валидация и списание.
//
// Правила:
//  - скидка в процентах, только на товары (не на доставку);
//  - персональный код: применить может только тот юзер, на кого он выписан;
//  - одноразовый: used_at ставим при оплате заказа;
//  - срок годности expires_at.
//
// Со скидкой Hell Pass НЕ суммируется — в заказе берём большую из двух.

import { eq, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { promoCodes, type PromoCode } from "../db/schema/promo.js";

export class PromoError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export function normalizePromoCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

/** Случайный код вида HELL-7K2QX9. */
export function generatePromoCode(prefix = "HELL"): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let tail = "";
  for (let i = 0; i < 6; i++) {
    tail += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `${prefix.toUpperCase()}-${tail}`;
}

export async function findPromoByCode(code: string): Promise<PromoCode | null> {
  const normalized = normalizePromoCode(code);
  const [row] = await db
    .select()
    .from(promoCodes)
    .where(sql`upper(${promoCodes.code}) = ${normalized}`)
    .limit(1);
  return row ?? null;
}

/** Что лежит в корзине — нужно для товарных промокодов. */
export type PromoCartContext = Array<{ productId: string; qty: number }>;

/**
 * Товары, на которые действует промокод.
 * Пустой массив = обычный промокод на всю корзину.
 */
export function promoTargetProductIds(promo: {
  productId?: string | null;
  productIds?: string[] | null;
}): string[] {
  if (promo.productIds && promo.productIds.length > 0) return promo.productIds;
  return promo.productId ? [promo.productId] : [];
}

/**
 * Проверяет промокод для юзера. Бросает PromoError с человеческим текстом.
 * Если промокод товарный (productId), требуем наличие этого товара в корзине.
 * Скидка применяется только к 1 шт. целевого товара, остальные товары — по полной цене.
 */
export async function validatePromoForUser(
  userId: string,
  rawCode: string,
  cart?: PromoCartContext,
): Promise<PromoCode> {
  const code = normalizePromoCode(rawCode);
  if (!code) throw new PromoError("promo_empty", "Введи промокод");
  const promo = await findPromoByCode(code);
  if (!promo) throw new PromoError("promo_not_found", "Промокод не найден");
  if (!promo.active) throw new PromoError("promo_inactive", "Промокод отключён");
  if (promo.usedAt) throw new PromoError("promo_used", "Промокод уже использован");
  if (promo.expiresAt && promo.expiresAt.getTime() < Date.now()) {
    throw new PromoError("promo_expired", "Срок действия промокода истёк");
  }
  if (promo.userId && promo.userId !== userId) {
    throw new PromoError("promo_foreign", "Этот промокод выписан на другого райдера");
  }
  if (promo.discountPct <= 0) throw new PromoError("promo_invalid", "Промокод не даёт скидку");

  if (promo.productId) {
    if (!cart) {
      throw new PromoError(
        "promo_product_cart_required",
        "Этот промокод работает только на конкретный товар — добавь его в корзину",
      );
    }
    // Товарный промокод: в корзине могут быть и другие товары,
    // но скидка применяется только к 1 шт. целевого товара.
    const has = cart.some((i) => i.productId === promo.productId && i.qty > 0);
    if (!has) {
      throw new PromoError(
        "promo_product_mismatch",
        "Промокод действует только на конкретный товар — добавь его в корзину",
      );
    }
  }

  return promo;
}


/**
 * Помечает промокод использованным. Идемпотентно: если уже помечен — ничего не делает.
 */
export async function consumePromoCode(promoCodeId: string, orderId: string): Promise<void> {
  await db
    .update(promoCodes)
    .set({ usedAt: new Date(), usedOrderId: orderId })
    .where(sql`${promoCodes.id} = ${promoCodeId} AND ${promoCodes.usedAt} IS NULL`);
}

/** Освобождает промокод (например, при возврате/отмене заказа). */
export async function releasePromoCodeForOrder(orderId: string): Promise<void> {
  await db
    .update(promoCodes)
    .set({ usedAt: null, usedOrderId: null })
    .where(eq(promoCodes.usedOrderId, orderId));
}
