// HOUND HUNT — шоу-розыгрыш для владельцев Hell Pass Platinum.
// ВАЖНО: пока это ТОЛЬКО визуал на моках. Победители определяются локально
// (Math.random по весам билетов). Серверная часть (честный жребий, seed,
// подпись) — позже. Звука нет намеренно: у HellSpin свой звук, здесь будет
// отдельный саунд-дизайн.
//
// Механика показа: 3 приза (3-е → 2-е → главный). На каждый приз:
// медленный дрейф капсул → гончая ведёт глазами за капсулами →
// «вынюхивает» одну и вытягивает её к пасти → раскусывает →
// ревил победителя. Победитель выбывает из барабана.

import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useAnimationControls } from "framer-motion";
import { RiderCharacter, type RiderMode } from "@/components/club/hound-hunt/RiderCharacter";
import { EmberField } from "@/components/club/hound-hunt/EmberField";
import { HuntCapsule, CapsuleChip } from "@/components/club/hound-hunt/HuntCapsule";
import {
  HUNT_PRIZES,
  HUNT_TICKET_STEP,
  makeEntries,
  type HuntEntry,
} from "@/components/club/hound-hunt/hh-mock";
import { haptic } from "@/hooks/use-haptic";
import { useIsMobile } from "@/hooks/use-mobile";

