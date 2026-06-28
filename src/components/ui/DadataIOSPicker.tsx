// Полноэкранный iOS-стиль пикер для DaData (адрес/ФИО/email).
// Используется ТОЛЬКО когда сайт открыт как PWA — в браузере остаётся обычный
// inline-dropdown (DadataInput), т.к. там нет проблем с клавиатурой/overflow.

import { useEffect, useRef, useState } from "react";
import { Check, Plus, Search, X } from "@/components/ui/icons";
import { IOSOverlay } from "@/components/ios/IOSOverlay";
import {
  suggest,
  type DadataSuggestType,
  type DadataSuggestion,
} from "@/lib/dadata";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  type: DadataSuggestType;
  value: string;
  onPick: (value: string, suggestion: DadataSuggestion | null) => void;
  params?: Record<string, unknown>;
  placeholder?: string;
  count?: number;
  minChars?: number;
  /** Разрешить «использовать введённое как есть» (для email/fio имеет смысл). */
  allowCustom?: boolean;
};

export function DadataIOSPicker({
  open,
  onOpenChange,
  title,
  type,
  value,
  onPick,
  params,
  placeholder = "Начни вводить…",
  count = 7,
  minChars = 2,
  allowCustom = true,
}: Props) {
  const [query, setQuery] = useState(value);
  const [items, setItems] = useState<DadataSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Сброс при каждом открытии: подставляем текущее значение, чтобы юзер мог
  // дотюнить с того места, на котором остановился.
  useEffect(() => {
    if (!open) return;
    setQuery(value);
    setItems([]);
  }, [open, value]);

  // debounce + abort
  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < minChars) {
      setItems([]);
      setLoading(false);
      return;
    }
    const t = setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setLoading(true);
      const res = await suggest(type, q, { count, params, signal: ctrl.signal });
      setItems(res);
      setLoading(false);
    }, 180);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, type, count, JSON.stringify(params ?? {}), open, minChars]);

  const hasExact = items.some((s) => s.value.trim() === query.trim());
  const showCustom = allowCustom && query.trim().length >= minChars && !hasExact;

  const commitCustom = () => {
    const v = query.trim();
    if (!v) return;
    onPick(v, null);
    onOpenChange(false);
  };

  const searchBar = (
    <div className="border-b border-white/[0.06] px-4 py-3">
      <div className="flex min-h-[44px] items-center gap-2 rounded-[14px] border border-white/[0.08] bg-black/30 px-3">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (items[0]) {
                onPick(items[0].value, items[0]);
                onOpenChange(false);
              } else if (showCustom) {
                commitCustom();
              }
            }
          }}
          placeholder={placeholder}
          inputMode={type === "email" ? "email" : "text"}
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
  );

  return (
    <IOSOverlay
      open={open}
      onClose={() => onOpenChange(false)}
      title={title}
      cancelLabel="Отмена"
      doneLabel="Готово"
      onDone={() => {
        if (query.trim() && query.trim() !== value.trim()) {
          onPick(query.trim(), null);
        }
        onOpenChange(false);
      }}
      onCancel={() => onOpenChange(false)}
      zIndexClassName="z-[320]"
      headerExtra={searchBar}
      contentClassName="px-2 py-2"
    >
      {showCustom && (
        <button
          type="button"
          onClick={commitCustom}
          className="flex min-h-[48px] w-full items-center gap-3 border-b border-white/[0.04] px-3 py-3 text-left text-primary active:bg-primary/[0.06]"
        >
          <Plus className="h-4 w-4 shrink-0" />
          <span className="min-w-0 flex-1 truncate text-[15px]">
            Использовать: «{query.trim()}»
          </span>
        </button>
      )}

      {items.length === 0 && !showCustom && (
        <p className="px-4 py-8 text-center font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          {loading
            ? "Поиск…"
            : query.trim().length < minChars
              ? `Введи минимум ${minChars} символа`
              : "Ничего не нашлось"}
        </p>
      )}

      {items.map((s, i) => {
        const active = s.value.trim() === value.trim();
        return (
          <button
            key={`${s.value}-${i}`}
            type="button"
            onClick={() => {
              onPick(s.value, s);
              onOpenChange(false);
            }}
            className="flex min-h-[48px] w-full items-start gap-3 border-b border-white/[0.04] px-3 py-3 text-left active:bg-white/[0.04]"
          >
            <Check
              className={`mt-0.5 h-4 w-4 shrink-0 ${
                active ? "text-primary opacity-100" : "opacity-0"
              }`}
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] text-foreground">
                {s.value}
              </span>
              {s.unrestricted_value && s.unrestricted_value !== s.value && (
                <span className="block truncate text-[11px] text-muted-foreground">
                  {s.unrestricted_value}
                </span>
              )}
            </span>
          </button>
        );
      })}

      {loading && items.length > 0 && (
        <p className="px-4 py-2 text-center font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          Поиск…
        </p>
      )}
    </IOSOverlay>
  );
}
