import { apiFetch } from "@/lib/api";

export type PromoCodeDto = {
  id: string;
  code: string;
  discountPct: number;
  userId: string | null;
  /** Товарный промокод: скидка только на этот товар (корзина = 1 шт. этого товара). */
  productId: string | null;
  /** Промокод на группу товаров (любой из них), например «любые носки». */
  productIds?: string[] | null;
  /** Название товара для товарного промокода (только в /promo/mine). */
  productTitle?: string | null;
  /** Названия всех целевых товаров (для группового промокода). */
  productTitles?: string[] | null;
  note: string | null;
  expiresAt: string | null;
  usedAt: string | null;
  usedOrderId?: string | null;
  active: boolean;
  createdAt: string;
  expired?: boolean;
};

export type AdminPromoCodeDto = PromoCodeDto & {
  userNick: string | null;
  userEmail: string | null;
  productTitle: string | null;
  productTitles?: string[] | null;
};

/** Сводка по активированным промокодам — «докупают ли что-то ещё». */
export type AdminPromoStats = {
  usedTotal: number;
  unusedTotal: number;
  withOrder: number;
  withExtras: number;
  extrasSharePct: number;
  revenueRub: number;
  extraRub: number;
  discountRub: number;
  shippingRub: number;
  avgOrderRub: number;
  avgExtraRub: number;
};

export type AdminPromoUsage = {
  promo: PromoCodeDto;
  order: {
    id: string;
    userId: string;
    nick: string | null;
    email: string | null;
    status: string;
    subtotalRub: number;
    discountRub: number;
    discountPct: number;
    totalRub: number;
    shippingPriceRub: number;
    shippingMode: string;
    bonusTicketsTotal: number;
    city: string | null;
    createdAt: string;
    paidAt: string | null;
    extraRub: number;
    items: Array<{
      id: string;
      productId: string | null;
      title: string;
      priceRub: number;
      qty: number;
      size: string | null;
      kind: string;
      isPromoTarget: boolean;
    }>;
  } | null;
};

export const promoQk = {
  mine: ["promo", "mine"] as const,
  admin: (userId?: string) => ["admin", "promo", userId ?? "all"] as const,
  adminStats: ["admin", "promo", "stats"] as const,
  adminUsage: (id: string) => ["admin", "promo", "usage", id] as const,
  adminCapsules: (status: string, q: string) => ["admin", "promo", "capsules", status, q] as const,
};

/** Капсула ×2 из HellSpin: выдача и факт активации. */
export type AdminCapsuleDto = {
  id: string;
  userId: string;
  nick: string | null;
  email: string | null;
  grantedAt: string;
  expiresAt: string;
  usedAt: string | null;
  usedOrderId: string | null;
  bonusTickets: number;
  orderTotalRub: number | null;
  status: "active" | "used" | "expired";
};

export type AdminCapsulesResponse = {
  items: AdminCapsuleDto[];
  stats: { total: number; used: number; active: number; bonusTickets: number };
};

export async function adminListCapsules(params: { status?: string; q?: string } = {}) {
  const qs = new URLSearchParams({ status: params.status || "all" });
  if (params.q) qs.set("q", params.q);
  return apiFetch<AdminCapsulesResponse>(`/api/v1/admin/promo/capsules?${qs.toString()}`);
}

export async function adminPromoStats() {
  return apiFetch<AdminPromoStats>("/api/v1/admin/promo/stats");
}

export async function adminPromoUsage(id: string) {
  return apiFetch<AdminPromoUsage>(`/api/v1/admin/promo/${id}/usage`);
}


/** Мои промокоды — вкладка «Промокоды» в профиле. */
export async function fetchMyPromoCodes() {
  return apiFetch<{ items: PromoCodeDto[] }>("/api/v1/promo/mine");
}

export type PromoValidateResult = {
  ok: true;
  code: string;
  discountPct: number;
  /** Не null — товарный промокод: скидка только на этот товар, билеты не начисляются. */
  productId: string | null;
  /** Группа товаров: скидка на 1 шт. самого дорогого из них в корзине. */
  productIds?: string[] | null;
  expiresAt: string | null;
};

/**
 * Проверка промокода на чекауте. Бросает Error с текстом из бэка.
 * items — корзина: нужна для товарных промокодов (ровно 1 шт. нужного товара).
 */
export async function validatePromoCode(
  code: string,
  items?: Array<{ productId: string; qty: number }>,
) {
  return apiFetch<PromoValidateResult>("/api/v1/promo/validate", {
    method: "POST",
    body: JSON.stringify({ code, items }),
  });
}

// ===== Админка =====

export async function adminListPromoCodes(userId?: string) {
  const qs = userId ? `?userId=${encodeURIComponent(userId)}` : "";
  return apiFetch<{ items: AdminPromoCodeDto[] }>(`/api/v1/admin/promo${qs}`);
}

export async function adminCreatePromoCode(input: {
  code?: string;
  discountPct: number;
  userId?: string | null;
  productId?: string | null;
  productIds?: string[] | null;
  note?: string;
  expiresAt?: string | null;
}) {
  return apiFetch<{ promo: AdminPromoCodeDto }>("/api/v1/admin/promo", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function adminUpdatePromoCode(
  id: string,
  patch: {
    discountPct?: number;
    expiresAt?: string | null;
    active?: boolean;
    note?: string | null;
    productId?: string | null;
    productIds?: string[] | null;
  },
) {
  return apiFetch<{ promo: AdminPromoCodeDto }>(`/api/v1/admin/promo/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export async function adminDeletePromoCode(id: string) {
  return apiFetch<{ ok: true }>(`/api/v1/admin/promo/${id}`, { method: "DELETE" });
}

/** Товары, на которые действует промокод. Пусто — на всю корзину. */
export function promoTargetIds(p: {
  productId: string | null;
  productIds?: string[] | null;
}): string[] {
  if (p.productIds && p.productIds.length > 0) return p.productIds;
  return p.productId ? [p.productId] : [];
}

/** Человеческое описание, на что действует промокод. */
export function promoTargetLabel(p: {
  productId: string | null;
  productIds?: string[] | null;
  productTitle?: string | null;
  productTitles?: string[] | null;
}): string | null {
  const titles = p.productTitles && p.productTitles.length > 0
    ? p.productTitles
    : p.productTitle
      ? [p.productTitle]
      : [];
  if (promoTargetIds(p).length === 0) return null;
  if (titles.length === 0) return "товар";
  if (titles.length === 1) return titles[0]!;
  return titles.join(" / ");
}
