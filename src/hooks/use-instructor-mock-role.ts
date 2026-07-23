// Временный мок-переключатель роли «инструктор». Пока бэк не отдаёт роль
// `instructor`, храним выбор в localStorage — чтобы можно было зайти под
// конкретным инструктором и посмотреть новый интерфейс (Школа вместо Гаража
// в таб-баре + список чатов с учениками).

import { useSyncExternalStore } from "react";

const KEY = "hh_mock_instructor";
const listeners = new Set<() => void>();

function read(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

let current: string | null = read();

function subscribe(fn: () => void) {
  listeners.add(fn);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      current = read();
      listeners.forEach((f) => f());
    }
  };
  if (typeof window !== "undefined") window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(fn);
    if (typeof window !== "undefined") window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot() {
  return current;
}

export function setMockInstructorRole(slug: string | null) {
  current = slug;
  try {
    if (slug) localStorage.setItem(KEY, slug);
    else localStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
  listeners.forEach((fn) => fn());
}

export function useMockInstructorRole(): string | null {
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}
