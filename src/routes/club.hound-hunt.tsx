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
  motion,
  useAnimation,
  useMotionValue,
  useTransform,
  type MotionValue,
} from "framer-motion";

import {
  playHuntImpact,
  preloadHuntSamples,
  playHuntWin,
  speakHuntCount,
  HUNT_WIN_MS,
} from "@/lib/hunt-audio";

import { RiderCharacter, type RiderMode } from "@/components/club/hound-hunt/RiderCharacter";
import { EmberField } from "@/components/club/hound-hunt/EmberField";
import { HuntAvatar } from "@/components/club/hound-hunt/HuntAvatar";
import { KickedAvatar } from "@/components/club/hound-hunt/KickedAvatar";
import {
  HUNT_PRIZES,
  HUNT_TICKET_STEP,
  makeEntries,
  fetchHuntEntries,
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
  reveal: HUNT_WIN_MS + 150, // ревил победителя: держим, пока фанфара не доиграет
};

const SPEEDS = [1, 2, 5, 20, 60] as const;
type Speed = (typeof SPEEDS)[number];

type Phase = "intro" | "arming" | "drift" | "settle" | "countdown" | "podium";

const CHIP_SCALE = 0.62;
const CHIP_W = 132 * CHIP_SCALE;
const CHIP_GAP = 16;
const STEP = CHIP_W + CHIP_GAP;
/** Отступ победителя от левого края экрана в финале. */
const WIN_LEFT = 22;

/**
 * На сколько «шагов» лента должна проехать дальше центра, чтобы победитель
 * встал в крайнее левое положение и целиком остался на экране.
 */
function winStopOffset() {
  const w = Math.min(560, typeof window === "undefined" ? 393 : window.innerWidth);
  return (w / 2 - WIN_LEFT - CHIP_W / 2) / STEP;
}


/** Сколько участников в моковом розыгрыше — столько же звеньев в барабане. */
const MOCK_ENTRIES = 20;

/**
 * Чем меньше осталось участников, тем медленнее лента: к финалу зритель
 * успевает прочитать каждый ник и болеть за своего.
 */
function speedRamp(_remaining: number) {
  // Один темп от первого удара до последнего: рывков от смены скорости нет,
  // а читать ники успеваешь всегда — как раньше только в финале.
  return 2.1;
}

/**
 * Пауза «раздумья» перед следующим ударом. Пока участников много — бьём
 * подряд, а в финале байкер выжидает: лента крутится, зритель не знает,
 * по кому и когда прилетит. Интрига важнее темпа.
 */
function suspenseMs(remaining: number) {
  if (remaining <= 2) return 1600;
  if (remaining === 3) return 1300;
  if (remaining === 4) return 1000;
  if (remaining === 5) return 800;
  if (remaining <= 7) return 450;
  return 0;
}


/* ------------------------------ страница ------------------------------ */

