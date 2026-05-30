/**
 * Редирект на платёжную форму.
 *
 * История вопроса: пробовали через `window.open("about:blank")` синхронно
 * в onClick, чтобы потом подставить URL — на мобильных браузерах это
 * приводит к зависанию вкладки на about:blank (ссылка на popup теряется
 * при переключении табов, либо запись в popup.location блокируется).
 *
 * Правильное решение: `window.location.href = url` в текущем окне.
 * В отличие от `window.open`, это НЕ требует user gesture и работает
 * даже после await — на всех платформах (mobile browser, PWA, desktop).
 *
 * API сохранён (beginPaymentRedirect + handle.commit), чтобы не трогать
 * вызывающие компоненты.
 */

export type PaymentRedirectHandle = {
  commit: (url: string) => void;
  cancel: () => void;
};

export function beginPaymentRedirect(): PaymentRedirectHandle {
  return {
    commit: (url: string) => {
      if (typeof window === "undefined") return;
      window.location.href = url;
    },
    cancel: () => {},
  };
}

export function commitPaymentRedirect(paymentUrl: string) {
  if (typeof window === "undefined") return;
  window.location.href = paymentUrl;
}
