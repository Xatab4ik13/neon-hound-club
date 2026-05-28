import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Plus, Search, X } from "lucide-react";
import { useThemeColor } from "@/hooks/use-theme-color";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  value: string;
  options: string[];
  onSelect: (value: string, custom: boolean) => void;
  placeholder?: string;
  loading?: boolean;
  emptyHint?: string;
  allowCustom?: boolean;
};

function normalize(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export function IOSSearchPicker({
  open,
  onOpenChange,
  title,
  value,
  options,
  onSelect,
  placeholder = "Поиск...",
  loading = false,
  emptyHint = "Ничего не найдено",
  allowCustom = true,
}: Props) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useThemeColor(open ? "#0d0d0d" : null);

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  const normalizedQuery = normalize(query);
  const filtered = useMemo(() => {
    if (!normalizedQuery) return options;
    return options.filter((option) => normalize(option).includes(normalizedQuery));
  }, [normalizedQuery, options]);

  const hasExactMatch = useMemo(
    () => normalizedQuery.length > 0 && options.some((option) => normalize(option) === normalizedQuery),
    [normalizedQuery, options],
  );

  const showCustomOption = allowCustom && normalizedQuery.length > 0 && !hasExactMatch;

  const handleCustomSelect = () => {
    const next = query.trim().replace(/\s+/g, " ");
    if (!next) return;
    onSelect(next, true);
    onOpenChange(false);
  };

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[320] flex flex-col bg-[#0d0d0d]"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/[0.05] px-4 py-3">
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="-ml-2 flex h-11 items-center px-2 font-mono text-[12px] uppercase tracking-wider text-muted-foreground active:opacity-60"
        >
          Отмена
        </button>
        <h2 className="min-w-0 flex-1 truncate text-center text-[15px] font-semibold text-white">
          {title}
        </h2>
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="-mr-2 flex h-11 items-center px-2 font-mono text-[12px] font-bold uppercase tracking-wider text-primary active:opacity-60"
        >
          Готово
        </button>
      </div>

      <div className="shrink-0 border-b border-white/[0.06] px-4 py-3">
        <div className="flex min-h-[44px] items-center gap-2 rounded-[14px] border border-white/[0.08] bg-black/30 px-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && showCustomOption) {
                e.preventDefault();
                handleCustomSelect();
              }
            }}
            placeholder={loading ? "Загрузка..." : placeholder}
            inputMode="search"
            enterKeyHint={showCustomOption ? "done" : "search"}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            className="flex-1 bg-transparent text-[16px] text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className="flex h-8 w-8 shrink-0 items-center justify-center text-muted-foreground active:opacity-60"
              aria-label="Очистить"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div
        data-vaul-no-drag
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-2 py-2"
        style={{
          WebkitOverflowScrolling: "touch",
          touchAction: "pan-y",
        }}
      >
        {showCustomOption && (
          <button
            type="button"
            onClick={handleCustomSelect}
            className="flex min-h-[48px] w-full items-center gap-3 border-b border-white/[0.04] px-3 py-3 text-left text-primary active:bg-primary/[0.06]"
          >
            <Plus className="h-4 w-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate text-[15px]">Добавить: «{query.trim()}»</span>
          </button>
        )}

        {filtered.length === 0 && !showCustomOption && (
          <p className="px-4 py-8 text-center font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            {loading ? "Загрузка..." : emptyHint}
          </p>
        )}

        {filtered.map((option) => {
          const active = normalize(value) === normalize(option);
          return (
            <button
              key={option}
              type="button"
              onClick={() => {
                onSelect(option, false);
                onOpenChange(false);
              }}
              className="flex min-h-[48px] w-full items-center gap-3 border-b border-white/[0.04] px-3 py-3 text-left active:bg-white/[0.04]"
            >
              <Check
                className={cn(
                  "h-4 w-4 shrink-0",
                  active ? "text-primary opacity-100" : "opacity-0",
                )}
              />
              <span className="min-w-0 flex-1 truncate text-[15px] text-foreground">{option}</span>
            </button>
          );
        })}
      </div>
    </div>,
    document.body,
  );
}