export function HoundHuntPage() {
  const [speed, setSpeed] = useState<Speed>(5);
  const speedRef = useRef<Speed>(speed);
  speedRef.current = speed;
  const dur = useCallback((base: number) => Math.max(220, base / speedRef.current), []);

  const [pool, setPool] = useState<HuntEntry[]>(() => makeEntries(MOCK_ENTRIES));
  // На входе подтягиваем 20 реальных участников из базы (ник + аватарка),
  // чтобы интро показывало живой состав, а не моки.
  useEffect(() => {
    preloadHuntSamples();
  }, []);
  useEffect(() => {
    let cancelled = false;
    void fetchHuntEntries(MOCK_ENTRIES).then((entries) => {
      if (!cancelled) setPool(entries);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const [caseIdx, setCaseIdx] = useState(0);
  /** Данные следующего раунда, ждут окончания отсчёта «3 / 2 / 1». */
  const pendingRoundRef = useRef<{ idx: number; entries: HuntEntry[] } | null>(null);
  const [phase, setPhase] = useState<Phase>("intro");
  const [winners, setWinners] = useState<{ prizeId: string; entry: HuntEntry }[]>([]);
  const [current, setCurrent] = useState<HuntEntry | null>(null);
  const [look, setLook] = useState({ x: 0, y: 0 });
  /** Счётчик ударов для вспышки/тряски арены — растёт на каждый импакт. */
  const [shock, setShock] = useState(0);
  /** Победитель зафиксирован: лента доехала и встала, показываем плашку. */
  const [settled, setSettled] = useState(false);
  const settledRef = useRef(false);
  /** Абсолютный индекс слота, на котором лента должна остановиться. */
  const settleTargetRef = useRef<number | null>(null);

  const prize = HUNT_PRIZES[Math.min(caseIdx, HUNT_PRIZES.length - 1)];
  // Позиция ленты — своя motion-value: барабан крутится непрерывно, а в момент
  // импакта мы читаем её и понимаем, кто именно сейчас под ногой.
  /** Текущая абсолютная фаза ленты — по ней окно выбирает, какие слоты рисовать. */
  const phaseMv = useMotionValue(0);

  const reelRaf = useRef(0);
  const reelLastFrame = useRef(0);
  const reelPhase = useRef(0);
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

  /* --- барабан: бесконечная очередь без modulo ---
     Каждый слот знает свой АБСОЛЮТНЫЙ индекс. Дырка от выбитой капсулы
     уезжает влево и удаляется с головы, по кругу она НЕ возвращается.
     Значит по центру всегда живая капсула — удара в пустоту не бывает,
     а reelPhase никогда не пересчитывается, поэтому ники не дёргаются. */
  type Slot = { idx: number; entry: HuntEntry | null };
  const [tape, setTape] = useState<Slot[]>([]);
  const tapeRef = useRef<Slot[]>([]);
  /** Живые участники — из них добирается хвост ленты. */
  const liveRef = useRef<HuntEntry[]>([]);
  /** Очередь на добор: опустела — продолжаем тем же порядком живых. */
  const feedRef = useRef<(HuntEntry | null)[]>([]);
  /** Следующий абсолютный индекс, который добавим в хвост. */
  const nextIdxRef = useRef(0);
  const [alive, setAlive] = useState(0);
  const aliveRef = useRef(0);
  const [kicks, setKicks] = useState(0);
  const [kickToken, setKickToken] = useState(0);
  const [ghosts, setGhosts] = useState<{ key: string; entry: HuntEntry }[]>([]);
  const winnerIdRef = useRef<string>("");
  const kicksRef = useRef(0);
  const phaseRef = useRef<Phase>("intro");
  const finishRef = useRef<(() => void) | null>(null);
  /** Защита от двойного callback одного и того же цикла 3D-анимации. */
  const lastImpactCycle = useRef(-1);
  /** Дополнительный замок: один физический взмах ноги не может создать два вылета. */
  const impactLockedUntil = useRef(0);
  /** Один взмах заранее бронирует конкретную живую капсулу. */
  const kickInFlightRef = useRef(false);
  const reservedTargetRef = useRef<number | null>(null);
  const impactDelayRef = useRef(900);
  /** Полный цикл клипа (взмах + возврат в стойку) — раньше не бьём. */
  const kickCycleMsRef = useRef(1400);
  /** Ближайший момент, когда персонаж физически готов к новому взмаху. */
  const kickReadyAtRef = useRef(0);
  /** До этого времени лента стоит на месте — короткий hitstop в момент удара. */
  const hitstopUntilRef = useRef(0);
  /** Крайний срок, к которому 3D-клип обязан прислать импакт. */
  const kickDeadlineRef = useRef(0);
  /** Когда кто-то выбывал в последний раз — вход для watchdog'а. */
  const lastEliminationAtRef = useRef(0);
  /** Стабильная ссылка на eliminateAt для тика (объявлен ниже). */
  const eliminateRef = useRef<(idx: number | null) => void>(() => {});

  phaseRef.current = phase;
  tapeRef.current = tape;

  const halfWindow = useCallback(
    () => (typeof window === "undefined" ? 4 : Math.ceil(window.innerWidth / 2 / STEP) + 2),
    [],
  );

  const syncStrip = useCallback(() => {
    // Каждый слот сам вычисляет абсолютную позицию из phaseMv. Здесь нет
    // сброса transform на границе целого шага и React не может опоздать на кадр.
    phaseMv.set(reelPhase.current);
  }, [phaseMv]);

  /**
   * Кто следующим встанет в хвост. Порядок внутри круга не тасуем: так одна
   * и та же заявка не может случайно появиться рядом сама с собой на стыке
   * двух кругов и снова попасть под следующий удар.
   */
  const nextFeed = useCallback((): HuntEntry | null | undefined => {
    if (!feedRef.current.length) {
      const live = liveRef.current;
      if (!live.length) return undefined;
      // Финал должен читаться глазами: чем меньше живых, тем разряженнее лента,
      // и видно, что по кругу едут именно они, а не плотная толпа копий.
      // Персонаж по пустотам не бьёт — он их пропускает.
      const n = live.length;
      const gaps = n > 8 ? 0 : n > 6 ? 1 : n > 4 ? 1 : n > 2 ? 2 : 3;

      const built: (HuntEntry | null)[] = [];
      for (const entry of live) {
        built.push(entry);
        for (let i = 0; i < gaps; i++) built.push(null);
      }
      feedRef.current = built;
    }
    return feedRef.current.shift();
  }, []);

  /** На сколько слотов вперёд генерим хвост: минимум до точки будущего удара. */
  const leadRef = useRef(6);

  /** Добираем хвост, срезаем голову. reelPhase не трогаем — скачков нет. */
  const groomTape = useCallback(() => {
    const half = halfWindow();
    let list = tapeRef.current;
    let changed = false;
    const wantTo = Math.floor(reelPhase.current) + Math.max(half + 2, leadRef.current);
    while (nextIdxRef.current <= wantTo) {
      const entry = nextFeed();
      if (entry === undefined) break;
      if (!changed) {
        list = [...list];
        changed = true;
      }
      list.push({ idx: nextIdxRef.current, entry });
      nextIdxRef.current += 1;
    }
    const cutAt = Math.floor(reelPhase.current) - half - 2;
    if (list.length && list[0].idx < cutAt) {
      list = list.filter((s) => s.idx >= cutAt);
      changed = true;
    }
    if (changed) {
      tapeRef.current = list;
      setTape(list);
    }
  }, [halfWindow, nextFeed]);

  const stopReel = useCallback(() => {
    cancelAnimationFrame(reelRaf.current);
    reelRaf.current = 0;
    reelLastFrame.current = 0;
  }, []);

  const startReel = useCallback(() => {
    stopReel();
    reelLastFrame.current = performance.now();
    // Точка отсчёта для watchdog'а: если за два цикла никто не выбыл — добиваем.
    lastEliminationAtRef.current = performance.now();

    const tick = (now: number) => {
      const elapsed = Math.min(50, now - reelLastFrame.current);
      reelLastFrame.current = now;
      // Лента не останавливается во время ударов и замедляется к финалу.
      const step = dur(BASE.capsule) * speedRamp(aliveRef.current);
      // Hitstop: в кадре удара лента почти замирает на несколько десятков мс —
      // удар получает «вес», как в файтингах. Фазу не обнуляем и не стопим
      // полностью, поэтому расчёт следующей цели не сбивается.
      const frozen = now < hitstopUntilRef.current;
      let advance = (elapsed / step) * (frozen ? 0.12 : 1);

      // ФИНАЛ: последняя живая аватарка доезжает до КРАЙНЕГО ЛЕВОГО
      // положения (остаётся на экране) и лента там встаёт — рядом с ней
      // справа появляется приз.
      if (phaseRef.current === "settle" && !settledRef.current) {
        if (settleTargetRef.current === null) {
          const liveIds = new Set(liveRef.current.map((e) => e.id));
          const slot = tapeRef.current.find(
            (s) => s.entry && liveIds.has(s.entry.id) && s.idx >= reelPhase.current + 1.6,
          );
          if (slot) settleTargetRef.current = slot.idx + winStopOffset();
        }
        const target = settleTargetRef.current;
        if (target !== null) {
          const diff = target - reelPhase.current;
          // Торможение с нижней границей скорости: лента гарантированно
          // доезжает и ВСТАЁТ, а не ползёт бесконечно к цели.
          if (diff <= 0.04) {
            advance = diff;
            reelPhase.current += advance;
            syncStrip();
            settledRef.current = true;
            setSettled(true);
            playHuntWin();
            haptic("success");
            // В финале в кадре должна остаться РОВНО одна аватарка победителя:
            // все остальные слоты (в т.ч. его же копии по кругу) убираем.
            const winIdx = Math.round(target - winStopOffset());
            const only = tapeRef.current.filter((s) => s.idx === winIdx);
            tapeRef.current = only;
            setTape(only);
            stopReel();
            // Лента встала — сам запускаем финал раунда: показ победителя,
            // затем отсчёт «3 / 2 / 1» и следующий приз.
            finishRef.current?.();
            return;
          }

          advance = Math.min(advance, Math.max(diff * (elapsed / 260), (elapsed / 1000) * 0.7));
        }
      }


      reelPhase.current += advance;
      // Хвост ленты должен существовать дальше, чем точка будущего импакта,
      // иначе цель «ещё не создана» и взмах не запускается.
      leadRef.current = Math.ceil(impactDelayRef.current / step) + 3;
      groomTape();
      syncStrip();

      if (phaseRef.current === "drift" && aliveRef.current > 1) {
        // Пауза «раздумья»: в финале байкер не бьёт каждый цикл — лента
        // прокручивается лишний раз, и никто не знает, когда прилетит.
        const pause = suspenseMs(aliveRef.current);
        // --- Watchdog №1: взмах ушёл, а импакт-callback не пришёл (3D-клип
        // проглотил токен, дубль цикла, просадка кадров). Добиваем сами. ---
        if (kickInFlightRef.current && now > kickDeadlineRef.current) {
          const reserved = reservedTargetRef.current;
          kickInFlightRef.current = false;
          reservedTargetRef.current = null;
          lastImpactCycle.current = -1;
          impactLockedUntil.current = 0;
          eliminateRef.current(reserved);
          kickReadyAtRef.current = now + kickCycleMsRef.current + pause;
        }

        // --- Watchdog №2: последний рубеж. Если по любой причине никто не
        // выбывал дольше двух полных циклов — снимаем все замки и выбиваем
        // ближайшую живую капсулу. Розыгрыш не может встать намертво. ---
        if (
          lastEliminationAtRef.current &&
          now - lastEliminationAtRef.current >
            kickCycleMsRef.current * 2 + impactDelayRef.current + pause * 2
        ) {
          kickInFlightRef.current = false;
          reservedTargetRef.current = null;
          lastImpactCycle.current = -1;
          impactLockedUntil.current = 0;
          kickReadyAtRef.current = 0;
          eliminateRef.current(null);
          setKickToken((token) => token + 1);
        }

        // Запускаем одиночный взмах ровно за impactDelay до прихода следующей
        // живой капсулы в центр. Дырки просто проезжают — персонаж их не бьёт.
        if (!kickInFlightRef.current && now >= kickReadyAtRef.current) {
          const impactPhase = reelPhase.current + impactDelayRef.current / step;
          const liveIds = new Set(liveRef.current.map((entry) => entry.id));
          const nextLive = tapeRef.current.find(
            (slot) => slot.idx >= impactPhase && slot.entry !== null && liveIds.has(slot.entry.id),
          );
          // Страховка от зависания: если окно идеального тайминга по какой-то
          // причине проехало (кадр подвис, лента разряжена дырками), бьём по
          // ближайшей живой капсуле впереди, а не стоим до конца розыгрыша.
          const overdue = now - kickReadyAtRef.current > kickCycleMsRef.current * 1.5 + pause;
          if (nextLive) {
            const untilCenter = (nextLive.idx - reelPhase.current) * step;
            // Допуск в один кадр компенсирует React/Canvas между выбором цели
            // и фактическим стартом клипа, не меняя визуальную фазу ленты.
            if (untilCenter <= impactDelayRef.current + 34 || overdue) {
              reservedTargetRef.current = nextLive.idx;
              kickInFlightRef.current = true;
              kickReadyAtRef.current = now + kickCycleMsRef.current + pause;
              kickDeadlineRef.current = now + impactDelayRef.current + kickCycleMsRef.current;
              setKickToken((token) => token + 1);
            }
          } else if (overdue) {
            // Живой цели впереди нет вообще (хвост из дырок) — бьём по
            // ближайшей живой без брони, чтобы не зависнуть.
            kickReadyAtRef.current = now + kickCycleMsRef.current + pause;
            eliminateRef.current(null);
            setKickToken((token) => token + 1);
          }
        }
      }

      reelRaf.current = requestAnimationFrame(tick);
    };
    reelRaf.current = requestAnimationFrame(tick);
  }, [dur, groomTape, stopReel, syncStrip]);



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
      if (phase === "settle") setLook({ x: 0.25, y: 0.2 });
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
      const order = buildReel(entries);
      setCurrent(null);
      setSettled(false);
      settledRef.current = false;
      settleTargetRef.current = null;
      setKicks(0);
      setKickToken(0);
      kicksRef.current = 0;
      setGhosts([]);
      lastImpactCycle.current = -1;
      impactLockedUntil.current = 0;
      kickInFlightRef.current = false;
      reservedTargetRef.current = null;
      kickReadyAtRef.current = 0;
      kickDeadlineRef.current = 0;
      lastEliminationAtRef.current = 0;

      stopReel();

      // Лента собирается заново: живые в тасованном порядке, дырок нет.
      liveRef.current = order;
      feedRef.current = [...order];
      aliveRef.current = order.length;
      setAlive(order.length);
      tapeRef.current = [];
      setTape([]);
      winnerIdRef.current = winner.id;
      reelPhase.current = 0;
      // Слева от центра тоже должны быть капсулы, иначе окно начнётся с пустот.
      nextIdxRef.current = -(halfWindow() + 2);
      phaseMv.set(0);
      groomTape();

      setPhase("arming");
      haptic("light");

      // finish вызывается уже ПОСЛЕ того, как лента доехала и встала:
      // композиция та же, меняется только запись результата и переход дальше.
      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        const survivor = liveRef.current[0] ?? winner;
        setWinners((w) => [...w, { prizeId: HUNT_PRIZES[idx].id, entry: survivor }]);
        const rest = entries.filter((e) => e.id !== survivor.id);
        setPool(rest);

        later(() => {
          if (idx + 1 < HUNT_PRIZES.length) {
            // Между раундами: барабан стоит, музыка выключена, идёт отсчёт.
            stopReel();
            pendingRoundRef.current = { idx: idx + 1, entries: rest };
            setPhase("countdown");
          } else {
            stopReel();
            setPhase("podium");
          }
        }, BASE.reveal);
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
    [buildReel, dur, groomTape, halfWindow, later, phaseMv, pickWinner, startReel, stopReel],
  );

  /**
   * Единственное место, где кто-то выбывает. Вызывается либо из 3D-callback
   * (нормальный путь), либо watchdog'ом из тика, если callback не пришёл.
   * Инвариант: если в барабане есть живая капсула — функция ВСЕГДА кого-то
   * выбивает, поэтому розыгрыш физически не может застыть.
   */
  const eliminateAt = useCallback(
    (preferredIdx: number | null) => {
      if (phaseRef.current !== "drift") return;
      if (aliveRef.current <= 1) return;
      const now = performance.now();
      const list = tapeRef.current;
      const liveIds = new Set(liveRef.current.map((e) => e.id));
      const isLive = (slot: Slot) => Boolean(slot.entry && liveIds.has(slot.entry.id));

      let target =
        preferredIdx === null
          ? undefined
          : list.find((s) => s.idx === preferredIdx && isLive(s));
      if (!target) {
        // Fallback: ближайшая к центру живая капсула. Так удар никогда не
        // «уходит в никуда», даже если бронь устарела или слот стал дыркой.
        let bestDist = Infinity;
        for (const s of list) {
          if (!isLive(s)) continue;
          const d = Math.abs(s.idx - reelPhase.current);
          if (d < bestDist) {
            bestDist = d;
            target = s;
          }
        }
      }
      // Живых в ленте сейчас нет (хвост ещё догенерируется) — следующий кадр
      // попробует снова, watchdog не сбрасывается.
      if (!target?.entry) return;

      const center = target.idx;
      const kicked = target.entry;
      // Победителя выбивать нельзя: если он под ногой — переносим защиту на
      // другого живого. Центральная капсула всё равно честно улетает.
      if (kicked.id === winnerIdRef.current) {
        const other = liveRef.current.find((e) => e.id !== kicked.id);
        if (!other) return;
        winnerIdRef.current = other.id;
      }

      // Сколько человек уносит один удар. На больших пулах (100-200 заявок)
      // один удар = один человек означал бы 5+ минут ленты, поэтому удар
      // сносит группу: центральная капсула улетает, остальные из группы
      // снимаются за правым краем кадра — незаметно, но счётчик падает пачкой.
      const batch = Math.max(1, Math.ceil((aliveRef.current - 1) / 20));
      const removedIds = new Set<string>([kicked.id]);
      if (batch > 1) {
        for (const e of liveRef.current) {
          if (removedIds.size >= batch) break;
          if (e.id === kicked.id || e.id === winnerIdRef.current) continue;
          removedIds.add(e.id);
        }
      }
      liveRef.current = liveRef.current.filter((e) => !removedIds.has(e.id));
      // На пороге разрядки ленты пересобираем очередь с нуля, чтобы дырки
      // появились сразу, а не через круг.
      feedRef.current =
        liveRef.current.length <= 8
          ? []
          : feedRef.current.filter((e) => e === null || !removedIds.has(e.id));

      // Дыркой сразу становится физически выбитый слот. Копии выбитых, которые
      // ещё не появились в кадре (правее видимого окна), гасим тоже — иначе
      // мёртвые аватарки продолжают ездить по кругу и это читается как баг.
      const rightEdge = Math.floor(reelPhase.current) + halfWindow();
      const next = list.map((s) => {
        if (s.idx === center) return { ...s, entry: null };
        if (s.entry && s.idx > rightEdge && removedIds.has(s.entry.id)) return { ...s, entry: null };
        return s;
      });
      tapeRef.current = next;
      setTape(next);
      aliveRef.current = liveRef.current.length;
      setAlive(aliveRef.current);

      kicksRef.current += 1;
      setKicks(kicksRef.current);
      setShock((s) => s + 1);
      lastEliminationAtRef.current = now;
      // На ускорении пульта hitstop пропорционально короче, иначе на ×20
      // лента заикается вместо того, чтобы лететь.
      hitstopUntilRef.current = now + Math.min(55, 110 / speedRef.current);

      const key = `${center}-${kicksRef.current}`;
      // В кадре всегда ровно один выбитый шар: даже если 3D callback по ошибке
      // придёт повторно, второй летящий дубль не появится.
      setGhosts([{ key, entry: kicked }]);
      playHuntImpact(aliveRef.current <= 4 ? 1 : 0.85);
      // Чем меньше осталось — тем плотнее музыка.
      later(() => setGhosts((g) => g.filter((x) => x.key !== key)), 2000);
      haptic("light");
      if (aliveRef.current <= 1) {
        // Лента НЕ останавливается рывком и ничего не размонтируется: фаза
        // settle просто докатывает последнюю живую аватарку до центра.
        settleTargetRef.current = null;
        settledRef.current = false;
        setSettled(false);
        setCurrent(liveRef.current[0] ?? kicked);
        setPhase("settle");
      }
    },
    [halfWindow, later],
  );
  eliminateRef.current = eliminateAt;

  /** Импакт ноги: улетает та капсула, что была забронирована этим взмахом. */
  const handleImpact = useCallback(
    (cycle: number) => {
      if (phaseRef.current !== "drift") return;
      const now = performance.now();
      // Дубли одного и того же цикла 3D-клипа игнорируем, но замки ВСЕГДА
      // снимаем: раньше повторный callback оставлял kickInFlight=true навсегда,
      // и персонаж больше не бил до конца розыгрыша.
      const duplicate = lastImpactCycle.current === cycle || now < impactLockedUntil.current;
      const center = reservedTargetRef.current;
      kickInFlightRef.current = false;
      reservedTargetRef.current = null;
      if (duplicate) return;
      lastImpactCycle.current = cycle;
      impactLockedUntil.current = now + 650;
      eliminateAt(center);
    },
    [eliminateAt],
  );


  const start = async () => {
    clearTimers();
    // Музыку можно стартовать только из жеста пользователя — это он и есть.
    const fresh = await fetchHuntEntries(MOCK_ENTRIES, Math.floor(Math.random() * 99999));
    await Promise.all(
      [...new Set(fresh.map((entry) => entry.avatarUrl).filter((src): src is string => Boolean(src)))].map(
        (src) =>
          new Promise<void>((resolve) => {
            const image = new Image();
            image.onload = () => void image.decode().catch(() => undefined).finally(resolve);
            image.onerror = () => resolve();
            image.src = src;
          }),
      ),
    );
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
      const winner =
        liveRef.current.find((e) => e.id === winnerIdRef.current) ??
        liveRef.current[0] ??
        pickWinner(entries);
      kicksRef.current = Math.max(0, aliveRef.current - 1);
      setKicks(kicksRef.current);
      liveRef.current = [winner];
      aliveRef.current = 1;
      setAlive(1);
      setGhosts([]);
      setCurrent(winner);
      settleTargetRef.current = null;
      settledRef.current = false;
      setSettled(false);
      setPhase("settle");
      return;
    }
    if (phase === "settle") {
      finishRef.current?.();
    }
  };

  const dogMode: RiderMode =
    phase === "drift" ? "lunge" : phase === "arming" ? "watch" : "idle";

  const totalTickets = useMemo(
    () =>
      pool.reduce((s, e) => s + e.tickets, 0) + winners.reduce((s, w) => s + w.entry.tickets, 0),
    [pool, winners],
  );


  // Тестовый пульт скорости показываем только по ?dev=1.
  const devPanel = useMemo(
    () => typeof window !== "undefined" && window.location.search.includes("dev"),
    [],
  );

  return (
    <div className="fixed inset-0 z-40 overflow-hidden overscroll-none touch-pan-y bg-background text-foreground select-none">
      {/* Фоновое свечение: неоновые пятна по краям в брендовой магенте. */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(120% 60% at 50% -10%, color-mix(in oklab, var(--primary) 18%, transparent), transparent 70%)," +
            "radial-gradient(80% 50% at -10% 40%, color-mix(in oklab, var(--primary) 12%, transparent), transparent 70%)," +
            "radial-gradient(80% 50% at 110% 40%, color-mix(in oklab, var(--primary) 12%, transparent), transparent 70%)," +
            "radial-gradient(120% 60% at 50% 110%, color-mix(in oklab, var(--primary) 10%, transparent), transparent 70%)",
        }}
      />




      {/* WINNER — самый верх экрана, крупно и ядовито-зелёным */}
      <AnimatePresence>
        {settled && phase !== "countdown" && (
          <motion.div
            key="winner-top"
            initial={{ opacity: 0, y: -14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.25 } }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-none absolute inset-x-0 z-50 text-center"
            style={{ top: "calc(0.75rem + env(safe-area-inset-top))" }}
          >
            <p
              className="font-display text-6xl font-black uppercase leading-none tracking-[0.14em]"
              style={{ color: "#B6FF3C", textShadow: "0 0 34px rgba(182,255,60,0.5)" }}
            >
              winner
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Карточка приза текущего раунда — сверху, в брендовом стиле */}
      <AnimatePresence>
        {(phase === "arming" || phase === "drift") && !settled && (
          <motion.div
            key={`prize-card-${prize.id}`}
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12, transition: { duration: 0.2 } }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-none absolute inset-x-0 z-50 flex justify-center px-4"
            style={{ top: "calc(0.75rem + env(safe-area-inset-top))" }}
          >
            <div
              className="flex items-center gap-3 rounded-2xl border px-3 py-2 backdrop-blur-md"
              style={{
                borderColor: "rgba(182,255,60,0.45)",
                background: "color-mix(in oklab, var(--card) 70%, transparent)",
                boxShadow:
                  "0 0 0 1px rgba(182,255,60,0.18), 0 12px 40px -12px rgba(182,255,60,0.55)",
              }}
            >
              <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/60 bg-background/60">
                <img src={prize.img} alt="" className="h-9 w-9 object-contain" />
              </div>
              <div className="min-w-0 text-left">
                <p
                  className="text-[10px] font-semibold uppercase tracking-[0.22em]"
                  style={{
                    color: "#B6FF3C",
                    textShadow: "0 0 10px rgba(182,255,60,0.7)",
                  }}
                >
                  разыгрывается
                </p>

                <p className="truncate font-display text-sm font-black uppercase leading-tight">
                  {prize.title}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>



      <div className="relative flex h-full flex-col overflow-hidden pt-[max(0.5rem,env(safe-area-inset-top))] pb-[calc(5.5rem+env(safe-area-inset-bottom))]">
        {/* арена */}
        <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center">
          {/* Персонаж стоит за лентой и чуть ниже: аватарки проходят перед ним,
              а в зоне удара пересекаются только с ногой. */}
          <motion.div
            className={`relative z-10 w-full max-w-[560px] ${
              phase === "intro" ? "mt-0 h-[34svh]" : "-mt-[1svh] h-[74svh]"
            }`}
            animate={{ opacity: phase === "podium" ? 0.25 : 1 }}
          >
            <RiderCharacter
              mode={dogMode}
              lookAt={look}
              kickToken={kickToken}
              victory={settled}
              onKickReady={(impactDelay, cycleMs) => {
                impactDelayRef.current = impactDelay;
                kickCycleMsRef.current = cycleMs;
              }}
              onImpact={handleImpact}
              className="h-full w-full"
            />
          </motion.div>

          {phase === "intro" && <IntroPanel onStart={start} />}

          {(phase === "arming" ||
            phase === "drift" ||
            phase === "settle" ||
            phase === "countdown") && (
            <ReelStage
              slots={tape}
              ghosts={ghosts}
              phase={phaseMv}
              shock={shock}
              winner={settled ? current : null}
              prizeTitle={prize.title}
              prizeImg={prize.img}
            />
          )}


          {phase === "countdown" && (
            <RoundCountdown
              round={(pendingRoundRef.current?.idx ?? caseIdx) + 1}
              onDone={() => {
                const next = pendingRoundRef.current;
                pendingRoundRef.current = null;
                if (!next) return;
                setCaseIdx(next.idx);
                runCase(next.idx, next.entries);
              }}
            />
          )}

          {phase === "podium" && <Podium winners={winners} onRestart={start} />}
        </div>

        {/* тестовый пульт скорости: только по ?dev=1 */}
        {devPanel && (
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
            <p className="mt-2 text-center font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground/70">
              в барабане {pool.length} · {totalTickets} билетов
            </p>
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
        Капсулы движутся без остановки. Гончая выбивает их на лету, а пустое место уезжает
        вместе с лентой. Последний, кто устоял, забирает приз.
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
  phase,
  shock,
  winner,
  prizeTitle,
  prizeImg,
}: {
  /** Слоты ленты со своими АБСОЛЮТНЫМИ индексами (не по кругу). */
  slots: { idx: number; entry: HuntEntry | null }[];
  /** Сколько живых участников осталось. */
  ghosts: { key: string; entry: HuntEntry }[];
  /** Абсолютная фаза ленты: целая часть выбирает центральный слот. */
  phase: MotionValue<number>;
  /** Счётчик ударов: меняется — играем вспышку и тряску арены. */
  shock: number;
  /** Победитель: лента уже встала, рядом с аватаркой всплывает плашка. */
  winner: HuntEntry | null;
  prizeTitle: string;
  prizeImg: string;
}) {
  // Отдача от удара: тряска и микро-зум играются только на transform, поэтому
  // не вызывают ни layout, ни перерисовку аватарок.
  const recoil = useAnimation();
  useEffect(() => {
    if (!shock) return;
    void recoil.start({
      y: [0, -1.2, 0],
      scale: [1, 1.01, 1],
      transition: { duration: 0.34, ease: [0.22, 1, 0.36, 1] },
    });
  }, [shock, recoil]);

  return (
    <div className="relative z-30 -mt-[30svh] w-full">
      {/* Движущаяся лента плоская: перспектива применяется только к звену,
          которое уже выбито и летит отдельно от барабана. */}
      <motion.div className="relative py-2" animate={recoil} style={{ willChange: "transform" }}>


        {/* импакт-фрейм: короткая световая вспышка ровно в кадре удара */}
        {shock > 0 && (
          <motion.div
            key={`flash-${shock}`}
            className="pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              width: CHIP_W * 2.2,
              height: CHIP_W * 2.2,
              background:
                "radial-gradient(circle, color-mix(in oklab, var(--foreground) 85%, transparent), color-mix(in oklab, var(--destructive) 40%, transparent) 45%, transparent 70%)",
            }}
            initial={{ opacity: 0.6, scale: 0.6 }}
            animate={{ opacity: 0, scale: 1.2 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          />
        )}

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

        {/* вторая, более быстрая волна: даёт «двойной» удар по глазам */}
        {shock > 0 && (
          <motion.div
            key={`ring2-${shock}`}
            className="pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
            style={{
              width: CHIP_W * 0.8,
              height: CHIP_W * 0.8,
              borderColor: "color-mix(in oklab, var(--foreground) 55%, transparent)",
            }}
            initial={{ opacity: 0.7, scale: 0.4 }}
            animate={{ opacity: 0, scale: 2 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
          />
        )}

        {/* Эффект победителя: вращающийся веер лучей + две расходящиеся волны */}
        <AnimatePresence>
          {winner && (
            <>
              <motion.div
                key="win-rays"
                className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{
                  width: CHIP_W * 5,
                  height: CHIP_W * 5,
                  background:
                    "repeating-conic-gradient(from 0deg, rgba(182,255,60,0.20) 0deg 6deg, transparent 6deg 18deg)",
                  maskImage: "radial-gradient(circle, #000 12%, transparent 68%)",
                  WebkitMaskImage: "radial-gradient(circle, #000 12%, transparent 68%)",
                }}
                initial={{ opacity: 0, scale: 0.7, rotate: 0 }}
                animate={{ opacity: 1, scale: 1, rotate: 360 }}
                exit={{ opacity: 0 }}
                transition={{
                  opacity: { duration: 0.5 },
                  scale: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
                  rotate: { duration: 26, repeat: Infinity, ease: "linear" },
                }}
              />
              <motion.div
                key="win-halo"
                className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl"
                style={{
                  width: CHIP_W * 3.2,
                  height: CHIP_W * 3.2,
                  background:
                    "radial-gradient(circle, rgba(182,255,60,0.34), color-mix(in oklab, var(--primary) 26%, transparent) 55%, transparent 72%)",
                }}
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: [0.75, 1, 0.75], scale: [0.98, 1.06, 0.98] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
              />
              {[0, 0.35].map((d) => (
                <motion.div
                  key={`win-wave-${d}`}
                  className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
                  style={{
                    width: CHIP_W,
                    height: CHIP_W,
                    borderColor: "rgba(182,255,60,0.7)",
                  }}
                  initial={{ opacity: 0.8, scale: 0.5 }}
                  animate={{ opacity: 0, scale: 3.6 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.4, delay: d, ease: "easeOut" }}
                />
              ))}
            </>
          )}
        </AnimatePresence>


        {!winner && (
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-background to-transparent" />
        )}

        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-background to-transparent" />

        <div className="relative z-30" style={{ height: CHIP_W }}>
          {slots.map((slot) => (
            <ReelSlot key={slot.idx} slot={slot} phase={phase} />
          ))}
        </div>


        {/* выбитые аватарки — дорожка без overflow, полёт ничем не обрезается */}
        <AnimatePresence>
          {ghosts.map((g) => (
            <motion.div key={g.key} exit={{ opacity: 0 }}>
              <KickedAvatar entry={g.entry} seed={g.key} scale={CHIP_SCALE} width={CHIP_W} />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {/* Финал: лента встала, победитель стоит в крайнем левом положении —
          над персонажем всплывает WINNER, справа от аватарки — приз. */}
      <AnimatePresence>
        {winner && (
          <motion.div
            key="winner-prize"
            initial={{ opacity: 0, y: 10, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-none absolute left-1/2 top-1/2 z-40 flex max-w-[52%] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1"
          >
            <img
              src={prizeImg}
              alt=""
              className="h-20 shrink-0 object-contain drop-shadow-[0_0_26px_color-mix(in_oklab,var(--primary)_60%,transparent)]"
            />
            <p className="font-display text-base font-black uppercase leading-tight">
              {prizeTitle}
            </p>
          </motion.div>
        )}
      </AnimatePresence>



    </div>
  );
}

function ReelSlot({
  slot,
  phase,
}: {
  slot: { idx: number; entry: HuntEntry | null };
  phase: MotionValue<number>;
}) {
  const x = useTransform(phase, (value) => (slot.idx - value) * STEP - CHIP_W / 2);
  return (
    <motion.div
      data-slot={slot.idx}
      className="absolute left-1/2 top-0"
      style={{ x, width: CHIP_W, height: CHIP_W, willChange: "transform" }}
    >
      {slot.entry ? <HuntAvatar entry={slot.entry} scale={CHIP_SCALE} /> : null}
    </motion.div>
  );
}





/**
 * Межраундовая заставка: «СЛЕДУЮЩИЙ РАУНД» и отсчёт 3 → 2 → 1 → GO,
 * цифры влетают со звуком. Музыка на это время выключена.
 */
function RoundCountdown({ round, onDone }: { round: number; onDone: () => void }) {
  const [step, setStep] = useState<number | null>(null);
  const doneRef = useRef(false);

  useEffect(() => {
    const timers: number[] = [];
    const tick = (value: number, delay: number) => {
      timers.push(
        window.setTimeout(() => {
          setStep(value);
          haptic(value > 0 ? "light" : "success");
          speakHuntCount(value);
        }, delay),
      );
    };
    // Сначала гаснет WINNER и появляется «Следующий раунд», только потом 3-2-1.
    const LEAD = 900;
    tick(3, LEAD);
    tick(2, LEAD + 850);
    tick(1, LEAD + 1700);
    tick(0, LEAD + 2550);

    timers.push(
      window.setTimeout(() => {
        if (doneRef.current) return;
        doneRef.current = true;
        onDone();
      }, LEAD + 3200),
    );
    return () => timers.forEach((t) => window.clearTimeout(t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 z-40">
      {/* Шапка экрана: подпись раунда не перекрывает персонажа */}
      <div
        className="absolute inset-x-0 flex flex-col items-center"
        style={{ top: "calc(0.75rem + env(safe-area-inset-top))" }}
      >
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-display text-xl font-black uppercase tracking-[0.08em] text-foreground"
        >
          Следующий раунд
        </motion.p>
        <motion.p
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="mt-1 font-mono text-[11px] uppercase tracking-[0.34em] text-muted-foreground"
        >
          Раунд {round}
        </motion.p>
      </div>

      {/* Цифры — прямо на персонаже, по центру экрана */}
      <div className="absolute inset-0">

        <AnimatePresence mode="popLayout">
          {step !== null && (

          <motion.div
            key={step}
            initial={{ scale: 2.6, opacity: 0, filter: "blur(14px)" }}
            animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
            exit={{ scale: 0.6, opacity: 0, filter: "blur(10px)" }}
            transition={{ type: "spring", stiffness: 420, damping: 22, mass: 0.7 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <span
              className="font-display font-black uppercase leading-none"
              style={{
                fontSize: step === 0 ? "clamp(64px, 20vw, 140px)" : "clamp(96px, 34vw, 220px)",
                color: step === 0 ? "#B6FF3C" : "var(--foreground)",
                textShadow:
                  step === 0
                    ? "0 0 46px color-mix(in oklab, #B6FF3C 60%, transparent)"
                    : "0 0 40px color-mix(in oklab, var(--destructive) 55%, transparent)",
              }}
            >
              {step === 0 ? "GO!" : step}
            </span>
          </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
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
      className="pointer-events-auto absolute inset-x-0 bottom-0 z-10 mx-auto w-full max-w-md px-6 text-center"
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
