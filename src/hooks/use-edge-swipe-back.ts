// iOS-style edge-swipe back. Жест: пуш-старт у левого края (< EDGE_PX),
// горизонтальная тяга вправо > THRESHOLD_PX и доминирует над вертикалью.
//
// Логика возврата:
//   1. Если в нашем in-app history есть куда вернуться — `router.history.back()`.
//   2. Иначе (deep-link, прямой вход на подстраницу) — навигация на
//      родительский путь, чтобы не выкинуть юзера из приложения в Safari.
//
// Подключается один раз в layout (например, /club, /blogger).

import { useEffect } from "react";
import { useRouter } from "@tanstack/react-router";
import { haptic } from "@/hooks/use-haptic";

const EDGE_PX = 24;        // зона старта от левого края
const THRESHOLD_PX = 70;   // минимальная горизонтальная дистанция
const MAX_VERT_RATIO = 0.6; // |dy| / |dx| должно быть меньше

// Маршруты, для которых жест свайпа обязан остаться внутри клуба:
// если для них нет валидной in-app истории, упадём на родителя.
function parentPath(pathname: string): string | null {
  // /club/shop/$slug → /club/shop, /club/p/$id → /club, /club/me → /club
  const segs = pathname.split("/").filter(Boolean);
  if (segs.length <= 1) return null;
  segs.pop();
  return "/" + segs.join("/");
}

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

      haptic("light");

      // history.state у нас содержит __TSR_index (TanStack Router) — это
      // надёжный признак, что предыдущий вход был сделан роутером, а не
      // пришёл извне (deep-link / открытие из пуша).
      const hasInAppHistory =
        typeof window.history.state === "object" &&
        window.history.state !== null &&
        typeof (window.history.state as { __TSR_index?: number }).__TSR_index ===
          "number" &&
        (window.history.state as { __TSR_index?: number }).__TSR_index! > 0;

      if (hasInAppHistory) {
        router.history.back();
        return;
      }

      const parent = parentPath(window.location.pathname);
      if (parent) {
        router.navigate({ to: parent, replace: true });
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
