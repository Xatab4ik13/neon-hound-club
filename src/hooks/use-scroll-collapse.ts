import { useEffect, useState } from "react";

/**
 * Возвращает true, когда страница прокручена больше threshold px.
 * Используется, чтобы вынести iOS-style large title в верхнюю панель.
 */
export function useScrollCollapse(threshold = 24): boolean {
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setCollapsed(window.scrollY > threshold);
        ticking = false;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);
  return collapsed;
}
