// Фуллскрин-просмотр картинки поста. Тап вне картинки или свайп вниз — закрыть.
// Дабл-тап по картинке — onDoubleTap (используем для like). Без pinch-zoom
// в первой версии (требует библиотеки) — но базовый Instagram/Telegram-feel
// есть: затемнение, drag-down с резинкой, инерция закрытия.

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useThemeColor } from "@/hooks/use-theme-color";

type Props = {
  src: string;
  open: boolean;
  onClose: () => void;
  onDoubleTap?: () => void;
};

export function ImageViewer({ src, open, onClose, onDoubleTap }: Props) {
  const [dy, setDy] = useState(0);
  const startY = useRef<number | null>(null);
  const lastTap = useRef(0);
  useThemeColor(open ? "#000000" : null);

  // Esc / overflow
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) setDy(0);
  }, [open]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    startY.current = e.clientY;
  }, []);
  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (startY.current == null) return;
    const d = e.clientY - startY.current;
    setDy(d > 0 ? d : d / 3);
  }, []);
  const onPointerUp = useCallback(() => {
    if (Math.abs(dy) > 120) onClose();
    else setDy(0);
    startY.current = null;
  }, [dy, onClose]);

  const onImgClick = useCallback(() => {
    const now = Date.now();
    if (now - lastTap.current < 280) {
      onDoubleTap?.();
      lastTap.current = 0;
    } else {
      lastTap.current = now;
    }
  }, [onDoubleTap]);

  if (!open || typeof document === "undefined") return null;

  const fade = Math.max(0, 1 - Math.abs(dy) / 400);

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ background: `rgba(0,0,0,${0.92 * fade})`, transition: startY.current == null ? "background 220ms" : undefined }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Закрыть"
        className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] z-10 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white backdrop-blur"
      >
        <X size={20} />
      </button>
      <img
        src={src}
        alt=""
        draggable={false}
        onClick={onImgClick}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="max-h-full max-w-full touch-none select-none object-contain"
        style={{
          transform: `translateY(${dy}px)`,
          transition: startY.current == null ? "transform 260ms cubic-bezier(0.22,1,0.36,1)" : undefined,
          willChange: "transform",
        }}
      />
    </div>,
    document.body,
  );
}
