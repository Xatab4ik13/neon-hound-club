import { AnimatePresence, motion } from "framer-motion";
import { useLayoutEffect, useRef } from "react";
import { useRouterState } from "@tanstack/react-router";

/**
 * iOS-style push/pop transition между маршрутами клуба.
 *
 * Поведение:
 *  - push (deeper path)  → новый слой въезжает справа (x:100% → 0),
 *                          старый уезжает на -30%.
 *  - pop (shallower path)→ обратное.
 *  - tab ↔ tab           → мгновенная замена без анимации (как настоящий iOS).
 *  - same path           → не анимируем, ничего не делаем.
 *
 * popLayout убирает уходящий слой из flow, чтобы оба могли ехать без
 * скачков высоты документа. Opacity держим 1 — прозрачность на движении
 * выглядит как баг, в iOS такого нет.
 *
 * Scroll restoration: восстанавливаем `scrollTop` в useLayoutEffect ДО
 * того, как анимация стартует — иначе при возврате на ленту видно прыжок
 * в конце слайда.
 */

const TAB_ROOTS = new Set([
  "/club",
  "/club/shop",
  "/club/tickets",
  "/club/garage",
]);

const FIXED_HEIGHT_ROUTES = new Set([
  "/club/vip-chat",
  "/club/hell-ai",
]);

function depth(path: string) {
  return path.split("/").filter(Boolean).length;
}

function isTabRoot(path: string) {
  return TAB_ROOTS.has(path);
}

const SPRING = { type: "spring" as const, stiffness: 420, damping: 42, mass: 0.85 };

// Сохраняем scrollY каждого pathname, чтобы вернуть его при back-навигации
// синхронно (до того, как анимация раскрутится).
const scrollMemory = new Map<string, number>();

export function MobileTransition({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const prevPath = useRef(pathname);
  const prevDepth = useRef(depth(pathname));

  const current = depth(pathname);
  let direction: 1 | -1 | 0 = 0;
  let skipAnimation = false;

  if (pathname !== prevPath.current) {
    // Запоминаем скролл предыдущего экрана перед уходом.
    if (typeof window !== "undefined") {
      scrollMemory.set(prevPath.current, window.scrollY || 0);
    }
    // Tab ↔ tab — без анимации.
    if (isTabRoot(pathname) && isTabRoot(prevPath.current)) {
      skipAnimation = true;
      direction = 0;
    } else {
      direction =
        current > prevDepth.current ? 1 : current < prevDepth.current ? -1 : 0;
    }
    prevPath.current = pathname;
    prevDepth.current = current;
  }

  const isSlide = !skipAnimation && direction !== 0;
  const isFixedHeightRoute = FIXED_HEIGHT_ROUTES.has(pathname);

  // Восстанавливаем scrollY синхронно после смены key — до paint.
  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    const remembered = scrollMemory.get(pathname);
    // На push/новых экранах — наверх. На pop — возврат на запомненный.
    window.scrollTo(0, remembered ?? 0);
  }, [pathname]);

  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.div
        key={pathname}
        initial={
          isSlide
            ? { x: direction === 1 ? "100%" : "-30%", opacity: 1 }
            : false
        }
        animate={isSlide ? { x: 0, opacity: 1 } : { x: 0, opacity: 1 }}
        exit={
          isSlide
            ? { x: direction === 1 ? "-30%" : "100%", opacity: 1 }
            : { opacity: 1 }
        }
        transition={isSlide ? SPRING : { duration: 0 }}
        className={
          isFixedHeightRoute
            ? "relative min-h-0 overflow-hidden will-change-transform"
            : "relative min-h-[100dvh] will-change-transform"
        }
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
