// Общий iOS-style bottom sheet: drag handle + sticky header с Готово.
// Используется на мобиле как замена Dialog/portal модалкам.
// Десктоп пусть остаётся со своими модалками — там Dialog уместен.

import { Drawer } from "vaul";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useKeyboardOffset } from "@/hooks/use-keyboard-offset";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  /** Кнопка-CTA справа в шапке. По умолчанию «Готово», закрывающее sheet. */
  doneLabel?: string;
  onDone?: () => void;
  /** Заблокировать CTA (например, форма ещё не валидна). */
  doneDisabled?: boolean;
  /** Полноэкранный режим — высокая модалка (формы), иначе ~70vh (списки). */
  fullHeight?: boolean;
  children: ReactNode;
  /** Свой контент шапки слева (по умолчанию заголовок). */
  headerLeft?: ReactNode;
  contentClassName?: string;
};

export function IOSSheet({
  open,
  onOpenChange,
  title,
  doneLabel = "Готово",
  onDone,
  doneDisabled = false,
  fullHeight = false,
  children,
  headerLeft,
  contentClassName,
}: Props) {
  const close = () => onOpenChange(false);
  useThemeColor(open ? "#0d0d0d" : null);
  // На iOS PWA visualViewport уменьшается, когда появляется клавиатура.
  // Используем kbOffset чтобы СЖАТЬ sheet снизу (padding-bottom),
  // вместо vaul.repositionInputs, который физически поднимает Drawer и
  // утаскивает шапку с «Готово» за пределы экрана.
  const kbOffset = useKeyboardOffset();
  const isKbOpen = kbOffset > 0;

  return (
    <Drawer.Root
      open={open}
      onOpenChange={onOpenChange}
      // Не масштабируем фон — это и есть причина «прыжков» при открытии
      // вложенных пикеров и при анимации появления.
      shouldScaleBackground={false}
      setBackgroundColorOnScale={false}
      // Свайп-вниз только за ручку наверху, чтобы случайный жест в форме
      // не закрывал модалку с несохранёнными данными.
      handleOnly
      // ВАЖНО: отключаем встроенный лифт. Мы сами компенсируем клавиатуру
      // через padding-bottom = высота клавиатуры (см. style ниже).
      repositionInputs={false}
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[80] bg-black/80" />
        <Drawer.Content
          className={cn(
            "fixed inset-x-0 bottom-0 z-[81] flex flex-col rounded-t-[20px] border-t border-white/[0.08] bg-[#0d0d0d] outline-none",
            fullHeight
              ? "h-[calc(100dvh-env(safe-area-inset-top)-8px)]"
              : "max-h-[78dvh]",
          )}
          style={{
            // Когда клавиатура открыта — её высота вытесняет нижний инсет.
            // Это сжимает внутренний flex-1 список и поднимает композер ровно
            // над клавиатурой, не двигая шапку.
            paddingBottom: isKbOpen
              ? kbOffset
              : "env(safe-area-inset-bottom)",
            // Запрещаем браузеру обрабатывать горизонтальный пан — иначе в iOS PWA
            // модалку можно «таскать» вправо-влево пальцем по форме.
            touchAction: "pan-y",
            overscrollBehavior: "contain",
            // Плавно подстраиваемся под появление/скрытие клавиатуры,
            // чтобы композер не «дёргался».
            transition: "padding-bottom 180ms ease-out",
          }}
        >
          <Drawer.Title className="sr-only">{title}</Drawer.Title>

          {/* ручка — она же зона свайпа благодаря handleOnly */}
          <Drawer.Handle className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full !bg-white/15" />


          {/* шапка — sticky */}
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/[0.05] px-5 pb-3 pt-3">
            <div className="min-w-0 flex-1">
              {headerLeft ?? (
                <h2 className="truncate font-display text-xl font-black italic uppercase tracking-tight">
                  {title}
                </h2>
              )}
            </div>
            <button
              type="button"
              onClick={onDone ?? close}
              disabled={doneDisabled}
              className="shrink-0 font-mono text-[12px] font-bold uppercase tracking-wider text-primary active:opacity-60 disabled:cursor-not-allowed disabled:text-muted-foreground/40 disabled:active:opacity-100"
            >
              {doneLabel}
            </button>
          </div>

          <div
            className={cn(
              "flex-1 overflow-y-auto overscroll-contain px-4 pb-6 pt-4",
              contentClassName,
            )}
          >
            {children}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
