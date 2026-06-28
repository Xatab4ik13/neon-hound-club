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
  status: "pending_payment" | "active" | "expired" | "cancelled" | "superseded";
  paidAt: string | null;
  expiresAt: string | null;
  createdAt: string;
};

export type QuestKind = "one_time" | "monthly" | "ladder" | "manual";
export type QuestCategory =
  | "onboarding"
  | "ride"
  | "social"
  | "shop"
  | "ai"
  | "referral"
  | "app";

export type QuestLadderStep = { at: number; xp: number };

export type QuestItem = {
  id: string;
  code: string;
  title: string;
  description: string;
  category: QuestCategory;
  kind: QuestKind;
  xpReward: number;
  ticketsReward: number;
  goal: number;
  unit: string;
  actionLabel: string | null;
  actionTo: string | null;
  bonusNote: string | null;
  bloggerOnly: boolean;
  ladder: QuestLadderStep[] | null;
  progress: number;
  lastLadderStep: number;
  periodKey: string;
  completed: boolean;
  completedAt: string | null;
};

// ---------- SHOP TYPES ----------

export type ProductKind = "physical" | "preorder" | "virtual" | "digital";

export type ShopProductListItem = {
  id: string;
  slug: string;
  title: string;
  priceRub: number;
  bonusTickets: number;
  images: string[];
  stock: number | null;
  kind: ProductKind;
  categoryId: string | null;
  subcategoryId: string | null;
  preorderExpectedAt: string | null;
  sizes: Array<{ label: string; stock: number | null }>;
};

export type ShopProduct = ShopProductListItem & {
  description: string;
  active: boolean;
  digitalFileUrl: string | null;
  digitalFileName: string | null;
  shippingInfo: string;
  returnPolicy: string;
  /** Габариты посылки для СДЭК. Заполнены только у physical/preorder. */
  weightG: number | null;
  lengthCm: number | null;
  widthCm: number | null;
  heightCm: number | null;
  createdAt: string;
  updatedAt: string;
};

export type ShopCategory = {
  id: string;
  slug: string;
  name: string;
  sort: number;
  createdAt: string;
};

export type ShopSubcategory = {
  id: string;
  categoryId: string;
  slug: string;
  name: string;
  sort: number;
  createdAt: string;
};

export type ShopCategoryWithSubs = ShopCategory & { subs: ShopSubcategory[] };

