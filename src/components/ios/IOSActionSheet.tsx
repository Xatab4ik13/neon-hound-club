// iOS-style action sheet снизу. Список действий + отдельная кнопка «Отмена».
// Используем vaul.Drawer (как IOSSheet), без своего overlay/портала.
// Деструктивный пункт подсвечен красным (system #ff453a).

import { Drawer } from "vaul";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { haptic } from "@/hooks/use-haptic";

export type ActionSheetItem = {
  key: string;
  label: string;
  icon?: ReactNode;
  destructive?: boolean;
  disabled?: boolean;
  onSelect: () => void;
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title?: string;
  description?: string;
  items: ActionSheetItem[];
  cancelLabel?: string;
};

export function IOSActionSheet({
  open,
  onOpenChange,
  title,
  description,
  items,
  cancelLabel = "Отмена",
}: Props) {
  const handleSelect = (it: ActionSheetItem) => {
    if (it.disabled) return;
    haptic("selection");
    onOpenChange(false);
    // отложим вызов до закрытия для плавности
    setTimeout(() => it.onSelect(), 60);
  };

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[330] bg-black/60 backdrop-blur-sm" />
        <Drawer.Content
          className={cn(
            "fixed inset-x-0 bottom-0 z-[331] outline-none",
            "px-2 pb-[max(env(safe-area-inset-bottom),8px)]",
          )}
        >
          <Drawer.Title className="sr-only">{title ?? "Действия"}</Drawer.Title>
          <Drawer.Description className="sr-only">
            {description ?? "Меню действий"}
          </Drawer.Description>

          {/* Группа действий */}
          <div className="mx-auto max-w-[480px] overflow-hidden rounded-2xl border border-white/[0.06] bg-[#1c1c1e]/95 backdrop-blur-2xl shadow-[0_24px_60px_-20px_rgba(0,0,0,0.7)]">
            {(title || description) && (
              <div className="border-b border-white/[0.06] px-4 py-3 text-center">
                {title && (
                  <div className="text-[13px] font-medium text-white/55">{title}</div>
                )}
                {description && (
                  <div className="mt-0.5 text-[12px] leading-snug text-white/40">
                    {description}
                  </div>
                )}
              </div>
            )}
            <ul>
              {items.map((it, i) => (
                <li key={it.key}>
                  <button
                    type="button"
                    disabled={it.disabled}
                    onClick={() => handleSelect(it)}
                    className={cn(
                      "flex w-full items-center justify-between px-4 py-[14px] text-[17px] transition-colors",
                      "active:bg-white/[0.06] disabled:opacity-40",
                      i > 0 && "border-t border-white/[0.06]",
                      it.destructive ? "text-[#ff453a] font-medium" : "text-white",
                    )}
                  >
                    <span>{it.label}</span>
                    {it.icon && <span className="ml-3 opacity-80">{it.icon}</span>}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Отмена */}
          <div className="mx-auto mt-2 max-w-[480px] overflow-hidden rounded-2xl border border-white/[0.06] bg-[#1c1c1e]/95 backdrop-blur-2xl">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="w-full px-4 py-[14px] text-[17px] font-semibold text-primary transition-colors active:bg-white/[0.06]"
            >
              {cancelLabel}
            </button>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
