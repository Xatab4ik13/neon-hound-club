// Журнал байка: сервисные записи + поездки. Бэкенд (Fastify + Postgres).
// Привязка к bikeId. Внешний API совместим со старой версией (subscribe/getSnapshot).

import { useSyncExternalStore } from "react";
import { apiFetch } from "@/lib/api";

export type ServiceType = "oil" | "chain" | "tires" | "brakes" | "to" | "filter" | "other";

export const SERVICE_TYPE_LABEL: Record<ServiceType, string> = {
  oil: "Замена масла",
  chain: "Цепь / звёзды",
  tires: "Резина",
  brakes: "Тормоза",
  to: "ТО",
  filter: "Фильтры",
  other: "Другое",
};

/** Рекомендуемый интервал между обслуживаниями (км). 0 — без напоминания. */
export const SERVICE_INTERVAL_KM: Record<ServiceType, number> = {
  oil: 6000,
  chain: 10000,
  tires: 12000,
  brakes: 15000,
  to: 10000,
  filter: 12000,
  other: 0,
};

export type ServiceEntry = {
  id: string;
  bikeId: string;
  type: ServiceType;
  date: string;
  mileage: number;
  note?: string | null;
};

export type Ride = {
  id: string;
  bikeId: string;
  date: string;
  km: number;
  note?: string | null;
};

type JournalState = { service: ServiceEntry[]; rides: Ride[] };
type ServerResp = { service: ServiceEntry[]; rides: Ride[] };

let STATE: JournalState = { service: [], rides: [] };
let loaded = false;
let loading: Promise<void> | null = null;

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function setState(next: JournalState) {
  STATE = next;
  emit();
}

async function loadFromServer() {
  if (typeof window === "undefined") return;
  if (loading) return loading;
  loading = (async () => {
    try {
      const r = await apiFetch<ServerResp>("/api/v1/garage/journal");
      setState({ service: r.service ?? [], rides: r.rides ?? [] });
    } catch {
      // молча — пусть будет пусто, UI сам покажет «пока пусто»
    } finally {
      loaded = true;
      loading = null;
    }
  })();
  return loading;
}

function tempId(prefix: string) {
  return `${prefix}_tmp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export const bikeJournalStore = {
  subscribe(l: () => void) {
    if (!loaded) loadFromServer();
    listeners.add(l);
    return () => listeners.delete(l);
  },
  getSnapshot(): JournalState {
    return STATE;
  },
  refresh() {
    loaded = false;
    return loadFromServer();
  },
  async addService(input: Omit<ServiceEntry, "id">) {
    const optimistic: ServiceEntry = { id: tempId("s"), ...input };
    setState({ ...STATE, service: [optimistic, ...STATE.service] });
    try {
      const row = await apiFetch<ServiceEntry>("/api/v1/garage/service", {
        method: "POST",
        body: JSON.stringify(input),
      });
      setState({
        ...STATE,
        service: STATE.service.map((s) => (s.id === optimistic.id ? row : s)),
      });
    } catch (e) {
      setState({ ...STATE, service: STATE.service.filter((s) => s.id !== optimistic.id) });
      throw e;
    }
  },
  async removeService(id: string) {
    const prev = STATE.service;
    setState({ ...STATE, service: prev.filter((s) => s.id !== id) });
    try {
      await apiFetch(`/api/v1/garage/service/${id}`, { method: "DELETE" });
    } catch (e) {
      setState({ ...STATE, service: prev });
      throw e;
    }
  },
  async addRide(input: Omit<Ride, "id">) {
    const optimistic: Ride = { id: tempId("r"), ...input };
    setState({ ...STATE, rides: [optimistic, ...STATE.rides] });
    try {
      const row = await apiFetch<Ride>("/api/v1/garage/rides", {
        method: "POST",
        body: JSON.stringify(input),
      });
      setState({
        ...STATE,
        rides: STATE.rides.map((r) => (r.id === optimistic.id ? row : r)),
      });
    } catch (e) {
      setState({ ...STATE, rides: STATE.rides.filter((r) => r.id !== optimistic.id) });
      throw e;
    }
  },
  async removeRide(id: string) {
    const prev = STATE.rides;
    setState({ ...STATE, rides: prev.filter((r) => r.id !== id) });
    try {
      await apiFetch(`/api/v1/garage/rides/${id}`, { method: "DELETE" });
    } catch (e) {
      setState({ ...STATE, rides: prev });
      throw e;
    }
  },
};

export function useBikeJournal() {
  return useSyncExternalStore(
    bikeJournalStore.subscribe,
    bikeJournalStore.getSnapshot,
    bikeJournalStore.getSnapshot,
  );
}

/** Сумма км по поездкам за текущий календарный месяц. */
export function ridesKmThisMonth(rides: Ride[]) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  return rides.reduce((sum, r) => {
    const d = new Date(r.date);
    if (d.getFullYear() === y && d.getMonth() === m) return sum + r.km;
    return sum;
  }, 0);
}

/** Последняя сервисная запись данного типа. */
export function lastService(entries: ServiceEntry[], type: ServiceType) {
  return entries
    .filter((s) => s.type === type)
    .sort((a, b) => (a.date < b.date ? 1 : -1))[0];
}

/** Сколько км осталось до рекомендуемого следующего ТО по типу. */
export function kmUntilNextService(
  entries: ServiceEntry[],
  type: ServiceType,
  currentMileage: number,
) {
  const interval = SERVICE_INTERVAL_KM[type];
  if (!interval) return null;
  const last = lastService(entries, type);
  if (!last) return null;
  return last.mileage + interval - currentMileage;
}
