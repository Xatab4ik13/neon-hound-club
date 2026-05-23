// Реферальная программа — поверх бекенда (/api/v1/invites/me).
// Реф-код сохраняем при заходе по ?ref=... в localStorage,
// чтобы прокинуть на /api/v1/auth/register.

import { useQuery } from "@tanstack/react-query";
import { useViewer } from "@/hooks/use-viewer";
import { fetchInvitesMe, qk, type InvitedFriendApi } from "@/lib/queries";

const PENDING_REF_KEY = "hellhound:pending_ref";

/** Сколько билетов выдаётся обоим (статика для UI; источник истины — бекенд). */
export const REFERRAL_REWARD_TICKETS = 1;

/** Захватываем ?ref=... из URL и кладём в localStorage. Вызывается один раз при загрузке приложения. */
export function captureRefFromUrl() {
  if (typeof window === "undefined") return;
  try {
    const url = new URL(window.location.href);
    const ref = url.searchParams.get("ref");
    if (ref) {
      const clean = ref.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 40);
      if (clean) localStorage.setItem(PENDING_REF_KEY, clean);
    }
  } catch {
    /* noop */
  }
}

export function getPendingRef(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(PENDING_REF_KEY);
  } catch {
    return null;
  }
}

export function clearPendingRef() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(PENDING_REF_KEY);
  } catch {
    /* noop */
  }
}

export function buildReferralUrl(code: string, origin?: string) {
  const base =
    origin ??
    (typeof window !== "undefined"
      ? window.location.origin
      : "https://hhr.pro");
  return `${base}/?ref=${code}`;
}

export type InvitedFriend = InvitedFriendApi;

/** Хук: мой реф-код, список приглашённых, статы. Без авторизации — пусто. */
export function useInvitesMe() {
  const { isAuthed } = useViewer();
  return useQuery({
    queryKey: qk.invitesMe,
    queryFn: fetchInvitesMe,
    enabled: isAuthed,
    staleTime: 60_000,
  });
}
