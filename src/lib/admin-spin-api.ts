// Реальные данные HellSpin для админки (/api/v1/admin/spin/*).
import { apiFetch } from "./api";

export type SpinRarity = "common" | "rare" | "epic" | "legend";

export type AdminSpinOverview = {
  season: { periodKey: string; startsAt: string; endsAt: string; daysTotal: number };
  stats: { spins: number; players: number; spinsToday: number };
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

export type AdminSpinHistoryRow = {
  id: string;
  userId: string;
  nick: string | null;
  prizeCode: string;
  prizeTitle: string;
  rarity: SpinRarity;
  tier: string;
  bonus: boolean;
  createdAt: string;
};

export type AdminSpinHistory = {
  items: AdminSpinHistoryRow[];
  total: number;
  page: number;
  pageSize: number;
};

export type AdminSpinLegend = {
  id: string;
  userId: string;
  nick: string | null;
  email: string | null;
  city: string | null;
  phone: string | null;
  prizeCode: string;
  prizeTitle: string;
  rewardKind: string;
  tier: string;
  createdAt: string;
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
  history: (rarity: string, page: number, pageSize: number) =>
    ["admin", "spin", "history", rarity, page, pageSize] as const,
  legends: ["admin", "spin", "legends"] as const,
  streaks: ["admin", "spin", "streaks"] as const,
};

export function fetchAdminSpinOverview() {
  return apiFetch<AdminSpinOverview>("/api/v1/admin/spin/overview");
}

export function fetchAdminSpinHistory(
  rarity: "all" | "top" | "low",
  page: number,
  pageSize: number,
) {
  return apiFetch<AdminSpinHistory>(
    `/api/v1/admin/spin/history?rarity=${rarity}&page=${page}&pageSize=${pageSize}`,
  );
}

export function fetchAdminSpinLegends() {
  return apiFetch<AdminSpinLegend[]>("/api/v1/admin/spin/legends");
}

export function fetchAdminSpinStreaks() {
  return apiFetch<AdminSpinStreak[]>("/api/v1/admin/spin/streaks");
}
