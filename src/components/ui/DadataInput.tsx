import { useEffect, useId, useRef, useState } from "react";
import {
  suggest,
  type DadataSuggestType,
  type DadataSuggestion,
} from "@/lib/dadata";

type Props = {
  type: DadataSuggestType;
  value: string;
  onChange: (value: string) => void;
  onSelect?: (s: DadataSuggestion) => void;
  /** Дополнительные параметры запроса DaData (locations, from_bound, to_bound, parts...) */
  params?: Record<string, unknown>;
  /** Кол-во подсказок (1..20) */
  count?: number;
  placeholder?: string;
  inputMode?: "text" | "tel" | "email" | "numeric";
  inputType?: string;
  required?: boolean;
  autoComplete?: string;
  className?: string;
  /** Минимальное число символов для запроса */
  minChars?: number;
  /** Задержка debounce, мс */
  debounceMs?: number;
};

export function DadataInput({
  type,
  value,
  onChange,
  onSelect,
  params,
  count = 7,
  placeholder,
  inputMode,
  inputType = "text",
  required,
  autoComplete = "off",
  className,
  minChars = 2,
  debounceMs = 180,
}: Props) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<DadataSuggestion[]>([]);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const lastQueryRef = useRef("");
  const abortRef = useRef<AbortController | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  // debounce + fetch
  useEffect(() => {
    const q = value.trim();
    if (q.length < minChars) {
      setItems([]);
      setLoading(false);
      return;
    }
    if (q === lastQueryRef.current && items.length > 0) return;
    const t = setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setLoading(true);
      const res = await suggest(type, q, { count, params, signal: ctrl.signal });
      lastQueryRef.current = q;
      setItems(res);
      setActive(0);
      setLoading(false);
    }, debounceMs);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, type, count, JSON.stringify(params ?? {})]);

  // close on outside click
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const pick = (s: DadataSuggestion) => {
    onChange(s.value);
    onSelect?.(s);
    setOpen(false);
    setItems([]);
  };

  const showList = open && items.length > 0;

  return (
    <div ref={wrapRef} className="relative min-w-0 flex-1">
      <input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (!showList) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, items.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            pick(items[active]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        type={inputType}
        inputMode={inputMode}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        className={
          className ??
          "min-w-0 flex-1 bg-transparent py-1.5 text-right text-[15px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
        }
      />
      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-auto rounded-xl border border-white/[0.08] bg-[#0d0d0d]/98 py-1 text-left shadow-2xl backdrop-blur-xl"
        >
          {items.map((s, i) => (
            <li
              key={`${s.value}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(s);
              }}
              onMouseEnter={() => setActive(i)}
              className={`cursor-pointer px-3 py-2 text-[14px] leading-snug ${
                i === active
                  ? "bg-primary/15 text-foreground"
                  : "text-foreground/90 hover:bg-white/[0.04]"
              }`}
            >
              <div className="truncate">{s.value}</div>
              {s.unrestricted_value && s.unrestricted_value !== s.value && (
                <div className="truncate text-[11px] text-muted-foreground">
                  {s.unrestricted_value}
                </div>
              )}
            </li>
          ))}
          {loading && (
            <li className="px-3 py-1.5 text-[11px] text-muted-foreground">Поиск…</li>
          )}
        </ul>
      )}
    </div>
  );
}
