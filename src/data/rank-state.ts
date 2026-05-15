// Глобальное dev-состояние ранга и прогресса XP.
// Используется и плашкой профиля в шапке, и дашбордом /club/me, и свитчером.

import { useSyncExternalStore } from "react";
import { RANKS, XP_PER_RANK, type RankMeta } from "./ranks";

type State = {
  rankIndex: number; // 0..RANKS.length - 1
  xpPct: number;     // 0..100, прогресс ВНУТРИ текущего ранга
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
  next: RankMeta | null;
  xp: number;
  xpMax: number;
  xpPct: number;
  isMax: boolean;
} {
  const { rankIndex, xpPct } = useRankState();
  const rank = RANKS[rankIndex];
  const next = RANKS[rankIndex + 1] ?? null;
  const isMax = !!rank.isMax;
  const xpMax = XP_PER_RANK;
  // На максимуме — всегда полный бар.
  const effectivePct = isMax ? 100 : xpPct;
  const xp = Math.round((effectivePct / 100) * xpMax);
  return { rank, next, xp, xpMax, xpPct: effectivePct, isMax };
}
