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
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useVelocity,
  useTransform,
  type MotionValue,
} from "framer-motion";

import { RiderCharacter, type RiderMode } from "@/components/club/hound-hunt/RiderCharacter";
import { EmberField } from "@/components/club/hound-hunt/EmberField";
import { HuntAvatar } from "@/components/club/hound-hunt/HuntAvatar";
import { HuntAura } from "@/components/club/hound-hunt/HuntAura";
import { KickedAvatar } from "@/components/club/hound-hunt/KickedAvatar";
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
  arming: 2600, // персонаж встаёт в стойку
  spin: 1500, // прокрут до остановки на жертве
  collapse: 420, // схлопывание освободившегося места
  gap: 300, // пауза между раундами
  pull: 4200, // победитель подъезжает к персонажу
  crack: 2200, // раскрытие капсулы
  reveal: 26000, // ревил победителя
};

const SPEEDS = [1, 2, 5, 20, 60] as const;
type Speed = (typeof SPEEDS)[number];

type Phase = "intro" | "arming" | "drift" | "pull" | "crack" | "reveal" | "podium";

const CHIP_SCALE = 0.62;
const CHIP_W = 132 * CHIP_SCALE;
const CHIP_GAP = 16;
const STEP = CHIP_W + CHIP_GAP;

/** Сколько участников в моковом розыгрыше — столько же звеньев в барабане. */
const MOCK_ENTRIES = 15;

/* ------------------------------ страница ------------------------------ */

/**
 * Схема шоу — «стоп-кадр удар» (как открытие кейса):
 *  1) лента разгоняется и ПЛАВНО ОСТАНАВЛИВАЕТСЯ ровно на жертве в центре;
 *  2) гончая бьёт по СТОЯЩЕЙ капсуле — полёт виден целиком;
 *  3) освободившееся место схлопывается на неподвижной ленте;
 *  4) лента снова разгоняется до следующей жертвы.
 * Никаких скрытых подмен состава, призрачных аур и маскирующего размытия.
 */
