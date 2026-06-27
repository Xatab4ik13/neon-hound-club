// iOS-style action sheet снизу. Список действий + отдельная кнопка «Отмена».
// СОБСТВЕННЫЙ портал (НЕ vaul), чтобы:
//   1) tap по фону НЕ проваливался кликом в карточку поста под шитом.
//      vaul закрывал дровер на pointerdown — оверлей размонтировался — синтетический
//      click долетал до элемента под пальцем (PostCard.onCardClick → переход на пост).
//      Здесь мы сами рендерим оверлей и гасим pointerdown/click + preventDefault.
//   2) стиль совпадал с остальным приложением (bg-[#0d0d0d], border-white/[0.08],
//      радиус 20, primary-CTA). iOS-серый #1c1c1e выглядел чужим.
//
// Поддерживается «эмоджи-ряд» (variant="emojiRow") — горизонтальная полоска
// круглых кнопок 5×, удобно для пикера реакций.

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
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
  /** "list" (по умолчанию) | "emojiRow" — горизонтальный ряд крупных эмодзи. */
  variant?: "list" | "emojiRow";
};

export function IOSActionSheet({
  open,
  onOpenChange,
  title,
  description,
  items,
  cancelLabel = "Отмена",
  variant = "list",
}: Props) {
  const close = () => onOpenChange(false);

  // ESC для десктопа.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Блокируем скролл боди пока шит открыт.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Монтирование с задержкой размонтажа для анимации fade-out.
  // mounted-state, не ref, иначе re-render не выкинет узел из DOM (утечка).
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    if (open) {
      setMounted(true);
      return;
    }
    // Дождёмся завершения transition (200ms) и снимем компонент с дерева.
    const t = setTimeout(() => setMounted(false), 220);
    return () => clearTimeout(t);
  }, [open]);
  if (!mounted) return null;

  const handleSelect = (it: ActionSheetItem) => {
    if (it.disabled) return;
    haptic("selection");
    onOpenChange(false);
    // отложим до закрытия для плавности
    setTimeout(() => it.onSelect(), 60);
  };

  // Закрытие — ТОЛЬКО по `click` на оверлее (не pointerdown!).
  // preventDefault на pointerdown НЕ отменяет click — браузер генерирует его
  // отдельно. Если закрыть шит на pointerdown, оверлей размонтируется, и
  // синтетический click долетит до элемента под пальцем (PostCard → переход).
  // На `click` мы гарантированно являемся click-target → ничего не «протекает».
  const onOverlayClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    close();
  };

  const node = (
    <div
      aria-hidden={!open}
      className={cn(
        "z-[330] flex flex-col justify-end",
        "transition-opacity duration-200",
        open ? "opacity-100" : "opacity-0 pointer-events-none",
      )}
      // Явные top/left/right/bottom + 100vw/100dvh вместо `fixed inset-0`,
      // чтобы корректно покрывать viewport даже когда мы рендеримся внутри
      // ancestor'а с `transform` (vaul Drawer.Content). `position: fixed`
      // внутри transformed-предка позиционируется относительно него, поэтому
      // полагаемся на абсолютную геометрию.
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100dvh",
      }}
    >
      {/* Затемнение + click-shield */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onOverlayClick}
        // pointerdown НЕ закрывает — но останавливаем всплытие, чтобы PostCard
        // не успел получить даже pointerdown сквозь портал.
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onContextMenu={(e) => e.preventDefault()}
        role="presentation"
      />

      {/* Контент */}
      <div
        className={cn(
          "relative mx-auto w-full max-w-[480px] px-2 pb-[max(env(safe-area-inset-bottom),8px)]",
          "transform transition-transform duration-250 ease-out",
          open ? "translate-y-0" : "translate-y-full",
        )}
        // не закрываем при тапе по самому шиту
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* Группа действий */}
        <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d0d0d]/98 backdrop-blur-2xl shadow-[0_24px_60px_-20px_rgba(0,0,0,0.7)]">
          {(title || description) && (
            <div className="border-b border-white/[0.06] px-4 py-3 text-center">
              {title && (
                <div className="font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {title}
                </div>
              )}
              {description && (
                <div className="mt-0.5 text-[12px] leading-snug text-muted-foreground/70">
                  {description}
                </div>
              )}
            </div>
          )}

          {variant === "emojiRow" ? (
            <div className="flex items-center justify-around gap-1 px-3 py-3">
              {items.map((it) => (
                <button
                  key={it.key}
                  type="button"
                  disabled={it.disabled}
                  onClick={() => handleSelect(it)}
                  aria-label={it.label}
                  className={cn(
                    "grid h-12 w-12 place-items-center rounded-full text-[26px] leading-none",
                    "transition-transform active:scale-90 hover:bg-white/[0.06] disabled:opacity-40",
                  )}
                >
                  {it.label}
                </button>
              ))}
            </div>
          ) : (
            <ul>
              {items.map((it, i) => (
                <li key={it.key}>
                  <button
                    type="button"
                    disabled={it.disabled}
                    onClick={() => handleSelect(it)}
                    className={cn(
                      "flex w-full items-center justify-between px-4 py-[14px] text-[16px] transition-colors",
                      "active:bg-white/[0.06] disabled:opacity-40",
                      i > 0 && "border-t border-white/[0.05]",
                      it.destructive
                        ? "font-medium text-destructive"
                        : "text-foreground",
                    )}
                  >
                    <span>{it.label}</span>
                    {it.icon && <span className="ml-3 opacity-80">{it.icon}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Отмена */}
        <div className="mt-2 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d0d0d]/98 backdrop-blur-2xl">
          <button
            type="button"
            onClick={close}
            className="w-full px-4 py-[14px] text-[16px] font-semibold text-primary transition-colors active:bg-white/[0.06]"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  // Если мы внутри открытого IOSSheet (vaul Drawer) — vaul ставит inert на
  // siblings body, и наш portal-в-body будет «невидим» для hit-testing,
  // click пролетит сквозь оверлей в карточку поста. Поэтому, если есть
  // [data-ios-sheet-portal] (рендерится внутри Drawer.Content), портим туда.
  const target =
    document.querySelector<HTMLElement>("[data-ios-sheet-portal]") ?? document.body;
  return createPortal(node, target);
}
