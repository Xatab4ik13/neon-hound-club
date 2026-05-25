// SwiftUI-подобный pull-to-refresh: тянем сверху, резина, релиз → refresh.
// Только touch (мобайл). На десктопе ничего не делает.
// Перформанс: transform на одном внутреннем контейнере, без re-layout.

import { useEffect, useRef, useState, type ReactNode } from "react";
import { haptic } from "@/hooks/use-haptic";
import { feedStore } from "@/data/feed-store";

type Props = {
  onRefresh?: () => Promise<void> | void;
  children: ReactNode;
  /** Порог срабатывания в px. По умолчанию 70. */
  threshold?: number;
};

export function PullToRefresh({ onRefresh, children, threshold = 70 }: Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const startY = useRef(0);
  const pulling = useRef(false);
  const armed = useRef(false);
  const [pull, setPull] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    if (typeof window === "undefined") return;
    if (!("ontouchstart" in window)) return;

    const onTouchStart = (e: TouchEvent) => {
      if (busy) return;
      // Тянем только если страница скроллена в самый верх.
      if ((window.scrollY || document.documentElement.scrollTop) > 0) return;
      startY.current = e.touches[0].clientY;
      pulling.current = true;
      armed.current = false;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!pulling.current || busy) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy <= 0) {
        if (pull !== 0) setPull(0);
        return;
      }
      // Резина: чем дальше — тем тяжелее.
      const eased = Math.min(140, Math.pow(dy, 0.82));
      setPull(eased);
      if (!armed.current && eased >= threshold) {
        armed.current = true;
        haptic("light");
      } else if (armed.current && eased < threshold) {
        armed.current = false;
      }
    };

    const onTouchEnd = async () => {
      if (!pulling.current) return;
      pulling.current = false;
      if (armed.current && !busy) {
        setBusy(true);
        setPull(48);
        haptic("success");
        try {
          await onRefresh();
        } finally {
          setBusy(false);
          setPull(0);
        }
      } else {
        setPull(0);
      }
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: true });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    el.addEventListener("touchcancel", onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [busy, onRefresh, pull, threshold]);

  const progress = Math.min(1, pull / threshold);

  return (
    <div ref={wrapRef} className="relative">
      {/* Индикатор */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 z-20 -translate-x-1/2"
        style={{
          top: 8,
          opacity: pull > 4 ? 1 : 0,
          transform: `translate(-50%, ${Math.max(0, pull - 24)}px)`,
          transition: pulling.current ? "none" : "transform 280ms cubic-bezier(0.22,1,0.36,1), opacity 200ms ease",
        }}
      >
        <div
          className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-black/60 backdrop-blur"
          style={{
            boxShadow: busy || armed.current ? "0 0 14px rgba(255,45,149,0.45)" : undefined,
            transition: "box-shadow 180ms ease",
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            className={busy ? "animate-spin text-primary" : "text-foreground/80"}
            style={{
              transform: busy ? undefined : `rotate(${progress * 270}deg)`,
              transition: busy ? undefined : "transform 60ms linear",
            }}
          >
            <path
              d="M12 4v4M12 4l-3 3M12 4l3 3"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            {busy && (
              <circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="20 60" />
            )}
          </svg>
        </div>
      </div>

      <div
        style={{
          transform: `translate3d(0, ${pull}px, 0)`,
          transition: pulling.current ? "none" : "transform 320ms cubic-bezier(0.22,1,0.36,1)",
          willChange: "transform",
        }}
      >
        {children}
      </div>
    </div>
  );
}