export function HoundHuntPage() {
  const [speed, setSpeed] = useState<Speed>(2);
  const speedRef = useRef<Speed>(speed);
  speedRef.current = speed;
  const dur = useCallback((base: number) => Math.max(140, base / speedRef.current), []);

  const [pool, setPool] = useState<HuntEntry[]>(() => makeEntries(MOCK_ENTRIES));
  const [caseIdx, setCaseIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>("intro");
  const [winners, setWinners] = useState<{ prizeId: string; entry: HuntEntry }[]>([]);
  const [current, setCurrent] = useState<HuntEntry | null>(null);
  const [look, setLook] = useState({ x: 0, y: 0 });
  /** Счётчик ударов для вспышки/тряски арены. */
  const [shock, setShock] = useState(0);

  const prize = HUNT_PRIZES[Math.min(caseIdx, HUNT_PRIZES.length - 1)];

  /** Лента: живые участники, порядок фиксирован. */
  const [reel, setReel] = useState<HuntEntry[]>([]);
  const reelRef = useRef<HuntEntry[]>([]);
  reelRef.current = reel;

  /** Абсолютная позиция ленты в «шагах». Целое значение = слот ровно по центру. */
  const pos = useMotionValue(0);
  /** Кто сейчас улетает (виден как отдельная летящая аватарка). */
  const [ghost, setGhost] = useState<{ key: string; entry: HuntEntry } | null>(null);
  /** id слота, чьё место схлопывается прямо сейчас. */
  const [dyingId, setDyingId] = useState<string | null>(null);
  /** true = гончая замахивается для удара по стоящей капсуле. */
  const [striking, setStriking] = useState(false);

  const winnerIdRef = useRef<string | null>(null);
  const victimRef = useRef<{ id: string; index: number } | null>(null);
  const roundBusy = useRef(false);
  const phaseRef = useRef<Phase>("intro");
  const finishRef = useRef<((survivor: HuntEntry) => void) | null>(null);
  const spinAnim = useRef<{ stop: () => void } | null>(null);
  const timers = useRef<number[]>([]);
  phaseRef.current = phase;

  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
      spinAnim.current?.stop();
    },
    [],
  );

  const pickWinner = useCallback((entries: HuntEntry[]) => {
    const total = entries.reduce((s, e) => s + e.slots, 0);
    let r = Math.random() * total;
    for (const e of entries) {
      r -= e.slots;
      if (r <= 0) return e;
    }
    return entries[entries.length - 1];
  }, []);

  const buildReel = useCallback((entries: HuntEntry[]) => {
    const list = [...entries];
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  }, []);

  /* --------------------------- цикл одного раунда --------------------------- */

  /** Разгон + плавная остановка ровно на жертве. */
  const spinToVictim = useCallback(() => {
    if (phaseRef.current !== "drift") return;
    const list = reelRef.current;
    const n = list.length;
    if (n <= 1) {
      finishRef.current?.(list[0]);
      return;
    }

    // Жертва — любой живой, кроме заранее выбранного победителя.
    const candidates = list
      .map((e, i) => ({ e, i }))
      .filter(({ e }) => e.id !== winnerIdRef.current);
    const target = candidates[Math.floor(Math.random() * candidates.length)];
    victimRef.current = { id: target.e.id, index: target.i };

    // Целевая позиция: целое число шагов, дающее нужный слот по центру,
    // минимум полтора полных оборота — тогда остановка читается как «выбор».
    const from = pos.get();
    const min = from + n * 1.35;
    const T = Math.ceil((min - target.i) / n) * n + target.i;

    const slow = n <= 4 ? 1.5 : n <= 8 ? 1.2 : 1;
    roundBusy.current = true;
    const run = animate(pos, T, {
      duration: dur(BASE.spin * slow) / 1000,
      ease: [0.1, 0.72, 0.06, 1],
    });
    spinAnim.current = run;
    run.then(() => {
      pos.set(T);
      if (phaseRef.current !== "drift") return;
      // Лента стоит — теперь бьём. Замах крутится сам, удар придёт колбэком.
      haptic("selection");
      setStriking(true);
    });
  }, [dur, pos]);

  /** Импакт ноги по СТОЯЩЕЙ капсуле. */
  const handleImpact = useCallback(() => {
    if (phaseRef.current !== "drift") return;
    const victim = victimRef.current;
    if (!victim) return;
    victimRef.current = null;
    setStriking(false);

    const list = reelRef.current;
    const idx = list.findIndex((e) => e.id === victim.id);
    if (idx < 0) return;
    const kicked = list[idx];

    setShock((s) => s + 1);
    haptic("light");

    const key = `${kicked.id}-${Date.now()}`;
    setGhost({ key, entry: kicked });
    setDyingId(kicked.id);
    later(() => setGhost((g) => (g?.key === key ? null : g)), 1600);

    const collapse = dur(BASE.collapse);
    later(() => {
      // Ровно в конце схлопывания меняем состав: последний кадр анимации и
      // первый кадр нового состава совпадают пиксель в пиксель, скачка нет.
      const rest = reelRef.current.filter((e) => e.id !== kicked.id);
      reelRef.current = rest;
      setReel(rest);
      setDyingId(null);
      pos.set(rest.length ? ((idx % rest.length) + rest.length) % rest.length : 0);
      roundBusy.current = false;

      if (rest.length <= 1) {
        finishRef.current?.(rest[0] ?? kicked);
        return;
      }
      later(spinToVictim, dur(BASE.gap));
    }, collapse);
  }, [dur, later, pos, spinToVictim]);

  /* --- взгляд персонажа --- */
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
      const list = buildReel(entries);

      spinAnim.current?.stop();
      setCurrent(null);
      setGhost(null);
      setDyingId(null);
      setStriking(false);
      victimRef.current = null;
      roundBusy.current = false;
      winnerIdRef.current = winner.id;
      setReel(list);
      reelRef.current = list;
      pos.set(0);

      setPhase("arming");
      haptic("light");

      finishRef.current = (survivor) => {
        spinAnim.current?.stop();
        setStriking(false);
        setPhase("pull");
        setCurrent(survivor);
        haptic("selection");

        later(() => {
          setPhase("crack");
          later(() => {
            setPhase("reveal");
            haptic("success");
            setWinners((w) => [...w, { prizeId: HUNT_PRIZES[idx].id, entry: survivor }]);
            const rest = entries.filter((e) => e.id !== survivor.id);
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
        phaseRef.current = "drift";
        spinToVictim();
      }, dur(BASE.arming));
    },
    [buildReel, dur, later, pickWinner, pos, spinToVictim],
  );

  const start = () => {
    clearTimers();
    const fresh = makeEntries(MOCK_ENTRIES, Math.floor(Math.random() * 99999));
    setPool(fresh);
    setWinners([]);
    setCaseIdx(0);
    runCase(0, fresh);
  };

  /** Тестовая кнопка: перескочить к следующей фазе. */
  const skip = () => {
    if (phase === "intro" || phase === "podium") return;
    clearTimers();
    spinAnim.current?.stop();
    const entries = pool;
    if (phase === "arming" || phase === "drift") {
      const winner = entries.find((e) => e.id === winnerIdRef.current) ?? pickWinner(entries);
      setGhost(null);
      setDyingId(null);
      setStriking(false);
      setReel([winner]);
      reelRef.current = [winner];
      finishRef.current?.(winner);
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

  const dogMode: RiderMode =
    phase === "drift"
      ? striking
        ? "lunge"
        : "watch"
      : phase === "arming" || phase === "pull"
        ? "watch"
        : phase === "crack"
          ? "lunge"
          : phase === "reveal"
            ? "chew"
            : "idle";

  const intensity =
    phase === "crack" ? 1 : phase === "reveal" ? 0.7 : phase === "drift" ? 0.45 : 0.26;

  const totalTickets = useMemo(
    () =>
      pool.reduce((s, e) => s + e.tickets, 0) + winners.reduce((s, w) => s + w.entry.tickets, 0),
    [pool, winners],
  );

  return (
    <div className="fixed inset-0 z-40 overflow-hidden overscroll-none touch-pan-y bg-background text-foreground select-none">
      {/* фон: угли, дым, винетка */}
      <EmberField intensity={intensity} className="absolute inset-0 h-full w-full opacity-80" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_0%,color-mix(in_oklab,var(--destructive)_14%,transparent),transparent_60%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_60%_at_50%_110%,color-mix(in_oklab,var(--primary)_12%,transparent),transparent_70%)]" />
      <SmokeLayers />
      <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_220px_60px_var(--background)]" />

      <div className="relative flex h-full flex-col overflow-hidden pt-[max(0.5rem,env(safe-area-inset-top))] pb-[calc(5.5rem+env(safe-area-inset-bottom))]">
        {/* арена */}
        <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center">
          <motion.div
            className={`relative z-10 w-full max-w-[560px] ${
              phase === "intro" ? "mt-0 h-[34svh]" : "mt-[11svh] h-[62svh]"
            }`}
            animate={{ opacity: phase === "podium" ? 0.25 : 1, y: phase === "crack" ? 10 : 0 }}
          >
            <RiderCharacter
              mode={dogMode}
              lookAt={look}
              loopKick={striking}
              onImpact={handleImpact}
              className="h-full w-full"
            />
          </motion.div>

          {phase === "intro" && <IntroPanel onStart={start} />}

          {(phase === "arming" || phase === "drift") && (
            <ReelStage
              reel={reel}
              ghost={ghost}
              dyingId={dyingId}
              pos={pos}
              collapseMs={dur(BASE.collapse)}
              armed={phase === "arming"}
              striking={striking}
              shock={shock}
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
        {phase !== "intro" && (
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
            {phase !== "podium" && (
              <p className="mt-2 text-center font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground/70">
                в барабане {pool.length} · {totalTickets} билетов · {HUNT_TICKET_STEP} билетов = 1
                место
              </p>
            )}
          </div>
        )}
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
        Лента останавливается на одном участнике — гончая выбивает именно его. 15 человек, 14
        ударов. Последний, кто устоял, забирает приз.
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

/**
 * Лента. Ключевая идея: рендерим три одинаковые копии живого списка и
 * оборачиваем позицию по модулю одной копии — стык копий невидим, потому что
 * содержимое идентично. Целое значение `pos` = слот ровно в центре.
 */
function ReelStage({
  reel,
  ghost,
  dyingId,
  pos,
  collapseMs,
  armed,
  striking,
  shock,
}: {
  reel: HuntEntry[];
  ghost: { key: string; entry: HuntEntry } | null;
  dyingId: string | null;
  pos: MotionValue<number>;
  collapseMs: number;
  armed: boolean;
  striking: boolean;
  shock: number;
}) {
  const n = Math.max(1, reel.length);
  const x = useTransform(pos, (p) => -((((p % n) + n) % n) + n) * STEP);
  // Размытие только от реальной скорости прокрутки: на остановке его нет.
  const vel = useVelocity(pos);
  const blur = useTransform(vel, (v: number) => {
    const s = Math.min(1, Math.abs(v) / 14);
    return s < 0.04 ? "none" : `blur(${(s * 3.2).toFixed(2)}px)`;
  });

  const copies = [0, 1, 2];

  return (
    <div className="relative z-30 -mt-[36svh] w-full">
      <motion.div
        className="relative overflow-x-clip py-2"
        animate={shock ? { x: [0, -6, 5, -3, 0], y: [0, 3, -2, 1, 0] } : { x: 0, y: 0 }}
        transition={{ duration: 0.34, ease: "easeOut" }}
        key={`shake-${shock}`}
      >
        {/* зона удара под ногой */}
        <motion.div
          className="pointer-events-none absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            width: CHIP_W * 2.2,
            height: CHIP_W * 2.2,
            background:
              "radial-gradient(circle, color-mix(in oklab, var(--destructive) 22%, transparent), transparent 62%)",
          }}
          animate={{
            opacity: striking ? [0.7, 1, 0.7] : [0.35, 0.6, 0.35],
            scale: striking ? [1, 1.1, 1] : [0.95, 1.04, 0.95],
          }}
          transition={{ duration: striking ? 0.7 : 2, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* прицел: две вертикальные метки центра — видно, на кого встала лента */}
        <div className="pointer-events-none absolute left-1/2 top-0 z-40 h-full -translate-x-1/2">
          <motion.div
            className="absolute left-1/2 top-0 h-2.5 w-px -translate-x-1/2"
            style={{ background: "color-mix(in oklab, var(--destructive) 90%, transparent)" }}
            animate={{ opacity: striking ? 1 : 0.5 }}
          />
          <motion.div
            className="absolute bottom-0 left-1/2 h-2.5 w-px -translate-x-1/2"
            style={{ background: "color-mix(in oklab, var(--destructive) 90%, transparent)" }}
            animate={{ opacity: striking ? 1 : 0.5 }}
          />
        </div>

        {/* шок-волна из точки удара */}
        {shock > 0 && (
          <motion.div
            key={`ring-${shock}`}
            className="pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 rounded-full border"
            style={{
              width: CHIP_W,
              height: CHIP_W,
              borderColor: "color-mix(in oklab, var(--destructive) 80%, transparent)",
            }}
            initial={{ opacity: 0.9, scale: 0.5 }}
            animate={{ opacity: 0, scale: 3.4 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
          />
        )}

        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-background to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-background to-transparent" />

        <motion.div
          className="relative z-30 flex items-center"
          style={{
            x,
            paddingLeft: `calc(50% - ${STEP / 2}px)`,
            willChange: "transform",
            filter: blur,
          }}
        >
          {copies.map((c) =>
            reel.map((entry) => {
              const dying = entry.id === dyingId;
              return (
                <motion.div
                  key={`${c}-${entry.id}`}
                  className="relative shrink-0 overflow-hidden"
                  style={{ height: CHIP_W * 1.22 }}
                  initial={false}
                  animate={{ width: dying ? 0 : STEP }}
                  transition={{ duration: collapseMs / 1000, ease: "easeInOut" }}
                >
                  <div
                    className="grid justify-items-center"
                    style={{ width: STEP, opacity: dying ? 0 : 1 }}
                  >
                    <HuntAura width={CHIP_W} seed={entry.nick.length + c} />
                    <HuntAvatar entry={entry} scale={CHIP_SCALE} />
                  </div>
                </motion.div>
              );
            }),
          )}
        </motion.div>

        {/* выбитая аватарка — летит поверх, ничем не обрезается */}
        <AnimatePresence>
          {ghost && (
            <motion.div key={ghost.key} exit={{ opacity: 0 }} className="absolute inset-0 z-50">
              <KickedAvatar entry={ghost.entry} seed={ghost.key} scale={CHIP_SCALE} width={CHIP_W} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* счётчик остатка */}
      <div className="relative z-50 mt-3 flex items-center justify-center gap-2">
        <motion.span
          key={`left-${reel.length}`}
          initial={{ scale: 1.5, color: "var(--destructive)" }}
          animate={{ scale: 1, color: "var(--foreground)" }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="font-display text-2xl font-black leading-none"
        >
          {reel.length}
        </motion.span>
        <motion.p
          animate={{ opacity: armed ? [0.4, 1, 0.4] : 1 }}
          transition={{ duration: 1.6, repeat: Infinity }}
          className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground"
        >
          {armed ? "выходит на удар" : striking ? "цель выбрана" : "в барабане"}
        </motion.p>
      </div>
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
        <HuntAvatar entry={entry} scale={1.35} focused />
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
        {cracking ? "есть победитель" : "выбит последний"}
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
