// Мок-стор админки «Школа»:
//   • присвоение user-аккаунтов инструкторам (localStorage),
//   • агрегация экономики из моковых чатов инструктор↔ученик,
//   • отметки выплат инструкторам (недельные батчи),
//   • настройки школы (ставка налога).
//
// Никакого бэка тут нет — временный слой под UI, пока не подключим реальный API.

import { useSyncExternalStore } from "react";
import { INSTRUCTOR_ACCOUNTS } from "./instructor-accounts";
import { INVOICE_COMMISSION, invoiceTotalForStudent } from "./instructor-chats-mock";
import type { InstructorThread, InvoicePayload } from "./instructor-chats-mock";
import { PUBLIC_USERS } from "./users";

const ASSIGN_KEY = "hh_admin_school_assignments_v1";
const CHATS_KEY = "hh_instructor_chats_v1";
const PAYOUTS_KEY = "hh_admin_school_payouts_v1";
const BATCHES_KEY = "hh_admin_school_batches_v1";
const SETTINGS_KEY = "hh_admin_school_settings_v1";

// ============= Общая шина =============
const REFRESH_EVENT = "hh:admin-school-refresh";
function emitRefresh() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(REFRESH_EVENT));
  }
}

// ============= Assignments =============
type Assignments = Record<string, string>;

function loadAssignments(): Assignments {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(ASSIGN_KEY);
    return raw ? (JSON.parse(raw) as Assignments) : {};
  } catch {
    return {};
  }
}

let assignments: Assignments = loadAssignments();
const assignListeners = new Set<() => void>();

function persistAssignments() {
  try {
    localStorage.setItem(ASSIGN_KEY, JSON.stringify(assignments));
  } catch {
    /* noop */
  }
  assignListeners.forEach((fn) => fn());
}

export function assignInstructorAccount(instructorSlug: string, userSlug: string | null) {
  const next = { ...assignments };
  if (userSlug) {
    next[instructorSlug] = userSlug;
  } else {
    delete next[instructorSlug];
  }
  assignments = next;
  persistAssignments();
}

export function useAssignments(): Assignments {
  return useSyncExternalStore(
    (fn) => {
      assignListeners.add(fn);
      return () => {
        assignListeners.delete(fn);
      };
    },
    () => assignments,
    () => ({}),
  );
}

// ============= Candidate user accounts =============
export type CandidateUser = { slug: string; nick: string; city?: string };

export function listCandidateUsers(): CandidateUser[] {
  return Object.values(PUBLIC_USERS)
    .map((u) => ({ slug: u.slug, nick: u.nick, city: u.city }))
    .sort((a, b) => a.nick.localeCompare(b.nick, "ru"));
}

// ============= Settings (налоги) =============
export type SchoolSettings = {
  /** Доля налога от выручки (0..1). По умолчанию 6% — самозанятые. */
  taxRate: number;
};

const DEFAULT_SETTINGS: SchoolSettings = { taxRate: 0.06 };

function loadSettings(): SchoolSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const s = JSON.parse(raw) as Partial<SchoolSettings>;
    return { ...DEFAULT_SETTINGS, ...s };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

let settings: SchoolSettings = loadSettings();

export function setTaxRate(rate: number) {
  const clamped = Math.max(0, Math.min(1, rate));
  settings = { ...settings, taxRate: clamped };
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* noop */
  }
  emitRefresh();
}

export function useSettings(): SchoolSettings {
  return useSyncExternalStore(
    (fn) => {
      window.addEventListener(REFRESH_EVENT, fn);
      return () => window.removeEventListener(REFRESH_EVENT, fn);
    },
    () => settings,
    () => DEFAULT_SETTINGS,
  );
}

// ============= Payouts (отметки о выплатах инструкторам) =============
// Ключ — invoice.id, значение — timestamp выплаты + id батча.
type PayoutState = Record<string, { paidOutAt: number; batchId: string }>;

function loadPayouts(): PayoutState {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(PAYOUTS_KEY);
    return raw ? (JSON.parse(raw) as PayoutState) : {};
  } catch {
    return {};
  }
}
function persistPayouts(next: PayoutState) {
  try {
    localStorage.setItem(PAYOUTS_KEY, JSON.stringify(next));
  } catch {
    /* noop */
  }
}

export type PayoutBatch = {
  id: string;
  instructorSlug: string;
  createdAt: number;
  /** ID инвойсов, попавших в этот батч. */
  invoiceIds: string[];
  /** Сумма к выплате инструктору (без наценки). */
  amount: number;
};

function loadBatches(): PayoutBatch[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(BATCHES_KEY);
    return raw ? (JSON.parse(raw) as PayoutBatch[]) : [];
  } catch {
    return [];
  }
}
function persistBatches(next: PayoutBatch[]) {
  try {
    localStorage.setItem(BATCHES_KEY, JSON.stringify(next));
  } catch {
    /* noop */
  }
}

