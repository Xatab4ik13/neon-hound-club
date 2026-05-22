// ============================================================================
// ADMIN — отдельный модуль, чтобы не мешать клиентским запросам.
// Все endpoint'ы под /api/v1/admin/* требуют роли admin (проверка на бэке).
// ============================================================================

import { apiFetch } from "@/lib/api";
import type {
  LedgerEntry,
  PassRecord,
  PassTier,
  RaffleListItem,
  RaffleStatus,
  ShopOrder,
  ShopOrderStatus,
  ShopOrderWithItems,
  ShopProduct,
} from "@/lib/queries";

// ---------- KEYS ----------

export const adminQk = {
  users: (q: string) => ["admin", "users", q] as const,
  user: (id: string) => ["admin", "user", id] as const,
  shopProducts: ["admin", "shop", "products"] as const,
  shopOrders: (status?: string) => ["admin", "shop", "orders", status ?? "all"] as const,
  shopOrder: (id: string) => ["admin", "shop", "order", id] as const,
  quests: ["admin", "quests"] as const,
  raffles: ["admin", "raffles"] as const,
  passList: (status?: string) => ["admin", "pass", status ?? "all"] as const,
};

// ---------- USERS ----------

export type AdminUserListItem = {
  id: string;
  email: string;
  nick: string;
  role: "user" | "admin" | "blogger";
  emailVerified: boolean;
  blocked: boolean;
  createdAt: string;
  city: string | null;
  avatarUrl: string | null;
  phone: string | null;
};

export type AdminUserDetail = AdminUserListItem & {
  blockedAt: string | null;
  bio: string | null;
  ticketsBalance: number;
  ticketsEarned: number;
  activePass: PassRecord | null;
  xpTotal: number;
  rank: {
    rankIndex: number;
    rankId: string;
    rankLabel: string;
    xpTotal: number;
    isMax: boolean;
    inRank: number;
    pct: number;
  };
};

export function fetchAdminUsers(q?: string) {
  const search = q ? `?q=${encodeURIComponent(q)}` : "";
  return apiFetch<{ items: AdminUserListItem[] }>(`/api/v1/admin/users/${search}`);
}

export function fetchAdminUser(id: string) {
  return apiFetch<AdminUserDetail>(`/api/v1/admin/users/${id}`);
}

export function patchAdminUser(
  id: string,
  patch: { role?: "user" | "admin"; blocked?: boolean },
) {
  return apiFetch<{ id: string; nick: string; role: "user" | "admin"; blocked: boolean }>(
    `/api/v1/admin/users/${id}`,
    { method: "PATCH", body: JSON.stringify(patch) },
  );
}

export function deleteAdminUser(id: string) {
  return apiFetch<{ ok: true }>(`/api/v1/admin/users/${id}`, { method: "DELETE" });
}

export type CreateAdminUserInput = {
  email: string;
  password: string;
  nick: string;
  role?: "user" | "admin" | "blogger";
  emailVerified?: boolean;
};

export function createAdminUser(input: CreateAdminUserInput) {
  return apiFetch<{ id: string; email: string; nick: string; role: string }>(
    `/api/v1/admin/users/`,
    { method: "POST", body: JSON.stringify(input) },
  );
}

export type AdminUserBadge = {
  id: string;
  badgeId: string;
  code: string;
  name: string;
  rarity: AdminBadge["rarity"];
  category: AdminBadge["category"];
  awardedAt: string;
};

export function fetchAdminUserBadges(userId: string) {
  return apiFetch<{ items: AdminUserBadge[] }>(`/api/v1/admin/users/${userId}/badges`);
}



// ---------- SHOP ADMIN ----------

export type CreateProductInput = {
  slug: string;
  title: string;
  description?: string;
  priceRub: number;
  bonusTickets?: number;
  images?: string[];
  stock?: number | null;
  active?: boolean;
};

export function fetchAdminShopProducts() {
  return apiFetch<{ items: ShopProduct[] }>("/api/v1/admin/shop/products");
}

