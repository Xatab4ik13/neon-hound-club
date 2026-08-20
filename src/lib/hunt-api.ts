// API охоты HELL HUNT. Бек: /api/v1/hunt (юзер) и /api/v1/admin/hunt (админка).
import { apiFetch } from "@/lib/api";

export type HuntApiPrize = {
  id: string;
  place: number;
  title: string;
  sub: string;
  img: string | null;
  ticketsReward: number;
  forcedWinnerId: string | null;
  winnerUserId: string | null;
  winnerNick: string | null;
};

export type HuntApiEntry = {
  id: string;
  nick: string;
  city: string;
  avatarUrl: string | null;
  rankId: string;
  tickets: number;
  capsules: number;
};

export type HuntApiState = {
  hunt: {
    id: string;
    title: string;
    startsAt: string;
    ticketStep: number;
    status: "draft" | "open" | "finished" | "canceled";
    drawnAt: string | null;
    lockMs: number;
  } | null;
  prizes: HuntApiPrize[];
  entries: HuntApiEntry[];
  totals: { participants: number; tickets: number; capsules: number } | null;
  me: { tickets: number; capsules: number } | null;
  pass?: { tier: string; expiresAt: string | null } | null;
  balance?: number;
};

export function fetchHuntState() {
  return apiFetch<HuntApiState>("/api/v1/hunt/current");
}

export function postHuntBet(tickets: number) {
  return apiFetch<{ tickets: number; capsules: number; balance: number }>("/api/v1/hunt/bet", {
    method: "POST",
    body: JSON.stringify({ tickets }),
  });
}

export function fetchAdminHunt() {
  return apiFetch<HuntApiState>("/api/v1/admin/hunt/current");
}

export type AdminHuntSaveBody = {
  id?: string | null;
  title: string;
  startsAt: string;
  ticketStep: number;
  status?: "draft" | "open" | "finished" | "canceled";
  prizes: {
    id?: string;
    place: number;
    title: string;
    sub: string;
    img?: string | null;
    ticketsReward?: number;
    forcedWinnerId?: string | null;
  }[];
};

export function saveAdminHunt(body: AdminHuntSaveBody) {
  return apiFetch<HuntApiState>("/api/v1/admin/hunt/save", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function drawAdminHunt(force = false) {
  return apiFetch<HuntApiState>("/api/v1/admin/hunt/draw", {
    method: "POST",
    body: JSON.stringify({ force }),
  });
}

export function resetAdminHuntResults() {
  return apiFetch<HuntApiState>("/api/v1/admin/hunt/reset-results", { method: "POST" });
}

export function refundAdminHunt() {
  return apiFetch<{ refunded: number }>("/api/v1/admin/hunt/refund", { method: "POST" });
}

export function fetchAdminHuntParticipants() {
  return apiFetch<{ items: { id: string; nick: string; tickets: number; capsules: number; chance: number }[] }>(
    "/api/v1/admin/hunt/participants",
  );
}

export type HuntPlatinumUser = {
  id: string;
  nick: string;
  email: string;
  city: string | null;
  avatarUrl: string | null;
  passExpiresAt: string | null;
  tickets: number;
  capsules: number;
  inHunt: boolean;
};

/** Поиск владельцев активного Hell Pass Platinum (для назначения победителя). */
export function fetchAdminPlatinumUsers(q = "") {
  const qs = q.trim() ? `?q=${encodeURIComponent(q.trim())}` : "";
  return apiFetch<{ items: HuntPlatinumUser[] }>(`/api/v1/admin/hunt/platinum-users${qs}`);
}