/** Пометить все ожидающие выплаты по инструктору как выплаченные. Возвращает батч. */
export function markInstructorPaidOut(instructorSlug: string): PayoutBatch | null {
  const chats = readChats();
  const paidOut = loadPayouts();
  const invs = collectInvoices(chats, instructorSlug).filter(
    (inv) => inv.status === "paid" && !paidOut[inv.id],
  );
  if (invs.length === 0) return null;
  const batchId = `b_${Date.now()}`;
  const now = Date.now();
  const nextPayouts: PayoutState = { ...paidOut };
  for (const inv of invs) nextPayouts[inv.id] = { paidOutAt: now, batchId };
  persistPayouts(nextPayouts);

  const batch: PayoutBatch = {
    id: batchId,
    instructorSlug,
    createdAt: now,
    invoiceIds: invs.map((i) => i.id),
    amount: invs.reduce((s, i) => s + i.amount, 0),
  };
  const nextBatches = [batch, ...loadBatches()];
  persistBatches(nextBatches);
  emitRefresh();
  return batch;
}

export function undoPayoutBatch(batchId: string) {
  const batches = loadBatches();
  const b = batches.find((x) => x.id === batchId);
  if (!b) return;
  const nextBatches = batches.filter((x) => x.id !== batchId);
  persistBatches(nextBatches);
  const payouts = loadPayouts();
  const next: PayoutState = {};
  for (const [k, v] of Object.entries(payouts)) {
    if (v.batchId !== batchId) next[k] = v;
  }
  persistPayouts(next);
  emitRefresh();
}

export function useBatches(): PayoutBatch[] {
  return useSyncExternalStore(
    (fn) => {
      const onStorage = (e: StorageEvent) => {
        if (e.key === BATCHES_KEY || e.key === PAYOUTS_KEY) fn();
      };
      window.addEventListener("storage", onStorage);
      window.addEventListener(REFRESH_EVENT, fn);
      return () => {
        window.removeEventListener("storage", onStorage);
        window.removeEventListener(REFRESH_EVENT, fn);
      };
    },
    () => loadBatches(),
    () => [] as PayoutBatch[],
  );
}

// ============= Economy =============
export type InstructorEconomy = {
  slug: string;
  paidCount: number;
  pendingCount: number;
  /** Сумма инструктора (без наценки) по всем оплаченным ученикам инвойсам. */
  payout: number;
  /** Сумма, которую заплатили ученики (с 20% наценкой). */
  gross: number;
  /** Комиссия платформы = gross - payout. */
  commission: number;
  /** К выплате инструктору сейчас (ещё не помечено как выплаченное). */
  payoutDue: number;
  /** Уже выплачено инструктору всего. */
  payoutPaid: number;
  /** К выплате за последние 7 дней (по paidAt инвойсов, ещё не выплачено). */
  payoutWeek: number;
};

function readChats(): InstructorThread[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CHATS_KEY);
    if (!raw) return [];
    const state = JSON.parse(raw) as Record<string, InstructorThread>;
    return Object.values(state);
  } catch {
    return [];
  }
}

function collectInvoices(threads: InstructorThread[], slug: string): InvoicePayload[] {
  const out: InvoicePayload[] = [];
  for (const t of threads) {
    if (t.instructorSlug !== slug) continue;
    for (const m of t.messages) {
      if (m.invoice) out.push(m.invoice);
    }
  }
  return out;
}

const WEEK = 7 * 24 * 3600_000;

export function computeEconomy(): InstructorEconomy[] {
  const chats = readChats();
  const paidOut = loadPayouts();
  const now = Date.now();
  return INSTRUCTOR_ACCOUNTS.map((acc) => {
    const invs = collectInvoices(chats, acc.slug);
    let paidCount = 0;
    let pendingCount = 0;
    let payout = 0;
    let gross = 0;
    let payoutPaid = 0;
    let payoutDue = 0;
    let payoutWeek = 0;
    for (const inv of invs) {
      if (inv.status === "paid") {
        paidCount += 1;
        payout += inv.amount;
        gross += invoiceTotalForStudent(inv.amount);
        if (paidOut[inv.id]) {
          payoutPaid += inv.amount;
        } else {
          payoutDue += inv.amount;
          if (inv.paidAt && now - inv.paidAt <= WEEK) {
            payoutWeek += inv.amount;
          }
        }
      } else {
        pendingCount += 1;
      }
    }
    return {
      slug: acc.slug,
      paidCount,
      pendingCount,
      payout,
      gross,
      commission: gross - payout,
      payoutDue,
      payoutPaid,
      payoutWeek,
    };
  });
}

export function useEconomy(): InstructorEconomy[] {
  return useSyncExternalStore(
    (fn) => {
      const onStorage = (e: StorageEvent) => {
        if (
          e.key === CHATS_KEY ||
          e.key === ASSIGN_KEY ||
          e.key === PAYOUTS_KEY ||
          e.key === BATCHES_KEY ||
          e.key === SETTINGS_KEY
        )
          fn();
      };
      window.addEventListener("storage", onStorage);
      window.addEventListener(REFRESH_EVENT, fn);
      return () => {
        window.removeEventListener("storage", onStorage);
        window.removeEventListener(REFRESH_EVENT, fn);
      };
    },
    () => computeEconomy(),
    () => [] as InstructorEconomy[],
  );
}

export function refreshEconomy() {
  emitRefresh();
}

export { INVOICE_COMMISSION };
