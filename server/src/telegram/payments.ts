import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { tgOrders, type TgOrder } from "../db/schema/tg.js";
import { createOrder, getAccount, mapRaifStatus, verifyPaymentCallback, RaifApiError } from "../lib/raif.js";
import { adminChatIds, escapeHtml, openAppButton, sendMessage, TG_WEBAPP_URL } from "./bot.js";

export async function createTgPayment(order: TgOrder): Promise<string> {
  const back = `${TG_WEBAPP_URL}/tg?paid=${order.id}`;
  const parts = [order.tickets ? "Открытка HELLHOUND" : "", (order.shirts as unknown[]).length ? "Футболка HELLHOUND" : ""].filter(Boolean);
  const r = await createOrder({
    method: "any",
    orderId: order.id,
    amountRub: order.totalRub,
    comment: `HELLHOUND: ${parts.join(" + ")}`.slice(0, 140),
    successUrl: back,
    failUrl: `${TG_WEBAPP_URL}/tg?failed=${order.id}`,
    extra: { refType: "tg_order", refId: order.id, phone: order.phone },
  });
  if (!r.payformUrl) throw new RaifApiError(502, "no_payform_url", "Райффайзен не вернул ссылку на оплату", r);
  await db.update(tgOrders).set({ providerPaymentId: r.id, paymentUrl: r.payformUrl, updatedAt: new Date() }).where(eq(tgOrders.id, order.id));
  return r.payformUrl;
}

/** Вебхук Райфа для заказов из Telegram. false — платёж не наш / подпись неверна. */
export async function handleTgRaifNotification(body: Record<string, unknown>, signature: string | undefined): Promise<boolean> {
  const data = (body.data ?? {}) as Record<string, unknown>;
  const pid = String(((data.order ?? {}) as Record<string, unknown>).id ?? "");
  if (!pid) return false;
  const [order] = await db.select().from(tgOrders).where(eq(tgOrders.providerPaymentId, pid)).limit(1);
  if (!order) return false;
  const acc = getAccount("any");
  if (!acc || !verifyPaymentCallback(body, signature, acc.secretKey)) return false;
  if (body.event && body.event !== "PAYMENT") return true;

  const amount = Math.round(Number(data.amount));
  const mapped = mapRaifStatus(((data.status ?? {}) as Record<string, unknown>).value as string | undefined);
  const next = amount !== order.totalRub ? "failed" : mapped === "confirmed" ? "paid" : mapped === "rejected" ? "failed" : order.status;
  if (order.status === "paid") return true; // идемпотентно

  await db.update(tgOrders)
    .set({ status: next, rawLastNotification: body, paidAt: next === "paid" ? new Date() : null, updatedAt: new Date() })
    .where(eq(tgOrders.id, order.id));
  if (next === "paid") await notifyPaid({ ...order, status: "paid" });
  return true;
}

function describe(o: TgOrder): string[] {
  const lines: string[] = [];
  if (o.tickets) lines.push(`🎟 ${o.tickets} бил. на розыгрыш Yamaha MT-07 — ${o.ticketsRub} ₽`);
  for (const s of o.shirts as { name: string; size: string; qty: number; price: number }[]) {
    lines.push(`👕 «${escapeHtml(s.name)}» ${s.size} × ${s.qty} — ${s.price * s.qty} ₽`);
  }
  if (o.shippingRub) lines.push(`🚚 Доставка СДЭК — ${o.shippingRub} ₽`);
  return lines;
}

async function notifyPaid(o: TgOrder) {
  const items = describe(o);
  if (o.telegramUserId) {
    const text = [
      "<b>Оплата прошла ✅</b>",
      "",
      ...items,
      `<b>Итого: ${o.totalRub} ₽</b>`,
      "",
      `Всё привязано к номеру ${o.phone}. Когда HHR заработает, билеты и заказ появятся в вашем аккаунте.`,
      o.cdekPvzAddress ? `Пункт выдачи: ${escapeHtml(o.cdekPvzAddress)}` : "",
      `Заказ #${o.id.slice(0, 8).toUpperCase()}`,
    ].filter((l) => l !== "").join("\n");
    await sendMessage(o.telegramUserId, text, openAppButton("Купить ещё")).catch((e) => console.error("[tg] buyer notify failed", e));
  }
  const who = [o.telegramName, o.telegramUsername ? `@${o.telegramUsername}` : "", o.phone].filter(Boolean).join(" · ");
  const adminText = [`💰 <b>Новая оплата ${o.totalRub} ₽</b>`, escapeHtml(who), ...items, o.recipientName ? `Получатель: ${escapeHtml(o.recipientName)}` : "", o.cdekPvzAddress ? `ПВЗ: ${escapeHtml(`${o.cdekCityName ?? ""}, ${o.cdekPvzAddress}`)}` : ""]
    .filter(Boolean).join("\n");
  for (const id of adminChatIds()) {
    await sendMessage(id, adminText).catch((e) => console.error("[tg] admin notify failed", e));
  }
}
