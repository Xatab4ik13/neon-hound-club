// Реакции на комментарии (🔥 💀 🤘 🤝 🫡). localStorage, ключ — commentId.
// Когда подъедет бек — заменим getSnapshot/mutate на API, контракт хука сохраним.

import { useSyncExternalStore } from "react";
import type { Reaction } from "@/components/club/LikeButton";

const STORAGE_KEY = "club:comment-reactions:v1";

type ReactionState = {
  mine: Reaction | null;
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
    /* quota */
  }
}

function emit() {
  for (const l of listeners) l();
}

const EMPTY: ReactionState = { mine: null, counts: {} };

function getState(commentId: string): ReactionState {
  return DATA[commentId] ?? EMPTY;
}

function setReaction(commentId: string, next: Reaction | null) {
  const prev = getState(commentId);
  if (prev.mine === next) return;
  const counts = { ...prev.counts };
  if (prev.mine) counts[prev.mine] = Math.max(0, (counts[prev.mine] ?? 1) - 1);
  if (next) counts[next] = (counts[next] ?? 0) + 1;
  for (const k of Object.keys(counts) as Reaction[]) {
    if ((counts[k] ?? 0) <= 0) delete counts[k];
  }
  const nextState: ReactionState = { mine: next, counts };
  if (next === null && Object.keys(counts).length === 0) {
    delete DATA[commentId];
  } else {
    DATA = { ...DATA, [commentId]: nextState };
  }
  persist();
  emit();
}

export const commentReactionsStore = {
  subscribe(l: () => void) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
  getSnapshot() {
    return DATA;
  },
  toggle(commentId: string, r: Reaction) {
    const cur = getState(commentId).mine;
    setReaction(commentId, cur === r ? null : r);
  },
  set(commentId: string, r: Reaction) {
    setReaction(commentId, r);
  },
  clear(commentId: string) {
    setReaction(commentId, null);
  },
};

export function useCommentReactions(commentId: string): ReactionState {
  useSyncExternalStore(
    commentReactionsStore.subscribe,
    commentReactionsStore.getSnapshot,
    commentReactionsStore.getSnapshot,
  );
  return getState(commentId);
}
