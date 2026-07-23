// Мок-стор переписок «инструктор ↔ ученик». Хранится в localStorage,
// поэтому сообщения не пропадают при перезагрузке — можно писать инструктору
// со стороны юзера и увидеть их же в списке чатов, переключившись в
// режим инструктора (см. `use-instructor-mock-role`).
//
// Никакого бэка тут нет — временный слой, пока не подключим VIP-чат для инструкторов.

import { useSyncExternalStore } from "react";
import { INSTRUCTOR_ACCOUNTS, MOCK_STUDENTS } from "./instructor-accounts";

export type InstructorMsgSender = "instructor" | "student" | "system";

export type InvoiceStatus = "pending" | "paid";

export type InvoicePayload = {
  id: string;
  hours: number;
  description: string;
  /** ISO-строка даты/времени занятия. */
  dateTime: string;
  /** Сумма инструктора в рублях (без наценки). */
  amount: number;
  status: InvoiceStatus;
  /** ФИО плательщика после оплаты (мок). */
  payerName?: string;
  payerEmail?: string;
  paidAt?: number;
};

export type InstructorMsg = {
  id: string;
  senderRole: InstructorMsgSender;
  text?: string;
  sticker?: string;
  invoice?: InvoicePayload;
  createdAt: number;
};

export type InstructorThread = {
  instructorSlug: string;
  studentUserId: string;
  studentNick: string;
  messages: InstructorMsg[];
};

type State = Record<string, InstructorThread>;

const KEY = "hh_instructor_chats_v1";

function seed(): State {
  const out: State = {};
  const now = Date.now();
  const HOUR = 3_600_000;
  INSTRUCTOR_ACCOUNTS.forEach((acc, ai) => {
    MOCK_STUDENTS.slice(0, 3).forEach((s, si) => {
      const k = threadKey(acc.slug, s.userId);
      const base = now - ((ai + 1) * 3 + si) * HOUR;
      out[k] = {
        instructorSlug: acc.slug,
        studentUserId: s.userId,
        studentNick: s.nick,
        messages: [
          {
            id: `${k}_seed_1`,
            senderRole: "student",
            text: si === 0
              ? "Привет! Хочу записаться на занятие. Когда есть окно?"
              : si === 1
                ? "Здоров. Первый раз на мото. С нуля возьмёшь?"
                : "Йо, подскажи по спорт-группе на выходных.",
            createdAt: base,
          },
          {
            id: `${k}_seed_2`,
            senderRole: "instructor",
            text: si === 0
              ? "Го! Свободен в среду 15:00 и в субботу с утра."
              : si === 1
                ? "Возьму. Приезжай на пробное — посмотрим, что умеешь."
                : "В субботу есть слот в 10. Пиши, если по кайфу.",
            createdAt: base + 5 * 60_000,
          },
        ],
      };
    });
  });
  return out;
}

function load(): State {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      const s = seed();
      localStorage.setItem(KEY, JSON.stringify(s));
      return s;
    }
    return JSON.parse(raw) as State;
  } catch {
    return seed();
  }
}

let state: State = load();
const listeners = new Set<() => void>();

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* noop */
  }
  listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function getSnapshot() {
  return state;
}

export function threadKey(instructorSlug: string, studentUserId: string) {
  return `${instructorSlug}::${studentUserId}`;
}

export function ensureThread(
  instructorSlug: string,
  studentUserId: string,
  studentNick: string,
): InstructorThread {
  const k = threadKey(instructorSlug, studentUserId);
  if (!state[k]) {
    state = {
      ...state,
      [k]: {
        instructorSlug,
        studentUserId,
        studentNick,
        messages: [],
      },
    };
    persist();
  }
  return state[k];
}

export function sendInstructorChatMessage(
  instructorSlug: string,
  studentUserId: string,
  studentNick: string,
  payload: { text?: string; sticker?: string },
  sender: InstructorMsgSender,
) {
  const k = threadKey(instructorSlug, studentUserId);
  const existing =
    state[k] ??
    ({
      instructorSlug,
      studentUserId,
      studentNick,
      messages: [],
    } as InstructorThread);
  const msg: InstructorMsg = {
    id: `${k}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    senderRole: sender,
    text: payload.text,
    sticker: payload.sticker,
    createdAt: Date.now(),
  };
  state = {
    ...state,
    [k]: {
      ...existing,
      studentNick,
      messages: [...existing.messages, msg],
    },
  };
  persist();
  return msg;
}

export function useInstructorThreadsList(instructorSlug: string): InstructorThread[] {
  const snap = useSyncExternalStore(subscribe, getSnapshot, () => ({}) as State);
  return Object.values(snap)
    .filter((t) => t.instructorSlug === instructorSlug)
    .sort(
      (a, b) =>
        (b.messages.at(-1)?.createdAt ?? 0) - (a.messages.at(-1)?.createdAt ?? 0),
    );
}

/** Список тредов конкретного ученика — используется на странице
 *  «Мои инструкторы» у обычного юзера. */
export function useStudentThreadsList(studentUserId: string): InstructorThread[] {
  const snap = useSyncExternalStore(subscribe, getSnapshot, () => ({}) as State);
  return Object.values(snap)
    .filter((t) => t.studentUserId === studentUserId)
    .sort(
      (a, b) =>
        (b.messages.at(-1)?.createdAt ?? 0) - (a.messages.at(-1)?.createdAt ?? 0),
    );
}

export function useInstructorThread(
  instructorSlug: string,
  studentUserId: string,
): InstructorThread | undefined {
  const snap = useSyncExternalStore(subscribe, getSnapshot, () => ({}) as State);
  return snap[threadKey(instructorSlug, studentUserId)];
}
