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
  | "legend-holo-prism"
  | "vip-platinum"
  | "vip-holo-card"
  | "vip-pink-chrome";

export type RankId =
  | "rookie"
  | "pit-crew"
  | "road-captain"
  | "alpha-hound"
  | "hell-legend"
  | "vip";

export type RankMeta = {
  id: RankId;
  label: string;     // длинное имя для дашборда: "ROAD CAPTAIN"
  short: string;     // короткое для лестницы: "CAPTAIN"
  plaqueBg: PlaqueBg;
  /** Для рангов с несколькими равноправными визуалами (VIP). Первый = дефолт. */
  plaqueVariants?: PlaqueBg[];
  /** основной цвет акцента ранга (XP-бар, активный шаг лестницы) */
  accent: string;
  /** мягкий цвет (пройденные шаги, glow) */
  accentSoft: string;
  /** цвет текста поверх accent (для активного шага лестницы) */
  onAccent: string;
  isMax?: boolean;
  /** платный ранг — рисуем замок/цену вместо XP-бара */
  isPaid?: boolean;
  /** плейсхолдер цены, рисуется на плашке вместо XP */
  priceLabel?: string;
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
  {
    id: "vip",
    label: "VIP",
    short: "VIP",
    plaqueBg: "vip-platinum",
    accent: "#e8e4d6",
    accentSoft: "rgba(232, 228, 214, 0.5)",
    onAccent: "#0a0a0a",
    isMax: true,
    isPaid: true,
    priceLabel: "от 4 990 ₽",
  },
];

export const XP_PER_RANK = 2000;
