import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { ME } from "@/data/profile";

type Tier = "silver" | "gold" | "platinum" | null;

type Viewer = {
  isAuthed: boolean;
  nick: string | null;
  tier: Tier;
  tickets: number;
  /** false до тех пор пока не прочитали localStorage — нужно чтобы хедер не «прыгал». */
  hydrated: boolean;
};

type ViewerContextValue = Viewer & {
  /** Dev-only: переключатель «гость / участник». Удалить, когда подключим реальный auth. */
  toggleAuth: () => void;
  signOut: () => void;
};

const STORAGE_KEY = "hh:viewer:isAuthed";

const ViewerContext = createContext<ViewerContextValue | null>(null);

function readInitial(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(STORAGE_KEY) === "1";
}

export function ViewerProvider({ children }: { children: ReactNode }) {
  const [isAuthed, setIsAuthed] = useState<boolean>(false);
  const [hydrated, setHydrated] = useState<boolean>(false);

  // Hydrate after mount, чтобы не ломать SSR.
  useEffect(() => {
    setIsAuthed(readInitial());
    setHydrated(true);
  }, []);

  const persist = useCallback((value: boolean) => {
    setIsAuthed(value);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
    }
  }, []);

  const toggleAuth = useCallback(() => persist(!isAuthed), [isAuthed, persist]);
  const signOut = useCallback(() => persist(false), [persist]);

  const value: ViewerContextValue = {
    isAuthed,
    nick: isAuthed ? ME.nick : null,
    // Тир пока хардкодим — у профиля нет поля. Подменим, когда появится.
    tier: isAuthed ? "gold" : null,
    tickets: isAuthed ? ME.totals.tickets : 0,
    hydrated,
    toggleAuth,
    signOut,
  };

  return <ViewerContext.Provider value={value}>{children}</ViewerContext.Provider>;
}


export function useViewer() {
  const ctx = useContext(ViewerContext);
  if (!ctx) throw new Error("useViewer must be used inside <ViewerProvider>");
  return ctx;
}
