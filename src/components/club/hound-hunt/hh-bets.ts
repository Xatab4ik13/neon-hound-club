// Ставки и итоги охоты HELL HUNT.
//
// Ставки живут на бекенде: POST /api/v1/hunt/bet списывает билеты и пишет
// заявку, GET /api/v1/hunt/current отдаёт мою ставку. localStorage остаётся
// кешем для мгновенного рендера и оффлайна. Итоги шоу (results) — локальные,
// они только повторяют то, что уже решил бек.

import { useCallback, useEffect, useState } from "react";
import { fetchHuntState, postHuntBet } from "@/lib/hunt-api";


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

/** Текущая ставка юзера в этой охоте (кеш; истина — бек). */
export function getMyBet(hunt: HuntKey, ticketStep: number): MyBet {
  const tickets = readJson<BetsMap>(BETS_KEY, {})[hunt] ?? 0;
  return { tickets, capsules: Math.floor(tickets / Math.max(1, ticketStep)) };
}

function cacheBet(hunt: HuntKey, tickets: number) {
  const map = readJson<BetsMap>(BETS_KEY, {});
  map[hunt] = tickets;
  writeJson(BETS_KEY, map);
}

/**
 * Поставить билеты. Списание на бекенде (леджер билетов), ставки суммируются,
 * отмены нет. Локально кешируем ответ, чтобы UI не мигал.
 */
export async function placeBet(hunt: HuntKey, amount: number, ticketStep: number): Promise<MyBet> {
  const res = await postHuntBet(Math.max(0, Math.floor(amount)));
  cacheBet(hunt, res.tickets);
  return { tickets: res.tickets, capsules: res.capsules ?? Math.floor(res.tickets / Math.max(1, ticketStep)) };
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
    let alive = true;
    const sync = () => setBet(getMyBet(hunt, ticketStep));
    sync();
    window.addEventListener(EVT, sync);
    window.addEventListener("storage", sync);

    // Истина по ставке — бек: подтягиваем её и обновляем кеш.
    void fetchHuntState()
      .then((state) => {
        if (!alive || !state.me) return;
        cacheBet(hunt, state.me.tickets);
        setBet({ tickets: state.me.tickets, capsules: state.me.capsules });
      })
      .catch(() => {
        /* оффлайн/не авторизован — остаётся кеш */
      });

    return () => {
      alive = false;
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
