/**
 * Оплата из iOS/Android PWA standalone-окна.
 *
 * Почему так: PWA в standalone-режиме не пускает cross-origin top-level
 * navigation внутрь своего окна (особенно iOS) и режет form submit с
 * target="_blank" как popup. Единственный надёжный способ открыть банк —
 * window.open('', '_blank') СИНХРОННО из click/submit handler'а (пока ещё
 * жив user gesture), а потом, после fetch, выставить ему location.
 *
 * Бэк по заголовку X-PWA: 1 отдаёт JSON {paymentUrl} вместо 303.
 */

import { BACKEND_URL } from "@/lib/api";
import { hhToast } from "@/lib/hh-toast";

const PAY_URL = `${BACKEND_URL}/api/v1/payments/redirect`;

/**
 * Вызывается ВНУТРИ обработчика клика/submit'а, синхронно.
 * Сначала открывает пустое окно (пока user gesture активен), потом
 * фетчит платёжный URL и перебрасывает попап на банк.
 */
export function payInPwa(fields: Record<string, string>): void {
  // Открываем попап СРАЗУ, до любых await — иначе iOS заблокирует.
  const popup = window.open("", "_blank");

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
        if (popup && !popup.closed) {
          popup.location.href = data.paymentUrl;
        } else {
          // Попап заблокирован — пробуем top-level navigation как fallback.
          window.location.href = data.paymentUrl;
        }
        return;
      }
      if (popup && !popup.closed) popup.close();
      hhToast.error("Ошибка оплаты", {
        meta: data.message ?? data.error ?? `HTTP ${res.status}`,
        duration: 12000,
      });
    })
    .catch((err) => {
      if (popup && !popup.closed) popup.close();
      hhToast.error("Ошибка оплаты", {
        meta: err instanceof Error ? err.message : "Сеть недоступна",
        duration: 12000,
      });
    });
}
