import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { IOSActionSheet, type ActionSheetItem } from "@/components/ios/IOSActionSheet";

export type { ActionSheetItem };
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { haptic } from "@/hooks/use-haptic";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title?: string;
  description?: string;
  items: ActionSheetItem[];
  cancelLabel?: string;
  variant?: "list" | "emojiRow";
};

export function AdaptiveActionSheet({
  open,
  onOpenChange,
  title,
  description,
  items,
  cancelLabel = "Отмена",
  variant = "list",
}: Props) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <IOSActionSheet
        open={open}
        onOpenChange={onOpenChange}
        title={title}
        description={description}
        items={items}
        cancelLabel={cancelLabel}
        variant={variant}
      />
    );
  }

  const close = () => onOpenChange(false);

  const handleSelect = (it: ActionSheetItem) => {
    if (it.disabled) return;
    haptic("selection");
    onOpenChange(false);
    setTimeout(() => it.onSelect(), 60);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm border-white/[0.08] bg-[#0d0d0d] p-0 text-foreground">
        <DialogHeader className="px-6 pt-6 pb-2">
          {title && <DialogTitle className="text-center text-base font-semibold">{title}</DialogTitle>}
          {description && (
            <DialogDescription className="text-center text-sm text-muted-foreground">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>

        {variant === "emojiRow" ? (
          <div className="flex items-center justify-around gap-1 px-3 py-4">
            {items.map((it) => (
              <button
                key={it.key}
                type="button"
                disabled={it.disabled}
                onClick={() => handleSelect(it)}
                aria-label={it.label}
                className={cn(
                  "grid h-12 w-12 place-items-center rounded-full text-[26px] leading-none",
                  "transition-transform hover:bg-white/[0.06] active:scale-90 disabled:opacity-40",
                )}
              >
                {it.label}
              </button>
            ))}
          </div>
        ) : (
          <ul className="py-2">
            {items.map((it, i) => (
              <li key={it.key} className={cn(i > 0 && "border-t border-white/[0.05]")}>
                <button
                  type="button"
                  disabled={it.disabled}
                  onClick={() => handleSelect(it)}
                  className={cn(
                    "flex w-full items-center justify-between px-6 py-3.5 text-[15px] transition-colors",
                    "hover:bg-white/[0.04] active:bg-white/[0.06] disabled:opacity-40",
                    it.destructive ? "font-medium text-destructive" : "text-foreground",
                  )}
                >
                  <span>{it.label}</span>
                  {it.icon && <span className="ml-3 opacity-80">{it.icon}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="border-t border-white/[0.06] px-6 py-4">
          <button
            type="button"
            onClick={close}
            className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-[15px] font-semibold text-primary transition-colors hover:bg-white/[0.06]"
          >
            {cancelLabel}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
