import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { getMyProfile } from "@/lib/profile.functions";

type Tier = "silver" | "gold" | "platinum" | null;

type Viewer = {
  isAuthed: boolean;
  userId: string | null;
  email: string | null;
  nick: string | null;
  avatarUrl: string | null;
  tier: Tier;
  tickets: number;
  /** false до завершения первичной гидратации сессии — нужно, чтобы шапка не «прыгала». */
  hydrated: boolean;
};

type ViewerContextValue = Viewer & {
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const ViewerContext = createContext<ViewerContextValue | null>(null);

type ProfileLite = { nick: string | null; avatarUrl: string | null };

export function ViewerProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileLite | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      const p = await getMyProfile();
      if (p) setProfile({ nick: p.nick, avatarUrl: p.avatarUrl ?? null });
      else setProfile(null);
    } catch {
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    // ВАЖНО: подписываемся ДО getSession, чтобы не пропустить ранний refresh.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s) {
        void loadProfile();
      } else {
        setProfile(null);
      }
      // Заставляем роутер перепройти beforeLoad-гейты (логин/логаут).
      void router.invalidate();
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setHydrated(true);
      if (data.session) void loadProfile();
    });

    return () => subscription.unsubscribe();
  }, [loadProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const value = useMemo<ViewerContextValue>(() => {
    const isAuthed = !!session;
    return {
      isAuthed,
      userId: session?.user.id ?? null,
      email: session?.user.email ?? null,
      nick: profile?.nick ?? null,
      avatarUrl: profile?.avatarUrl ?? null,
      // tier и tickets подключим, когда появятся таблицы passes / tickets_ledger.
      tier: null,
      tickets: 0,
      hydrated,
      signOut,
      refresh: loadProfile,
    };
  }, [session, profile, hydrated, signOut, loadProfile]);

  return <ViewerContext.Provider value={value}>{children}</ViewerContext.Provider>;
}

export function useViewer() {
  const ctx = useContext(ViewerContext);
  if (!ctx) throw new Error("useViewer must be used inside <ViewerProvider>");
  return ctx;
}
