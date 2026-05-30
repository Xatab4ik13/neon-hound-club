/**
 * Оплата из iOS/Android PWA standalone-окна.
 *
 * Стратегия: top-level navigation на банк через window.location.href.
 * Это единственный 100% надёжный способ в standalone PWA на iOS —
 * popup'ы блокируются, target="_blank" режется, а top-level navigation
 * на cross-origin URL iOS открывает в Safari.
 *
 * Бэк по заголовку X-PWA: 1 отдаёт JSON {paymentUrl} вместо 303-редиректа.
 */

import { BACKEND_URL } from "@/lib/api";
import { hhToast } from "@/lib/hh-toast";

const PAY_URL = `${BACKEND_URL}/api/v1/payments/redirect`;

/**
 * Вызывается из обработчика клика. Фетчит платёжный URL, затем делает
 * top-level redirect — iOS откроет банк в Safari.
 */
export function payInPwa(fields: Record<string, string>): void {
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(fields)) body.set(k, v);

  fetch(PAY_URL, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      "X-PWA": "1",
    },
    body: body.toString(),
  })
    .then(async (res) => {
      const data = (await res.json().catch(() => ({}))) as {
        paymentUrl?: string;
        message?: string;
        error?: string;
      };
      if (res.ok && data.paymentUrl) {
        window.location.href = data.paymentUrl;
        return;
      }
      hhToast.error("Ошибка оплаты", {
        meta: data.message ?? data.error ?? `HTTP ${res.status}`,
        duration: 12000,
      });
    })
    .catch((err) => {
      hhToast.error("Ошибка оплаты", {
        meta: err instanceof Error ? err.message : "Сеть недоступна",
        duration: 12000,
      });
    });
}
