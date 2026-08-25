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

export type AdminSpinHistoryParams = {
  rarity?: "all" | "top" | "low";
  q?: string;
  prize?: string;
  page: number;
  pageSize: number;
};

export const adminSpinQk = {
  overview: ["admin", "spin", "overview"] as const,
  history: (p: AdminSpinHistoryParams) =>
    ["admin", "spin", "history", p.rarity ?? "all", p.q ?? "", p.prize ?? "", p.page, p.pageSize] as const,
  legends: ["admin", "spin", "legends"] as const,
  streaks: ["admin", "spin", "streaks"] as const,
};

export function fetchAdminSpinOverview() {
  return apiFetch<AdminSpinOverview>("/api/v1/admin/spin/overview");
}

export function fetchAdminSpinHistory(p: AdminSpinHistoryParams) {
  const qs = new URLSearchParams({
    rarity: p.rarity ?? "all",
    page: String(p.page),
    pageSize: String(p.pageSize),
  });
  if (p.q) qs.set("q", p.q);
  if (p.prize) qs.set("prize", p.prize);
  return apiFetch<AdminSpinHistory>(`/api/v1/admin/spin/history?${qs.toString()}`);
}

export function fetchAdminSpinLegends() {
  return apiFetch<AdminSpinLegend[]>("/api/v1/admin/spin/legends");
}

export function fetchAdminSpinStreaks() {
  return apiFetch<AdminSpinStreak[]>("/api/v1/admin/spin/streaks");
}

/**
 * Включить/выключить приз в текущем сезоне. Выключенный приз остаётся в колесе
 * и в списке призов, но не выпадает (jackpot-очередь на нём останавливается).
 */
export function setAdminSpinPrizeActive(code: string, active: boolean) {
  return apiFetch<{ code: string; active: boolean }>(`/api/v1/admin/spin/prizes/${code}`, {
    method: "PATCH",
    body: JSON.stringify({ active }),
  });
}
