import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useKeyboardOffset } from "@/hooks/use-keyboard-offset";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  doneLabel?: string;
  onDone?: () => void;
  doneDisabled?: boolean;
  cancelLabel?: string;
  onCancel?: () => void;
  contentClassName?: string;
  zIndexClassName?: string;
};

export function IOSFullScreenModal({
  open,
  onOpenChange,
  title,
  children,
  doneLabel = "Готово",
  onDone,
  doneDisabled = false,
  cancelLabel = "Отмена",
  onCancel,
  contentClassName,
  zIndexClassName,
}: Props) {
  useThemeColor(open ? "#0d0d0d" : null);
  const kbOffset = useKeyboardOffset();
  const isKbOpen = kbOffset > 0;

  useEffect(() => {
    if (!open || typeof document === "undefined") return;

    const { body, documentElement } = document;
    const prevBodyOverflow = body.style.overflow;
    const prevHtmlOverflow = documentElement.style.overflow;

    body.style.overflow = "hidden";
    documentElement.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onOpenChange(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      body.style.overflow = prevBodyOverflow;
      documentElement.style.overflow = prevHtmlOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onOpenChange]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 flex flex-col bg-[#0d0d0d]",
        zIndexClassName ?? "z-[260]",
      )}
      style={{
        paddingTop: "env(safe-area-inset-top)",
      }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/[0.05] px-4 py-3">
        <button
          type="button"
          onClick={onCancel ?? (() => onOpenChange(false))}
          className="-ml-2 flex h-11 items-center px-2 font-mono text-[12px] uppercase tracking-wider text-muted-foreground active:opacity-60"
        >
          {cancelLabel}
        </button>
        <h2 className="min-w-0 flex-1 truncate text-center text-[15px] font-semibold text-white">
          {title}
        </h2>
        <button
          type="button"
          onClick={onDone ?? (() => onOpenChange(false))}
          disabled={doneDisabled}
          className="-mr-2 flex h-11 items-center px-2 font-mono text-[12px] font-bold uppercase tracking-wider text-primary active:opacity-60 disabled:cursor-not-allowed disabled:text-muted-foreground/40 disabled:active:opacity-100"
        >
          {doneLabel}
        </button>
      </div>

      <div
        className={cn(
          "flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 pt-4",
          contentClassName,
        )}
        style={{
          paddingBottom: isKbOpen ? kbOffset + 24 : "calc(env(safe-area-inset-bottom) + 24px)",
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