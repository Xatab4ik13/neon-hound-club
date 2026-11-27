/**
 * Чистые правила доставки физических наград календаря HellSpin
 * (футболка за 20 дней, Secret Box за 40). Приз бесплатный — участник
 * платит только доставку СДЭК до ПВЗ, рассчитанную на сервере.
 */
export const TSHIRT_SIZES = ["S", "M", "L", "XL"] as const;

export interface SpinDeliveryPrize {
  title: string;
  sizes: readonly string[] | null;
  pkg: { weightG: number; lengthCm: number; widthCm: number; heightCm: number };
}

export const SPIN_DELIVERY_PRIZES: Record<string, SpinDeliveryPrize> = {
  tshirt_legend: {
    title: "Легендарная футболка — награда HellSpin (20 дней)",
    sizes: TSHIRT_SIZES,
    pkg: { weightG: 300, lengthCm: 30, widthCm: 25, heightCm: 3 },
  },
  secret_box: {
    title: "Secret Box — награда HellSpin (40 дней)",
    sizes: null,
    pkg: { weightG: 2000, lengthCm: 30, widthCm: 30, heightCm: 20 },
  },
};

export class SpinDeliveryError extends Error {
  constructor(public code: string, message: string, public status = 400) {
    super(message);
  }
}

/** Проверяет размер и возвращает суммы заказа: товар 0 ₽, итог = доставка. */
export function planSpinDeliveryOrder(prizeCode: string, size: string | null | undefined, shippingRub: number) {
  const prize = SPIN_DELIVERY_PRIZES[prizeCode];
  if (!prize) throw new SpinDeliveryError("not_deliverable", "Этот приз не отправляется почтой");
  let sizeSnapshot: string | null = null;
  if (prize.sizes) {
    if (!size || !prize.sizes.includes(size)) {
      throw new SpinDeliveryError("size_required", `Выбери размер: ${prize.sizes.join(", ")}`);
    }
    sizeSnapshot = size;
  }
  if (!Number.isInteger(shippingRub) || shippingRub <= 0) {
    throw new SpinDeliveryError("cdek_calc_failed", "Не удалось рассчитать доставку", 502);
  }
  return {
    title: prize.title,
    sizeSnapshot,
    subtotalRub: 0,
    discountRub: 0,
    shippingPriceRub: shippingRub,
    totalRub: shippingRub,
  };
}
