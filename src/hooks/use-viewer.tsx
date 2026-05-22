import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ME } from "@/data/profile";
import { apiFetch, ApiError } from "@/lib/api";

type Tier = "silver" | "gold" | "platinum" | null;

type SessionUser = {
  id: string;
  email: string;
  nick: string;
  role: "user" | "admin";
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

type ViewerContextValue = Viewer & {
  signIn: (email: string, password: string) => Promise<SessionUser>;
  signUp: (email: string, password: string, nick: string) => Promise<SessionUser>;
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

  const signIn = useCallback(
    async (email: string, password: string) => {
      const { user } = await apiFetch<{ user: SessionUser }>("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      qc.setQueryData(ME_KEY, user);
      return user;
    },
    [qc],
  );

  const signUp = useCallback(
    async (email: string, password: string, nick: string) => {
      const { user } = await apiFetch<{ user: SessionUser }>("/api/v1/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password, nick }),
      });
      qc.setQueryData(ME_KEY, user);
      return user;
    },
    [qc],
  );

  const signOutMutation = useMutation({
    mutationFn: () => apiFetch<{ ok: true }>("/api/v1/auth/logout", { method: "POST" }),
    onSettled: () => {
      qc.setQueryData(ME_KEY, null);
      qc.invalidateQueries({ queryKey: ME_KEY });
    },
  });

  const signOut = useCallback(async () => {
    await signOutMutation.mutateAsync();
  }, [signOutMutation]);

  const user = meQ.data ?? null;
  const isAuthed = !!user;

  const value = useMemo<ViewerContextValue>(
    () => ({
      isAuthed,
      user,
      nick: user?.nick ?? null,
      // Tier и tickets подменим, когда поднимем эндпоинты Hell Pass. Пока — мок только для залогиненных.
      tier: isAuthed ? "gold" : null,
      tickets: isAuthed ? ME.totals.tickets : 0,
      hydrated: meQ.isFetched,
      signIn,
      signUp,
      signOut,
    }),
    [isAuthed, user, meQ.isFetched, signIn, signUp, signOut],
  );

  return <ViewerContext.Provider value={value}>{children}</ViewerContext.Provider>;
}

export function useViewer() {
  const ctx = useContext(ViewerContext);
  if (!ctx) throw new Error("useViewer must be used inside <ViewerProvider>");
  return ctx;
}
