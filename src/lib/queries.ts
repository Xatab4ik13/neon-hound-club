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
  wonPrizes: string[];
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

// ============================================================================
// NEWS (public)
// ============================================================================

export type NewsListItem = {
  slug: string;
  title: string;
  excerpt: string;
  tag: string;
  coverUrl: string | null;
  publishedAt: string | null;
};

export type NewsArticle = NewsListItem & {
  id: string;
  body: string;
  metaTitle: string;
  metaDescription: string;
  ogImage: string | null;
  status: "draft" | "published";
};

export function fetchNewsList(limit = 20) {
  return apiFetch<{ items: NewsListItem[] }>(`/api/v1/news?limit=${limit}`);
}

export function fetchNewsArticle(slug: string) {
  return apiFetch<NewsArticle>(`/api/v1/news/${slug}`);
}

// ============================================================================
// INVITES
// ============================================================================

export type InvitedFriend = {
  id: string;
  nick: string;
  status: "joined" | "active";
  ticketsRewarded: number;
  joinedAt: string;
  activatedAt: string | null;
};

export type MyInvitesResponse = {
  code: string;
  rewardTickets: number;
  totals: { total: number; active: number; tickets: number };
  items: InvitedFriend[];
};

export function fetchMyInvites() {
  return apiFetch<MyInvitesResponse>(`/api/v1/invites/me`);
}

// ============================================================================
// XP / RANK
// ============================================================================

export type RankInfo = {
  xp: number;
  rankIndex: number;
  rankId: string;
  rankLabel: string;
  nextLabel: string | null;
  pct: number;
  inRank: number;
  span: number;
  toNext: number;
  isMax: boolean;
};

export type XpEvent = {
  id: string;
  amount: number;
  source: string;
  reason: string;
  refType: string | null;
  refId: string | null;
  createdAt: string;
};

export function fetchMyRank() {
  return apiFetch<RankInfo>(`/api/v1/xp/me`);
}

export function fetchMyXpHistory(limit = 50) {
  return apiFetch<{ items: XpEvent[] }>(`/api/v1/xp/history?limit=${limit}`);
}

// ============================================================================
// BADGES
// ============================================================================

export type BadgeRarity = "common" | "rare" | "epic" | "legendary" | "mythic";
export type BadgeCategory = "rank" | "club" | "pass" | "event" | "achievement" | "founder";

export type CatalogBadge = {
  id: string;
  code: string;
  name: string;
  description: string;
  rarity: BadgeRarity;
  category: BadgeCategory;
  issue: string | null;
  mintedOf: number | null;
};

export type MyBadge = CatalogBadge & {
  badgeId: string;
  pinned: boolean;
  awardedAt: string;
};

export function fetchBadgesCatalog() {
  return apiFetch<{ items: CatalogBadge[] }>(`/api/v1/badges`);
}

export function fetchMyBadges() {
  return apiFetch<{ items: MyBadge[] }>(`/api/v1/badges/me`);
}

export function setBadgePinned(badgeId: string, pinned: boolean) {
  return apiFetch<MyBadge>(`/api/v1/badges/me/${badgeId}`, {
    method: "PATCH",
    body: JSON.stringify({ pinned }),
  });
}

// ---------- FEED / POSTS ----------

export type FeedAuthor = {
  id: string;
  nick: string;
  role: "user" | "admin" | "blogger";
  avatarUrl: string | null;
  city: string | null;
  rankId: string;
};

export type FeedPollOptionResult = { id: string; text: string; votes: number };

export type FeedPollHydrated = {
  question: string;
  anonymous: boolean;
  multi: boolean;
  closed: boolean;
  options: { id: string; text: string }[];
  results: FeedPollOptionResult[];
  myVote: string[];
};

export type FeedPostHydrated = {
  id: string;
  author: FeedAuthor;
  text: string;
  imageUrl: string | null;
  pinned: boolean;
  poll: FeedPollHydrated | null;
  likes: number;
  liked: boolean;
  commentsCount: number;
  createdAt: string;
  updatedAt: string;
};

export type FeedCommentHydrated = {
  id: string;
  text: string;
  likes: number;
  liked: boolean;
  createdAt: string;
  authorId: string;
  nick: string;
  role: "user" | "admin" | "blogger";
  avatarUrl: string | null;
  rankId: string;
};

export type FeedPostDetail = FeedPostHydrated & { comments: FeedCommentHydrated[] };

export type CreatePostInput = {
  text?: string;
  imageUrl?: string | null;
  pinned?: boolean;
  poll?: {
    question: string;
    anonymous: boolean;
    multi: boolean;
    closed: boolean;
    options: { id: string; text: string }[];
  } | null;
};

export function fetchFeed(params: { limit?: number; cursor?: string; author?: string } = {}) {
  const q = new URLSearchParams();
  if (params.limit) q.set("limit", String(params.limit));
  if (params.cursor) q.set("cursor", params.cursor);
  if (params.author) q.set("author", params.author);
  const qs = q.toString() ? `?${q}` : "";
  return apiFetch<{ items: FeedPostHydrated[]; nextCursor: string | null }>(`/api/v1/feed${qs}`);
}

export function fetchPost(id: string) {
  return apiFetch<FeedPostDetail>(`/api/v1/feed/${id}`);
}

export function likePost(id: string) {
  return apiFetch<{ ok: true }>(`/api/v1/feed/${id}/like`, { method: "POST" });
}
export function unlikePost(id: string) {
  return apiFetch<{ ok: true }>(`/api/v1/feed/${id}/like`, { method: "DELETE" });
}

export function addComment(postId: string, text: string) {
  return apiFetch<FeedCommentHydrated>(`/api/v1/feed/${postId}/comments`, {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}

export function deleteComment(commentId: string) {
  return apiFetch<{ ok: true }>(`/api/v1/feed/comments/${commentId}`, { method: "DELETE" });
}

export function votePoll(postId: string, optionIds: string[]) {
  return apiFetch<{ ok: true }>(`/api/v1/feed/${postId}/vote`, {
    method: "POST",
    body: JSON.stringify({ optionIds }),
  });
}
export function unvotePoll(postId: string) {
  return apiFetch<{ ok: true }>(`/api/v1/feed/${postId}/vote`, { method: "DELETE" });
}

export function likeComment(commentId: string) {
  return apiFetch<{ ok: true }>(`/api/v1/feed/comments/${commentId}/like`, { method: "POST" });
}
export function unlikeComment(commentId: string) {
  return apiFetch<{ ok: true }>(`/api/v1/feed/comments/${commentId}/like`, { method: "DELETE" });
}

// Blogger / Admin
export function createPost(input: CreatePostInput) {
  return apiFetch<FeedPostHydrated>(`/api/v1/posts`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}
export function patchPost(id: string, input: Partial<CreatePostInput>) {
  return apiFetch<FeedPostHydrated>(`/api/v1/posts/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}
export function deletePost(id: string) {
  return apiFetch<{ ok: true }>(`/api/v1/posts/${id}`, { method: "DELETE" });
}
