// Глобальное dev-состояние текущей подписки Hell Pass.
// Когда подключим бекенд — заменим источник, API хука не меняется.

import { useSyncExternalStore } from "react";
import { TIERS, type Tier } from "./hell-pass";

export type PassSlug = Tier["slug"];

type State = { tier: PassSlug | null };

let state: State = { tier: "gold" }; // демо-значение

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function setPassTier(slug: PassSlug | null) {
  if (state.tier === slug) return;
  state = { tier: slug };
  emit();
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const getSnapshot = () => state;

export function usePassState(): { tier: PassSlug | null; tierInfo: Tier | null } {
  const s = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const tierInfo = s.tier ? TIERS.find((t) => t.slug === s.tier) ?? null : null;
  return { tier: s.tier, tierInfo };
}
