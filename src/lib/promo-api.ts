import { apiFetch } from "@/lib/api";

export type PromoCodeDto = {
  id: string;
  code: string;
  discountPct: number;
  userId: string | null;
  /** Товарный промокод: скидка только на этот товар (корзина = 1 шт. этого товара). */
  productId: string | null;
  note: string | null;
  expiresAt: string | null;
  usedAt: string | null;
  active: boolean;
  createdAt: string;
  expired?: boolean;
};

export type AdminPromoCodeDto = PromoCodeDto & {
  userNick: string | null;
  userEmail: string | null;
  productTitle: string | null;
};

export const promoQk = {
  mine: ["promo", "mine"] as const,
  admin: (userId?: string) => ["admin", "promo", userId ?? "all"] as const,
};

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
