import { useEffect, useRef, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { haptic } from "@/hooks/use-haptic";

// iOS-style pull-to-refresh. Срабатывает только когда скролл уже наверху.
// При достижении трешхолда — invalidate() роутера (перетягивает loader-данные
// и инвалидирует react-query кеш) + haptic. Без external libs.

const THRESHOLD = 72; // px — порог срабатывания
const MAX_PULL = 120; // px — визуальный максимум

export function PullToRefresh({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const armed = useRef(false);

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      if (refreshing) return;
      // Только если страница реально наверху.
      if (window.scrollY > 0) {
        startY.current = null;
        armed.current = false;
        return;
      }
      startY.current = e.touches[0].clientY;
      armed.current = true;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!armed.current || startY.current === null || refreshing) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy <= 0) {
        setPull(0);
        return;
      }
      // Резиновое сопротивление — чем дальше, тем медленнее.
      const eased = Math.min(MAX_PULL, dy * 0.5);
      setPull(eased);
    };

    const onTouchEnd = async () => {
      if (!armed.current) return;
      armed.current = false;
      startY.current = null;
      if (pull >= THRESHOLD && !refreshing) {
        setRefreshing(true);
        haptic("success");
        try {
          await router.invalidate();
        } finally {
          setRefreshing(false);
          setPull(0);
        }
      } else {
        setPull(0);
      }
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [pull, refreshing, router]);

  const visible = pull > 0 || refreshing;
  const progress = Math.min(1, pull / THRESHOLD);

  return (
    <>
      <div
        aria-hidden={!visible}
        className="pointer-events-none fixed inset-x-0 z-40 flex justify-center"
        style={{
          top: "calc(env(safe-area-inset-top) + 4px)",
          transform: `translateY(${visible ? Math.min(pull, MAX_PULL) * 0.5 : -40}px)`,
          opacity: visible ? 1 : 0,
          transition: refreshing || pull === 0 ? "transform 220ms cubic-bezier(0.32,0.72,0,1), opacity 220ms" : "none",
        }}
      >
        <div
          className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-black/70 backdrop-blur-xl"
          style={{
            transform: refreshing ? "none" : `rotate(${progress * 360}deg)`,
          }}
        >
          <Loader2
            className={`h-4 w-4 text-primary ${refreshing ? "animate-spin" : ""}`}
            strokeWidth={2.4}
            style={{ opacity: refreshing ? 1 : 0.4 + progress * 0.6 }}
          />
        </div>
      </div>
      <div
        style={{
          transform: pull > 0 && !refreshing ? `translateY(${pull * 0.4}px)` : "translateY(0)",
          transition: pull === 0 || refreshing ? "transform 240ms cubic-bezier(0.32,0.72,0,1)" : "none",
        }}
      >
        {children}
      </div>
    </>
  );
}