export type ShopShowcaseItem = {
  id: string;
  slug: string;
  title: string;
  priceRub: number;
  bonusTickets: number;
  images: string[];
  stock: number | null;
  kind: ProductKind;
  preorderExpectedAt: string | null;
  sort: number;
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

export type ShopOrderPreview = {
  /** Названия первых позиций (snapshot). Максимум 3. */
  titles: string[];
  /** Обложка первого товара заказа. Null, если у товара нет картинок или товар удалён. */
  coverImage: string | null;
  /** Сумма qty по всем позициям заказа. */
  totalQty: number;
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
  cdekUuid: string | null;
  cdekStatusCode: string | null;
  cdekStatusName: string | null;
  cdekStatusAt: string | null;
  createdAt: string;
  updatedAt: string;
  paidAt: string | null;
  shippedAt: string | null;
  /** Дедлайн оплаты для status='pending_payment'. После него заказ сносится воркером. */
  expiresAt: string | null;
  /** Превью позиций заказа для карточки в списке. Доступно только в GET /shop/orders. */
  preview?: ShopOrderPreview;
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
  shopCategories: ["shop", "categories"] as const,
  shopShowcase: ["shop", "showcase"] as const,
  shopOrders: ["shop", "orders"] as const,
  shopOrder: (id: string) => ["shop", "order", id] as const,
  adminOrders: (status?: string) => ["admin", "orders", status ?? "all"] as const,
  adminOrder: (id: string) => ["admin", "order", id] as const,
  raffles: ["raffles", "list"] as const,
  raffle: (id: string) => ["raffles", "item", id] as const,
  myRaffles: ["raffles", "my"] as const,
  invitesMe: ["invites", "me"] as const,
  
};

// ---------- INVITES / REFERRALS ----------

export type InvitedFriendApi = {
  id: string;
  nick: string;
  status: "joined" | "active";
  ticketsRewarded: number;
  joinedAt: string;
  activatedAt: string | null;
};

export type InvitesMeResponse = {
  code: string;
  rewardTickets: number;
  totals: { total: number; active: number; tickets: number };
  items: InvitedFriendApi[];
};

export async function fetchInvitesMe() {
  return apiFetch<InvitesMeResponse>("/api/v1/invites/me");
}

export async function checkRefCode(code: string) {
  return apiFetch<{ valid: boolean }>(
    `/api/v1/invites/check?code=${encodeURIComponent(code)}`,
  );
}

// ---------- RAFFLES ----------

export type RaffleStatus = "draft" | "active" | "finished" | "cancelled";

export type RaffleListItem = {
  id: string;
  title: string;
  description: string;
  imageUrl: string | null;
  /** legacy подпись к карточке, не редактируется в новой админке. Может быть null. */
  prize: string | null;
  ticketCost: number;
  maxEntriesPerUser: number | null;
  showOnHome: boolean;
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

export type HomeRaffleItem = RaffleListItem & {
  totalEntries: number;
  prizes: { name: string; qty: number }[];
};

export async function fetchRaffles() {
  return apiFetch<{ items: RaffleListItem[] }>("/api/v1/raffles/");
}

export async function fetchHomeRaffles() {
  return apiFetch<{ items: HomeRaffleItem[] }>("/api/v1/raffles/home");
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
  return apiFetch<{ active: PassRecord | null; history: PassRecord[]; daysLeft: number | null; durationDays: number }>("/api/v1/pass/me");
}

export async function purchasePass(tier: PassTier, method: "card" | "sbp" = "card") {
  return apiFetch<{ purchase: PassRecord; paymentUrl: string | null }>(
    "/api/v1/pass/purchase",
    { method: "POST", body: JSON.stringify({ tier, method }) },
  );
}

// ---------- QUESTS ----------

export async function fetchQuests() {
  return apiFetch<{ items: QuestItem[] }>("/api/v1/quests/");
}

export async function checkQuest(code: string) {
  return apiFetch<
    | { credited: true; completionId: string; tickets: number; xp: number }
    | { credited: false; reason: string }
  >(`/api/v1/quests/${encodeURIComponent(code)}/check`, { method: "POST" });
}

export async function confirmPwaInstall() {
  return apiFetch<
    | { credited: true; completionId: string; tickets: number; xp: number }
    | { credited: false; reason: string }
  >(`/api/v1/quests/pwa_install/confirm`, { method: "POST" });
}

// ---------- SHOP ----------

export async function fetchShopProducts() {
  return apiFetch<{ items: ShopProductListItem[] }>("/api/v1/shop/products");
}

export async function fetchShopProduct(slug: string) {
  return apiFetch<ShopProduct>(`/api/v1/shop/products/${encodeURIComponent(slug)}`);
}

export async function fetchShopCategories() {
  return apiFetch<{ items: ShopCategoryWithSubs[] }>("/api/v1/shop/categories");
}

export async function fetchShopShowcase() {
  return apiFetch<{ items: ShopShowcaseItem[] }>("/api/v1/shop/showcase");
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

// ---------- ADMIN: ORDERS ----------

export async function fetchAdminOrders(
  status?: ShopOrderStatus,
  opts?: { page?: number; pageSize?: number },
) {
  const sp = new URLSearchParams();
  if (status) sp.set("status", status);
  if (opts?.page) sp.set("page", String(opts.page));
  if (opts?.pageSize) sp.set("pageSize", String(opts.pageSize));
  const qs = sp.toString();
  return apiFetch<{ items: ShopOrder[]; total: number; page: number; pageSize: number }>(
    `/api/v1/admin/shop/orders${qs ? `?${qs}` : ""}`,
  );
}

export async function fetchAdminOrder(id: string) {
  return apiFetch<ShopOrderWithItems>(`/api/v1/admin/shop/orders/${id}`);
}

export async function patchAdminOrder(
  id: string,
  patch: { status?: ShopOrderStatus; cdekTrack?: string | null },
) {
  return apiFetch<ShopOrderWithItems>(`/api/v1/admin/shop/orders/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export async function createCdekWaybill(orderId: string) {
  return apiFetch<{ cdekUuid: string; cdekNumber: string | null; order: ShopOrderWithItems }>(
    `/api/v1/admin/shop/orders/${orderId}/cdek/create`,
    { method: "POST" },
  );
}

export async function refreshCdekStatus(orderId: string) {
  return apiFetch<{
    cdekUuid: string;
    cdekNumber: string | null;
    statusCode: string | null;
    statusName: string | null;
    order: ShopOrderWithItems;
  }>(`/api/v1/admin/shop/orders/${orderId}/cdek/refresh`, { method: "POST" });

// ---------- PAYMENTS (Raiffeisen) ----------

export type PaymentStatus = "new" | "pending" | "authorized" | "confirmed" | "rejected" | "refunded";
export type PaymentMethod = "card" | "sbp";




export async function initOrderPayment(orderId: string, method: PaymentMethod = "card") {
  return apiFetch<{ paymentId: string; paymentUrl: string }>(
    `/api/v1/payments/order/${orderId}/init`,
    { method: "POST", body: JSON.stringify({ method }) },
  );
}

export async function initPassPayment(purchaseId: string, method: PaymentMethod = "card") {
  return apiFetch<{ paymentId: string; paymentUrl: string }>(
    `/api/v1/payments/pass/${purchaseId}/init`,
    { method: "POST", body: JSON.stringify({ method }) },
  );
}

export async function fetchPaymentStatus(paymentId: string) {
  return apiFetch<{
    id: string;
    status: PaymentStatus;
    refType: "pass" | "order";
    refId: string;
    amountRub: number;
    method: PaymentMethod;
  }>(`/api/v1/payments/${paymentId}/status`);
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
  /** 'text' — обычный коммент, 'sticker' — стикер, 'image' — фото-вложение. */
  kind?: "text" | "sticker" | "image";
  /** URL/id стикера, когда kind === 'sticker'. */
  stickerId?: string | null;
  /** URL картинки, когда kind === 'image'. */
  imageUrl?: string | null;
  /** id родительского коммента — для тредов. */
  parentId?: string | null;
  /** ISO-метка последнего редактирования; null если не редактировался. */
  editedAt?: string | null;
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

export type AddCommentInput =
  | { kind?: "text"; text: string; parentId?: string }
  | { kind: "sticker"; stickerId: string; parentId?: string }
  | { kind: "image"; imageUrl: string; text?: string; parentId?: string };

export function addComment(postId: string, input: string | AddCommentInput) {
  const body =
    typeof input === "string"
      ? { kind: "text" as const, text: input }
      : input;
  return apiFetch<FeedCommentHydrated>(`/api/v1/feed/${postId}/comments`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function editComment(commentId: string, text: string) {
  return apiFetch<{ id: string; text: string; editedAt: string }>(
    `/api/v1/feed/comments/${commentId}`,
    { method: "PATCH", body: JSON.stringify({ text }) },
  );
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

// ============================================================================
// HOME BANNERS — карусель на /club. Публичный read-only список.
// ============================================================================

export type HomeBanner = {
  id: string;
  title: string;
  eyebrow: string;
  ctaLabel: string;
  ctaHref: string;
  imageUrl: string;
  sort: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export function fetchHomeBanners() {
  return apiFetch<{ banners: HomeBanner[] }>(`/api/v1/home/banners/`);
}
