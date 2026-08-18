// HOUND HUNT — шоу-розыгрыш для владельцев Hell Pass Platinum.
// ВАЖНО: пока это ТОЛЬКО визуал на моках. Никакого бекенда, победители
// определяются локально (Math.random по весам билетов) — чтобы согласовать
// анимацию и тайминги. Серверная часть (честный жребий, seed, подпись) — позже.
//
// Механика показа: 3 кейса по призам (3-е → 2-е → главный).
// Каждый кейс: барабан аватарок как в Dota 2 → гончая кусает кейс →
// аватарка исчезает в пасти → ревил победителя. Победитель выбывает.

import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useAnimationControls } from "framer-motion";
import { X } from "lucide-react";
import { HoundDog, type DogMode } from "@/components/club/hound-hunt/HoundDog";
import { EmberField } from "@/components/club/hound-hunt/EmberField";
import {
  HUNT_PRIZES,
  HUNT_TICKET_STEP,
  hueOf,
  makeEntries,
  type HuntEntry,
} from "@/components/club/hound-hunt/hh-mock";
import { playSpin, playWin, playClick, playTick } from "@/lib/roller-sfx";
import { haptic } from "@/hooks/use-haptic";

export const Route = createFileRoute("/club/hound-hunt")({
  head: () => ({
    meta: [
      { title: "HOUND HUNT — клуб HELLHOUND" },
      { name: "description", content: "Шоу-розыгрыш для владельцев Hell Pass Platinum." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: HoundHuntPage,
});

/* ------------------------------ тайминги ------------------------------ */

type Pace = "demo" | "show";

const PACE: Record<Pace, { arming: number; spin: number; bite: number; reveal: number }> = {
  // быстрый прогон для проверки визуала
  demo: { arming: 2600, spin: 7000, bite: 1500, reveal: 4200 },
  // «боевой» темп: три кейса ≈ 12–15 минут
  show: { arming: 40000, spin: 150000, bite: 2600, reveal: 45000 },
};

type Phase = "intro" | "arming" | "spinning" | "bite" | "reveal" | "podium";

const CARD_W = 104;
const CARD_GAP = 10;
const STEP = CARD_W + CARD_GAP;

/* ------------------------------ страница ------------------------------ */

function HoundHuntPage() {
  const [pace, setPace] = useState<Pace>("demo");
  const t = PACE[pace];

  const [pool, setPool] = useState<HuntEntry[]>(() => makeEntries(28));
  const [caseIdx, setCaseIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>("intro");
  const [winners, setWinners] = useState<{ prizeId: string; entry: HuntEntry }[]>([]);
  const [current, setCurrent] = useState<HuntEntry | null>(null);
  const [flash, setFlash] = useState(0);
  const [look, setLook] = useState({ x: 0, y: 0 });

  const prize = HUNT_PRIZES[Math.min(caseIdx, HUNT_PRIZES.length - 1)];
  const shake = useAnimationControls();
  const strip = useAnimationControls();
  const timers = useRef<number[]>([]);

  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  /* --- барабан: длинная лента слотов, победитель на фиксированном индексе --- */
  const [reel, setReel] = useState<HuntEntry[]>([]);
  const WIN_INDEX = 46;

  const buildReel = useCallback((entries: HuntEntry[], winner: HuntEntry) => {
    const slots: HuntEntry[] = [];
    for (const e of entries) for (let i = 0; i < e.slots; i++) slots.push(e);
    const out: HuntEntry[] = [];
    for (let i = 0; i < WIN_INDEX + 14; i++) {
      out.push(slots[Math.floor(Math.random() * slots.length)]);
    }
    out[WIN_INDEX] = winner;
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

  /* ------------------------------ сценарий ------------------------------ */

  const runCase = useCallback(
    (idx: number, entries: HuntEntry[]) => {
      const winner = pickWinner(entries);
      setCurrent(null);
      setReel(buildReel(entries, winner));
      strip.set({ x: 0 });
      setPhase("arming");
      haptic("light");

      later(() => {
        setPhase("spinning");
        playSpin(WIN_INDEX, t.spin);
        strip.start({
          x: -(WIN_INDEX * STEP),
          transition: { duration: t.spin / 1000, ease: [0.12, 0.78, 0.1, 1] },
        });

        later(() => {
          // укус
          setPhase("bite");
          setCurrent(winner);
          haptic("warning");
          playTick(0.3, 0.2);
          setFlash((f) => f + 1);
          shake.start({
            x: [0, -14, 12, -8, 5, 0],
            y: [0, 8, -6, 4, -2, 0],
            transition: { duration: 0.55 },
          });

          later(() => {
            setPhase("reveal");
            playWin();
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
            }, t.reveal);
          }, t.bite);
        }, t.spin + 250);
      }, t.arming);
    },
    [buildReel, later, pickWinner, shake, strip, t],
  );

  const start = () => {
    playClick();
    timers.current.forEach(clearTimeout);
    timers.current = [];
    const fresh = makeEntries(28, Math.floor(Math.random() * 99999));
    setPool(fresh);
    setWinners([]);
    setCaseIdx(0);
    runCase(0, fresh);
  };

  /* глаза следят за курсором */
  const onMove = (e: React.MouseEvent) => {
    const x = (e.clientX / window.innerWidth) * 2 - 1;
    const y = (e.clientY / window.innerHeight) * 2 - 1;
    setLook({ x, y: y * 0.6 });
  };

  const dogMode: DogMode =
    phase === "spinning" ? "watch" : phase === "bite" ? "lunge" : phase === "reveal" ? "chew" : "idle";

  const intensity =
    phase === "bite" ? 1 : phase === "reveal" ? 0.7 : phase === "spinning" ? 0.5 : 0.28;

  const totalTickets = useMemo(
    () => pool.reduce((s, e) => s + e.tickets, 0) + winners.reduce((s, w) => s + w.entry.tickets, 0),
    [pool, winners],
  );

  return (
    <div
      onMouseMove={onMove}
      className="fixed inset-0 z-50 overflow-hidden bg-background text-foreground select-none"
    >
      {/* фон: угли, дым, винетка */}
      <EmberField intensity={intensity} className="absolute inset-0 h-full w-full opacity-80" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_0%,color-mix(in_oklab,var(--destructive)_14%,transparent),transparent_60%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_60%_at_50%_110%,color-mix(in_oklab,var(--primary)_12%,transparent),transparent_70%)]" />
      <SmokeLayers />
      <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_220px_60px_var(--background)]" />

      {/* красная вспышка укуса */}
      <AnimatePresence>
        {flash > 0 && (
          <motion.div
            key={flash}
            initial={{ opacity: 0.85 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.7 }}
            className="pointer-events-none absolute inset-0 bg-destructive/70 mix-blend-screen"
          />
        )}
      </AnimatePresence>

      <motion.div animate={shake} className="relative flex h-full flex-col">
        {/* шапка */}
        <header className="flex items-start justify-between gap-3 px-4 pt-[max(1rem,env(safe-area-inset-top))]">
          <div>
            <h1 className="font-display text-2xl font-black uppercase leading-none tracking-tight drop-shadow-[0_0_22px_color-mix(in_oklab,var(--destructive)_60%,transparent)] md:text-4xl">
              HOUND HUNT
            </h1>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground md:text-xs">
              Platinum · {pool.length + winners.length} заявок · {totalTickets} билетов
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPace((p) => (p === "demo" ? "show" : "demo"))}
              className="rounded-full border border-border/60 bg-card/60 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground backdrop-blur transition hover:text-foreground"
            >
              темп: {pace === "demo" ? "быстрый" : "боевой"}
            </button>
            <Link
              to="/club"
              className="grid size-9 place-items-center rounded-full border border-border/60 bg-card/60 text-muted-foreground backdrop-blur transition hover:text-foreground"
              aria-label="Выйти"
            >
              <X className="size-4" />
            </Link>
          </div>
        </header>

        {/* прогресс кейсов */}
        <div className="mt-4 flex items-center justify-center gap-2 px-4">
          {HUNT_PRIZES.map((p, i) => {
            const done = winners.some((w) => w.prizeId === p.id);
            const active = phase !== "intro" && phase !== "podium" && i === caseIdx;
            return (
              <div
                key={p.id}
                className={`h-1 w-14 rounded-full transition-all md:w-24 ${
                  done
                    ? "bg-primary"
                    : active
                      ? "bg-destructive shadow-[0_0_14px_color-mix(in_oklab,var(--destructive)_80%,transparent)]"
                      : "bg-border/60"
                }`}
              />
            );
          })}
        </div>

        {/* арена */}
        <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center">
          {/* собака */}
          <motion.div
            className="relative z-20 h-36 w-52 md:h-52 md:w-72"
            animate={{ opacity: phase === "podium" ? 0.25 : 1 }}
          >
            <HoundDog mode={dogMode} lookAt={look} className="h-full w-full" />
          </motion.div>

          {phase === "intro" && (
            <IntroPanel onStart={start} />
          )}

          {(phase === "arming" || phase === "spinning") && (
            <ReelStage
              prizeTitle={prize.title}
              prizeSub={prize.sub}
              prizeImg={prize.img}
              reel={reel}
              controls={strip}
              armed={phase === "arming"}
            />
          )}

          {phase === "bite" && current && <BiteStage entry={current} />}

          {phase === "reveal" && current && (
            <RevealStage entry={current} prizeTitle={prize.title} prizeSub={prize.sub} prizeImg={prize.img} />
          )}

          {phase === "podium" && <Podium winners={winners} onRestart={start} />}
        </div>

        {/* нижняя лента участников */}
        {phase !== "intro" && phase !== "podium" && (
          <div className="relative z-10 shrink-0 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <p className="mb-2 text-center font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
              в барабане · порог {HUNT_TICKET_STEP} билетов = 1 место
            </p>
            <div className="flex flex-wrap justify-center gap-1.5">
              {pool.slice(0, 22).map((e) => (
                <span
                  key={e.id}
                  className="rounded-full border border-border/50 bg-card/40 px-2 py-0.5 font-mono text-[10px] text-muted-foreground backdrop-blur"
                >
                  {e.nick}
                  <span className="text-primary"> ×{e.slots}</span>
                </span>
              ))}
              {pool.length > 22 && (
                <span className="rounded-full border border-border/50 bg-card/40 px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                  +{pool.length - 22}
                </span>
              )}
            </div>
          </div>
        )}
      </motion.div>
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
        Три кейса. Гончая вскроет каждый по очереди — от третьего места к главному призу.
        Кого она достанет, тот забирает. Выигравший из барабана выбывает.
      </p>
      <button
        type="button"
        onClick={onStart}
        className="mt-6 w-full rounded-2xl border border-destructive/50 bg-destructive/15 px-6 py-4 font-display text-lg font-black uppercase tracking-wide text-foreground shadow-[0_0_40px_-6px_color-mix(in_oklab,var(--destructive)_70%,transparent)] transition hover:bg-destructive/25 active:scale-[0.98]"
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
  controls,
  armed,
}: {
  prizeTitle: string;
  prizeSub: string;
  prizeImg: string;
  reel: HuntEntry[];
  controls: ReturnType<typeof useAnimationControls>;
  armed: boolean;
}) {
  return (
    <div className="relative z-10 w-full">
      <div className="mb-3 flex items-center justify-center gap-3">
        <img src={prizeImg} alt="" className="size-10 rounded-lg object-contain" />
        <div className="text-left">
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-destructive">{prizeSub}</p>
          <p className="font-display text-base font-black uppercase tracking-tight">{prizeTitle}</p>
        </div>
      </div>

      <div className="relative overflow-hidden border-y border-border/50 bg-card/25 py-4 backdrop-blur-sm">
        {/* маркер центра */}
        <div className="pointer-events-none absolute left-1/2 top-0 z-20 h-full w-[2px] -translate-x-1/2 bg-destructive shadow-[0_0_20px_4px_color-mix(in_oklab,var(--destructive)_70%,transparent)]" />
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-background to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-background to-transparent" />

        <motion.div
          animate={controls}
          className="flex gap-[10px] pl-[calc(50%-52px)]"
          style={{ willChange: "transform" }}
        >
          {reel.map((e, i) => (
            <AvatarCard key={`${e.id}-${i}`} entry={e} />
          ))}
        </motion.div>
      </div>

      <motion.p
        animate={{ opacity: armed ? [0.4, 1, 0.4] : 1 }}
        transition={{ duration: 1.2, repeat: Infinity }}
        className="mt-3 text-center font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground"
      >
        {armed ? "гончая берёт след" : "барабан крутится"}
      </motion.p>
    </div>
  );
}

function AvatarCard({ entry, big }: { entry: HuntEntry; big?: boolean }) {
  const hue = hueOf(entry.nick);
  return (
    <div
      className={`shrink-0 rounded-xl border border-border/60 bg-card/70 text-center backdrop-blur ${
        big ? "w-40 p-4" : "w-[104px] p-2"
      }`}
    >
      <div
        className={`mx-auto grid place-items-center rounded-full font-display font-black text-foreground ${
          big ? "size-20 text-2xl" : "size-12 text-sm"
        }`}
        style={{
          background: `linear-gradient(140deg, oklch(0.42 0.16 ${hue}), oklch(0.18 0.05 ${hue}))`,
          boxShadow: "0 0 18px -6px color-mix(in oklab, var(--primary) 60%, transparent)",
        }}
      >
        {entry.initials}
      </div>
      <p className={`mt-2 truncate font-mono uppercase ${big ? "text-sm" : "text-[10px]"}`}>
        {entry.nick}
      </p>
      <p className={`truncate text-primary ${big ? "text-xs" : "text-[9px]"} font-mono`}>
        ×{entry.slots} · {entry.tickets} б.
      </p>
    </div>
  );
}

/** Кейс в пасти: аватарка исчезает, летят щепки. */
function BiteStage({ entry }: { entry: HuntEntry }) {
  return (
    <div className="relative z-10 mt-2 grid place-items-center">
      <motion.div
        initial={{ scale: 1, opacity: 1, y: 0, rotate: 0 }}
        animate={{ scale: [1, 1.1, 0.2], opacity: [1, 1, 0], y: [0, -10, -70], rotate: [0, -6, 10] }}
        transition={{ duration: 1.1, times: [0, 0.35, 1] }}
      >
        <AvatarCard entry={entry} big />
      </motion.div>
      {/* щепки кейса */}
      {Array.from({ length: 14 }).map((_, i) => (
        <motion.span
          key={i}
          className="absolute size-1.5 rounded-sm bg-destructive"
          initial={{ opacity: 1, x: 0, y: 0 }}
          animate={{
            opacity: 0,
            x: Math.cos((i / 14) * Math.PI * 2) * (90 + Math.random() * 70),
            y: Math.sin((i / 14) * Math.PI * 2) * (70 + Math.random() * 60),
          }}
          transition={{ duration: 0.9, ease: "easeOut" }}
        />
      ))}
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
      <img src={prizeImg} alt="" className="mx-auto h-28 object-contain drop-shadow-[0_0_30px_color-mix(in_oklab,var(--primary)_60%,transparent)]" />
      <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.28em] text-destructive">{prizeSub}</p>
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
      <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-destructive">охота закрыта</p>
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
        className="mt-6 w-full rounded-2xl border border-border/60 bg-card/60 px-6 py-3.5 font-display text-base font-black uppercase tracking-wide backdrop-blur transition hover:bg-card active:scale-[0.98]"
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
