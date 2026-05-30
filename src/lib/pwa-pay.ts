/**
 * Оплата из iOS/Android PWA standalone-окна.
 *
 * Самый надёжный сценарий — не fetch/XHR, а обычный POST формы в backend endpoint.
 * Тогда backend отвечает 303 redirect на банк, и браузер видит это как настоящий
 * top-level navigation текущего окна.
 */

import { BACKEND_URL } from "@/lib/api";
import { submitPaymentRedirectForm } from "@/lib/payment-redirect";

const PAY_URL = `${BACKEND_URL}/api/v1/payments/redirect`;

export function payInPwa(fields: Record<string, string>): void {
  submitPaymentRedirectForm(PAY_URL, fields);
}
