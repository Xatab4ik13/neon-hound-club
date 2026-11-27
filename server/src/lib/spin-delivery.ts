import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "../db/client.js";
import { spinWinners } from "../db/schema/spin.js";
import { orders, orderItems, PAID_ORDER_STATUSES } from "../db/schema/shop.js";
import { cdek } from "./cdek.js";
import { SPIN_DELIVERY_PRIZES, SpinDeliveryError, planSpinDeliveryOrder } from "./spin-delivery-plan.js";

export { SpinDeliveryError } from "./spin-delivery-plan.js";

const CODES = Object.keys(SPIN_DELIVERY_PRIZES);

async function getWinner(userId: string, winnerId: string) {
  const [w] = await db
    .select()
    .from(spinWinners)
    .where(and(eq(spinWinners.id, winnerId), eq(spinWinners.userId, userId)))
    .limit(1);
  if (!w || !SPIN_DELIVERY_PRIZES[w.prizeCode]) {
    throw new SpinDeliveryError("not_found", "Награда не найдена", 404);
  }
  return w;
}

async function paidOrderFor(winnerId: string) {
  const [o] = await db
    .select({ id: orders.id, status: orders.status })
    .from(orders)
    .where(and(eq(orders.spinWinnerId, winnerId), inArray(orders.status, [...PAID_ORDER_STATUSES])))
    .limit(1);
  return o ?? null;
}

/** Мои физические награды календаря и статус оплаты доставки. */
export async function listMyDeliveries(userId: string) {
  const winners = await db
    .select()
    .from(spinWinners)
    .where(and(eq(spinWinners.userId, userId), inArray(spinWinners.prizeCode, CODES)))
    .orderBy(desc(spinWinners.createdAt));
  const out = [];
  for (const w of winners) {
    const paid = await paidOrderFor(w.id);
    const prize = SPIN_DELIVERY_PRIZES[w.prizeCode]!;
    out.push({
      winnerId: w.id,
      prizeCode: w.prizeCode,
      title: prize.title,
      sizes: prize.sizes,
      orderId: paid?.id ?? null,
      orderStatus: paid?.status ?? null,
    });
  }
  return out;
}

export async function calcSpinDelivery(userId: string, winnerId: string, cityCode: number) {
  const w = await getWinner(userId, winnerId);
  const prize = SPIN_DELIVERY_PRIZES[w.prizeCode]!;
  return cdek.calculate({ toCityCode: cityCode, mode: "pvz", packages: [prize.pkg] });
}

export async function createSpinDeliveryOrder(
  userId: string,
  input: {
    winnerId: string;
    size?: string | null;
    fio: string;
    phone: string;
    city: string;
    cdekCityCode: number;
    cdekPvzCode: string;
    cdekPvzAddress?: string | null;
  },
): Promise<{ orderId: string }> {
  const w = await getWinner(userId, input.winnerId);
  if (await paidOrderFor(w.id)) {
    throw new SpinDeliveryError("already_paid", "Доставка этой награды уже оплачена", 409);
  }
  const prize = SPIN_DELIVERY_PRIZES[w.prizeCode]!;
  let calc;
  try {
    calc = await cdek.calculate({ toCityCode: input.cdekCityCode, mode: "pvz", packages: [prize.pkg] });
  } catch {
    throw new SpinDeliveryError("cdek_calc_failed", "Не удалось рассчитать доставку СДЭК. Попробуй ещё раз.", 502);
  }
  const plan = planSpinDeliveryOrder(w.prizeCode, input.size, Math.round(calc.totalSum));

  const [order] = await db
    .insert(orders)
    .values({
      userId,
      status: "pending_payment",
      subtotalRub: plan.subtotalRub,
      discountPct: 0,
      discountRub: 0,
      totalRub: plan.totalRub,
      bonusTicketsTotal: 0,
      shipping: {
        fio: input.fio,
        phone: input.phone,
        city: input.city,
        address: input.cdekPvzAddress ?? "",
        cdekCityCode: input.cdekCityCode,
        cdekPvzCode: input.cdekPvzCode,
        cdekPvzAddress: input.cdekPvzAddress ?? null,
        mode: "pvz",
      } as any,
      comment: `Оплата доставки приза HellSpin: ${prize.title}${plan.sizeSnapshot ? `, размер ${plan.sizeSnapshot}` : ""}`,
      shippingPriceRub: plan.shippingPriceRub,
      shippingMode: "pvz",
      cdekTariffCode: calc.tariffCode,
      kindSummary: "spin",
      spinWinnerId: w.id,
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
    })
    .returning();

  await db.insert(orderItems).values({
    orderId: order!.id,
    productId: null,
    titleSnapshot: plan.title,
    priceRubSnapshot: 0,
    bonusTicketsSnapshot: 0,
    qty: 1,
    sizeSnapshot: plan.sizeSnapshot,
    kindSnapshot: "physical",
  });
  return { orderId: order!.id };
}
