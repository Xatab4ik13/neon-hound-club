// Аватарка участника HOUND HUNT — «шайба» с фото/инициалами и ником.
// По ленте барабана крутятся именно аватарки, чтобы участник узнал себя
// и болел за свою. Позже avatarUrl придёт с бекенда, пока моки без фото.

import { motion } from "framer-motion";
import { hueOf, type HuntEntry } from "./hh-mock";

type Props = {
  entry: HuntEntry;
  /** 1 = ~152px в ширину. */
  scale?: number;
  focused?: boolean;
  className?: string;
};

export function HuntAvatar({ entry, scale = 1, focused = false, className }: Props) {
  const size = 132 * scale;
  const hue = hueOf(entry.nick);

  return (
    <div
      className={className}
      style={{ width: size, display: "grid", justifyItems: "center", gap: size * 0.06 }}
    >
      <motion.div
        className="relative grid place-items-center rounded-full"
        style={{
          width: size,
          height: size,
          padding: size * 0.045,
          background: focused
            ? "conic-gradient(from 0deg, color-mix(in oklab, var(--destructive) 90%, transparent), color-mix(in oklab, var(--primary) 90%, transparent), color-mix(in oklab, var(--destructive) 90%, transparent))"
            : "linear-gradient(160deg, rgba(255,255,255,0.35), rgba(255,255,255,0.06) 45%, rgba(0,0,0,0.7))",
          boxShadow: focused
            ? "0 0 34px -4px color-mix(in oklab, var(--destructive) 75%, transparent), inset 0 1px 2px rgba(255,255,255,0.5)"
            : "0 16px 30px -14px rgba(0,0,0,0.95), inset 0 1px 2px rgba(255,255,255,0.4)",
        }}
        animate={focused ? { scale: [1, 1.05, 1] } : undefined}
        transition={focused ? { duration: 1.6, repeat: Infinity, ease: "easeInOut" } : undefined}
      >
        <div
          className="relative h-full w-full overflow-hidden rounded-full"
          style={{
            background: `linear-gradient(150deg, oklch(0.48 0.16 ${hue}), oklch(0.14 0.04 ${hue}))`,
          }}
        >
          {entry.avatarUrl ? (
            <img
              src={entry.avatarUrl}
              alt={entry.nick}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : (
            <div
              className="grid h-full w-full place-items-center font-display font-black text-foreground"
              style={{ fontSize: size * 0.32 }}
            >
              {entry.initials}
            </div>
          )}

          {/* блик по «стеклу» аватарки */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "linear-gradient(150deg, rgba(255,255,255,0.28), transparent 42%, rgba(0,0,0,0.35))",
            }}
          />
        </div>
      </motion.div>

      <span
        className="max-w-full truncate text-center font-mono uppercase tracking-[0.14em]"
        style={{
          fontSize: Math.max(8, size * 0.105),
          color: focused ? "var(--foreground)" : "color-mix(in oklab, var(--foreground) 60%, transparent)",
        }}
      >
        {entry.nick}
      </span>
    </div>
  );
}
