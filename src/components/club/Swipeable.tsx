// SwiftUI-style swipe actions для строки/карточки.
// Свайп пальцем влево/вправо — открывается «полка» с действиями.
// Релиз за порогом → вызывает action; недотянул → spring-возврат.
// Только touch (мобайл), на десктопе ничего не делает.
//
// Перформанс: один transform на контентном слое, без re-layout. willChange:transform.

import { useEffect, useRef, useState, type ReactNode } from "react";
import { haptic } from "@/hooks/use-haptic";

type Action = {
  /** Иконка действия (lucide-react element) */
  icon: ReactNode;
  /** Подпись на полке */
  label: string;
  /** Цвет фона полки */
  bg: string;
  /** Цвет текста/иконки */
  fg?: string;
  /** Колбэк по срабатыванию */
  onAction: () => void;
};

type Props = {
  children: ReactNode;
  /** Действие при свайпе вправо (полка слева) */
  right?: Action;
  /** Действие при свайпе влево (полка справа) */
  left?: Action;
  /** Порог срабатывания в px. По умолчанию 80. */
  threshold?: number;
  /** Доп. класс на корне (нужен для радиусов карточек). */
  className?: string;
  /** Радиус скругления полки в px (по умолчанию 16). */
  radius?: number;
};

export function Swipeable({
  children,
  right,
  left,
  threshold = 80,
  className = "",
  radius = 16,
}: Props) {
  const startX = useRef(0);
  const startY = useRef(0);
  const tracking = useRef(false);
  const horizontal = useRef<boolean | null>(null); // null = ещё не определились
  const armed = useRef(false);
  const [dx, setDx] = useState(0);

  useEffect(() => {
    // touch-only feature
    if (typeof window === "undefined") return;
    if (!("ontouchstart" in window)) return;
  }, []);

  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    tracking.current = true;
    horizontal.current = null;
    armed.current = false;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!tracking.current) return;
    const x = e.touches[0].clientX - startX.current;
    const y = e.touches[0].clientY - startY.current;

    // Определяем ось один раз: если |y| доминирует — отдаём управление скроллу.
    if (horizontal.current === null) {
      if (Math.abs(x) < 8 && Math.abs(y) < 8) return; // ещё не понятно
      horizontal.current = Math.abs(x) > Math.abs(y);
      if (!horizontal.current) {
        tracking.current = false;
        return;
      }
    }

    // Ограничиваем сторону: если нет полки в эту сторону → резина уменьшает
    let nx = x;
    if (x > 0 && !right) nx = Math.pow(x, 0.5);
    if (x < 0 && !left) nx = -Math.pow(-x, 0.5);
    // Cap на 1.5*threshold
    const cap = threshold * 1.6;
    nx = Math.max(-cap, Math.min(cap, nx));

    setDx(nx);

    const overThreshold = Math.abs(nx) >= threshold && ((nx > 0 && right) || (nx < 0 && left));
    if (overThreshold && !armed.current) {
      armed.current = true;
      haptic("light");
    } else if (!overThreshold && armed.current) {
      armed.current = false;
    }
  };

  const onTouchEnd = () => {
    if (!tracking.current && horizontal.current === false) {
      // была вертикальная прокрутка — ничего не делаем
      return;
    }
    tracking.current = false;
    horizontal.current = null;
    if (armed.current) {
      armed.current = false;
      haptic("success");
      if (dx > 0 && right) right.onAction();
      else if (dx < 0 && left) left.onAction();
    }
    setDx(0);
  };

  const onTouchCancel = () => {
    tracking.current = false;
    horizontal.current = null;
    armed.current = false;
    setDx(0);
  };

  // Прогресс [0..1] для подсветки полки.
  const progress = Math.min(1, Math.abs(dx) / threshold);

  return (
    <div className={`relative ${className}`} style={{ touchAction: "pan-y" }}>
      {/* Левая полка (swipe вправо) */}
      {right && dx > 0 && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 flex items-center justify-start pl-5"
          style={{
            width: Math.max(0, dx),
            background: right.bg,
            color: right.fg ?? "white",
            borderRadius: radius,
            opacity: 0.6 + progress * 0.4,
            transition: tracking.current ? "none" : "opacity 220ms ease",
          }}
        >
          <span
            className="inline-flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.18em]"
            style={{ transform: `scale(${0.85 + progress * 0.2})` }}
          >
            {right.icon}
            <span>{right.label}</span>
          </span>
        </div>
      )}

      {/* Правая полка (swipe влево) */}
      {left && dx < 0 && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 flex items-center justify-end pr-5"
          style={{
            width: Math.max(0, -dx),
            background: left.bg,
            color: left.fg ?? "white",
            borderRadius: radius,
            opacity: 0.6 + progress * 0.4,
            transition: tracking.current ? "none" : "opacity 220ms ease",
          }}
        >
          <span
            className="inline-flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.18em]"
            style={{ transform: `scale(${0.85 + progress * 0.2})` }}
          >
            <span>{left.label}</span>
            {left.icon}
          </span>
        </div>
      )}

      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchCancel}
        style={{
          transform: `translate3d(${dx}px, 0, 0)`,
          transition: tracking.current ? "none" : "transform 320ms cubic-bezier(0.22, 1, 0.36, 1)",
          willChange: "transform",
        }}
      >
        {children}
      </div>
    </div>
  );
}
