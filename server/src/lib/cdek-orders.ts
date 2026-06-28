/**
 * Создание и обновление накладной СДЭК для существующего shop.order.
 * Используется из админки:
 *   POST /api/v1/admin/shop/orders/:id/cdek/create   — создать накладную
 *   POST /api/v1/admin/shop/orders/:id/cdek/refresh  — подтянуть cdek_number + статус
 *
 * Идемпотентно: если у заказа уже есть cdek_uuid — повторно createOrder не зовём.
 */
import { eq, inArray } from "drizzle-orm";
import { db } from "../db/client.js";
import { orders, orderItems, products } from "../db/schema/shop.js";
import { cdek, CDEK_TARIFFS } from "./cdek.js";

export class CdekOrderError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export async function createCdekWaybillForOrder(orderId: string): Promise<{
  cdekUuid: string;
  cdekNumber: string | null;
}> {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) throw new CdekOrderError("order_not_found", "Заказ не найден", 404);
  if (order.cdekUuid) {
    // уже создана — просто вернём
    const info = await cdek.getOrder(order.cdekUuid).catch(() => null);
    return { cdekUuid: order.cdekUuid, cdekNumber: info?.cdekNumber ?? order.cdekTrack ?? null };
  }
  if (order.status === "pending_payment" || order.status === "cancelled" || order.status === "refunded") {
    throw new CdekOrderError("order_not_payable_state", "Накладная создаётся только для оплаченных заказов");
  }

  const shipping = (order.shipping ?? {}) as {
    fio?: string;
    phone?: string;
    address?: string;
    cdekCityCode?: number | null;
    cdekPvzCode?: string | null;
    mode?: "pvz" | "courier" | "none";
  };
  if (!shipping.fio || !shipping.phone) {
    throw new CdekOrderError("recipient_required", "У заказа не хватает ФИО или телефона получателя");
  }
  const mode = shipping.mode ?? "pvz";
  if (mode === "none") {
    throw new CdekOrderError("no_shipping", "Заказ без доставки — накладная не нужна");
  }
  const tariffCode = order.cdekTariffCode ?? CDEK_TARIFFS[mode === "pvz" ? "pvz" : "courier"];

  const items = await db
    .select({ id: orderItems.id, productId: orderItems.productId, title: orderItems.titleSnapshot, price: orderItems.priceRubSnapshot, qty: orderItems.qty })
    .from(orderItems)
    .where(eq(orderItems.orderId, order.id));
  if (items.length === 0) throw new CdekOrderError("no_items", "В заказе нет позиций");

  const productIds = items.map((i) => i.productId).filter((x): x is string => !!x);
  const dbProducts = productIds.length
    ? await db
        .select({
          id: products.id,
          weightG: products.weightG,
          lengthCm: products.lengthCm,
          widthCm: products.widthCm,
          heightCm: products.heightCm,
          kind: products.kind,
        })
        .from(products)
        .where(inArray(products.id, productIds))
    : [];
  const byId = new Map(dbProducts.map((p) => [p.id, p]));

  const packages: Array<{ number: string; weightG: number; lengthCm: number; widthCm: number; heightCm: number }> = [];
  const cdekItems: Array<{ name: string; wareKey: string; cost: number; weight: number; amount: number }> = [];
  for (const it of items) {
    const p = it.productId ? byId.get(it.productId) : undefined;
    if (!p || p.kind === "virtual" || p.kind === "digital") continue;
    if (!p.weightG || !p.lengthCm || !p.widthCm || !p.heightCm) {
      throw new CdekOrderError(
        "product_missing_dimensions",
        `У товара «${it.title}» нет веса/габаритов — заполни в карточке товара`,
        409,
      );
    }
    cdekItems.push({
      name: it.title,
      wareKey: it.productId!,
      cost: it.price,
      weight: p.weightG,
      amount: it.qty,
    });
    for (let k = 0; k < it.qty; k++) {
      packages.push({
        number: `${it.id}-${k + 1}`,
        weightG: p.weightG,
        lengthCm: p.lengthCm,
        widthCm: p.widthCm,
        heightCm: p.heightCm,
      });
    }
  }

  if (packages.length === 0) {
    throw new CdekOrderError("no_physical_items", "В заказе только цифровые/виртуальные товары");
  }

  const created = await cdek.createOrder({
    tariffCode,
    externalNumber: order.id,
    recipient: { name: shipping.fio, phone: shipping.phone },
    toPvzCode: mode === "pvz" ? shipping.cdekPvzCode ?? undefined : undefined,
    toLocation:
      mode === "courier" && shipping.cdekCityCode
        ? { cityCode: shipping.cdekCityCode, address: shipping.address ?? "" }
        : undefined,
    items: cdekItems,
    packages,
  });

  // Пробуем сразу подтянуть cdek_number (часто доступен не сразу, тогда null).
  const info = await cdek.getOrder(created.uuid).catch(() => null);

  await db
    .update(orders)
    .set({
      cdekUuid: created.uuid,
      cdekTrack: info?.cdekNumber ?? null,
      cdekTariffCode: tariffCode,
      cdekStatusCode: info?.statusCode ?? "CREATED",
      cdekStatusName: info?.statusName ?? "Создана",
      cdekStatusAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(orders.id, order.id));

  return { cdekUuid: created.uuid, cdekNumber: info?.cdekNumber ?? null };
}

export async function refreshCdekStatusForOrder(orderId: string): Promise<{
  cdekUuid: string;
  cdekNumber: string | null;
  statusCode: string | null;
  statusName: string | null;
}> {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) throw new CdekOrderError("order_not_found", "Заказ не найден", 404);
  if (!order.cdekUuid) throw new CdekOrderError("no_waybill", "У заказа ещё нет накладной СДЭК");

  const info = await cdek.getOrder(order.cdekUuid);
  await db
    .update(orders)
    .set({
      cdekTrack: info.cdekNumber ?? order.cdekTrack,
      cdekStatusCode: info.statusCode,
      cdekStatusName: info.statusName,
      cdekStatusAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(orders.id, order.id));
  return { cdekUuid: order.cdekUuid, ...info };
}
