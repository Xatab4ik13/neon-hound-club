// Рефералка. Без бэка: код — slug ника, список приглашённых — в localStorage.

import { useSyncExternalStore } from "react";
import { ME } from "./profile";

const STORAGE_KEY = "hellhound:referrals";

export type InvitedFriend = {
  id: string;
  nick: string;
  joinedAt: string; // ISO yyyy-mm-dd
  ticketsRewarded: number;
  status: "joined" | "active";
};

const SEED: InvitedFriend[] = [
  { id: "i1", nick: "MOSCOW_RAVE", joinedAt: "2026-04-12", ticketsRewarded: 5, status: "active" },
  { id: "i2", nick: "VLAD_X", joinedAt: "2026-05-02", ticketsRewarded: 5, status: "joined" },
];

let STATE: InvitedFriend[] = SEED;
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
      STATE = JSON.parse(raw) as InvitedFriend[];
    }
  } catch {
    STATE = SEED;
  }
}

const listeners = new Set<() => void>();

export const referralStore = {
  subscribe(l: () => void) {
    load();
    listeners.add(l);
    return () => listeners.delete(l);
  },
  getSnapshot() {
    load();
    return STATE;
  },
};

export function useReferrals() {
  return useSyncExternalStore(
    referralStore.subscribe,
    referralStore.getSnapshot,
    referralStore.getSnapshot,
  );
}

/** Реферальный код = lowercase ник, без подчёркиваний и спецсимволов. */
export function myReferralCode() {
  return ME.nick.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function buildReferralUrl(origin?: string) {
  const base =
    origin ??
    (typeof window !== "undefined" ? window.location.origin : "https://hellhound.racing");
  return `${base}/?ref=${myReferralCode()}`;
}

/** Награды: +5 билетов мне и +5 другу за регистрацию. */
export const REFERRAL_REWARD_TICKETS = 5;
