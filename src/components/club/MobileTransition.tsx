import { AnimatePresence, motion } from "framer-motion";
import { useRef } from "react";
import { useRouterState } from "@tanstack/react-router";

/**
 * iOS-style push/pop transition between routes.
 *
 * Forward (deeper path): incoming slides in from the right (x:100% → 0),
 * outgoing slides left to -30%.
 * Back (shallower path): inverse.
 * Same-depth: subtle cross-fade.
 *
 * Both layers are absolutely positioned inside an overflow-hidden track
 * so they don't stack visually and don't push the layout. Opacity stays
 * at 1 during slides — translucency on motion looks broken on real iOS.
 */

function depth(path: string) {
  return path.split("/").filter(Boolean).length;
}

const SPRING = { type: "spring" as const, stiffness: 420, damping: 42, mass: 0.85 };
const FADE = { duration: 0.18, ease: [0.32, 0.72, 0, 1] as const };

export function MobileTransition({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const prevPath = useRef(pathname);
  const prevDepth = useRef(depth(pathname));

  const current = depth(pathname);
  let direction: 1 | -1 | 0 = 0;
  if (pathname !== prevPath.current) {
    direction = current > prevDepth.current ? 1 : current < prevDepth.current ? -1 : 0;
    prevPath.current = pathname;
    prevDepth.current = current;
  }

  const isSlide = direction !== 0;

  return (
    <div className="relative isolate min-h-full overflow-hidden">
      <AnimatePresence mode="sync" initial={false}>
        <motion.div
          key={pathname}
          initial={
            isSlide
              ? { x: direction === 1 ? "100%" : "-30%", opacity: 1 }
              : { opacity: 0 }
          }
          animate={{ x: 0, opacity: 1 }}
          exit={
            isSlide
              ? { x: direction === 1 ? "-30%" : "100%", opacity: 1 }
              : { opacity: 0 }
          }
          transition={isSlide ? SPRING : FADE}
          className="absolute inset-0 min-h-full will-change-transform"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
