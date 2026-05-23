import { AnimatePresence, motion } from "framer-motion";
import { useRef } from "react";
import { useRouterState } from "@tanstack/react-router";

function depth(path: string) {
  return path.split("/").filter(Boolean).length;
}

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

  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.div
        key={pathname}
        initial={
          direction === 0
            ? { opacity: 0, scale: 0.985 }
            : { x: direction === 1 ? "100%" : "-25%", opacity: direction === 1 ? 1 : 0.7 }
        }
        animate={{ x: 0, opacity: 1, scale: 1 }}
        exit={
          direction === 0
            ? { opacity: 0, scale: 0.985 }
            : { x: direction === 1 ? "-25%" : "100%", opacity: direction === 1 ? 0.7 : 1 }
        }
        transition={
          direction === 0
            ? { duration: 0.18, ease: [0.32, 0.72, 0, 1] }
            : { type: "spring", stiffness: 380, damping: 38, mass: 0.9 }
        }
        className="min-h-full will-change-transform"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

