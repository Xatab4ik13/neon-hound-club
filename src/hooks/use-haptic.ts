// Лёгкие тактильные сигналы для PWA. Работает на Android (Web Vibration API),
// на iOS — пока в браузере отключено, но добавит ощущение «как нативное» там,
// где поддерживается. Никогда не вибрирует, если пользователь не разрешал.
//
// Используем минимальные длительности — это не «удар», а «щелчок»,
// чтобы не раздражать. light = 8ms, selection = 6ms, success = [10, 20, 10].

export type HapticPattern = "light" | "selection" | "success" | "warning";

// Важно: Android Chrome игнорирует импульсы короче ~10-15ms — они физически
// не успевают раскрутить моторчик. Поэтому минимум 15ms.
const PATTERNS: Record<HapticPattern, number | number[]> = {
  light: 18,
  selection: 15,
  success: [22, 40, 30],
  warning: [20, 50, 20, 50, 20],
};

export function haptic(pattern: HapticPattern = "light") {
  if (typeof window === "undefined") return;
  // Vibration API: Android Chrome — да, iOS — нет. Будет no-op, ничего не ломает.
  const nav = window.navigator as Navigator & { vibrate?: (p: number | number[]) => boolean };
  if (typeof nav.vibrate !== "function") return;
  try {
    nav.vibrate(PATTERNS[pattern]);
  } catch {
    // ignore
  }
}

export function useHaptic() {
  return haptic;
}
