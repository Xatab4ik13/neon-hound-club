// Документы по байку: ОСАГО, КАСКО, ТО, ПТС/СТС, ВУ.
// localStorage, без бэка. Привязка к bikeId.

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "hellhound:bike-documents";

export type DocType = "osago" | "kasko" | "to" | "sts" | "pts" | "license";

export const DOC_TYPE_LABEL: Record<DocType, string> = {
  osago: "ОСАГО",
  kasko: "КАСКО",
  to: "Диагностическая карта",
  sts: "СТС",
  pts: "ПТС",
  license: "Водительское удостоверение",
};

/** Документы со сроком действия — для расчёта статуса. */
export const DOC_HAS_EXPIRY: Record<DocType, boolean> = {
  osago: true,
  kasko: true,
  to: true,
  sts: false,
  pts: false,
  license: true,
};

export type BikeDocument = {
  id: string;
  bikeId: string;
  type: DocType;
  number?: string;
  issueDate?: string; // ISO
  expiryDate?: string; // ISO, для срочных
  photo?: string; // dataURL
  note?: string;
};

type State = { docs: BikeDocument[] };

const SEED: State = {
  docs: [
    {
      id: "d_seed_1",
      bikeId: "b1",
      type: "osago",
      number: "ХХХ 0123456789",
      issueDate: "2025-08-01",
      expiryDate: "2026-07-31",
    },
    {
      id: "d_seed_2",
      bikeId: "b1",
      type: "sts",
      number: "9999 123456",
      issueDate: "2023-04-12",
    },
  ],
};

let STATE: State = SEED;
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
      STATE = JSON.parse(raw) as State;
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

function newId() {
  return `d_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export const bikeDocumentsStore = {
  subscribe(l: () => void) {
    load();
    listeners.add(l);
    return () => listeners.delete(l);
  },
  getSnapshot() {
    load();
    return STATE;
  },
  add(input: Omit<BikeDocument, "id">) {
    STATE = { docs: [{ id: newId(), ...input }, ...STATE.docs] };
    persist();
    emit();
  },
  update(id: string, patch: Partial<BikeDocument>) {
    STATE = {
      docs: STATE.docs.map((d) => (d.id === id ? { ...d, ...patch } : d)),
    };
    persist();
    emit();
  },
  remove(id: string) {
    STATE = { docs: STATE.docs.filter((d) => d.id !== id) };
    persist();
    emit();
  },
};

export function useBikeDocuments() {
  return useSyncExternalStore(
    bikeDocumentsStore.subscribe,
    bikeDocumentsStore.getSnapshot,
    bikeDocumentsStore.getSnapshot,
  );
}

export type DocStatus = "ok" | "expiring" | "expired" | "no-expiry" | "unknown";

/** Возвращает статус документа на основе expiryDate. */
export function docStatus(doc: BikeDocument): {
  status: DocStatus;
  daysLeft: number | null;
} {
  if (!DOC_HAS_EXPIRY[doc.type]) return { status: "no-expiry", daysLeft: null };
  if (!doc.expiryDate) return { status: "unknown", daysLeft: null };
  const now = new Date();
  const exp = new Date(doc.expiryDate);
  const days = Math.floor((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (days < 0) return { status: "expired", daysLeft: days };
  if (days <= 30) return { status: "expiring", daysLeft: days };
  return { status: "ok", daysLeft: days };
}
