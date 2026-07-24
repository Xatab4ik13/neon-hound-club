// Мок отмены подписки Hell Pass (без бэкенда).
// Хранит флаг "подписка отменена, автопродление выключено" в localStorage.
// Когда подключим бекенд — заменим реализацию, API хука не поменяется.

import { useSyncExternalStore } from "react";

const KEY = "hh_pass_cancelled_v1";

function read(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function setPassCancelled(v: boolean) {
  try {
    if (v) window.localStorage.setItem(KEY, "1");
    else window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  emit();
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function usePassCancelled(): boolean {
  return useSyncExternalStore(subscribe, read, () => false);
}
