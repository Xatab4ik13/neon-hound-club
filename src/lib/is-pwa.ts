/**
 * Возвращает true, если страница открыта как установленное PWA
 * (iOS standalone или Android/desktop display-mode: standalone).
 *
 * Нужно, чтобы при cross-origin навигации (на банк) сабмитить форму
 * с target="_blank" — иначе iOS PWA не пускает уход на чужой домен
 * внутри своего окна и возвращает на исходную страницу.
 */
export function isStandalonePWA(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.matchMedia?.("(display-mode: standalone)").matches) return true;
    // iOS Safari < 17 не поддерживает display-mode, но выставляет navigator.standalone
    const nav = window.navigator as Navigator & { standalone?: boolean };
    if (nav.standalone === true) return true;
  } catch {
    /* ignore */
  }
  return false;
}
