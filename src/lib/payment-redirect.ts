/**
 * Универсальный редирект на платёжную форму.
 * Используем window.location.href — он работает одинаково в desktop, mobile
 * браузерах и в PWA standalone. Никаких popup'ов и window.open — их режут
 * браузеры/PWA если между тапом и открытием был await.
 *
 * ВАЖНО: вызывать СИНХРОННО после получения paymentUrl, ДО любых setState/
 * clear()/invalidateQueries — иначе React успевает ре-рендериться и SPA-навигация
 * (TanStack Router) может перехватить управление раньше браузерной навигации.
 */
export function commitPaymentRedirect(paymentUrl: string) {
  if (typeof window === "undefined") return;
  // href надёжнее assign в PWA-контекстах (Android Trusted Web Activity / iOS standalone).
  window.location.href = paymentUrl;
}
