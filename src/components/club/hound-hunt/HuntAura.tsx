// Гравитационная аура под капсулой HOUND HUNT.
// Она «держит» капсулу на весу: снизу вверх идёт луч, под капсулой — эллипс
// свечения. Когда капсулу выбивают, аура остаётся на месте — состав ленты не
// меняется, значит нет подмены аватарок на глазах у зрителя.

import { motion } from "framer-motion";

type Props = {
  /** Ширина капсулы, px — аура масштабируется от неё. */
  width: number;
  /** true = капсула выбита: аура остаётся, но гаснет и «выдыхает». */
  empty?: boolean;
  /** Разброс фаз, чтобы ауры не пульсировали синхронно. */
  seed?: number;
};

export function HuntAura({ width, empty = false, seed = 0 }: Props) {
  const delay = (seed % 7) * 0.23;
  const strength = empty ? 0.78 : 1;

  return (
    <div
      className="pointer-events-none absolute left-1/2 -translate-x-1/2"
      style={{ top: width * 0.82, width: width * 1.35, height: width * 0.7 }}
    >
      {/* Вертикальное поле: широкое у основания и сходится к капсуле. */}
      <motion.div
        className="absolute left-1/2 top-0 -translate-x-1/2"
        style={{
          width: width * 0.72,
          height: width * 0.7,
          background:
            "conic-gradient(from 164deg at 50% 0%, transparent 0deg, color-mix(in oklab, var(--primary) 42%, transparent) 14deg, color-mix(in oklab, var(--destructive) 46%, transparent) 30deg, transparent 58deg)",
          filter: "blur(4px)",
        }}
        animate={{ opacity: [0.48 * strength, 0.82 * strength, 0.48 * strength] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", delay }}
      />

      {/* эллипс-подушка прямо под капсулой */}
      <motion.div
        className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-[50%]"
        style={{
          width: width * 1.02,
          height: width * 0.28,
          background:
            "radial-gradient(ellipse, transparent 34%, color-mix(in oklab, var(--primary) 75%, transparent) 43%, color-mix(in oklab, var(--destructive) 70%, transparent) 58%, transparent 72%)",
          filter: "blur(1.5px)",
        }}
        animate={{
          opacity: [0.55 * strength, 0.9 * strength, 0.55 * strength],
          scaleX: empty ? [1, 1.12, 1] : [0.94, 1.06, 0.94],
        }}
        transition={{ duration: 1.9, repeat: Infinity, ease: "easeInOut", delay }}
      />

      {/* искры, поднимающиеся вверх по полю */}
      {Array.from({ length: 3 }).map((_, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full"
          style={{
            left: `${28 + i * 22}%`,
            bottom: 0,
            width: Math.max(2, width * 0.035),
            height: Math.max(2, width * 0.035),
            background: "color-mix(in oklab, var(--destructive) 85%, white)",
          }}
          animate={{ y: [0, -width * 0.7], opacity: [0, 0.8 * strength, 0] }}
          transition={{
            duration: 2.2 + i * 0.4,
            repeat: Infinity,
            ease: "easeOut",
            delay: delay + i * 0.5,
          }}
        />
      ))}
    </div>
  );
}
