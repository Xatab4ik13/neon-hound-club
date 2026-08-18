// Капсула HOUND HUNT — пока чисто CSS/SVG «псевдо-3D»: стеклянная колба,
// металлические обручи, внутри болтается аватарка участника (без ника).
// Когда придут настоящие 3D-ассеты (GLB), эта же геометрия/тайминги
// переедут в three-сцену без изменения логики шоу.

import { motion } from "framer-motion";
import { hueOf, type HuntEntry } from "./hh-mock";

export type CapsuleState = "idle" | "float" | "focus" | "crack";

type Props = {
  entry: HuntEntry;
  /** Масштаб: 1 = крупная капсула (~152px в ширину). */
  scale?: number;
  state?: CapsuleState;
  className?: string;
};

/** Аватарка внутри капсулы. Пока — инициалы на градиенте (заглушка под avatarUrl). */
function InnerAvatar({ entry, size }: { entry: HuntEntry; size: number }) {
  const hue = hueOf(entry.nick);
  return (
    <div
      className="grid place-items-center rounded-full font-display font-black text-foreground"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.34,
        background: `linear-gradient(150deg, oklch(0.5 0.17 ${hue}), oklch(0.16 0.05 ${hue}))`,
        boxShadow:
          "inset 0 2px 10px rgba(255,255,255,0.25), 0 10px 24px -8px rgba(0,0,0,0.9)",
      }}
    >
      {entry.initials}
    </div>
  );
}

export function HuntCapsule({ entry, scale = 1, state = "float", className }: Props) {
  const W = 152 * scale;
  const H = 208 * scale;
  const avatar = W * 0.52;

  const bob = state === "crack" ? 0 : 1;

  return (
    <div
      className={className}
      style={{ width: W, height: H, perspective: 900, transformStyle: "preserve-3d" }}
    >
      <motion.div
        className="relative h-full w-full"
        animate={
          state === "crack"
            ? { rotateZ: [0, -8, 9, -4, 0], scale: [1, 1.06, 0.94, 1] }
            : { rotateZ: [-2.5, 2.5, -2.5], y: [-4 * bob, 4 * bob, -4 * bob] }
        }
        transition={
          state === "crack"
            ? { duration: 0.6 }
            : { duration: state === "focus" ? 3.4 : 5, repeat: Infinity, ease: "easeInOut" }
        }
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* внешнее свечение */}
        <motion.div
          className="pointer-events-none absolute inset-0 -z-10 rounded-full blur-2xl"
          animate={{
            opacity: state === "focus" ? [0.45, 0.8, 0.45] : [0.2, 0.35, 0.2],
          }}
          transition={{ duration: 2.4, repeat: Infinity }}
          style={{
            background:
              state === "focus"
                ? "radial-gradient(closest-side, color-mix(in oklab, var(--destructive) 70%, transparent), transparent)"
                : "radial-gradient(closest-side, color-mix(in oklab, var(--primary) 55%, transparent), transparent)",
          }}
        />

        {/* стеклянная колба */}
        <div
          className="absolute inset-x-0 top-[8%] bottom-[8%] overflow-hidden"
          style={{
            borderRadius: `${W * 0.5}px / ${H * 0.42}px`,
            background:
              "linear-gradient(160deg, rgba(255,255,255,0.16), rgba(255,255,255,0.04) 42%, rgba(0,0,0,0.5))",
            border: "1px solid rgba(255,255,255,0.18)",
            boxShadow:
              "inset 0 0 40px rgba(255,255,255,0.12), inset 0 -20px 40px rgba(0,0,0,0.6), 0 24px 50px -20px rgba(0,0,0,0.9)",
            backdropFilter: "blur(2px)",
          }}
        >
          {/* внутренняя дымка */}
          <motion.div
            className="absolute inset-0"
            animate={{ opacity: [0.35, 0.6, 0.35], scale: [1, 1.12, 1] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            style={{
              background:
                "radial-gradient(60% 50% at 50% 60%, color-mix(in oklab, var(--primary) 22%, transparent), transparent 70%)",
            }}
          />

          {/* аватарка болтается внутри */}
          <div className="absolute inset-0 grid place-items-center" style={{ perspective: 600 }}>
            <motion.div
              animate={
                state === "crack"
                  ? { y: [0, -6, 0], rotateY: [0, 40, -20], scale: [1, 1.08, 0.9] }
                  : { y: [-7, 7, -7], rotateY: [-24, 24, -24], rotateX: [6, -6, 6] }
              }
              transition={
                state === "crack"
                  ? { duration: 0.6 }
                  : { duration: state === "focus" ? 4 : 6.5, repeat: Infinity, ease: "easeInOut" }
              }
              style={{ transformStyle: "preserve-3d" }}
            >
              <InnerAvatar entry={entry} size={avatar} />
            </motion.div>
          </div>

          {/* блик по стеклу */}
          <motion.div
            className="pointer-events-none absolute -inset-y-4 w-1/3"
            animate={{ x: ["-40%", "260%"] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", repeatDelay: 1.2 }}
            style={{
              background:
                "linear-gradient(100deg, transparent, rgba(255,255,255,0.28), transparent)",
              filter: "blur(3px)",
            }}
          />
        </div>

        {/* обручи сверху/снизу */}
        {[0, 1].map((i) => (
          <div
            key={i}
            className="absolute inset-x-[16%]"
            style={{
              [i === 0 ? "top" : "bottom"]: 0,
              height: H * 0.11,
              borderRadius: 999,
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.5), rgba(120,120,130,0.35) 40%, rgba(0,0,0,0.85))",
              boxShadow: "0 2px 10px rgba(0,0,0,0.8), inset 0 1px 2px rgba(255,255,255,0.6)",
            }}
          />
        ))}
      </motion.div>
    </div>
  );
}

/** Мелкая капсула для ленты барабана — постоянно вращается вокруг своей оси. */
export function CapsuleChip({ entry, focused }: { entry: HuntEntry; focused?: boolean }) {
  return (
    <div className="shrink-0" style={{ opacity: focused ? 1 : 0.75, perspective: 800 }}>
      <motion.div
        animate={{ rotateY: 360 }}
        transition={{ duration: focused ? 2.4 : 4, repeat: Infinity, ease: "linear" }}
        style={{ transformStyle: "preserve-3d" }}
      >
        <HuntCapsule entry={entry} scale={0.62} state={focused ? "focus" : "idle"} />
      </motion.div>
    </div>
  );
}
