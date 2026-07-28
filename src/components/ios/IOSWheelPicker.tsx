// iOS-style wheel picker (один или несколько барабанов).
// Открывается как нижний sheet поверх любого другого sheet (z-[300]).
// Работает на тач-скролле + scroll-snap.

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { useThemeColor } from "@/hooks/use-theme-color";
import { haptic } from "@/hooks/use-haptic";

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

let feedbackCtx: AudioContext | null = null;

function playPickerTick() {
  if (typeof window === "undefined") return;
  try {
    const Ctor =
      (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
        .AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    if (!feedbackCtx) feedbackCtx = new Ctor();
    const c = feedbackCtx;
    if (c.state === "suspended") c.resume().catch(() => {});

    const now = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(1320, now + 0.035);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.035, now + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.055);
    osc.connect(gain).connect(c.destination);
    osc.start(now);
    osc.stop(now + 0.065);
  } catch {
    // no-op: звук не должен ломать выбор даты
  }
}

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
      className="pointer-events-auto fixed inset-0 z-[320] flex flex-col justify-end bg-black/60 animate-in fade-in-0"
      // Останавливаем pointerdown/touchstart, чтобы Radix Sheet-родитель
      // не считал это «кликом снаружи» и не блокировал нажатия.
      onPointerDownCapture={(e) => e.stopPropagation()}
      onMouseDownCapture={(e) => e.stopPropagation()}
      onTouchStartCapture={(e) => e.stopPropagation()}
      onClick={() => onOpenChange(false)}
    >
      <div
        className="pointer-events-auto rounded-t-[20px] border-t border-white/[0.08] bg-[#1c1c1e] pb-[env(safe-area-inset-bottom)] animate-in slide-in-from-bottom"
        onClick={(e) => e.stopPropagation()}
        style={{ touchAction: "pan-y" }}
      >
        {/* шапка */}
        <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onOpenChange(false);
            }}
            className="font-mono text-[12px] uppercase tracking-wider text-muted-foreground active:opacity-60"
          >
            Отмена
          </button>
          <h2 className="truncate text-center text-[15px] font-semibold text-white">{title}</h2>
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onOpenChange(false);
            }}
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
  const snapTimerRef = useRef<number | null>(null);
  const touchRef = useRef<{ y: number; top: number; moved: boolean } | null>(null);

  // На открытии — скроллим к текущему значению.
  useEffect(() => {
    if (!ref.current) return;
    const i = Math.max(0, options.indexOf(value));
    idxRef.current = i;
    ref.current.scrollTo({ top: i * ITEM_H });
    return () => {
      if (snapTimerRef.current) window.clearTimeout(snapTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function emitChange(i: number) {
    if (i !== idxRef.current && options[i] !== undefined) {
      idxRef.current = i;
      haptic("selection");
      playPickerTick();
      onChange(options[i]);
    }
  }

  function scrollToIndex(i: number, smooth = true) {
    if (!ref.current) return;
    const safe = Math.max(0, Math.min(options.length - 1, i));
    ref.current.scrollTo({ top: safe * ITEM_H, behavior: smooth ? "smooth" : "auto" });
    emitChange(safe);
  }

  function handleScroll() {
    if (!ref.current) return;
    const i = Math.round(ref.current.scrollTop / ITEM_H);
    emitChange(i);
    if (snapTimerRef.current) window.clearTimeout(snapTimerRef.current);
    snapTimerRef.current = window.setTimeout(() => {
      if (!ref.current) return;
      const cur = Math.round(ref.current.scrollTop / ITEM_H);
      ref.current.scrollTo({ top: cur * ITEM_H, behavior: "smooth" });
    }, 120);
  }

  const pad = ((VISIBLE - 1) / 2) * ITEM_H;

  return (
    <div
      ref={ref}
      onScroll={handleScroll}
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => {
        e.stopPropagation();
        const touch = e.touches[0];
        if (!touch || !ref.current) return;
        touchRef.current = { y: touch.clientY, top: ref.current.scrollTop, moved: false };
        if (snapTimerRef.current) window.clearTimeout(snapTimerRef.current);
      }}
      onTouchMove={(e) => {
        e.stopPropagation();
        const touch = e.touches[0];
        const start = touchRef.current;
        if (!touch || !start || !ref.current) return;
        const delta = start.y - touch.clientY;
        if (Math.abs(delta) > 2) start.moved = true;
        ref.current.scrollTop = Math.max(0, Math.min((options.length - 1) * ITEM_H, start.top + delta));
        handleScroll();
      }}
      onTouchEnd={(e) => {
        e.stopPropagation();
        if (!ref.current) return;
        const cur = Math.round(ref.current.scrollTop / ITEM_H);
        scrollToIndex(cur, true);
        window.setTimeout(() => {
          touchRef.current = null;
        }, 0);
      }}
      onWheel={(e) => {
        e.stopPropagation();
      }}
      className={cn("relative overflow-y-scroll no-scrollbar select-none", width)}
      style={{
        height: VISIBLE * ITEM_H,
        scrollSnapType: "y mandatory",
        scrollPaddingTop: pad,
        WebkitOverflowScrolling: "touch",
        touchAction: "pan-y",
        overscrollBehavior: "contain",
      }}
    >
      <div style={{ paddingTop: pad, paddingBottom: pad }}>
        {options.map((opt, i) => {
          const active = opt === value;
          return (
            <button
              key={opt}
              type="button"
              onTouchEnd={(e) => {
                if (touchRef.current?.moved) {
                  e.preventDefault();
                  e.stopPropagation();
                }
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (touchRef.current?.moved) return;
                scrollToIndex(i, true);
              }}
              style={{ height: ITEM_H, scrollSnapAlign: "center" }}
              className={cn(
                "flex w-full items-center justify-center text-[17px] tabular-nums transition-colors",
                active ? "text-white" : "text-white/40",
              )}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}
