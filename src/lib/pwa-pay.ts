/**
 * Запуск платежа. Две схемы:
 *  1. Браузер (включая мобильный Safari/Chrome не-PWA) — синхронный submit
 *     обычной HTML-формы POST в backend; backend отвечает 303 на банк.
 *     Это надёжный top-level navigation без JS-await.
 *  2. PWA standalone — backend возвращает JSON `{ paymentUrl }`, фронт
 *     навигирует на внутреннюю страницу `/pay/go?u=...&p=...`, где большая
 *     кнопка `<a href={paymentUrl}>` открывает оплату в системном Safari
 *     (единственный сценарий, который iOS PWA не зарежет).
 */

import { BACKEND_URL } from "@/lib/api";
import { submitPaymentRedirectForm } from "@/lib/payment-redirect";
import { isStandalonePWA } from "@/lib/is-pwa";

const PAY_URL = `${BACKEND_URL}/api/v1/payments/redirect`;

type PayResult = { ok: true } | { ok: false; message: string };

async function payViaPwa(fields: Record<string, string>): Promise<PayResult> {
  let res: Response;
  try {
    res = await fetch(PAY_URL, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-PWA": "1",
      },
      body: JSON.stringify(fields),
    });
  } catch {
    return { ok: false, message: "Нет сети. Проверь интернет." };
  }
  let data: { paymentUrl?: string; paymentId?: string; message?: string } = {};
  try {
    data = (await res.json()) as typeof data;
  } catch {
    /* ignore */
  }
  if (!res.ok || !data.paymentUrl) {
    return { ok: false, message: data.message || "Не удалось открыть оплату" };
  }
  const u = encodeURIComponent(data.paymentUrl);
  const p = data.paymentId ? `&p=${encodeURIComponent(data.paymentId)}` : "";
  window.location.assign(`/pay/go?u=${u}${p}`);
  return { ok: true };
}

/** Универсальный старт оплаты. В PWA → GO-страница; иначе → form-POST. */
export function startPayment(fields: Record<string, string>): Promise<PayResult> {
  if (isStandalonePWA()) return payViaPwa(fields);
  // Браузер — синхронный сабмит. Возвращаем сразу, юзер уже уехал на банк.
  submitPaymentRedirectForm(PAY_URL, fields);
  return Promise.resolve({ ok: true });
}

// ── обратная совместимость ────────────────────────────────────────────

/** @deprecated Используй startPayment. */
export function payInPwa(fields: Record<string, string>): void {
  void startPayment(fields);
}

/** Оплата уже созданного заказа. */
export function payExistingOrderInPwa(
  orderId: string,
  method: "card" | "sbp" = "card",
): Promise<PayResult> {
  return startPayment({ target: "order_existing", order_id: orderId, method });
}
