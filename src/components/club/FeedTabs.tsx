// Переключатель вкладок ленты: HELLHOUND (посты Вани) / NEWS (мотоспорт).
// Plump-стиль: чипы с чёрной обводкой и тенью, активный — цветной фон.
// Выбор сохраняется в localStorage, чтобы при возврате в /club юзер попадал
// в ту же вкладку, где был.

import { useCallback, useEffect, useState } from "react";
import { haptic } from "@/hooks/use-haptic";

export type FeedTab = "hellhound" | "news";

const STORAGE_KEY = "club:feed-tab";

// Цвета вкладок — pink primary для HELLHOUND, салатовый для NEWS (согласовано)
const TABS: { id: FeedTab; label: string; color: string }[] = [
  { id: "hellhound", label: "HELLHOUND", color: "hsl(var(--primary))" },
  { id: "news", label: "NEWS", color: "#B6FF3C" },
];

export function useFeedTab(): [FeedTab, (t: FeedTab) => void] {
  const [tab, setTab] = useState<FeedTab>("hellhound");

  // Hydrate из localStorage после mount (SSR-safe)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === "hellhound" || raw === "news") setTab(raw);
  }, []);

  const set = useCallback((next: FeedTab) => {
    setTab(next);
    haptic("light");
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* privacy mode etc. */
    }
  }, []);

  return [tab, set];
}

export function FeedTabs({ tab, onChange }: { tab: FeedTab; onChange: (t: FeedTab) => void }) {
  return (
    <div className="mb-4 flex items-center gap-2 px-2">
      {TABS.map((t) => {
        const active = tab === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={`inline-flex h-9 items-center rounded-[12px] border-[2px] px-3.5 font-display text-[13px] font-black uppercase italic leading-none tracking-tight transition-all active:scale-95 ${
              active
                ? "border-foreground text-black shadow-[3px_3px_0_0_hsl(var(--foreground))]"
                : "border-white/15 bg-transparent text-muted-foreground hover:border-white/30 hover:text-foreground"
            }`}
            style={active ? { background: t.color } : undefined}
            aria-pressed={active}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
