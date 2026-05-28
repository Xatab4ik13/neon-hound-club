// Единый примитив iOS-style full-screen оверлеев.
// - fixed inset-0, 100dvh, safe-area top
// - ref-counted scroll lock на body/html (несколько оверлеев стекаются корректно)
// - shared keyboard offset (visualViewport)
// - Esc закрывает верхний оверлей
// - portal в document.body
//
// Все full-screen модалки (форма, search picker, и т.п.) строятся ПОВЕРХ этого.

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useKeyboardOffset } from "@/hooks/use-keyboard-offset";
import { cn } from "@/lib/utils";

// ─── ref-counted body scroll lock ───────────────────────────────
// Несколько оверлеев могут быть открыты одновременно (form → picker).
// Если каждый сам трогает body.style.overflow, восстановление при закрытии
// верхнего ломает блокировку нижнего. Считаем открытые оверлеи и снимаем
// блокировку только когда счётчик = 0.
let lockCount = 0;
let savedBodyOverflow = "";
let savedHtmlOverflow = "";

function acquireScrollLock() {
  if (typeof document === "undefined") return;
  if (lockCount === 0) {
    savedBodyOverflow = document.body.style.overflow;
    savedHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
  }
  lockCount++;
}

function releaseScrollLock() {
  if (typeof document === "undefined") return;
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    document.body.style.overflow = savedBodyOverflow;
    document.documentElement.style.overflow = savedHtmlOverflow;
  }
}

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Левая кнопка шапки. По умолчанию «Отмена» закрывает. */
  cancelLabel?: string;
  onCancel?: () => void;
  /** Правая кнопка-CTA. По умолчанию «Готово» закрывает. */
  doneLabel?: string;
  onDone?: () => void;
  doneDisabled?: boolean;
  /** Свой контент шапки (если нужна не кнопка-«Отмена», а, скажем, поиск-инпут). */
  headerExtra?: ReactNode;
  /** z-index слой. Дефолт 260. Для пикеров над формой — 320. */
  zIndexClassName?: string;
  children: ReactNode;
  /** Дополнительные классы на скроллируемый контейнер контента. */
  contentClassName?: string;
};

export function IOSOverlay({
  open,
  onClose,
  title,
  cancelLabel = "Отмена",
  onCancel,
  doneLabel = "Готово",
  onDone,
  doneDisabled = false,
  headerExtra,
  zIndexClassName = "z-[260]",
  children,
  contentClassName,
}: Props) {
  useThemeColor(open ? "#0d0d0d" : null);
  const kbOffset = useKeyboardOffset();
  const isKbOpen = kbOffset > 0;
  const acquiredRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    acquireScrollLock();
    acquiredRef.current = true;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("keydown", onKey);
      if (acquiredRef.current) {
        releaseScrollLock();
        acquiredRef.current = false;
      }
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className={cn("fixed inset-0 flex flex-col bg-[#0d0d0d]", zIndexClassName)}
      style={{
        height: "100dvh",
        paddingTop: "env(safe-area-inset-top)",
      }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/[0.05] px-4 py-3">
        <button
          type="button"
          onClick={onCancel ?? onClose}
          className="-ml-2 flex h-11 items-center px-2 font-mono text-[12px] uppercase tracking-wider text-muted-foreground active:opacity-60"
        >
          {cancelLabel}
        </button>
        <h2 className="min-w-0 flex-1 truncate text-center text-[15px] font-semibold text-white">
          {title}
        </h2>
        <button
          type="button"
          onClick={onDone ?? onClose}
          disabled={doneDisabled}
          className="-mr-2 flex h-11 items-center px-2 font-mono text-[12px] font-bold uppercase tracking-wider text-primary active:opacity-60 disabled:cursor-not-allowed disabled:text-muted-foreground/40 disabled:active:opacity-100"
        >
          {doneLabel}
        </button>
      </div>

      {headerExtra && <div className="shrink-0">{headerExtra}</div>}

      <div
        className={cn(
          "min-h-0 flex-1 overflow-y-auto overscroll-contain",
          contentClassName,
        )}
        style={{
          paddingBottom: isKbOpen
            ? kbOffset + 24
            : "calc(env(safe-area-inset-bottom) + 24px)",
          WebkitOverflowScrolling: "touch",
          touchAction: "pan-y",
        }}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
