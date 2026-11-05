/**
 * Часы сезона HellSpin.
 *
 * Сайт был закрыт 11 октября — 5 ноября 2026. Чтобы стрики, календарь
 * активности и фазы jackpot не сгорели, время сезона «заморожено» на дни
 * простоя: сезон 2 (якорь 16 сентября, 45 дней) продолжается с того дня,
 * на котором сайт упал, а следующий сезон начнётся на DOWNTIME_MS позже.
 */

/** Начало сезона 2: 16 сентября 2026, 00:00 МСК. */
export const SEASON_ANCHOR_UTC = Date.UTC(2026, 8, 15, 21, 0, 0);
/** Длина сезона в днях. */
export const SEASON_DAYS = 45;

/** Простой сайта: 11 октября 2026, 00:00 МСК (по нему фильтруем Pass). */
export const DOWNTIME_START_MS = Date.UTC(2026, 9, 10, 21, 0, 0);
/** Продление на дни простоя: 11 октября — 5 ноября 2026 = 25 дней. */
export const DOWNTIME_DAYS = 25;
export const DOWNTIME_MS = DOWNTIME_DAYS * 86_400_000;

/** Конец сезона 2 по старому графику (31 октября 2026, 00:00 МСК). */
const SEASON2_END_UTC = SEASON_ANCHOR_UTC + SEASON_DAYS * 86_400_000;

/**
 * Сдвиг «замороженного» времени: пока идёт продлённый сезон 2 (до 25 ноября
 * 2026), события сезона считаются по времени, отстающему на дни простоя.
 * После окончания продления сдвиг снова 0 — следующие сезоны по обычному графику.
 */
export function seasonTimeShiftMs(now = Date.now()): number {
  return now < SEASON2_END_UTC + DOWNTIME_MS ? DOWNTIME_MS : 0;
}

/** Индекс текущего сезона (0 — первый) по «замороженному» времени. */
export function seasonIndex(now = Date.now()): number {
  const diff = now - seasonTimeShiftMs(now) - SEASON_ANCHOR_UTC;
  return diff <= 0 ? 0 : Math.floor(diff / (SEASON_DAYS * 86_400_000));
}

/** Границы сезона: текущий (продлённый) сезон получает конец со сдвигом простоя. */
export function seasonBounds(now = Date.now()): { startsAt: Date; endsAt: Date } {
  const shift = seasonTimeShiftMs(now);
  const idx = seasonIndex(now);
  const startsAt = new Date(SEASON_ANCHOR_UTC + idx * SEASON_DAYS * 86_400_000);
  const endsAt = new Date(startsAt.getTime() + SEASON_DAYS * 86_400_000 + shift);
  return { startsAt, endsAt };
}
