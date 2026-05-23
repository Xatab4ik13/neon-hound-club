// Документы по байку: ОСАГО, КАСКО, ТО, ПТС/СТС, ВУ.
// Бэкенд (Fastify + Postgres + S3/MinIO).

import { useSyncExternalStore } from "react";
import { apiFetch } from "@/lib/api";

const ENDPOINT = "/api/v1/garage/documents";

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
  number?: string | null;
  issueDate?: string | null;
  expiryDate?: string | null;
  /** Несколько фото: лицевая/обратная и т.д. Это публичные URL из нашего S3. */
  photos?: string[];
  note?: string | null;
};

/** Возвращает массив фото из документа. */
export function docPhotos(d: BikeDocument): string[] {
  return d.photos ?? [];
}

type State = { docs: BikeDocument[] };

let STATE: State = { docs: [] };
let loaded = false;
let loading: Promise<void> | null = null;

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function setState(next: State) {
  STATE = next;
  emit();
}

async function loadFromServer() {
  if (typeof window === "undefined") return;
  if (loading) return loading;
  loading = (async () => {
    try {
      const r = await apiFetch<{ docs: BikeDocument[] }>(ENDPOINT);
      setState({ docs: r.docs ?? [] });
    } catch {
      // молча
    } finally {
      loaded = true;
      loading = null;
    }
  })();
  return loading;
}

function tempId() {
  return `d_tmp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export const bikeDocumentsStore = {
  subscribe(l: () => void) {
    if (!loaded) loadFromServer();
    listeners.add(l);
    return () => listeners.delete(l);
  },
  getSnapshot(): State {
    return STATE;
  },
  refresh() {
    loaded = false;
    return loadFromServer();
  },
  async add(input: Omit<BikeDocument, "id">) {
    const optimistic: BikeDocument = { id: tempId(), ...input };
    setState({ docs: [optimistic, ...STATE.docs] });
    try {
      const row = await apiFetch<BikeDocument>(ENDPOINT, {
        method: "POST",
        body: JSON.stringify({
          bikeId: input.bikeId,
          type: input.type,
          number: input.number ?? null,
          issueDate: input.issueDate ?? null,
          expiryDate: input.expiryDate ?? null,
          photos: input.photos ?? [],
          note: input.note ?? null,
        }),
      });
      setState({ docs: STATE.docs.map((d) => (d.id === optimistic.id ? row : d)) });
    } catch (e) {
      setState({ docs: STATE.docs.filter((d) => d.id !== optimistic.id) });
      throw e;
    }
  },
  async update(id: string, patch: Partial<BikeDocument>) {
    const prev = STATE.docs;
    setState({ docs: prev.map((d) => (d.id === id ? { ...d, ...patch } : d)) });
    try {
      const body: Record<string, unknown> = {};
      if (patch.type !== undefined) body.type = patch.type;
      if (patch.number !== undefined) body.number = patch.number ?? null;
      if (patch.issueDate !== undefined) body.issueDate = patch.issueDate ?? null;
      if (patch.expiryDate !== undefined) body.expiryDate = patch.expiryDate ?? null;
      if (patch.photos !== undefined) body.photos = patch.photos ?? [];
      if (patch.note !== undefined) body.note = patch.note ?? null;
      const row = await apiFetch<BikeDocument>(`${ENDPOINT}/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      setState({ docs: STATE.docs.map((d) => (d.id === id ? row : d)) });
    } catch (e) {
      setState({ docs: prev });
      throw e;
    }
  },
  async remove(id: string) {
    const prev = STATE.docs;
    setState({ docs: prev.filter((d) => d.id !== id) });
    try {
      await apiFetch(`${ENDPOINT}/${id}`, { method: "DELETE" });
    } catch (e) {
      setState({ docs: prev });
      throw e;
    }
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
