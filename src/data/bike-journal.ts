// Журнал байка: сервисные записи + поездки. localStorage, без бэка.
// Привязка к bikeId.

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "hellhound:bike-journal";

export type ServiceType =
  | "oil"
  | "chain"
  | "tires"
  | "brakes"
  | "to"
  | "filter"
  | "other";

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
  date: string; // ISO yyyy-mm-dd
  mileage: number; // км на одометре в момент работ
  note?: string;
};

export type Ride = {
  id: string;
  bikeId: string;
  date: string; // ISO yyyy-mm-dd
  km: number;
  note?: string;
};

type JournalState = {
  service: ServiceEntry[];
  rides: Ride[];
};

const SEED: JournalState = {
  service: [
    {
      id: "s_seed_1",
      bikeId: "b1",
      type: "oil",
      date: "2026-03-14",
      mileage: 15800,
      note: "Motul 7100 10W-40, фильтр K&N",
    },
    {
      id: "s_seed_2",
      bikeId: "b1",
      type: "chain",
      date: "2026-04-02",
      mileage: 16500,
      note: "Чистка + смазка Motul Chain Lube",
    },
    {
      id: "s_seed_3",
      bikeId: "b1",
      type: "tires",
      date: "2026-04-22",
      mileage: 17200,
      note: "Michelin Power 5 переднее/заднее",
    },
  ],
  rides: [
    { id: "r_seed_1", bikeId: "b1", date: "2026-05-04", km: 120, note: "Каширка → Серпухов" },
    { id: "r_seed_2", bikeId: "b1", date: "2026-05-10", km: 75, note: "МКАД покатушка" },
    { id: "r_seed_3", bikeId: "b1", date: "2026-05-15", km: 210, note: "Поездка на трек" },
  ],
};

let STATE: JournalState = SEED;
let loaded = false;

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED));
      STATE = SEED;
    } else {
      STATE = JSON.parse(raw) as JournalState;
    }
  } catch {
    STATE = SEED;
  }
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(STATE));
  } catch {
    /* ignore quota */
  }
}

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function newId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export const bikeJournalStore = {
  subscribe(l: () => void) {
    load();
    listeners.add(l);
    return () => listeners.delete(l);
  },
  getSnapshot() {
    load();
    return STATE;
  },
  addService(input: Omit<ServiceEntry, "id">) {
    STATE = { ...STATE, service: [{ id: newId("s"), ...input }, ...STATE.service] };
    persist();
    emit();
  },
  removeService(id: string) {
    STATE = { ...STATE, service: STATE.service.filter((s) => s.id !== id) };
    persist();
    emit();
  },
  addRide(input: Omit<Ride, "id">) {
    STATE = { ...STATE, rides: [{ id: newId("r"), ...input }, ...STATE.rides] };
    persist();
    emit();
  },
  removeRide(id: string) {
    STATE = { ...STATE, rides: STATE.rides.filter((r) => r.id !== id) };
    persist();
    emit();
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
