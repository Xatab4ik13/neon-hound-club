// Общий стор розыгрышей. Источник правды для админки и для рандомайзера блогера.
// У каждого участника — реальное количество билетов; рандомайзер крутит честно
// по весам, потом выбранный билет (один) выбывает.

import { useSyncExternalStore } from "react";
import { PUBLIC_USERS } from "./users";

export type RafflePrize = {
  id: string;
  name: string;
  qty: number;
  /** Список slug'ов уже выигравших этот приз (через рандомайзер блогера). */
  winners?: string[];
};

export type RaffleParticipant = {
  slug: string;
  tickets: number;
};

export type Raffle = {
  id: string;
  name: string;
  description?: string;
  cover?: string;
  endsAt: string;
  createdAt: string;
  participants: RaffleParticipant[];
  prizes: RafflePrize[];
};

/** Сгенерировать список участников с распределением билетов по логнормальному паттерну. */
function mockParticipants(slugs: string[], totalTickets: number): RaffleParticipant[] {
  // Простое распределение: первый участник держит большую долю, дальше — спад.
  const weights = slugs.map((_, i) => Math.max(1, Math.round((slugs.length - i) ** 1.6)));
  const sum = weights.reduce((a, b) => a + b, 0);
  let allocated = 0;
  const out = slugs.map((slug, i) => {
    const t = i === slugs.length - 1
      ? Math.max(1, totalTickets - allocated)
      : Math.max(1, Math.round((weights[i] / sum) * totalTickets));
    allocated += t;
    return { slug, tickets: t };
  });
  return out;
}

const COMMON_SLUGS = Object.keys(PUBLIC_USERS).filter((s) => s !== "hell" && s !== "team_pavel");

let RAFFLES: Raffle[] = [
  {
    id: "1",
    name: "Летний розыгрыш №1",
    description: "Главная летняя серия призов от HELLHOUND.",
    cover: "",
    endsAt: "2026-06-30",
    createdAt: "2026-05-01",
    participants: mockParticipants(COMMON_SLUGS, 4120),
    prizes: [
      { id: "p1", name: "Шлем AGV K6", qty: 1 },
      { id: "p2", name: "Перчатки v3", qty: 5 },
      { id: "p3", name: "Худи Founder S01", qty: 10 },
    ],
  },
  {
    id: "2",
    name: "Весенний розыгрыш",
    cover: "",
    endsAt: "2026-04-30",
    createdAt: "2026-03-01",
    participants: mockParticipants(COMMON_SLUGS.slice(0, 5), 612),
    prizes: [{ id: "p4", name: "Перчатки Пит-крю", qty: 3 }],
  },
];

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const rafflesStore = {
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  getSnapshot() {
    return RAFFLES;
  },
  setAll(next: Raffle[]) {
    RAFFLES = next;
    emit();
  },
  upsert(r: Raffle) {
    RAFFLES = RAFFLES.some((x) => x.id === r.id)
      ? RAFFLES.map((x) => (x.id === r.id ? r : x))
      : [r, ...RAFFLES];
    emit();
  },
  remove(id: string) {
    RAFFLES = RAFFLES.filter((x) => x.id !== id);
    emit();
  },
  /** Списать один билет у победителя (его «выигравший» билет выбывает). */
  consumeTicket(raffleId: string, winnerSlug: string) {
    RAFFLES = RAFFLES.map((r) => {
      if (r.id !== raffleId) return r;
      return {
        ...r,
        participants: r.participants
          .map((p) => (p.slug === winnerSlug ? { ...p, tickets: p.tickets - 1 } : p))
          .filter((p) => p.tickets > 0),
      };
    });
    emit();
  },
  /** Записать победителя приза. */
  recordWinner(raffleId: string, prizeId: string, slug: string) {
    RAFFLES = RAFFLES.map((r) => {
      if (r.id !== raffleId) return r;
      return {
        ...r,
        prizes: r.prizes.map((p) =>
          p.id === prizeId ? { ...p, winners: [...(p.winners ?? []), slug] } : p,
        ),
      };
    });
    emit();
  },
};

export function useRaffles() {
  return useSyncExternalStore(rafflesStore.subscribe, rafflesStore.getSnapshot, rafflesStore.getSnapshot);
}

export function totalTickets(r: Raffle) {
  return r.participants.reduce((s, p) => s + p.tickets, 0);
}

export function totalPrizeQty(r: Raffle) {
  return r.prizes.reduce((s, p) => s + p.qty, 0);
}

export function prizeRemaining(p: RafflePrize) {
  return Math.max(0, p.qty - (p.winners?.length ?? 0));
}
