// Мок-хранилище чатов «инструктор ↔ ученик» в localStorage.
// Остаётся живым для:
//   • MockChatRoom — общий UI (нужен тип InstructorMsg + InvoicePayload
//     + helper invoiceTotalForStudent для показа наценки ученику).
//   • BookInstructorChatSheet — вход «Записаться» до перехода в реальный чат.
//   • admin-school (мок панель) — считает историю счетов.
// Реальные экраны студента/инструктора уже ходят на API, а не сюда.

import { useEffect, useState } from "react";

export const INVOICE_COMMISSION = 0.2;

export function invoiceTotalForStudent(amount: number): number {
  return Math.round(amount * (1 + INVOICE_COMMISSION));
}

export type InvoicePayload = {
  id: string;
  /** Заголовок/тип занятия. */
  duration: string;
  description: string;
  /** ISO date. */
  dateTime: string;
  /** Сумма инструктора в рублях (без наценки). */
  amount: number;
  status: "pending" | "paid";
};

export type InstructorMsg = {
  id: string;
  senderRole: "instructor" | "student";
  text?: string;
  createdAt: number;
  invoice?: InvoicePayload;
};

export type InstructorThread = {
  slug: string;
  studentId: string;
  studentNick: string;
  messages: InstructorMsg[];
  updatedAt: number;
};

const STORAGE_KEY = "hhr.instructor-chats.v1";
const BUS = "hhr:instructor-chats";

function readAll(): Record<string, InstructorThread> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, InstructorThread>;
  } catch {
    return {};
  }
}

function writeAll(state: Record<string, InstructorThread>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent(BUS));
  } catch {
    /* quota etc — ignore */
  }
}

function threadKey(slug: string, studentId: string) {
  return `${slug}::${studentId}`;
}

export function ensureThread(slug: string, studentId: string, studentNick: string) {
  const all = readAll();
  const key = threadKey(slug, studentId);
  if (all[key]) return;
  all[key] = {
    slug,
    studentId,
    studentNick,
    messages: [],
    updatedAt: Date.now(),
  };
  writeAll(all);
}

export function sendInstructorChatMessage(
  slug: string,
  studentId: string,
  senderRole: "instructor" | "student",
  text: string,
) {
  const all = readAll();
  const key = threadKey(slug, studentId);
  const t = all[key];
  if (!t) return;
  const msg: InstructorMsg = {
    id: `m_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    senderRole,
    text,
    createdAt: Date.now(),
  };
  t.messages.push(msg);
  t.updatedAt = msg.createdAt;
  writeAll(all);
}

export function useInstructorThread(slug: string, studentId: string): InstructorThread | null {
  const [thread, setThread] = useState<InstructorThread | null>(() => {
    const all = readAll();
    return all[threadKey(slug, studentId)] ?? null;
  });

  useEffect(() => {
    const update = () => {
      const all = readAll();
      setThread(all[threadKey(slug, studentId)] ?? null);
    };
    update();
    window.addEventListener(BUS, update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener(BUS, update);
      window.removeEventListener("storage", update);
    };
  }, [slug, studentId]);

  return thread;
}
