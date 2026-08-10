// Реальные данные HellSpin для админки (/api/v1/admin/spin/*).
import { apiFetch } from "./api";

export type SpinRarity = "common" | "rare" | "epic" | "legend";
export type SpinShipStatus = "pending" | "contacted" | "shipped" | "delivered";

export type AdminSpinOverview = {
  season: { periodKey: string; startsAt: string; endsAt: string; daysTotal: number };
  stats: { spins: number; players: number; spinsToday: number; pendingShipments: number };
  spinsPerDay: Record<string, number>;
  prizes: {
    code: string;
    title: string;
    rarity: SpinRarity;
    rewardKind: string;
    chancePpm: number;
    limitTotal: number | null;
    issued: number;
    active: boolean;
  }[];
  byPrize: { prizeCode: string; count: number }[];
  recent: {
    id: string;
    nick: string | null;
    prizeCode: string;
    prizeTitle: string;
    rarity: SpinRarity;
    tier: string;
    bonus: boolean;
    createdAt: string;
  }[];
};

export type AdminSpinWinner = {
  id: string;
  source: "spin" | "streak";
  prizeCode: string;
  prizeTitle: string;
  status: SpinShipStatus;
  trackNumber: string | null;
  adminNote: string | null;
  createdAt: string;
  userId: string;
  nick: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
};

export type AdminSpinStreak = {
  userId: string;
  nick: string | null;
  city: string | null;
  phone: string | null;
  daysCount: number;
  claimed10At: string | null;
  claimed20At: string | null;
  claimed30At: string | null;
};

export const adminSpinQk = {
  overview: ["admin", "spin", "overview"] as const,
  winners: (source: string) => ["admin", "spin", "winners", source] as const,
  streaks: ["admin", "spin", "streaks"] as const,
};

export function fetchAdminSpinOverview() {
  return apiFetch<AdminSpinOverview>("/api/v1/admin/spin/overview");
}

export function fetchAdminSpinWinners(source: "all" | "spin" | "streak" = "all") {
  return apiFetch<AdminSpinWinner[]>(`/api/v1/admin/spin/winners?source=${source}`);
}

export function fetchAdminSpinStreaks() {
  return apiFetch<AdminSpinStreak[]>("/api/v1/admin/spin/streaks");
}

export function updateAdminSpinWinner(
  id: string,
  patch: { status?: SpinShipStatus; trackNumber?: string | null; adminNote?: string | null },
) {
  return apiFetch<AdminSpinWinner>(`/api/v1/admin/spin/winners/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}
