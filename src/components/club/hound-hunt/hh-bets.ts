// Ставки и итоги охоты HELL HUNT.
//
// ВАЖНО: сейчас это мок на localStorage, но интерфейс уже такой, каким он
// будет с бекендом: getMyBet / placeBet / readResults / saveResults. Когда
// появится API, внутри этих функций встанет apiFetch — компоненты не меняются.

import { useCallback, useEffect, useState } from "react";

const BETS_KEY = "hh.hunt.bets.v1";
const RESULTS_KEY = "hh.hunt.results.v1";
const EVT = "hh-hunt-bets";

/** Ключ конкретной охоты. Пока это её время старта, на бекенде будет huntId. */
export type HuntKey = string;

export type MyBet = {
  /** Сколько билетов уже поставлено (сумма всех ставок, отмены нет). */
  tickets: number;
  /** Сколько капсул это даёт при текущем пороге. */
  capsules: number;
};

export type HuntResult = {
  prizeId: string;
  entryId: string;
  nick: string;
  avatarUrl?: string;
};

type BetsMap = Record<HuntKey, number>;
type ResultsMap = Record<HuntKey, HuntResult[]>;

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new Event(EVT));
}

/** Текущая ставка юзера в этой охоте. */
export function getMyBet(hunt: HuntKey, ticketStep: number): MyBet {
  const tickets = readJson<BetsMap>(BETS_KEY, {})[hunt] ?? 0;
  return { tickets, capsules: Math.floor(tickets / Math.max(1, ticketStep)) };
}

/**
 * Поставить билеты. Ставки суммируются, списание сразу, отмены нет.
 * На бекенде здесь будет POST со списанием из леджера билетов.
 */
export async function placeBet(hunt: HuntKey, amount: number, ticketStep: number): Promise<MyBet> {
  const map = readJson<BetsMap>(BETS_KEY, {});
  const next = (map[hunt] ?? 0) + Math.max(0, Math.floor(amount));
  map[hunt] = next;
  writeJson(BETS_KEY, map);
  return { tickets: next, capsules: Math.floor(next / Math.max(1, ticketStep)) };
}

/** Итоги охоты: пишутся один раз в конце шоу, реплей показывает их же. */
export function readResults(hunt: HuntKey): HuntResult[] {
  return readJson<ResultsMap>(RESULTS_KEY, {})[hunt] ?? [];
}

export function saveResults(hunt: HuntKey, results: HuntResult[]) {
  const map = readJson<ResultsMap>(RESULTS_KEY, {});
  map[hunt] = results;
  writeJson(RESULTS_KEY, map);
}

/** Новая охота из админки: ставки и итоги обнуляются. */
export function resetHuntState() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(BETS_KEY);
  window.localStorage.removeItem(RESULTS_KEY);
  window.dispatchEvent(new Event(EVT));
}

export function useMyBet(hunt: HuntKey, ticketStep: number) {
  const [bet, setBet] = useState<MyBet>(() => getMyBet(hunt, ticketStep));

  useEffect(() => {
    const sync = () => setBet(getMyBet(hunt, ticketStep));
    sync();
    window.addEventListener(EVT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [hunt, ticketStep]);

  const bump = useCallback(
    async (amount: number) => {
      const next = await placeBet(hunt, amount, ticketStep);
      setBet(next);
      return next;
    },
    [hunt, ticketStep],
  );

  return { bet, placeBet: bump };
}
