// Отдельный контекст сессии админки. Живёт только под /admin, ходит на
// /api/v1/auth/admin/* и использует отдельную cookie hh_admin_sid.
// Изолирован от useViewer() (клуб) — чтобы вход в админку не светил
// админский профиль в шапке клуба.

import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, ApiError } from "@/lib/api";

type AdminUser = {
  id: string;
  email: string;
  nick: string;
  role: "admin";
};

type AdminViewer = {
  isAuthed: boolean;
  user: AdminUser | null;
  hydrated: boolean;
};

type AdminViewerContextValue = AdminViewer & {
  signIn: (email: string, password: string) => Promise<AdminUser>;
  signOut: () => Promise<void>;
};

const AdminViewerContext = createContext<AdminViewerContextValue | null>(null);

const ADMIN_ME_KEY = ["admin-auth", "me"] as const;

async function fetchAdminMe(): Promise<AdminUser | null> {
  try {
    const res = await apiFetch<{ user: AdminUser }>("/api/v1/auth/admin/me");
    return res.user;
  } catch (e) {
    if (e instanceof ApiError && (e.status === 401 || e.status === 403)) return null;
    throw e;
  }
}

export function AdminViewerProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();

  const meQ = useQuery({
    queryKey: ADMIN_ME_KEY,
    queryFn: fetchAdminMe,
    enabled: typeof window !== "undefined",
    staleTime: 60_000,
    retry: false,
  });

  const signIn = useCallback(
    async (email: string, password: string) => {
      const res = await apiFetch<{ user: AdminUser }>("/api/v1/auth/admin/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      qc.setQueryData(ADMIN_ME_KEY, res.user);
      return res.user;
    },
    [qc],
  );

  const signOutMutation = useMutation({
    mutationFn: () => apiFetch<{ ok: true }>("/api/v1/auth/admin/logout", { method: "POST" }),
    onSettled: () => {
      qc.setQueryData(ADMIN_ME_KEY, null);
      qc.invalidateQueries({ queryKey: ADMIN_ME_KEY });
    },
  });

  const signOut = useCallback(async () => {
    await signOutMutation.mutateAsync();
  }, [signOutMutation]);

  const user = meQ.data ?? null;

  const value = useMemo<AdminViewerContextValue>(
    () => ({
      isAuthed: !!user,
      user,
      hydrated: meQ.isFetched,
      signIn,
      signOut,
    }),
    [user, meQ.isFetched, signIn, signOut],
  );

  return <AdminViewerContext.Provider value={value}>{children}</AdminViewerContext.Provider>;
}

export function useAdminViewer() {
  const ctx = useContext(AdminViewerContext);
  if (!ctx) throw new Error("useAdminViewer must be used inside <AdminViewerProvider>");
  return ctx;
}
