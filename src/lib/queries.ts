// Единая точка для React Query-ключей и factory-функций для бэк-эндпоинтов.
// Тонкая обёртка вокруг apiFetch — никакой бизнес-логики, только формы запросов и ответов.

import { apiFetch } from "@/lib/api";

// ---------- TYPES (синхронны с server/src/db/schema) ----------

export type BackendTicketSource =
  | "admin"
  | "quest"
  | "product_bonus"
  | "pass_monthly"
  | "raffle_entry"
  | "refund";

export type LedgerEntry = {
  id: string;
  amount: number; // > 0 начислено, < 0 списано
  source: BackendTicketSource;
  reason: string;
  refType: string | null;
  refId: string | null;
  createdAt: string; // ISO
};

export type PassTier = "silver" | "gold" | "platinum";

export type PassTierInfo = {
  tier: PassTier;
  priceRub: number;
  tickets: number;
  aiQuestions: number | null;
};

export type PassRecord = {
  id: string;
  userId: string;
  tier: PassTier;
  priceRub: number;
  ticketsGranted: number;
  status: "pending_payment" | "active" | "expired" | "cancelled";
  paidAt: string | null;
  expiresAt: string | null;
  createdAt: string;
};

export type QuestItem = {
  id: string;
  code: string;
  title: string;
  description: string;
  ticketsReward: number;
  kind: "auto" | "manual";
  repeatable: boolean;
  completed: boolean;
  completedAt: string | null;
};

// ---------- SHOP TYPES ----------

export type ShopProductListItem = {
  id: string;
  slug: string;
  title: string;
  priceRub: number;
  bonusTickets: number;
  images: string[];
  stock: number | null;
};

export type ShopProduct = ShopProductListItem & {
  description: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ShopOrderStatus =
  | "pending_payment"
  | "paid"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";

export type ShopOrderShipping = {
  fio: string;
  phone: string;
  city: string;
  address: string;
  postalCode?: string;
};

export type ShopOrder = {
  id: string;
  userId: string;
  status: ShopOrderStatus;
  totalRub: number;
  bonusTicketsTotal: number;
  shipping: ShopOrderShipping;
  comment: string | null;
  cdekTrack: string | null;
  createdAt: string;
  updatedAt: string;
  paidAt: string | null;
  shippedAt: string | null;
};

export type ShopOrderItem = {
  id: string;
  orderId: string;
  productId: string | null;
  titleSnapshot: string;
  priceRubSnapshot: number;
  bonusTicketsSnapshot: number;
  qty: number;
  createdAt: string;
};

export type ShopOrderWithItems = ShopOrder & { items: ShopOrderItem[] };

// ---------- KEYS ----------

export const qk = {
  ticketsBalance: ["tickets", "balance"] as const,
  ticketsHistory: (limit = 30) => ["tickets", "history", limit] as const,
  passTiers: ["pass", "tiers"] as const,
  passMe: ["pass", "me"] as const,
  quests: ["quests", "list"] as const,
  shopProducts: ["shop", "products"] as const,
  shopProduct: (slug: string) => ["shop", "product", slug] as const,
  shopOrders: ["shop", "orders"] as const,
  shopOrder: (id: string) => ["shop", "order", id] as const,
  raffles: ["raffles", "list"] as const,
  raffle: (id: string) => ["raffles", "item", id] as const,
  myRaffles: ["raffles", "my"] as const,
};

// ---------- RAFFLES ----------

export type RaffleStatus = "draft" | "active" | "finished" | "cancelled";

export type RaffleListItem = {
  id: string;
  title: string;
  description: string;
  imageUrl: string | null;
  prize: string;
  ticketCost: number;
  maxEntriesPerUser: number | null;
  startsAt: string;
  endsAt: string;
  status: RaffleStatus;
  winnerUserId: string | null;
  winnerEntryId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RaffleDetail = RaffleListItem & {
  totalEntries: number;
  myEntries: number;
  winnerNick: string | null;
};

export type MyRaffleItem = RaffleListItem & {
  myEntries: number;
  won: boolean;
  winnerNick: string | null;
};

export async function fetchRaffles() {
  return apiFetch<{ items: RaffleListItem[] }>("/api/v1/raffles/");
}

export async function fetchRaffle(id: string) {
  return apiFetch<RaffleDetail>(`/api/v1/raffles/${id}`);
}

export async function fetchMyRaffles() {
  return apiFetch<{ items: MyRaffleItem[] }>("/api/v1/raffles/my");
}

export async function enterRaffle(id: string) {
  return apiFetch<{ ok: true; entryId: string; balance: number }>(
    `/api/v1/raffles/${id}/enter`,
    { method: "POST" },
  );
}

// ---------- TICKETS ----------

export async function fetchTicketsBalance() {
  return apiFetch<{ balance: number }>("/api/v1/tickets/balance");
}

export async function fetchTicketsHistory(limit = 30) {
  return apiFetch<{ items: LedgerEntry[]; nextCursor: string | null }>(
    `/api/v1/tickets/history?limit=${limit}`,
  );
}

// ---------- HELL PASS ----------

export async function fetchPassTiers() {
  return apiFetch<{ durationDays: number; tiers: PassTierInfo[] }>("/api/v1/pass/tiers");
}

export async function fetchPassMe() {
  return apiFetch<{ active: PassRecord | null; history: PassRecord[] }>("/api/v1/pass/me");
}

export async function purchasePass(tier: PassTier) {
  return apiFetch<{ purchase: PassRecord; paymentUrl: string | null }>(
    "/api/v1/pass/purchase",
    { method: "POST", body: JSON.stringify({ tier }) },
  );
}

// ---------- QUESTS ----------

export async function fetchQuests() {
  return apiFetch<{ items: QuestItem[] }>("/api/v1/quests/");
}

export async function checkQuest(code: string) {
  return apiFetch<
    | { credited: true; completionId: string; tickets: number }
    | { credited: false; reason: string }
  >(`/api/v1/quests/${encodeURIComponent(code)}/check`, { method: "POST" });
}

// ---------- SHOP ----------

export async function fetchShopProducts() {
  return apiFetch<{ items: ShopProductListItem[] }>("/api/v1/shop/products");
}

export async function fetchShopProduct(slug: string) {
  return apiFetch<ShopProduct>(`/api/v1/shop/products/${encodeURIComponent(slug)}`);
}

export async function fetchMyOrders() {
  return apiFetch<{ items: ShopOrder[] }>("/api/v1/shop/orders");
}

export async function fetchMyOrder(id: string) {
  return apiFetch<ShopOrderWithItems>(`/api/v1/shop/orders/${id}`);
}

export type CreateOrderInput = {
  items: { productId: string; qty: number }[];
  shipping: ShopOrderShipping;
  comment?: string;
};

export async function createOrder(input: CreateOrderInput) {
  return apiFetch<ShopOrderWithItems>("/api/v1/shop/orders", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
