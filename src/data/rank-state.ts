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
  /** Пользовательский выбор фона плашки. null = дефолт ранга. */
  customPlaqueBg: PlaqueBg | null;
};

let state: State = { rankIndex: 1, xpPct: 62, customPlaqueBg: null };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function setRankIndex(i: number) {
  const next = Math.max(0, Math.min(RANKS.length - 1, i));
  if (next === state.rankIndex) return;
  // при смене ранга сбрасываем кастомный фон, если он больше не доступен
  const allowed = getAvailablePlaqueBgs(next);
  const keep = state.customPlaqueBg && allowed.includes(state.customPlaqueBg)
    ? state.customPlaqueBg
    : null;
  state = { ...state, rankIndex: next, customPlaqueBg: keep };
  emit();
}

export function setXpPct(p: number) {
  const next = Math.max(0, Math.min(100, Math.round(p)));
  if (next === state.xpPct) return;
  state = { ...state, xpPct: next };
  emit();
}

export function setCustomPlaqueBg(bg: PlaqueBg | null) {
  if (state.customPlaqueBg === bg) return;
  state = { ...state, customPlaqueBg: bg };
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

// ─── Доступные фоны по рангу ────────────────────────────────────────────
// Чем выше ранг, тем больше визуалов разблокировано. Hell Legend (idx 4)
// открывает все варианты.

const BGS_BY_TIER: PlaqueBg[][] = [
  ["rider"], // 0 rookie
  ["pit-diamond", "pit-carbon", "pit-hazard"], // 1 pit-crew
  ["captain-speedlines", "captain-sweep", "captain-halftone"], // 2 road-captain
  ["alpha-aurora", "alpha-grid", "alpha-claw"], // 3 alpha-hound
  [
    "legend-inferno",
    "legend-storm",
    "legend-chrome",
    "legend-molten-gold",
    "legend-cyber-rune",
    "legend-holo-prism",
  ], // 4 hell-legend
];


export function getAvailablePlaqueBgs(rankIndex: number): PlaqueBg[] {
  const list: PlaqueBg[] = [];
  for (let i = 0; i <= Math.min(rankIndex, BGS_BY_TIER.length - 1); i++) {
    list.push(...BGS_BY_TIER[i]);
  }
  return list;
}

/** К какому рангу принадлежит фон (для подписи «разблокирован на …»). */
export function getPlaqueBgRankIndex(bg: PlaqueBg): number {
  for (let i = 0; i < BGS_BY_TIER.length; i++) {
    if (BGS_BY_TIER[i].includes(bg)) return i;
  }
  return 0;
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
  const { rankIndex, xpPct, customPlaqueBg } = useRankState();
  const rank = RANKS[rankIndex];
  const next = RANKS[rankIndex + 1] ?? null;
  const isMax = !!rank.isMax || !next;

  const xpMax = getRankSpan(rankIndex);
  const effectivePct = isMax ? 100 : xpPct;
  const xp = Math.round((effectivePct / 100) * xpMax);
  const xpAbs = XP_THRESHOLDS[rankIndex] + xp;
  const toNext = isMax ? 0 : Math.max(0, xpMax - xp);
  const allowed = getAvailablePlaqueBgs(rankIndex);
  const effectiveBg: PlaqueBg =
    customPlaqueBg && allowed.includes(customPlaqueBg) ? customPlaqueBg : rank.plaqueBg;
  return {
    rank,
    plaqueBg: effectiveBg,
    next,
    xp,
    xpMax,
    xpAbs,
    xpPct: effectivePct,
    toNext,
    isMax,
  };
}
