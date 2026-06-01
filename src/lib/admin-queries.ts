// ============================================================================
// ADMIN — отдельный модуль, чтобы не мешать клиентским запросам.
// Все endpoint'ы под /api/v1/admin/* требуют роли admin (проверка на бэке).
// ============================================================================

import { apiFetch } from "@/lib/api";
import type {
  LedgerEntry,
  PassRecord,
  PassTier,
  ProductKind,
  RaffleListItem,
  RaffleStatus,
  ShopCategoryWithSubs,
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
  shopCategories: ["admin", "shop", "categories"] as const,
  shopShowcase: ["admin", "shop", "showcase"] as const,
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
  totalSpentRub: number;
  ordersCount: number;
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

export type AdminRaffleWinner = {
  id: string;
  createdAt: string;
  prizeId: string;
  prizeName: string;
  userId: string;
  nick: string;
  email: string;
  phone: string | null;
  city: string | null;
  avatarUrl: string | null;
};

export type AdminListPage<T> = { items: T[]; total: number; page: number; pageSize: number };

export function fetchAdminUsers(opts?: { q?: string; page?: number; pageSize?: number }) {
  const sp = new URLSearchParams();
  if (opts?.q) sp.set("q", opts.q);
  if (opts?.page) sp.set("page", String(opts.page));
  if (opts?.pageSize) sp.set("pageSize", String(opts.pageSize));
  const qs = sp.toString();
  return apiFetch<AdminListPage<AdminUserListItem>>(
    `/api/v1/admin/users/${qs ? `?${qs}` : ""}`,
  );
}

export function fetchAdminUser(id: string) {
  return apiFetch<AdminUserDetail>(`/api/v1/admin/users/${id}`);
}

export function patchAdminUser(
  id: string,
  patch: { role?: "user" | "blogger"; blocked?: boolean },
) {
  return apiFetch<{ id: string; nick: string; role: "user" | "blogger"; blocked: boolean }>(
    `/api/v1/admin/users/${id}`,
    { method: "PATCH", body: JSON.stringify(patch) },
  );
}

// ---------- ADMIN STAFF (команда админки) ----------

export type AdminStaffItem = {
  id: string;
  email: string;
  nick: string;
  role: "admin";
  blocked: boolean;
  createdAt: string;
};

export function fetchAdminStaff() {
  return apiFetch<{ items: AdminStaffItem[] }>(`/api/v1/admin/staff/`);
}

export function createAdminStaff(input: { email: string; password: string; nick: string }) {
  return apiFetch<AdminStaffItem>(`/api/v1/admin/staff/`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function deleteAdminStaff(id: string) {
  return apiFetch<{ ok: true }>(`/api/v1/admin/staff/${id}`, { method: "DELETE" });
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
  kind?: ProductKind;
  categoryId?: string | null;
  subcategoryId?: string | null;
  digitalFileUrl?: string | null;
  digitalFileName?: string | null;
  /** ISO datetime, only for kind === 'preorder' */
  preorderExpectedAt?: string | null;
  shippingInfo?: string;
  returnPolicy?: string;
  sizes?: Array<{ label: string; stock: number | null }>;
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

// ---------- SHOP: CATEGORIES ----------

export function fetchAdminShopCategories() {
  return apiFetch<{ items: ShopCategoryWithSubs[] }>("/api/v1/admin/shop/categories");
}

export function createAdminShopCategory(input: { slug: string; name: string; sort?: number }) {
  return apiFetch<{ id: string }>("/api/v1/admin/shop/categories", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function patchAdminShopCategory(
  id: string,
  patch: { slug?: string; name?: string; sort?: number },
) {
  return apiFetch<{ id: string }>(`/api/v1/admin/shop/categories/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export function deleteAdminShopCategory(id: string) {
  return apiFetch<{ ok: true }>(`/api/v1/admin/shop/categories/${id}`, { method: "DELETE" });
}

export function createAdminShopSubcategory(input: {
  categoryId: string;
  slug: string;
  name: string;
  sort?: number;
}) {
  return apiFetch<{ id: string }>("/api/v1/admin/shop/subcategories", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function patchAdminShopSubcategory(
  id: string,
  patch: { slug?: string; name?: string; sort?: number },
) {
  return apiFetch<{ id: string }>(`/api/v1/admin/shop/subcategories/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export function deleteAdminShopSubcategory(id: string) {
  return apiFetch<{ ok: true }>(`/api/v1/admin/shop/subcategories/${id}`, { method: "DELETE" });
}

// ---------- SHOP: SHOWCASE ----------

export function fetchAdminShopShowcase() {
  return apiFetch<{ items: { productId: string; sort: number }[] }>(
    "/api/v1/admin/shop/showcase",
  );
}

export function putAdminShopShowcase(items: { productId: string; sort: number }[]) {
  return apiFetch<{ ok: true; count: number }>("/api/v1/admin/shop/showcase", {
    method: "PUT",
    body: JSON.stringify({ items }),
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
  maxEntriesPerUser?: number | null;
  showOnHome?: boolean;
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

export function fetchAdminRaffleWinners(id: string) {
  return apiFetch<{ raffle: { id: string; title: string }; items: AdminRaffleWinner[] }>(
    `/api/v1/admin/raffles/${id}/winners`,
  );
}

export function deleteAdminRaffle(id: string) {
  return apiFetch<{ ok: true }>(`/api/v1/admin/raffles/${id}`, { method: "DELETE" });
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

export function giftPass(userId: string, tier: "silver" | "gold" | "platinum") {
  return apiFetch<{ ok: true; tier: string; purchaseId: string }>(
    `/api/v1/admin/users/${userId}/gift-pass`,
    { method: "POST", body: JSON.stringify({ tier }) },
  );
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

export function fetchAdminTicketsJournal(opts?: { page?: number; pageSize?: number }) {
  const sp = new URLSearchParams();
  if (opts?.page) sp.set("page", String(opts.page));
  if (opts?.pageSize) sp.set("pageSize", String(opts.pageSize));
  const qs = sp.toString();
  return apiFetch<AdminListPage<AdminLedgerRow>>(
    `/api/v1/admin/tickets/journal${qs ? `?${qs}` : ""}`,
  );
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

// ============================================================================
// DASHBOARD
// ============================================================================

export type AdminDashboard = {
  kpi: {
    revenue30d: number;
    passActive: number;
    newUsers7d: number;
    ticketsInCirculation: number;
    rafflesActive: number;
    rafflesBankTickets: number;
    orders7d: number;
  };
  lastOrders: { id: string; status: string; totalRub: number; createdAt: string; nick: string }[];
  rafflesSoon: { id: string; title: string; prize: string | null; endsAt: string; entries: number }[];
  passExpiring: { id: string; tier: string; expiresAt: string; nick: string }[];
  topProducts: { productId: string | null; title: string; qty: number; revenue: number }[];
};

export function fetchAdminDashboard() {
  return apiFetch<AdminDashboard>(`/api/v1/admin/dashboard/`);
}




export type EconomyOperation = {
  id: string;
  occurredAt: string;
  type: "income" | "expense";
  category: string;
  amountRub: number;
  note: string;
  source: "manual" | "auto";
  refType: string | null;
  refId: string | null;
  createdAt: string;
};

export type EconomyCategory = {
  id: string;
  name: string;
  kind: "income" | "expense";
  isSystem: boolean;
};

export type EconomyPartner = {
  id: string;
  name: string;
  share: number;
  sort: number;
};

export type EconomyOverview = {
  income: number;
  expense: number;
  profit: number;
  monthly: { month: string; income: number; expense: number }[];
};

export function fetchEconomyOverview() {
  return apiFetch<EconomyOverview>(`/api/v1/admin/economy/overview`);
}
export function fetchEconomyOperations(params?: { type?: "income" | "expense" | "all"; category?: string }) {
  const qs = new URLSearchParams();
  if (params?.type && params.type !== "all") qs.set("type", params.type);
  if (params?.category) qs.set("category", params.category);
  const s = qs.toString();
  return apiFetch<{ items: EconomyOperation[] }>(`/api/v1/admin/economy/operations${s ? `?${s}` : ""}`);
}
export function createEconomyOperation(data: {
  type: "income" | "expense";
  category: string;
  amountRub: number;
  note?: string;
  occurredAt?: string;
}) {
  return apiFetch<EconomyOperation>(`/api/v1/admin/economy/operations`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}
export function patchEconomyOperation(id: string, data: Partial<EconomyOperation>) {
  return apiFetch<EconomyOperation>(`/api/v1/admin/economy/operations/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}
export function deleteEconomyOperation(id: string) {
  return apiFetch<{ ok: true }>(`/api/v1/admin/economy/operations/${id}`, { method: "DELETE" });
}

export function fetchEconomyCategories() {
  return apiFetch<{ items: EconomyCategory[] }>(`/api/v1/admin/economy/categories`);
}
export function createEconomyCategory(data: { name: string; kind: "income" | "expense" }) {
  return apiFetch<EconomyCategory>(`/api/v1/admin/economy/categories`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}
export function deleteEconomyCategory(id: string) {
  return apiFetch<{ ok: true }>(`/api/v1/admin/economy/categories/${id}`, { method: "DELETE" });
}

export function fetchEconomyPartners() {
  return apiFetch<{ items: EconomyPartner[]; totalShare: number }>(`/api/v1/admin/economy/partners`);
}
export function createEconomyPartner(data: { name: string; share: number }) {
  return apiFetch<EconomyPartner>(`/api/v1/admin/economy/partners`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}
export function patchEconomyPartner(id: string, data: { name?: string; share?: number }) {
  return apiFetch<EconomyPartner>(`/api/v1/admin/economy/partners/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}
export function deleteEconomyPartner(id: string) {
  return apiFetch<{ ok: true }>(`/api/v1/admin/economy/partners/${id}`, { method: "DELETE" });
}

// ============================================================================
// SYSTEM SETTINGS
// ============================================================================

export type SystemSettings = {
  maintenance: { enabled: boolean; message: string };
  club: { name: string; contact_email: string; support_url: string };
  hell_ai: { limit_silver: number; limit_gold: number; limit_platinum: number };
  admin_alerts: { new_orders: boolean; new_users: boolean };
};

export function fetchAdminSettings() {
  return apiFetch<SystemSettings>(`/api/v1/admin/settings/`);
}
export function putAdminSetting<K extends keyof SystemSettings>(
  key: K,
  value: SystemSettings[K],
) {
  return apiFetch(`/api/v1/admin/settings/${key}`, {
    method: "PUT",
    body: JSON.stringify(value),
  });
}

// ============================================================================
// HOME BANNERS (admin)
// ============================================================================

import type { HomeBanner } from "@/lib/queries";

export const adminHomeBannersQk = ["admin", "home-banners"] as const;

export type HomeBannerInput = {
  title: string;
  eyebrow?: string;
  ctaLabel?: string;
  ctaHref: string;
  imageUrl: string;
  sort?: number;
  active?: boolean;
};

export function fetchAdminHomeBanners() {
  return apiFetch<{ banners: HomeBanner[] }>(`/api/v1/admin/home/banners/`);
}

export function createAdminHomeBanner(input: HomeBannerInput) {
  return apiFetch<{ banner: HomeBanner }>(`/api/v1/admin/home/banners/`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function patchAdminHomeBanner(id: string, patch: Partial<HomeBannerInput>) {
  return apiFetch<{ banner: HomeBanner }>(`/api/v1/admin/home/banners/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export function deleteAdminHomeBanner(id: string) {
  return apiFetch<{ ok: true }>(`/api/v1/admin/home/banners/${id}`, { method: "DELETE" });
}