export const Route = createFileRoute("/club/hound-hunt")({
  head: () => ({
    meta: [
      { title: "HOUND HUNT — клуб HELLHOUND" },
      { name: "description", content: "Шоу-розыгрыш для владельцев Hell Pass Platinum." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: HoundHuntScreen,
});

/**
 * HOUND HUNT — только телефон/приложение. На десктопе шоу не запускаем:
 * вся вёрстка и анимации рассчитаны на вертикальный мобильный экран.
 */
function HoundHuntScreen() {
  const isMobile = useIsMobile();
  if (!isMobile) return <DesktopBlock />;
  return <HoundHuntPage />;
}

function DesktopBlock() {
  return (
    <div className="relative flex min-h-[100svh] flex-col items-center justify-center gap-5 overflow-hidden bg-black px-8 text-center">
      <EmberField className="pointer-events-none absolute inset-0 opacity-40" />
      <div className="relative z-10 flex flex-col items-center gap-4">
        <div className="w-40">
          <RiderCharacter mode="idle" className="h-40 w-40" />
        </div>
        <h1 className="font-display text-2xl uppercase tracking-tight text-white">Hound Hunt</h1>
        <p className="max-w-xs text-sm leading-relaxed text-white/50">
          Шоу идёт только в приложении на телефоне. Открой клуб с мобильного или установи PWA.
        </p>
        <Link
          to="/club"
          className="rounded-full border border-white/15 px-5 py-2 text-[11px] uppercase tracking-[0.18em] text-white/70"
        >
          В клуб
        </Link>
      </div>
    </div>
  );
}

/* ------------------------------ тайминги ------------------------------ */

/** Базовые длительности «боевого» темпа, мс. Кнопки скорости делят их. */
const BASE = {
  arming: 4000, // персонаж встаёт в стойку, капсулы разгоняются
  kick: 3000, // раз в 3 секунды — замах и удар по пролетающей капсуле
  glide: 3000, // столько времени капсула идёт от предыдущей позиции к центру
  pull: 5000, // последняя капсула подъезжает к персонажу
  crack: 2200, // раскрытие капсулы
  reveal: 26000, // ревил победителя
};


const SPEEDS = [1, 2, 5, 20, 60] as const;
type Speed = (typeof SPEEDS)[number];

type Phase = "intro" | "arming" | "drift" | "pull" | "crack" | "reveal" | "podium";

const CHIP_W = 152 * 0.62;
const CHIP_GAP = 16;
const STEP = CHIP_W + CHIP_GAP;

/** Сколько капсул в барабане на один приз (последняя — победитель). */
const REEL_LEN = 14;

/* ------------------------------ страница ------------------------------ */

export function HoundHuntPage() {
  const [speed, setSpeed] = useState<Speed>(5);
  const speedRef = useRef<Speed>(speed);
  speedRef.current = speed;
  const dur = useCallback((base: number) => Math.max(220, base / speedRef.current), []);

  const [pool, setPool] = useState<HuntEntry[]>(() => makeEntries(28));
  const [caseIdx, setCaseIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>("intro");
  const [winners, setWinners] = useState<{ prizeId: string; entry: HuntEntry }[]>([]);
  const [current, setCurrent] = useState<HuntEntry | null>(null);
  const [look, setLook] = useState({ x: 0, y: 0 });

  const prize = HUNT_PRIZES[Math.min(caseIdx, HUNT_PRIZES.length - 1)];
  const strip = useAnimationControls();
  const timers = useRef<number[]>([]);

  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  /* --- барабан: капсулы выбиваются по одной, последняя = победитель --- */
  const [reel, setReel] = useState<HuntEntry[]>([]);
  const [focusIdx, setFocusIdx] = useState(0);
  const [killed, setKilled] = useState<number[]>([]);
  const [kicking, setKicking] = useState(false);

  const buildReel = useCallback((entries: HuntEntry[], winner: HuntEntry) => {
    const slots: HuntEntry[] = [];
    for (const e of entries) for (let i = 0; i < e.slots; i++) slots.push(e);
    const others = slots.filter((e) => e.id !== winner.id);
    const out: HuntEntry[] = [];
    for (let i = 0; i < REEL_LEN - 1; i++) {
      out.push(others[Math.floor(Math.random() * others.length)] ?? winner);
    }
    out.push(winner);
    return out;
  }, []);

  const pickWinner = useCallback((entries: HuntEntry[]) => {
    const total = entries.reduce((s, e) => s + e.slots, 0);
    let r = Math.random() * total;
    for (const e of entries) {
      r -= e.slots;
      if (r <= 0) return e;
    }
    return entries[entries.length - 1];
  }, []);

  /* --- взгляд персонажа: следит за капсулами во время отбора --- */
  useEffect(() => {
    if (phase !== "drift" && phase !== "arming") {
      if (phase === "pull" || phase === "crack") setLook({ x: 0, y: 0.35 });
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const k = (now - t0) / 1000;
      setLook({ x: Math.sin(k * 0.55) * 0.9, y: 0.18 + Math.sin(k * 0.31) * 0.14 });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  /* ------------------------------ сценарий ------------------------------ */

  const runCase = useCallback(
    (idx: number, entries: HuntEntry[]) => {
      const winner = pickWinner(entries);
      const reelNow = buildReel(entries, winner);
      setCurrent(null);
      setFocusIdx(0);
      setKilled([]);
      setKicking(false);
      setReel(reelNow);
      strip.set({ x: STEP });
      setPhase("arming");
      haptic("light");

      const finish = () => {
        // последняя капсула — победитель: подъезжает к персонажу и раскрывается
        setPhase("pull");
        setCurrent(winner);
        haptic("selection");

        later(() => {
          setPhase("crack");

          later(() => {
            setPhase("reveal");
            haptic("success");
            setWinners((w) => [...w, { prizeId: HUNT_PRIZES[idx].id, entry: winner }]);
            const rest = entries.filter((e) => e.id !== winner.id);
            setPool(rest);

            later(() => {
              if (idx + 1 < HUNT_PRIZES.length) {
                setCaseIdx(idx + 1);
                runCase(idx + 1, rest);
              } else {
                setPhase("podium");
              }
            }, dur(BASE.reveal));
          }, dur(BASE.crack));
        }, dur(BASE.pull));
      };

      later(() => {
        setPhase("drift");

        const kickMs = dur(BASE.kick);
        const last = reelNow.length - 1;
        // Капсулы летят непрерывно с постоянной скоростью: одна капсула
        // проходит через центр ровно раз в kickMs.
        strip.start({
          x: -(last * STEP),
          transition: { duration: (kickMs * (last + 1)) / 1000, ease: "linear" },
        });

        // На каждый такт: замах (за 600 мс до касания) → удар → капсула вылетает.
        const windup = Math.min(600, kickMs * 0.35);
        for (let i = 0; i < last; i++) {
          const hitAt = kickMs * (i + 1);
          later(() => {
            setFocusIdx(i);
            setKicking(true);
          }, hitAt - windup);
          later(() => {
            setKilled((k) => [...k, i]);
            setKicking(false);
            haptic("light");
          }, hitAt);
        }

        later(() => {
          setFocusIdx(last);
          finish();
        }, kickMs * (last + 1));
      }, dur(BASE.arming));

    },
    [buildReel, dur, later, pickWinner, strip],
  );


  const start = () => {
    clearTimers();
    const fresh = makeEntries(28, Math.floor(Math.random() * 99999));
    setPool(fresh);
    setWinners([]);
    setCaseIdx(0);
    runCase(0, fresh);
  };

  /** Тестовая кнопка: перескочить к следующей фазе. */
  const skip = () => {
    if (phase === "intro" || phase === "podium") return;
    clearTimers();
    const entries = pool;
    if (phase === "arming" || phase === "drift") {
      const last = Math.max(0, reel.length - 1);
      const winner = reel[last] ?? pickWinner(entries);
      strip.set({ x: -(last * STEP) });
      setKilled(Array.from({ length: last }, (_, i) => i));
      setFocusIdx(last);
      setCurrent(winner);

      setPhase("pull");
      later(() => {
        setPhase("crack");
        
        later(() => {
          setPhase("reveal");
          setWinners((w) => [...w, { prizeId: HUNT_PRIZES[caseIdx].id, entry: winner }]);
          const rest = entries.filter((e) => e.id !== winner.id);
          setPool(rest);
          later(() => {
            if (caseIdx + 1 < HUNT_PRIZES.length) {
              setCaseIdx(caseIdx + 1);
              runCase(caseIdx + 1, rest);
            } else {
              setPhase("podium");
            }
          }, dur(BASE.reveal));
        }, dur(BASE.crack));
      }, dur(BASE.pull) * 0.4);
      return;
    }
    if (phase === "reveal") {
      if (caseIdx + 1 < HUNT_PRIZES.length) {
        setCaseIdx(caseIdx + 1);
        runCase(caseIdx + 1, pool);
      } else {
        setPhase("podium");
      }
    }
  };

  const dogMode: RiderMode = kicking
    ? "lunge"
    : phase === "drift" || phase === "arming" || phase === "pull"
      ? "watch"
      : phase === "crack"
        ? "lunge"
        : phase === "reveal"
          ? "chew"
          : "idle";


  const intensity =
    phase === "crack" ? 1 : phase === "reveal" ? 0.7 : phase === "drift" ? 0.45 : 0.26;

  const totalTickets = useMemo(
    () => pool.reduce((s, e) => s + e.tickets, 0) + winners.reduce((s, w) => s + w.entry.tickets, 0),
    [pool, winners],
  );

  return (
    <div className="relative min-h-[100svh] overflow-hidden bg-background text-foreground select-none">
      {/* фон: угли, дым, винетка */}
      <EmberField intensity={intensity} className="absolute inset-0 h-full w-full opacity-80" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_0%,color-mix(in_oklab,var(--destructive)_14%,transparent),transparent_60%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_60%_at_50%_110%,color-mix(in_oklab,var(--primary)_12%,transparent),transparent_70%)]" />
      <SmokeLayers />
      <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_220px_60px_var(--background)]" />

      <div className="relative flex min-h-[100svh] flex-col pt-[max(0.5rem,env(safe-area-inset-top))]">
        {/* арена */}
        <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center">
          {/* персонаж — виден целиком */}
          <motion.div
            className="relative z-20 h-[46svh] w-full max-w-[460px]"
            animate={{ opacity: phase === "podium" ? 0.25 : 1, y: phase === "crack" ? 10 : 0 }}
          >
            <RiderCharacter mode={dogMode} lookAt={look} className="h-full w-full" />
          </motion.div>

          {phase === "intro" && <IntroPanel onStart={start} />}

          {(phase === "arming" || phase === "drift") && (
            <ReelStage
              prizeTitle={prize.title}
              prizeSub={prize.sub}
              prizeImg={prize.img}
              reel={reel}
              focusIdx={focusIdx}
              killed={killed}
              kicking={kicking}
              controls={strip}
              armed={phase === "arming"}
            />
          )}


          {(phase === "pull" || phase === "crack") && current && (
            <PullStage entry={current} cracking={phase === "crack"} />
          )}

          {phase === "reveal" && current && (
            <RevealStage
              entry={current}
              prizeTitle={prize.title}
              prizeSub={prize.sub}
              prizeImg={prize.img}
            />
          )}

          {phase === "podium" && <Podium winners={winners} onRestart={start} />}
        </div>

        {/* тестовый пульт скорости (уйдёт из прода) */}
        <div className="relative z-30 shrink-0 px-4 pb-3">
          <div className="flex items-center justify-center gap-1.5">
            {SPEEDS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSpeed(s)}
                className={`rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] backdrop-blur transition ${
                  speed === s
                    ? "border-destructive/60 bg-destructive/20 text-foreground"
                    : "border-border/50 bg-card/40 text-muted-foreground"
                }`}
              >
                ×{s}
              </button>
            ))}
            <button
              type="button"
              onClick={skip}
              className="rounded-full border border-border/50 bg-card/40 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground backdrop-blur"
            >
              далее
            </button>
          </div>
          {phase !== "intro" && phase !== "podium" && (
            <p className="mt-2 text-center font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground/70">
              в барабане {pool.length} · {totalTickets} билетов · {HUNT_TICKET_STEP} билетов = 1 место
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ куски арены ------------------------------ */

function IntroPanel({ onStart }: { onStart: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative z-10 mt-6 w-full max-w-md px-6 text-center"
    >
      <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-destructive">
        охота начинается
      </p>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        Три приза. Капсулы летят мимо, и раз в три секунды персонаж замахивается и выбивает одну
        из них. Остаётся последняя: чья аватарка внутри, тот забирает приз.
      </p>

      <button
        type="button"
        onClick={onStart}
        className="mt-6 w-full rounded-2xl border border-destructive/50 bg-destructive/15 px-6 py-4 font-display text-lg font-black uppercase tracking-wide text-foreground shadow-[0_0_40px_-6px_color-mix(in_oklab,var(--destructive)_70%,transparent)] transition active:scale-[0.98]"
      >
        Спустить гончую
      </button>
    </motion.div>
  );
}

function ReelStage({
  prizeTitle,
  prizeSub,
  prizeImg,
  reel,
  focusIdx,
  killed,
  kicking,
  controls,
  armed,
}: {
  prizeTitle: string;
  prizeSub: string;
  prizeImg: string;
  reel: HuntEntry[];
  focusIdx: number;
  killed: number[];
  kicking: boolean;
  controls: ReturnType<typeof useAnimationControls>;
  armed: boolean;
}) {
  const alive = reel.length - killed.length;
  return (
    <div className="relative z-10 w-full">
      <div className="mb-3 flex items-center justify-center gap-3">
        <img src={prizeImg} alt="" className="size-10 rounded-lg object-contain" />
        <div className="text-left">
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-destructive">
            {prizeSub}
          </p>
          <p className="font-display text-base font-black uppercase tracking-tight">{prizeTitle}</p>
        </div>
      </div>

      <div className="relative overflow-hidden py-2">
        {/* зона удара — нейтральная тонкая метка по центру */}
        <div className="pointer-events-none absolute left-1/2 top-0 z-20 h-full w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-white/20 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-background to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-background to-transparent" />

        <motion.div
          animate={controls}
          className="flex items-center gap-4"
          style={{ paddingLeft: `calc(50% - ${(152 * 0.62) / 2}px)`, willChange: "transform" }}
        >
          {reel.map((e, i) => {
            const dead = killed.includes(i);
            return (
              <motion.div
                key={`${e.id}-${i}`}
                className="shrink-0"
                animate={
                  dead
                    ? { opacity: 0, scale: 0.4, x: 220, y: -120, rotate: 140, filter: "blur(5px)" }
                    : { opacity: 1, scale: 1, x: 0, y: 0, rotate: 0, filter: "blur(0px)" }
                }
                transition={{ duration: dead ? 0.5 : 0.25, ease: [0.2, 0.8, 0.3, 1] }}
              >
                <CapsuleChip entry={e} focused={i === focusIdx && !dead} />
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      <motion.p
        animate={{ opacity: armed ? [0.4, 1, 0.4] : 1 }}
        transition={{ duration: 1.6, repeat: Infinity }}
        className="mt-2 text-center font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground"
      >
        {armed ? "выходит на удар" : `выбивает капсулы · осталось ${alive}`}
      </motion.p>
    </div>
  );
}


/** Гончая вытягивает выбранную капсулу к пасти, потом раскусывает. */
function PullStage({ entry, cracking }: { entry: HuntEntry; cracking: boolean }) {
  return (
    <div className="relative z-10 -mt-6 grid place-items-center">
      <motion.div
        initial={{ y: 120, scale: 0.7, opacity: 0 }}
        animate={
          cracking
            ? { y: -26, scale: 1.12, opacity: 1 }
            : { y: [40, -6, 2, -10], scale: [0.85, 1.05, 1, 1.02], opacity: 1 }
        }
        transition={cracking ? { duration: 0.5 } : { duration: 2.6, ease: "easeInOut" }}
      >
        <HuntCapsule entry={entry} scale={1.05} state={cracking ? "crack" : "focus"} />
      </motion.div>

      {/* осколки стекла при раскусе */}
      {cracking &&
        Array.from({ length: 16 }).map((_, i) => (
          <motion.span
            key={i}
            className="absolute size-1.5 rounded-[2px] bg-white/70"
            initial={{ opacity: 1, x: 0, y: 0, rotate: 0 }}
            animate={{
              opacity: 0,
              x: Math.cos((i / 16) * Math.PI * 2) * (90 + Math.random() * 80),
              y: Math.sin((i / 16) * Math.PI * 2) * (70 + Math.random() * 70),
              rotate: 180,
            }}
            transition={{ duration: 0.9, ease: "easeOut" }}
          />
        ))}

      <motion.p
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.4, repeat: Infinity }}
        className="mt-4 font-mono text-[10px] uppercase tracking-[0.28em] text-destructive"
      >
        {cracking ? "раскусила" : "гончая взяла капсулу"}
      </motion.p>
    </div>
  );
}

function RevealStage({
  entry,
  prizeTitle,
  prizeSub,
  prizeImg,
}: {
  entry: HuntEntry;
  prizeTitle: string;
  prizeSub: string;
  prizeImg: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative z-10 mt-4 w-full max-w-sm px-6 text-center"
    >
      <motion.div
        animate={{ opacity: [0.35, 0.8, 0.35], scale: [1, 1.08, 1] }}
        transition={{ duration: 2.2, repeat: Infinity }}
        className="pointer-events-none absolute inset-0 -z-10 rounded-full bg-primary/25 blur-3xl"
      />
      <img
        src={prizeImg}
        alt=""
        className="mx-auto h-24 object-contain drop-shadow-[0_0_30px_color-mix(in_oklab,var(--primary)_60%,transparent)]"
      />
      <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.28em] text-destructive">
        {prizeSub}
      </p>
      <p className="font-display text-xl font-black uppercase tracking-tight">{prizeTitle}</p>
      <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
        забирает
      </p>
      <p className="font-display text-3xl font-black uppercase tracking-tight text-primary drop-shadow-[0_0_24px_color-mix(in_oklab,var(--primary)_60%,transparent)]">
        {entry.nick}
      </p>
      <p className="mt-1 font-mono text-[11px] text-muted-foreground">
        {entry.city} · {entry.tickets} билетов · ×{entry.slots} мест
      </p>
    </motion.div>
  );
}

function Podium({
  winners,
  onRestart,
}: {
  winners: { prizeId: string; entry: HuntEntry }[];
  onRestart: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative z-10 w-full max-w-md px-6 text-center"
    >
      <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-destructive">
        охота закрыта
      </p>
      <div className="mt-4 space-y-2">
        {[...winners].reverse().map((w) => {
          const p = HUNT_PRIZES.find((x) => x.id === w.prizeId)!;
          return (
            <div
              key={w.prizeId}
              className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card/50 p-3 text-left backdrop-blur"
            >
              <img src={p.img} alt="" className="size-12 shrink-0 object-contain" />
              <div className="min-w-0">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  {p.sub}
                </p>
                <p className="truncate font-display text-sm font-black uppercase">{p.title}</p>
                <p className="truncate font-mono text-[11px] text-primary">{w.entry.nick}</p>
              </div>
            </div>
          );
        })}
      </div>
      <button
        type="button"
        onClick={onRestart}
        className="mt-6 w-full rounded-2xl border border-border/60 bg-card/60 px-6 py-3.5 font-display text-base font-black uppercase tracking-wide backdrop-blur transition active:scale-[0.98]"
      >
        Прогнать ещё раз
      </button>
    </motion.div>
  );
}

/** Медленно плывущий дым — два больших мягких пятна. */
function SmokeLayers() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <motion.div
        animate={{ x: ["-10%", "12%", "-10%"], opacity: [0.25, 0.4, 0.25] }}
        transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -bottom-24 left-0 h-[60%] w-[140%] rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--muted)_60%,transparent),transparent)] blur-3xl"
      />
      <motion.div
        animate={{ x: ["8%", "-14%", "8%"], opacity: [0.18, 0.32, 0.18] }}
        transition={{ duration: 34, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-32 right-0 h-[55%] w-[130%] rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--destructive)_35%,transparent),transparent)] blur-3xl"
      />
    </div>
  );
}
