// Лестница рангов клуба HELLHOUND.
// Источник правды: всё, что зависит от ранга (плашка профиля, цвет XP-бара,
// фон дашборда), читает данные отсюда.

export type PlaqueBg =
  | "rider"
  | "pit-diamond"
  | "pit-carbon"
  | "pit-hazard"
  | "captain-speedlines"
  | "captain-sweep"
  | "captain-halftone"
  | "alpha-aurora"
  | "alpha-grid"
  | "alpha-claw"
  | "legend-inferno"
  | "legend-storm"
  | "legend-chrome"
  | "legend-molten-gold"
  | "legend-cyber-rune"
  | "legend-holo-prism";

export type RankId =
  | "rookie"
  | "pit-crew"
  | "road-captain"
  | "alpha-hound"
  | "hell-legend";


export type RankMeta = {
  id: RankId;
  label: string;     // длинное имя для дашборда: "ROAD CAPTAIN"
  short: string;     // короткое для лестницы: "CAPTAIN"
  plaqueBg: PlaqueBg;
  /** Для рангов с несколькими равноправными визуалами. Первый = дефолт. */
  plaqueVariants?: PlaqueBg[];
  /** основной цвет акцента ранга (XP-бар, активный шаг лестницы) */
  accent: string;
  /** мягкий цвет (пройденные шаги, glow) */
  accentSoft: string;
  /** цвет текста поверх accent (для активного шага лестницы) */
  onAccent: string;
  isMax?: boolean;
};


export const RANKS: RankMeta[] = [
  {
    id: "rookie",
    label: "ROOKIE",
    short: "ROOKIE",
    plaqueBg: "rider",
    accent: "var(--primary)",
    accentSoft: "color-mix(in oklab, var(--primary) 35%, transparent)",
    onAccent: "#0a0a0a",
  },
  {
    id: "pit-crew",
    label: "PIT CREW",
    short: "PIT",
    plaqueBg: "pit-diamond",
    accent: "#b8a48a",
    accentSoft: "rgba(184, 164, 138, 0.35)",
    onAccent: "#0a0a0a",
  },
  {
    id: "road-captain",
    label: "ROAD CAPTAIN",
    short: "CAPTAIN",
    plaqueBg: "captain-speedlines",
    accent: "#d4d0c4",
    accentSoft: "rgba(212, 208, 196, 0.4)",
    onAccent: "#0a0a0a",
  },
  {
    id: "alpha-hound",
    label: "ALPHA HOUND",
    short: "ALPHA",
    plaqueBg: "alpha-aurora",
    accent: "#b48dff",
    accentSoft: "rgba(180, 141, 255, 0.4)",
    onAccent: "#0a0a0a",
  },
  {
    id: "hell-legend",
    label: "HELL LEGEND",
    short: "LEGEND",
    plaqueBg: "legend-molten-gold",
    accent: "#ffb648",
    accentSoft: "rgba(255, 182, 72, 0.45)",
    onAccent: "#1a1000",
  },
];


/**
 * Пороговые значения XP для каждого ранга по индексу из RANKS.
 * Кривая растущая (~2.5–3×): Pit Crew — быстро, Hell Legend — статус 10–14 мес.
 */
export const XP_THRESHOLDS: number[] = [
  0,       // rookie
  500,     // pit-crew
  2_000,   // road-captain
  6_000,   // alpha-hound
  15_000,  // hell-legend
];

/** Индекс ранга по абсолютному XP. */
export function getRankIndexByXp(xp: number): number {
  let idx = 0;
  for (let i = 0; i < RANKS.length; i++) {
    if (xp >= XP_THRESHOLDS[i]) idx = i;
  }
  return idx;
}

/**
 * Прогресс внутри текущего ранга:
 *   pct  — 0..100 для XP-бара
 *   inRank — сколько XP уже набрано внутри текущего ранга
 *   span  — сколько XP в текущем ранге всего (до следующего порога)
 *   toNext — сколько XP осталось до следующего ранга (0 если максимум)
 */
export function getRankProgress(xp: number): {
  rankIndex: number;
  pct: number;
  inRank: number;
  span: number;
  toNext: number;
  isMax: boolean;
} {
  const rankIndex = getRankIndexByXp(xp);
  const rank = RANKS[rankIndex];
  const nextIndex = rankIndex + 1;
  const next = RANKS[nextIndex];
  const isMax = !next || !!rank.isMax;

  if (isMax) {
    return { rankIndex, pct: 100, inRank: 0, span: 0, toNext: 0, isMax: true };
  }
  const base = XP_THRESHOLDS[rankIndex];
  const top = XP_THRESHOLDS[nextIndex];
  const span = top - base;
  const inRank = Math.max(0, xp - base);
  const pct = Math.max(0, Math.min(100, Math.round((inRank / span) * 100)));
  const toNext = Math.max(0, top - xp);
  return { rankIndex, pct, inRank, span, toNext, isMax: false };
}

/** Сколько XP даёт текущий ранг от своего начала до следующего порога. */
export function getRankSpan(rankIndex: number): number {
  const next = XP_THRESHOLDS[rankIndex + 1];
  if (next === undefined) return 0;
  return next - XP_THRESHOLDS[rankIndex];
}

/** @deprecated Плоское значение оставлено для обратной совместимости со старым кодом. */
export const XP_PER_RANK = 2000;
