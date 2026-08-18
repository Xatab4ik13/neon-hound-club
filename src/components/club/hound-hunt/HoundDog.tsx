// Заглушка «гончей» для шоу HOUND HUNT.
// Пока это SVG-силуэт: голова, светящиеся глаза (следят за курсором/кейсом),
// подвижная нижняя челюсть. Когда будет 3D-ассет (GLB), этот компонент
// меняется на <Canvas> react-three-fiber с той же внешней API:
// mode = "idle" | "watch" | "lunge" | "chew", lookAt = {x,y} в диапазоне -1..1.

import { motion, useAnimationControls } from "framer-motion";
import { useEffect } from "react";

export type DogMode = "idle" | "watch" | "lunge" | "chew";

type Props = {
  mode: DogMode;
  /** Куда смотрит: -1..1 по обеим осям (0,0 — прямо на зрителя). */
  lookAt?: { x: number; y: number };
  className?: string;
};

export function HoundDog({ mode, lookAt = { x: 0, y: 0 }, className }: Props) {
  const body = useAnimationControls();
  const jaw = useAnimationControls();

  useEffect(() => {
    if (mode === "idle") {
      body.start({
        y: [0, -6, 0],
        scale: 1,
        rotate: 0,
        transition: { duration: 3.4, repeat: Infinity, ease: "easeInOut" },
      });
      jaw.start({ rotate: 0, transition: { duration: 0.4 } });
      return;
    }
    if (mode === "watch") {
      body.start({
        y: [0, -3, 0],
        scale: 1.04,
        rotate: 0,
        transition: { duration: 1.6, repeat: Infinity, ease: "easeInOut" },
      });
      jaw.start({ rotate: [0, 6, 0], transition: { duration: 1.6, repeat: Infinity } });
      return;
    }
    if (mode === "lunge") {
      body.start({
        y: [0, 18, -10, 0],
        scale: [1.04, 1.5, 1.18, 1.1],
        rotate: [0, -3, 2, 0],
        transition: { duration: 0.9, ease: [0.2, 0.9, 0.1, 1] },
      });
      jaw.start({
        rotate: [0, 26, 2, 18, 0],
        transition: { duration: 0.9, times: [0, 0.3, 0.5, 0.7, 1] },
      });
      return;
    }
    // chew
    body.start({
      y: [0, 4, 0],
      scale: 1.12,
      rotate: [0, 1.5, -1.5, 0],
      transition: { duration: 0.42, repeat: 5, ease: "easeInOut" },
    });
    jaw.start({ rotate: [4, 20, 4], transition: { duration: 0.42, repeat: 5 } });
  }, [mode, body, jaw]);

  const px = Math.max(-1, Math.min(1, lookAt.x)) * 5;
  const py = Math.max(-1, Math.min(1, lookAt.y)) * 4;

  return (
    <motion.div animate={body} className={className}>
      <svg viewBox="0 0 220 170" className="h-full w-full overflow-visible">
        <defs>
          <radialGradient id="hh-eye" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="1" />
            <stop offset="60%" stopColor="var(--destructive)" stopOpacity="0.9" />
            <stop offset="100%" stopColor="var(--destructive)" stopOpacity="0" />
          </radialGradient>
          <filter id="hh-glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* силуэт головы: почти чёрный, читается только контуром */}
        <g fill="currentColor" className="text-foreground/[0.14]">
          <path d="M30 96c-6-26 6-52 30-66 16-9 34-11 51-6l14-12 9 20 22 8-13 14c9 14 12 31 8 47-6 26-30 44-60 44-30 0-55-17-61-49Z" />
          <path d="M30 30c14 2 24 12 28 26-12 6-24 4-33-4-6-6-3-20 5-22Z" />
          <path d="M190 30c-14 2-24 12-28 26 12 6 24 4 33-4 6-6 3-20-5-22Z" />
        </g>
        <g
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          className="text-primary/40"
        >
          <path d="M30 96c-6-26 6-52 30-66 16-9 34-11 51-6" />
          <path d="M170 62c9 14 12 31 8 47-6 26-30 44-60 44-30 0-55-17-61-49" />
        </g>

        {/* глаза */}
        <g filter="url(#hh-glow)">
          <circle cx={82 + px} cy={80 + py} r="9" fill="url(#hh-eye)" />
          <circle cx={138 + px} cy={80 + py} r="9" fill="url(#hh-eye)" />
          <circle cx={82 + px * 1.6} cy={80 + py * 1.6} r="3.2" fill="var(--primary-foreground)" />
          <circle cx={138 + px * 1.6} cy={80 + py * 1.6} r="3.2" fill="var(--primary-foreground)" />
        </g>

        {/* морда + челюсть */}
        <g className="text-foreground/25" fill="currentColor">
          <path d="M96 108h28l-6 10h-16Z" />
        </g>
        <motion.g animate={jaw} style={{ originX: "110px", originY: "112px" }}>
          <path
            d="M92 118h36c-2 12-9 20-18 20s-16-8-18-20Z"
            fill="currentColor"
            className="text-foreground/20"
          />
          {/* клыки */}
          <path d="M98 118l4 11 4-11Z" fill="var(--primary-foreground)" opacity="0.85" />
          <path d="M114 118l4 12 4-12Z" fill="var(--primary-foreground)" opacity="0.85" />
        </motion.g>
      </svg>
    </motion.div>
  );
}
