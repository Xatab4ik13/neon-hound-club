// Глобальное dev-состояние ранга и прогресса XP.
// Прогресс хранится как pct (0..100) ВНУТРИ текущего ранга — UI-ориентировано.
// Абсолютный XP можно посчитать через XP_THRESHOLDS + getRankSpan.

import { useSyncExternalStore } from "react";
import {
  RANKS,
  XP_THRESHOLDS,
  getRankSpan,
  type PlaqueBg,
  type RankMeta,
} from "./ranks";

type State = {
  rankIndex: number;
  xpPct: number;
};

let state: State = { rankIndex: 1, xpPct: 62 };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function setRankIndex(i: number) {
  const next = Math.max(0, Math.min(RANKS.length - 1, i));
  if (next === state.rankIndex) return;
  state = { ...state, rankIndex: next };
  emit();
}

export function setXpPct(p: number) {
  const next = Math.max(0, Math.min(100, Math.round(p)));
  if (next === state.xpPct) return;
  state = { ...state, xpPct: next };
  emit();
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

const getSnapshot = () => state;

export function useRankState(): State {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useCurrentRank(): {
  rank: RankMeta;
  plaqueBg: PlaqueBg;
  next: RankMeta | null;
  xp: number;       // XP внутри текущего ранга
  xpMax: number;    // ширина текущего ранга
  xpAbs: number;    // абсолютный XP с учётом порогов
  xpPct: number;
  toNext: number;   // сколько XP до следующего ранга
  isMax: boolean;
} {
  const { rankIndex, xpPct } = useRankState();
  const rank = RANKS[rankIndex];
  const nextCandidate = RANKS[rankIndex + 1] ?? null;
  // VIP — платный, в XP-цепочку не входит как «следующий»
  const next = nextCandidate && !nextCandidate.isPaid ? nextCandidate : null;
  const isMax = !!rank.isMax || !next;
  const xpMax = getRankSpan(rankIndex);
  const effectivePct = isMax ? 100 : xpPct;
  const xp = Math.round((effectivePct / 100) * xpMax);
  const xpAbs = XP_THRESHOLDS[rankIndex] + xp;
  const toNext = isMax ? 0 : Math.max(0, xpMax - xp);
  return {
    rank,
    plaqueBg: rank.plaqueBg,
    next,
    xp,
    xpMax,
    xpAbs,
    xpPct: effectivePct,
    toNext,
    isMax,
  };
}
