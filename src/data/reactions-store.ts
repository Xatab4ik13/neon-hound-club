// Локальные реакции на пост (🔥 💀 🤘 🤝 🫡).
// Хранятся в localStorage — без бэка. Один юзер = одна реакция на пост.
// Если меняет реакцию: старая снимается, новая добавляется.
// Если тапает ту же что уже стоит — снимает.
//
// Когда бек подъедет — заменим getSnapshot/mutate на API, контракт хука сохраним.

import { useSyncExternalStore } from "react";
import type { Reaction } from "@/components/club/LikeButton";

const STORAGE_KEY = "club:reactions:v1";

type ReactionState = {
  /** Какую реакцию поставил юзер (или null если ничего). */
  mine: Reaction | null;
  /** Счётчики по типам. Включают свою реакцию. */
  counts: Partial<Record<Reaction, number>>;
};

type StoreShape = Record<string, ReactionState>;

const listeners = new Set<() => void>();
let DATA: StoreShape = load();

function load(): StoreShape {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoreShape) : {};
  } catch {
    return {};
  }
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DATA));
  } catch {
    /* quota — игнор */
  }
}

function emit() {
  for (const l of listeners) l();
}

const EMPTY: ReactionState = { mine: null, counts: {} };

function getState(postId: string): ReactionState {
  return DATA[postId] ?? EMPTY;
}

function setReaction(postId: string, next: Reaction | null) {
  const prev = getState(postId);
  if (prev.mine === next) return;
  const counts = { ...prev.counts };
  if (prev.mine) counts[prev.mine] = Math.max(0, (counts[prev.mine] ?? 1) - 1);
  if (next) counts[next] = (counts[next] ?? 0) + 1;
  // чистим нули
  for (const k of Object.keys(counts) as Reaction[]) {
    if ((counts[k] ?? 0) <= 0) delete counts[k];
  }
  const nextState: ReactionState = { mine: next, counts };
  if (next === null && Object.keys(counts).length === 0) {
    delete DATA[postId];
  } else {
    DATA = { ...DATA, [postId]: nextState };
  }
  persist();
  emit();
}

export const reactionsStore = {
  subscribe(l: () => void) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
  getSnapshot() {
    return DATA;
  },
  /** Тап по реакции: ставит её или снимает если уже стоит. */
  toggle(postId: string, r: Reaction) {
    const cur = getState(postId).mine;
    setReaction(postId, cur === r ? null : r);
  },
  /** Принудительно установить (long-press из LikeButton всегда ставит выбранную). */
  set(postId: string, r: Reaction) {
    setReaction(postId, r);
  },
  clear(postId: string) {
    setReaction(postId, null);
  },
};

export function useReactions(postId: string): ReactionState {
  useSyncExternalStore(reactionsStore.subscribe, reactionsStore.getSnapshot, reactionsStore.getSnapshot);
  return getState(postId);
}
