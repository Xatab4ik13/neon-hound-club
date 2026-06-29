// Хелперы для разделения хостов hhr.pro ↔ club.hhr.pro.
// PWA-зона клуба живёт на club.hhr.pro, лендинг — на hhr.pro.

export const CLUB_HOST = "club.hhr.pro";
export const MAIN_HOST = "hhr.pro";

/** Текущий хост — club.hhr.pro (или его dev-двойник). */
export function isClubHost(): boolean {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname.toLowerCase();
  return h === CLUB_HOST || h.startsWith("club.");
}

/** Запущено как установленное PWA (standalone). */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  // iOS Safari
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((window.navigator as any).standalone === true) return true;
  // Android / desktop
  try {
    return window.matchMedia("(display-mode: standalone)").matches;
  } catch {
    return false;
  }
}

/** Абсолютный URL на клубном поддомене для текущего пути. */
export function clubUrl(pathAndQuery: string): string {
  const path = pathAndQuery.startsWith("/") ? pathAndQuery : `/${pathAndQuery}`;
  return `https://${CLUB_HOST}${path}`;
}
