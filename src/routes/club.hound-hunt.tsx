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
import { AnimatePresence, animate, motion, useMotionValue, type MotionValue } from "framer-motion";
import { RiderCharacter, type RiderMode } from "@/components/club/hound-hunt/RiderCharacter";
import { EmberField } from "@/components/club/hound-hunt/EmberField";
import { HuntAvatar } from "@/components/club/hound-hunt/HuntAvatar";
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
  arming: 4000, // персонаж встаёт в стойку, капсулы разгоняются
  capsule: 360, // одна капсула проезжает мимо центра за столько мс (быстро)
  pull: 5000, // последняя капсула подъезжает к персонажу
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

/**
 * Чем меньше осталось участников, тем медленнее лента: к финалу зритель
 * успевает прочитать каждый ник и болеть за своего.
 */
function speedRamp(remaining: number) {
  if (remaining >= 12) return 1;
  return 1 + (12 - remaining) * 0.14; // 12 → 1.0 … 2 → 2.4 (медленнее)
}

/* ------------------------------ страница ------------------------------ */

export function HoundHuntPage() {
  const [speed, setSpeed] = useState<Speed>(5);
  const speedRef = useRef<Speed>(speed);
  speedRef.current = speed;
  const dur = useCallback((base: number) => Math.max(220, base / speedRef.current), []);

  const [pool, setPool] = useState<HuntEntry[]>(() => makeEntries(MOCK_ENTRIES));
  const [caseIdx, setCaseIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>("intro");
  const [winners, setWinners] = useState<{ prizeId: string; entry: HuntEntry }[]>([]);
  const [current, setCurrent] = useState<HuntEntry | null>(null);
  const [look, setLook] = useState({ x: 0, y: 0 });
  /** Счётчик ударов для вспышки/тряски арены — растёт на каждый импакт. */
  const [shock, setShock] = useState(0);

  const prize = HUNT_PRIZES[Math.min(caseIdx, HUNT_PRIZES.length - 1)];
  // Позиция ленты — своя motion-value: барабан крутится непрерывно, а в момент
  // импакта мы читаем её и понимаем, кто именно сейчас под ногой.
  const stripX = useMotionValue(0);
  /** Текущая абсолютная фаза ленты — по ней окно выбирает, какие слоты рисовать. */
  const phaseMv = useMotionValue(0);

  const reelRaf = useRef(0);
  const reelLastFrame = useRef(0);
  const reelPhase = useRef(0);
  /** 1 = обычный темп, <1 = слоу-мо сразу после удара. */
  const slowmo = useMotionValue(1);
  const slowmoAnim = useRef<{ stop: () => void } | null>(null);
  const timers = useRef<number[]>([]);

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
      cancelAnimationFrame(reelRaf.current);
    },
    [],
  );

  /* --- барабан: звенья выбиваются по одному, на их месте остаётся дырка --- */
  type Slot = { sid: number; entry: HuntEntry | null };
  const [slots, setSlots] = useState<Slot[]>([]);
  const [kicks, setKicks] = useState(0);
  const [ghosts, setGhosts] = useState<{ key: string; entry: HuntEntry }[]>([]);
  const slotsRef = useRef<Slot[]>([]);
  const winnerSidRef = useRef(-1);
  const kicksRef = useRef(0);
  const phaseRef = useRef<Phase>("intro");
  const finishRef = useRef<(() => void) | null>(null);
  /** Защита от двойного callback одного и того же цикла 3D-анимации. */
  const lastImpactCycle = useRef(-1);
  /** Дополнительный замок: один физический взмах ноги не может создать два вылета. */
  const impactLockedUntil = useRef(0);
  /** Выбитые слоты, ждущие схлопывания: убираем, когда дырка ушла за левый край. */
  const holes = useRef<{ sid: number; phaseAt: number }[]>([]);
  phaseRef.current = phase;
  slotsRef.current = slots;

  const syncStrip = useCallback(() => {
    // Лента рендерится «окном» вокруг центра: наружу уходит только дробная
    // часть фазы, поэтому копий ряда нет и подменять слоты можно за кадром.
    const frac = reelPhase.current - Math.floor(reelPhase.current);
    stripX.set(-frac * STEP);
    phaseMv.set(reelPhase.current);
  }, [phaseMv, stripX]);


  const stopReel = useCallback(() => {
    cancelAnimationFrame(reelRaf.current);
    reelRaf.current = 0;
    reelLastFrame.current = 0;
  }, []);

  const startReel = useCallback(() => {
    stopReel();
    reelLastFrame.current = performance.now();
    const tick = (now: number) => {
      const elapsed = Math.min(50, now - reelLastFrame.current);
      reelLastFrame.current = now;
      // Слоу-мо после удара + замедление к финалу: одна лента, два множителя.
      const alive = slotsRef.current.filter((s) => s.entry).length;
      const step = dur(BASE.capsule) * speedRamp(alive);
      reelPhase.current += (elapsed * slowmo.get()) / step;

      // Схлопываем дырки только когда они полностью скрылись за левым краем:
      // на экране влево от центра видно ~offLeft звеньев.
      if (holes.current.length) {
        const vw = window.innerWidth;
        // Ряд повторяется несколько раз подряд. Если один ряд короче экрана,
        // тот же слот виден одновременно в другой копии — значит закрывать
        // дырку нельзя ни в какой момент: подмена будет заметна.
        const rowFillsScreen = slotsRef.current.length * STEP > vw + CHIP_W;
        // От центра до полного ухода капсулы за левый край.
        const offLeft = (vw / 2 + CHIP_W / 2) / STEP;
        const ready = rowFillsScreen
          ? holes.current.filter((h) => reelPhase.current - h.phaseAt >= offLeft)
          : [];

        if (ready.length) {
          holes.current = holes.current.filter((h) => !ready.includes(h));
          let list = slotsRef.current;
          for (const h of ready) {
            const idx = list.findIndex((s) => s.sid === h.sid && !s.entry);
            if (idx < 0) continue;
            const compact = list.filter((s) => s.sid !== h.sid);
            if (!compact.length) continue;
            list = compact;
            // Слот уже позади центра — индексы сдвинулись на один назад.
            reelPhase.current -= 1;
            holes.current.forEach((rest) => {
              rest.phaseAt -= 1;
            });
          }
          if (list !== slotsRef.current) {
            slotsRef.current = list;
            setSlots(list);
          }
        }
      }

      syncStrip();
      reelRaf.current = requestAnimationFrame(tick);
    };
    reelRaf.current = requestAnimationFrame(tick);
  }, [dur, slowmo, stopReel, syncStrip]);

  /**
   * Барабан = реальные участники: 15 человек — 15 звеньев. Никаких случайных
   * копий: счётчик «осталось N» совпадает с тем, что видно на ленте.
   * Порядок перемешиваем, чтобы победитель не всегда стоял в конце.
   */
  const buildReel = useCallback((entries: HuntEntry[]) => {
    const list = [...entries];
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
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
      const reelNow = buildReel(entries);
      const slotsNow: Slot[] = reelNow.map((entry, i) => ({ sid: i, entry }));
      setCurrent(null);
      setKicks(0);
      kicksRef.current = 0;
      setGhosts([]);
      holes.current = [];
      lastImpactCycle.current = -1;
      impactLockedUntil.current = 0;

      setSlots(slotsNow);
      slotsRef.current = slotsNow;
      winnerSidRef.current = slotsNow.find((s) => s.entry?.id === winner.id)?.sid ?? -1;
      stopReel();

      slowmoAnim.current?.stop();
      slowmo.set(1);
      reelPhase.current = 0;
      stripX.set(0);

      setPhase("arming");
      haptic("light");

      const finish = () => {
        const survivor = slotsRef.current.find((slot) => slot.entry)?.entry ?? winner;
        // последняя капсула — победитель: подъезжает к персонажу и раскрывается
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

      finishRef.current = finish;

      // Две НЕЗАВИСИМЫЕ анимации:
      //  1) барабан — крутится непрерывно и быстро (линейно, без остановок),
      //  2) персонаж — клип удара крутится сам, без перезапусков.
      // Пересекаются только в момент импакта: кто в этот кадр по центру —
      // того и выбивает, его звено улетает и очередь подтягивается.
      later(() => {
        setPhase("drift");
        startReel();
      }, dur(BASE.arming));
    },
    [buildReel, dur, later, pickWinner, slowmo, startReel, stopReel, stripX],
  );

  /** Импакт ноги: улетает то звено, что в этот кадр стоит по центру. */
  const handleImpact = useCallback(
    (cycle: number) => {
      if (phaseRef.current !== "drift") return;
      if (lastImpactCycle.current === cycle) return;
      const now = performance.now();
      if (now < impactLockedUntil.current) return;
      lastImpactCycle.current = cycle;
      impactLockedUntil.current = now + 650;
      const list = slotsRef.current;
      const alive = list.filter((s) => s.entry);
      if (alive.length <= 1) return;

      // Центральный слот вычисляем из циклической фазы, а не из бесконечной
      // экранной координаты. Поэтому индекс остаётся точным после любого круга.
      const n = list.length;
      const pos = Math.round(reelPhase.current);
      const j = ((pos % n) + n) % n;
      const target = list[j];
      // По центру дырка — бить некого, ждём следующий оборот.
      if (!target.entry) return;
      // Визуально пропускать удар нельзя. Если под ногой оказался заранее
      // намеченный финалист, переносим защиту на другого живого участника:
      // центральная капсула всё равно честно улетает, а выигрывает последний.
      if (target.sid === winnerSidRef.current) {
        const nextSurvivor = alive.find((slot) => slot.sid !== target.sid);
        if (!nextSurvivor) return;
        winnerSidRef.current = nextSurvivor.sid;
      }

      const kicked = target.entry;
      // Место НЕ закрывается: на месте выбитого остаётся дырка, лента едет дальше.
      const rest = list.map((s) => (s.sid === target.sid ? { ...s, entry: null } : s));
      slotsRef.current = rest;
      setSlots(rest);
      // Дырку убираем не по таймеру, а когда она реально уедет за левый край:
      // фиксируем фазу удара, а rAF-цикл сам схлопнет слот в нужный момент.
      holes.current.push({ sid: target.sid, phaseAt: reelPhase.current });

      kicksRef.current += 1;
      setKicks(kicksRef.current);
      setShock((s) => s + 1);

      const key = `${target.sid}-${kicksRef.current}`;
      // В кадре всегда ровно один выбитый шар: даже если 3D callback по ошибке
      // придёт повторно, второй летящий дубль не появится.
      setGhosts([{ key, entry: kicked }]);
      later(() => setGhosts((g) => g.filter((x) => x.key !== key)), 2000);
      haptic("light");
      if (alive.length - 1 <= 1) {
        stopReel();
        finishRef.current?.();
      }
    },
    [later, stopReel],
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
    const entries = pool;
    if (phase === "arming" || phase === "drift") {
      const list = slotsRef.current;
      const winnerSlot = list.find((s) => s.sid === winnerSidRef.current) ?? list[list.length - 1];
      const winner = winnerSlot?.entry ?? pickWinner(entries);
      stopReel();
      slowmoAnim.current?.stop();
      slowmo.set(1);
      const rest = list.map((s) => (s.sid === winnerSlot?.sid ? s : { ...s, entry: null }));
      slotsRef.current = rest;
      setSlots(rest);
      kicksRef.current = Math.max(0, list.filter((s) => s.entry).length - 1);
      setKicks(kicksRef.current);

      setGhosts([]);
      holes.current = [];

      setCurrent(winner);

      setPhase("pull");
      later(
        () => {
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
        },
        dur(BASE.pull) * 0.4,
      );
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
      ? "lunge"
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

      <div className="relative flex h-full flex-col overflow-hidden pt-[max(0.5rem,env(safe-area-inset-top))]">
        {/* арена */}
        <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center">
          {/* Персонаж стоит за лентой и чуть ниже: аватарки проходят перед ним,
              а в зоне удара пересекаются только с ногой. */}
          <motion.div
            className="relative z-10 mt-[11svh] h-[62svh] w-full max-w-[560px]"
            animate={{ opacity: phase === "podium" ? 0.25 : 1, y: phase === "crack" ? 10 : 0 }}
          >
            <RiderCharacter
              mode={dogMode}
              lookAt={look}
              loopKick={phase === "drift"}
              onImpact={handleImpact}
              className="h-full w-full"
            />
          </motion.div>

          {phase === "intro" && <IntroPanel onStart={start} />}

          {(phase === "arming" || phase === "drift") && (
            <ReelStage
              slots={slots}
              ghosts={ghosts}
              x={stripX}
              phase={phaseMv}
              armed={phase === "arming"}
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
              в барабане {pool.length} · {totalTickets} билетов · {HUNT_TICKET_STEP} билетов = 1
              место
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
        В барабане все участники. Гончая выбивает по одному: 15 человек — 14 ударов. Чем меньше
        остаётся, тем медленнее крутится лента. Последний, кто устоял, забирает приз.
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
  slots,
  ghosts,
  x,
  armed,
  shock,
}: {
  slots: { sid: number; entry: HuntEntry | null }[];
  ghosts: { key: string; entry: HuntEntry }[];
  x: MotionValue<number>;
  armed: boolean;
  /** Счётчик ударов: меняется — играем вспышку и тряску арены. */
  shock: number;
}) {
  // Барабан крутится непрерывно: лента едет влево, поэтому копий списка нужно
  // столько, чтобы кадр никогда не оставался пустым. Выбитое звено НЕ убирается
  // из ряда — на его месте остаётся пустое место (дырка), которое едет дальше.
  const copies = Math.max(3, Math.ceil(60 / Math.max(1, slots.length)));
  const row = Array.from({ length: copies }, (_, c) => c);
  const remaining = Math.max(1, slots.filter((s) => s.entry).length);

  return (
    <div className="relative z-30 -mt-[30svh] w-full">
      {/* Движущаяся лента плоская: перспектива применяется только к звену,
          которое уже выбито и летит отдельно от барабана. */}
      <motion.div
        className="relative py-2"
        // Тряска арены на каждый удар — импакт чувствуется физически.
        animate={shock ? { x: [0, -6, 5, -3, 0], y: [0, 3, -2, 1, 0] } : { x: 0, y: 0 }}
        transition={{ duration: 0.34, ease: "easeOut" }}
        key={`shake-${shock}`}
      >
        {/* зона удара: дышащее пятно под ногой вместо жёсткой полоски */}
        <motion.div
          className="pointer-events-none absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            width: CHIP_W * 2.6,
            height: CHIP_W * 2.6,
            background:
              "radial-gradient(circle, color-mix(in oklab, var(--destructive) 26%, transparent), transparent 62%)",
          }}
          animate={{ opacity: [0.5, 0.95, 0.5], scale: [0.94, 1.06, 0.94] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        />

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
          className="relative z-30 flex items-center gap-4"
          style={{
            x,
            paddingLeft: `calc(50% - ${CHIP_W / 2}px)`,
            willChange: "transform",
          }}
        >
          {row.flatMap((c) =>
            slots.map((s) => (
              <div key={`slot-${c}-${s.sid}`} className="shrink-0" style={{ width: CHIP_W }}>
                {s.entry ? (
                  <HuntAvatar entry={s.entry} scale={CHIP_SCALE} />
                ) : (
                  // дырка на месте выбитого: пустое место едет вместе с лентой
                  <div style={{ width: CHIP_W, height: CHIP_W }} />
                )}
              </div>
            )),
          )}
        </motion.div>

        {/* выбитые аватарки — дорожка без overflow, полёт ничем не обрезается */}
        <AnimatePresence>
          {ghosts.map((g) => (
            <motion.div key={g.key} exit={{ opacity: 0 }}>
              <KickedAvatar entry={g.entry} seed={g.key} scale={CHIP_SCALE} width={CHIP_W} />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {/* счётчик остатка: реальное число участников на ленте */}
      <div className="relative z-50 mt-3 flex items-center justify-center gap-2">
        <motion.span
          key={`left-${remaining}`}
          initial={{ scale: 1.5, color: "var(--destructive)" }}
          animate={{ scale: 1, color: "var(--foreground)" }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="font-display text-2xl font-black leading-none"
        >
          {remaining}
        </motion.span>
        <motion.p
          animate={{ opacity: armed ? [0.4, 1, 0.4] : 1 }}
          transition={{ duration: 1.6, repeat: Infinity }}
          className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground"
        >
          {armed ? "выходит на удар" : "в барабане"}
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
