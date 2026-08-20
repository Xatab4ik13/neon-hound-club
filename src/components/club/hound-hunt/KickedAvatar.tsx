// Выбитая ударом аватарка: баллистический полёт вместо линейного твина.
// Этапы: launch (squash + резкий рывок) → баллистика по параболе → уход за кадр.
// Плюс вспышка в точке удара, искры и трейл. Разброс детерминированный по key,
// чтобы каждый удар выглядел по-разному, но не «прыгал» при ререндере.

import { motion } from "framer-motion";
import { useMemo } from "react";
import { HuntAvatar } from "./HuntAvatar";
import { rankColorsOf, type HuntEntry } from "./hh-mock";

type Props = {
  entry: HuntEntry;
  /** ключ удара — сид разброса */
  seed: string;
  scale?: number;
  width: number;
};

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

export function KickedAvatar({ entry, seed, scale = 0.62, width }: Props) {
  // Вспышка, искры и трейл красим в цвет ранга — аватарка улетает со своим свечением.
  const { accent, accentSoft } = rankColorsOf(entry);
  const r = useMemo(() => {
    const a = hash(seed);
    const b = hash(seed + "b");
    const c = hash(seed + "c");
    return {
      // дальность и высота полёта
      dx: 460 + a * 240,
      apex: -(210 + b * 120),
      fall: 380 + c * 200,
      spin: (420 + a * 320) * (b > 0.85 ? -1 : 1),
      tilt: -8 - c * 10,
      dur: 1.1 + b * 0.25,
    };
  }, [seed]);

  const sparks = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => {
        const a = hash(`${seed}s${i}`);
        const b = hash(`${seed}t${i}`);
        const ang = -0.15 - a * 1.15; // вверх-вправо конусом
        const len = 60 + b * 130;
        return {
          x: Math.cos(ang) * len,
          y: Math.sin(ang) * len,
          size: 2 + b * 3,
          delay: a * 0.05,
          dur: 0.32 + b * 0.3,
        };
      }),
    [seed],
  );

  return (
    <div className="pointer-events-none absolute left-1/2 top-2 z-30" style={{ marginLeft: -width / 2 }}>
      {/* вспышка в точке удара */}
      <motion.div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          width: width * 2.1,
          height: width * 2.1,
          background:
            `radial-gradient(circle, rgba(255,255,255,0.95), ${accentSoft} 32%, transparent 66%)`,
          mixBlendMode: "screen",
        }}
        initial={{ opacity: 0.95, scale: 0.25 }}
        animate={{ opacity: 0, scale: 1.25 }}
        transition={{ duration: 0.28, ease: "easeOut" }}
      />

      {/* искры */}
      {sparks.map((s, i) => (
        <motion.span
          key={i}
          className="absolute left-1/2 top-1/2 rounded-full"
          style={{
            width: s.size,
            height: s.size,
            background: i % 3 === 0 ? accent : accentSoft,
            boxShadow: "0 0 8px currentColor",
          }}
          initial={{ opacity: 1, x: 0, y: 0 }}
          animate={{ opacity: 0, x: s.x, y: s.y + 40 }}
          transition={{ duration: s.dur, delay: s.delay, ease: "easeOut" }}
        />
      ))}

      {/* трейл — размазанный след за аватаркой */}
      <motion.div
        className="absolute left-1/2 top-1/2 h-[3px] -translate-y-1/2 rounded-full"
        style={{
          width: width * 1.6,
          transformOrigin: "left center",
          background:
            `linear-gradient(90deg, ${accent}, transparent)`,
          filter: "blur(2px)",
        }}
        initial={{ opacity: 0.8, scaleX: 0.2, rotate: -22 }}
        animate={{ opacity: 0, scaleX: 1.6, rotate: -30 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      />

      {/* сама аватарка: x почти линейно, y по параболе, squash на launch,
          плюс 3D — звено сначала летит НА камеру, потом уносится вглубь */}
      <div style={{ perspective: "1000px", transformStyle: "preserve-3d" }}>
        <motion.div
          style={{ transformStyle: "preserve-3d" }}
          initial={{ x: 0, y: 0, z: 0 }}
          animate={{
            x: [0, r.dx * 0.34, r.dx * 0.68, r.dx],
            y: [0, r.apex * 0.85, r.apex * 0.35, r.fall],
            z: [0, 60, -180, -520],
          }}
          transition={{ duration: r.dur, ease: "linear", times: [0, 0.3, 0.62, 1] }}
        >
          <motion.div
            style={{ transformStyle: "preserve-3d" }}
            initial={{ rotate: 0, rotateY: 0, rotateX: 0 }}
            animate={{ rotate: r.spin, rotateY: r.spin * 0.4, rotateX: r.tilt * 3 }}
            transition={{ duration: r.dur, ease: "linear" }}
          >
            <motion.div
              initial={{ scaleX: 1, scaleY: 1 }}
              animate={{ scaleX: [1, 1.12, 1, 0.86], scaleY: [1, 0.9, 1, 0.86], opacity: [1, 1, 1, 0] }}
              transition={{ duration: r.dur, times: [0, 0.12, 0.4, 1], ease: "easeOut" }}
              style={{ rotate: r.tilt }}
            >
              <HuntAvatar entry={entry} focused scale={scale} />
            </motion.div>
          </motion.div>
        </motion.div>
      </div>

    </div>
  );
}
