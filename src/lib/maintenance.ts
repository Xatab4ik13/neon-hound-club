/**
 * Режим обслуживания: пока старая база не восстановлена, hhr.pro показывает
 * заглушку со ссылкой на бота, работают только админка и страница Telegram.
 * Выключить — поставить false (и MAINTENANCE_MODE=0 на сервере).
 */
export const MAINTENANCE_MODE = true;
export const TG_BOT_URL = "https://t.me/hhr_probot";

const OPEN_PATHS = ["/admin", "/tg", "/legal"];

export function isTgHost(host: string) {
  return host.toLowerCase().startsWith("tg.");
}

/** Заглушка только на боевых доменах — превью и localhost работают как обычно. */
export function shouldShowMaintenance(host: string, path: string) {
  if (!MAINTENANCE_MODE) return false;
  const h = host.toLowerCase();
  const prod = h === "hhr.pro" || h.endsWith(".hhr.pro");
  if (!prod || isTgHost(h)) return false;
  return !OPEN_PATHS.some((p) => path === p || path.startsWith(`${p}/`));
}
