// Единый расчёт фазы охоты HELL HUNT. Читают лендинг, шоу и роут — чтобы
// нигде не было «своей» логики времени. Позже фаза приедет с бекенда, но
// форма данных останется той же: старт + окна.

import { useEffect, useState } from "react";

/** За сколько минут до старта закрывается приём ставок (барабан заморожен). */
export const HUNT_LOCK_MS = 10 * 60 * 1000;

/** Сколько идёт само шоу от момента старта. */
export const HUNT_SHOW_MS = 30 * 60 * 1000;

/** Сколько после старта доступен реплей и итоги. */
export const HUNT_REPLAY_MS = 24 * 60 * 60 * 1000;

export type HuntPhase =
  /** приём ставок открыт */
  | "betting"
  /** последние минуты перед стартом: состав барабана зафиксирован */
  | "locked"
  /** шоу идёт прямо сейчас */
  | "live"
  /** сутки после шоу: итоги + можно проиграть шоу заново */
  | "replay"
  /** охота закрыта, ждём новую дату из админки */
  | "idle";

export type HuntPhaseState = {
  phase: HuntPhase;
  /** Сколько осталось до следующего перехода, мс. */
  ms: number;
  /** Абсолютное время старта, мс. */
  startsAtMs: number;
};

export function computeHuntPhase(startsAt: string, now = Date.now()): HuntPhaseState {
  const target = new Date(startsAt).getTime();
  if (Number.isNaN(target)) return { phase: "betting", ms: 0, startsAtMs: 0 };

  const lockAt = target - HUNT_LOCK_MS;
  const showEnd = target + HUNT_SHOW_MS;
  const replayEnd = target + HUNT_REPLAY_MS;

  if (now < lockAt) return { phase: "betting", ms: lockAt - now, startsAtMs: target };
  if (now < target) return { phase: "locked", ms: target - now, startsAtMs: target };
  if (now < showEnd) return { phase: "live", ms: showEnd - now, startsAtMs: target };
  if (now < replayEnd) return { phase: "replay", ms: replayEnd - now, startsAtMs: target };
  return { phase: "idle", ms: now - replayEnd, startsAtMs: target };
}

/** Тикающая фаза: пересчёт раз в секунду, переходы происходят сами. */
export function useHuntPhase(startsAt: string): HuntPhaseState {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return computeHuntPhase(startsAt, now);
}

/** Сколько осталось именно до старта охоты (для таймера). */
export function msUntilStart(startsAt: string, now = Date.now()) {
  const target = new Date(startsAt).getTime();
  return Number.isNaN(target) ? 0 : Math.max(0, target - now);
}
