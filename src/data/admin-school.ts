// Мок-стор админки «Школа»:
//   • присвоение user-аккаунтов инструкторам (localStorage),
//   • агрегация экономики из моковых чатов инструктор↔ученик.
//
// Никакого бэка тут нет — временный слой под UI, пока не подключим реальный API.

import { useSyncExternalStore } from "react";
import { INSTRUCTOR_ACCOUNTS } from "./instructor-accounts";
import { INVOICE_COMMISSION, invoiceTotalForStudent } from "./instructor-chats-mock";
import type { InstructorThread, InvoicePayload } from "./instructor-chats-mock";
import { PUBLIC_USERS } from "./users";

const ASSIGN_KEY = "hh_admin_school_assignments_v1";
const CHATS_KEY = "hh_instructor_chats_v1";

// ============= Assignments =============
type Assignments = Record<string, string>; // instructorSlug -> publicUserSlug

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

// ============= Economy =============
export type InstructorEconomy = {
  slug: string;
  paidCount: number;
  pendingCount: number;
  /** Сумма инструктора без наценки (то, что он получит). */
  payout: number;
  /** Сумма, которую заплатили ученики (с 20% наценкой). */
  gross: number;
  /** Комиссия платформы = gross - payout. */
  commission: number;
  /** Оплаты за последние 7 дней (по payout инструктора). */
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
  const now = Date.now();
  return INSTRUCTOR_ACCOUNTS.map((acc) => {
    const invs = collectInvoices(chats, acc.slug);
    let paidCount = 0;
    let pendingCount = 0;
    let payout = 0;
    let gross = 0;
    let payoutWeek = 0;
    for (const inv of invs) {
      if (inv.status === "paid") {
        paidCount += 1;
        payout += inv.amount;
        gross += invoiceTotalForStudent(inv.amount);
        if (inv.paidAt && now - inv.paidAt <= WEEK) {
          payoutWeek += inv.amount;
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
      payoutWeek,
    };
  });
}

export function useEconomy(): InstructorEconomy[] {
  // Пересчёт при изменении моковых чатов (тот же ключ, что использует
  // instructor-chats-mock — просто подпишемся на storage-события +
  // локальную «шину» через custom event).
  return useSyncExternalStore(
    (fn) => {
      const onStorage = (e: StorageEvent) => {
        if (e.key === CHATS_KEY || e.key === ASSIGN_KEY) fn();
      };
      const onLocal = () => fn();
      window.addEventListener("storage", onStorage);
      window.addEventListener("hh:admin-school-refresh", onLocal);
      // и на assignments — они меняют роли/аккаунты, но не экономику,
      // поэтому только storage для чатов реально важен.
      return () => {
        window.removeEventListener("storage", onStorage);
        window.removeEventListener("hh:admin-school-refresh", onLocal);
      };
    },
    () => computeEconomy(),
    () => [] as InstructorEconomy[],
  );
}

export function refreshEconomy() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("hh:admin-school-refresh"));
  }
}

export { INVOICE_COMMISSION };
