import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, ApiError } from "@/lib/api";
import {
  fetchPassMe,
  fetchTicketsBalance,
  qk,
  type PassTier,
} from "@/lib/queries";

type Tier = PassTier | null;

type SessionUser = {
  id: string;
  email: string;
  nick: string;
  role: "user" | "admin" | "blogger";
};

type Viewer = {
  isAuthed: boolean;
  user: SessionUser | null;
  nick: string | null;
  tier: Tier;
  tickets: number;
  /** false пока React Query не успела сходить за /me — нужно чтобы хедер не «прыгал». */
  hydrated: boolean;
};

export type SignUpResult = { ok: true; pendingVerification: true; email: string };

type ViewerContextValue = Viewer & {
  signIn: (email: string, password: string) => Promise<SessionUser>;
  signUp: (email: string, password: string, nick: string) => Promise<SignUpResult>;
  resendVerification: (email: string) => Promise<void>;
  refetchMe: () => Promise<void>;
  signOut: () => Promise<void>;
};

const ViewerContext = createContext<ViewerContextValue | null>(null);

const ME_KEY = ["auth", "me"] as const;

async function fetchMe(): Promise<SessionUser | null> {
  try {
    const res = await apiFetch<{ user: SessionUser }>("/api/v1/auth/me");
    return res.user;
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) return null;
    throw e;
  }
}

export function ViewerProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();

  const meQ = useQuery({
    queryKey: ME_KEY,
    queryFn: fetchMe,
    enabled: typeof window !== "undefined",
    staleTime: 60_000,
    retry: false,
  });

  const isAuthed = !!meQ.data;

  // Подтягиваем реальный pass и баланс — но только для залогиненных.
  const passQ = useQuery({
    queryKey: qk.passMe,
    queryFn: fetchPassMe,
    enabled: isAuthed,
    staleTime: 30_000,
    retry: false,
  });

  const balanceQ = useQuery({
    queryKey: qk.ticketsBalance,
    queryFn: fetchTicketsBalance,
    enabled: isAuthed,
    staleTime: 30_000,
    retry: false,
  });

  const signIn = useCallback(
    async (email: string, password: string) => {
      const { user } = await apiFetch<{ user: SessionUser }>("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      qc.setQueryData(ME_KEY, user);
      // После логина — освежить зависящие данные.
      qc.invalidateQueries({ queryKey: qk.passMe });
      qc.invalidateQueries({ queryKey: qk.ticketsBalance });
      return user;
    },
    [qc],
  );

  const signUp = useCallback(
    async (email: string, password: string, nick: string) => {
      const { getPendingRef, clearPendingRef } = await import("@/data/referral");
      const ref = getPendingRef();
      const res = await apiFetch<{ ok: true; pendingVerification: true; email: string }>(
        "/api/v1/auth/register",
        {
          method: "POST",
          body: JSON.stringify(ref ? { email, password, nick, ref } : { email, password, nick }),
        },
      );
      if (ref) clearPendingRef();
      return res;
    },
    [],
  );

  const resendVerification = useCallback(async (email: string) => {
    await apiFetch<{ ok: true }>("/api/v1/auth/resend-verification", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  }, []);

  const signOutMutation = useMutation({
    mutationFn: () => apiFetch<{ ok: true }>("/api/v1/auth/logout", { method: "POST" }),
    onSettled: () => {
      qc.setQueryData(ME_KEY, null);
      qc.invalidateQueries({ queryKey: ME_KEY });
      qc.removeQueries({ queryKey: qk.passMe });
      qc.removeQueries({ queryKey: qk.ticketsBalance });
    },
  });

  const signOut = useCallback(async () => {
    await signOutMutation.mutateAsync();
  }, [signOutMutation]);

  const user = meQ.data ?? null;
  const tier: Tier = passQ.data?.active?.tier ?? null;
  const tickets = balanceQ.data?.balance ?? 0;

  const value = useMemo<ViewerContextValue>(
    () => ({
      isAuthed,
      user,
      nick: user?.nick ?? null,
      tier,
      tickets,
      hydrated: meQ.isFetched,
      signIn,
      signUp,
      resendVerification,
      refetchMe: async () => {
        await Promise.all([
          qc.invalidateQueries({ queryKey: ME_KEY }),
          qc.invalidateQueries({ queryKey: qk.passMe }),
          qc.invalidateQueries({ queryKey: qk.ticketsBalance }),
        ]);
      },
      signOut,
    }),
    [isAuthed, user, tier, tickets, meQ.isFetched, signIn, signUp, resendVerification, signOut, qc],
  );

  return <ViewerContext.Provider value={value}>{children}</ViewerContext.Provider>;
}

export function useViewer() {
  const ctx = useContext(ViewerContext);
  if (!ctx) throw new Error("useViewer must be used inside <ViewerProvider>");
  return ctx;
}
