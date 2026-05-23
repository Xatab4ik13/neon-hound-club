// iOS-style edge-swipe back. Жест: пуш-старт у левого края (< EDGE_PX),
// горизонтальная тяга вправо > THRESHOLD_PX и доминирует над вертикалью.
// Триггерит router.history.back() + лёгкий хаптик.
//
// Подключается один раз в layout (например, /club, /blogger). Никаких
// визуальных эффектов — только жест. Если у пользователя нет истории —
// просто игнор.

import { useEffect } from "react";
import { useRouter } from "@tanstack/react-router";
import { haptic } from "@/hooks/use-haptic";

const EDGE_PX = 24;        // зона старта от левого края
const THRESHOLD_PX = 70;   // минимальная горизонтальная дистанция
const MAX_VERT_RATIO = 0.6; // |dy| / |dx| должно быть меньше

export function useEdgeSwipeBack(enabled = true) {
  const router = useRouter();

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;

    let startX = 0;
    let startY = 0;
    let tracking = false;

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      if (t.clientX > EDGE_PX) return;
      startX = t.clientX;
      startY = t.clientY;
      tracking = true;
    };

    const onEnd = (e: TouchEvent) => {
      if (!tracking) return;
      tracking = false;
      const t = e.changedTouches[0];
      if (!t) return;
      const dx = t.clientX - startX;
      const dy = Math.abs(t.clientY - startY);
      if (dx < THRESHOLD_PX) return;
      if (dy / Math.max(dx, 1) > MAX_VERT_RATIO) return;
      // Есть ли куда возвращаться?
      if (typeof window.history.length === "number" && window.history.length > 1) {
        haptic("light");
        router.history.back();
      }
    };

    const onCancel = () => {
      tracking = false;
    };

    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    window.addEventListener("touchcancel", onCancel, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onCancel);
    };
  }, [enabled, router]);
}