export function createAdminProduct(input: CreateProductInput) {
  return apiFetch<ShopProduct>("/api/v1/admin/shop/products", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function patchAdminProduct(id: string, patch: Partial<CreateProductInput>) {
  return apiFetch<ShopProduct>(`/api/v1/admin/shop/products/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export function deleteAdminProduct(id: string) {
  return apiFetch<{ ok: true }>(`/api/v1/admin/shop/products/${id}`, { method: "DELETE" });
}

export function fetchAdminOrders(status?: ShopOrderStatus) {
  const s = status ? `?status=${status}` : "";
  return apiFetch<{ items: ShopOrder[] }>(`/api/v1/admin/shop/orders${s}`);
}

export function fetchAdminOrder(id: string) {
  return apiFetch<ShopOrderWithItems>(`/api/v1/admin/shop/orders/${id}`);
}

export function patchAdminOrder(
  id: string,
  patch: { status?: ShopOrderStatus; cdekTrack?: string | null },
) {
  return apiFetch<ShopOrderWithItems>(`/api/v1/admin/shop/orders/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

// ---------- QUESTS ADMIN ----------

export type AdminQuest = {
  id: string;
  code: string;
  title: string;
  description: string;
  ticketsReward: number;
  kind: "auto" | "manual";
  repeatable: boolean;
  sortOrder: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateQuestInput = {
  code: string;
  title: string;
  description?: string;
  ticketsReward: number;
  kind?: "auto" | "manual";
  repeatable?: boolean;
  sortOrder?: number;
  active?: boolean;
};

export function fetchAdminQuests() {
  return apiFetch<{ items: AdminQuest[] }>("/api/v1/admin/quests/");
}

export function createAdminQuest(input: CreateQuestInput) {
  return apiFetch<AdminQuest>("/api/v1/admin/quests/", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function patchAdminQuest(id: string, patch: Partial<Omit<CreateQuestInput, "code">>) {
  return apiFetch<AdminQuest>(`/api/v1/admin/quests/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export function deleteAdminQuest(id: string) {
  return apiFetch<{ ok: true }>(`/api/v1/admin/quests/${id}`, { method: "DELETE" });
}

export function completeQuestForUser(code: string, userId: string) {
  return apiFetch<
    | { credited: true; completionId: string; tickets: number }
    | { credited: false; reason: string }
  >(`/api/v1/admin/quests/${encodeURIComponent(code)}/complete-for/${userId}`, { method: "POST" });
}

// ---------- RAFFLES ADMIN ----------

export type CreateRaffleInput = {
  title: string;
  description?: string;
  imageUrl?: string | null;
  prize: string;
  ticketCost: number;
  maxEntriesPerUser?: number | null;
  startsAt: string;
  endsAt: string;
  status?: RaffleStatus;
};

export function fetchAdminRaffles() {
  return apiFetch<{ items: RaffleListItem[] }>("/api/v1/admin/raffles/");
}

export function createAdminRaffle(input: CreateRaffleInput) {
  return apiFetch<RaffleListItem>("/api/v1/admin/raffles/", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function patchAdminRaffle(id: string, patch: Partial<CreateRaffleInput>) {
  return apiFetch<RaffleListItem>(`/api/v1/admin/raffles/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export function pickRaffleWinner(id: string) {
  return apiFetch<{ ok: true; winnerUserId: string | null; alreadyPicked: boolean }>(
    `/api/v1/admin/raffles/${id}/pick-winner`,
    { method: "POST" },
  );
}

export function cancelRaffle(id: string) {
  return apiFetch<{ ok: true; refunded: number }>(`/api/v1/admin/raffles/${id}/cancel`, {
    method: "POST",
  });
}

// ---------- TICKETS ADMIN ----------

export type CreditInput = {
  userId?: string;
  nick?: string;
  amount: number;
  source: "admin" | "quest" | "product_bonus" | "pass_monthly" | "raffle_entry" | "refund";
  reason: string;
};

export function creditTickets(input: CreditInput) {
  return apiFetch<{
    ok: true;
    entry: LedgerEntry;
    balance: number;
    user: { id: string; nick: string };
  }>("/api/v1/admin/tickets/credit", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export type AdminLedgerRow = {
  id: string;
  userId: string;
  nick: string | null;
  amount: number;
  source: string;
  reason: string;
  refType: string | null;
  refId: string | null;
  createdAt: string;
};

export function fetchAdminTicketsJournal(limit = 50) {
  return apiFetch<{ items: AdminLedgerRow[] }>(`/api/v1/admin/tickets/journal?limit=${limit}`);
}

// ---------- PASS ADMIN ----------

export function fetchAdminPassList(status?: PassRecord["status"]) {
  const s = status ? `?status=${status}` : "";
  return apiFetch<{ items: PassRecord[] }>(`/api/v1/admin/pass/list${s}`);
}

export function activatePass(purchaseId: string) {
  return apiFetch<{ ok: true; purchase: PassRecord }>("/api/v1/admin/pass/activate", {
    method: "POST",
    body: JSON.stringify({ purchaseId }),
  });
}

export type { PassTier };

// ============================================================================
// NEWS (ADMIN)
// ============================================================================

export type AdminNewsItem = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  tag: string;
  coverUrl: string | null;
  metaTitle: string;
  metaDescription: string;
  ogImage: string | null;
  status: "draft" | "published";
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export function fetchAdminNews(params?: { search?: string; status?: "draft" | "published" | "all" }) {
  const qs = new URLSearchParams();
  if (params?.search) qs.set("search", params.search);
  if (params?.status) qs.set("status", params.status);
  const s = qs.toString();
  return apiFetch<{ items: AdminNewsItem[] }>(`/api/v1/admin/news${s ? `?${s}` : ""}`);
}

export function createAdminNews(data: Partial<AdminNewsItem>) {
  return apiFetch<AdminNewsItem>(`/api/v1/admin/news`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateAdminNews(id: string, data: Partial<AdminNewsItem>) {
  return apiFetch<AdminNewsItem>(`/api/v1/admin/news/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteAdminNews(id: string) {
  return apiFetch<{ ok: true }>(`/api/v1/admin/news/${id}`, { method: "DELETE" });
}

// ============================================================================
// XP / BADGES (ADMIN)
// ============================================================================

export function grantXp(nick: string, amount: number, reason: string) {
  return apiFetch<{ ok: true }>(`/api/v1/admin/xp/grant`, {
    method: "POST",
    body: JSON.stringify({ nick, amount, reason }),
  });
}

export type AdminBadge = {
  id: string;
  code: string;
  name: string;
  description: string;
  rarity: "common" | "rare" | "epic" | "legendary" | "mythic";
  category: "rank" | "club" | "pass" | "event" | "achievement" | "founder";
  issue: string | null;
  mintedOf: number | null;
  active: boolean;
  createdAt: string;
};

export function fetchAdminBadges() {
  return apiFetch<{ items: AdminBadge[] }>(`/api/v1/admin/badges`);
}

export function createAdminBadge(data: Partial<AdminBadge>) {
  return apiFetch<AdminBadge>(`/api/v1/admin/badges`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateAdminBadge(id: string, data: Partial<AdminBadge>) {
  return apiFetch<AdminBadge>(`/api/v1/admin/badges/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteAdminBadge(id: string) {
  return apiFetch<{ ok: true }>(`/api/v1/admin/badges/${id}`, { method: "DELETE" });
}

export function awardBadge(nick: string, badgeCode: string) {
  return apiFetch<{ ok: true; awarded: boolean }>(`/api/v1/admin/badges/award`, {
    method: "POST",
    body: JSON.stringify({ nick, badgeCode }),
  });
}

export function revokeBadge(nick: string, badgeCode: string) {
  return apiFetch<{ ok: true }>(`/api/v1/admin/badges/award`, {
    method: "DELETE",
    body: JSON.stringify({ nick, badgeCode }),
  });
}
