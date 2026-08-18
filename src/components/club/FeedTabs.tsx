// Переключатель вкладок ленты: HELLHOUND (посты Вани) / NEWS (мотоспорт).
// Plump-стиль: чипы с чёрной обводкой и тенью, активный — цветной фон.
// NEWS — вкладка по умолчанию: при каждом заходе на ленту юзер попадает в новости.
// Выбор вкладки живёт только в рамках текущего экрана и не сохраняется.

import { useCallback, useState } from "react";
import { haptic } from "@/hooks/use-haptic";

export type FeedTab = "hellhound" | "news";

// Цвета вкладок — pink primary для HELLHOUND, салатовый для NEWS (согласовано)
const TABS: { id: FeedTab; label: string; color: string }[] = [
  { id: "news", label: "NEWS", color: "#B6FF3C" },
  { id: "hellhound", label: "HELLHOUND", color: "#F000C0" },
];


export function useFeedTab(): [FeedTab, (t: FeedTab) => void] {
  const [tab, setTab] = useState<FeedTab>("news");

  const set = useCallback((next: FeedTab) => {
    setTab(next);
    haptic("light");
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
            className={`inline-flex h-9 items-center rounded-[12px] px-3.5 font-display text-[13px] font-black uppercase leading-none tracking-tight transition-all active:scale-95 ${
              active
                ? "text-black"
                : "bg-transparent text-muted-foreground hover:text-foreground"
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
