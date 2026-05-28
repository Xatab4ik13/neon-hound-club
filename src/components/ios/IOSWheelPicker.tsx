// iOS-style wheel picker (один или несколько барабанов).
// Открывается как нижний sheet поверх любого другого sheet (z-[300]).
// Работает на тач-скролле + scroll-snap.

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { useThemeColor } from "@/hooks/use-theme-color";

type Column = {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  width?: string; // tailwind width, e.g. "w-24"
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  columns: Column[];
  doneLabel?: string;
};

const ITEM_H = 36; // px — высота одной строки барабана
const VISIBLE = 5; // нечётное

export function IOSWheelPicker({
  open,
  onOpenChange,
  title,
  columns,
  doneLabel = "Готово",
}: Props) {
  useThemeColor(open ? "#1c1c1e" : null);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[300] flex flex-col justify-end bg-black/60 animate-in fade-in-0"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="rounded-t-[20px] border-t border-white/[0.08] bg-[#1c1c1e] pb-[env(safe-area-inset-bottom)] animate-in slide-in-from-bottom"
        onClick={(e) => e.stopPropagation()}
        style={{ touchAction: "pan-y" }}
      >

        {/* шапка */}
        <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="font-mono text-[12px] uppercase tracking-wider text-muted-foreground active:opacity-60"
          >
            Отмена
          </button>
          <h2 className="truncate text-center text-[15px] font-semibold text-white">
            {title}
          </h2>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="font-mono text-[12px] font-bold uppercase tracking-wider text-primary active:opacity-60"
          >
            {doneLabel}
          </button>
        </div>

        <div className="relative flex justify-center gap-4 px-4 py-3">
          {/* центральные подсветки */}
          <div
            className="pointer-events-none absolute inset-x-4 border-y border-white/[0.08]"
            style={{
              top: `calc(50% - ${ITEM_H / 2}px)`,
              height: ITEM_H,
            }}
          />
          {columns.map((col, idx) => (
            <WheelColumn key={idx} {...col} />
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function WheelColumn({ options, value, onChange, width = "w-24" }: Column) {
  const ref = useRef<HTMLDivElement>(null);
  const idxRef = useRef(0);
  const [snapTimer, setSnapTimer] = useState<number | null>(null);

  // На открытии — скроллим к текущему значению.
  useEffect(() => {
    if (!ref.current) return;
    const i = Math.max(0, options.indexOf(value));
    idxRef.current = i;
    ref.current.scrollTo({ top: i * ITEM_H });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleScroll() {
    if (!ref.current) return;
    const i = Math.round(ref.current.scrollTop / ITEM_H);
    if (i !== idxRef.current && options[i] !== undefined) {
      idxRef.current = i;
      onChange(options[i]);
    }
    if (snapTimer) window.clearTimeout(snapTimer);
    const t = window.setTimeout(() => {
      if (!ref.current) return;
      ref.current.scrollTo({ top: i * ITEM_H, behavior: "smooth" });
    }, 80);
    setSnapTimer(t);
  }

  const pad = ((VISIBLE - 1) / 2) * ITEM_H;

  return (
    <div
      ref={ref}
      onScroll={handleScroll}
      className={cn(
        "relative overflow-y-scroll no-scrollbar",
        width,
      )}
      style={{
        height: VISIBLE * ITEM_H,
        scrollSnapType: "y mandatory",
        scrollPaddingTop: pad,
        WebkitOverflowScrolling: "touch",
      }}
    >
      <div style={{ paddingTop: pad, paddingBottom: pad }}>
        {options.map((opt) => {
          const active = opt === value;
          return (
            <div
              key={opt}
              style={{ height: ITEM_H, scrollSnapAlign: "center" }}
              className={cn(
                "flex items-center justify-center text-[17px] tabular-nums transition-colors",
                active ? "text-white" : "text-white/40",
              )}
            >
              {opt}
            </div>
          );
        })}
      </div>
    </div>
  );
}
