import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  suggest,
  type DadataSuggestType,
  type DadataSuggestion,
} from "@/lib/dadata";
import { isStandalonePWA } from "@/lib/is-pwa";
import { DadataIOSPicker } from "@/components/ui/DadataIOSPicker";

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

type Rect = { top: number; left: number; width: number; bottom: number };

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
  // В PWA inline-dropdown ломается iOS-клавиатурой и overflow контейнеров —
  // рендерим полноэкранный iOS-пикер вместо него.
  const isPwa = useMemo(() => isStandalonePWA(), []);
  const [pickerOpen, setPickerOpen] = useState(false);

  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<DadataSuggestion[]>([]);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const [rect, setRect] = useState<Rect | null>(null);
  const lastQueryRef = useRef("");
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();



  // debounce + fetch (только не-PWA — в PWA используется DadataIOSPicker)
  useEffect(() => {
    if (isPwa) return;
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

  // Пересчёт позиции dropdown относительно инпута (fixed-позиционирование,
  // чтобы overflow-hidden родителей не резал список).
  const updateRect = () => {
    const el = inputRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, bottom: r.bottom });
  };

  useLayoutEffect(() => {
    if (!open) return;
    updateRect();
  }, [open, items.length]);

  useEffect(() => {
    if (!open) return;
    const onScroll = () => updateRect();
    const onResize = () => updateRect();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  // close on outside click
  useEffect(() => {
    if (!open) return;
    const onDocPointer = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (inputRef.current?.contains(target)) return;
      if (listRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDocPointer);
    document.addEventListener("touchstart", onDocPointer, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onDocPointer);
      document.removeEventListener("touchstart", onDocPointer);
    };
  }, [open]);

  const pick = (s: DadataSuggestion) => {
    onChange(s.value);
    onSelect?.(s);
    setOpen(false);
    setItems([]);
  };

  const showList = open && items.length > 0;

  // Решаем — вниз или вверх (мало места под инпутом, например клавиатура iOS)
  const spaceBelow = rect ? window.innerHeight - rect.bottom : 0;
  const dropUp = rect ? spaceBelow < 220 && rect.top > spaceBelow : false;
  const maxH = rect
    ? Math.min(288, dropUp ? rect.top - 16 : window.innerHeight - rect.bottom - 16)
    : 288;

  // ── PWA-режим: рендерим кнопку-поле, открывающую полноэкранный пикер ──
  if (isPwa) {
    const pickerTitle =
      type === "address"
        ? "Адрес доставки"
        : type === "fio"
          ? "ФИО"
          : type === "email"
            ? "Email"
            : "Поиск";
    return (
      <>
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className={
            className ??
            "min-w-0 flex-1 truncate bg-transparent py-1.5 text-right text-[15px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
          }
        >
          {value ? (
            <span className="truncate">{value}</span>
          ) : (
            <span className="text-muted-foreground/50">{placeholder ?? "Указать"}</span>
          )}
        </button>
        {/* Скрытый input — чтобы required и нативная валидация формы работали */}
        <input
          type="hidden"
          value={value}
          required={required}
          autoComplete={autoComplete}
          onChange={() => {}}
        />
        <DadataIOSPicker
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          title={pickerTitle}
          type={type}
          value={value}
          params={params}
          count={count}
          minChars={minChars}
          placeholder={placeholder}
          allowCustom
          onPick={(v, s) => {
            onChange(v);
            if (s) onSelect?.(s);
          }}
        />
      </>
    );
  }

  return (
    <div className="relative min-w-0 flex-1">
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setOpen(true);
          requestAnimationFrame(updateRect);
        }}
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
      {showList && rect && typeof document !== "undefined" &&
        createPortal(
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            style={{
              position: "fixed",
              left: rect.left,
              width: rect.width,
              maxHeight: maxH,
              ...(dropUp
                ? { bottom: window.innerHeight - rect.top + 4 }
                : { top: rect.bottom + 4 }),
            }}
            className="z-[1000] overflow-auto rounded-xl border border-white/[0.08] bg-[#0d0d0d]/98 py-1 text-left shadow-2xl backdrop-blur-xl"
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
                onTouchStart={(e) => {
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
          </ul>,
          document.body,
        )}
    </div>
  );
}
