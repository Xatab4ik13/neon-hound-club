// Лендинг HOUND HUNT: продающая страница недельной охоты. Только фронт —
// призы, порог билетов и время старта берём из конфига админки (localStorage).

import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";

import { RiderCharacter } from "./RiderCharacter";
import { useHuntConfig, prizesInRunOrder } from "./hh-config";
import { HuntAvatar } from "./HuntAvatar";
import { fetchHuntEntries, rankColorsOf, type HuntEntry } from "./hh-mock";
import { haptic } from "@/hooks/use-haptic";
import { toast } from "sonner";

/** Ядовитый зелёный охоты — тот же, что в титре WINNER в шоу. */
const TOXIC = "#B6FF3C";

/** Сколько шоу висит после старта, прежде чем считаем охоту завершённой. */
const SHOW_WINDOW_MS = 30 * 60 * 1000;

type Stage = "soon" | "live" | "finished";

function useStage(startsAt: string): { stage: Stage; ms: number } {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const target = new Date(startsAt).getTime();
  if (Number.isNaN(target)) return { stage: "soon", ms: 0 };
  if (now < target) return { stage: "soon", ms: target - now };
  if (now < target + SHOW_WINDOW_MS) return { stage: "live", ms: target + SHOW_WINDOW_MS - now };
  return { stage: "finished", ms: now - target };
}

function split(ms: number) {
  const t = Math.floor(Math.max(0, ms) / 1000);
  return {
    d: Math.floor(t / 86400),
    h: Math.floor((t % 86400) / 3600),
    m: Math.floor((t % 3600) / 60),
    s: t % 60,
  };
}

const pad = (n: number) => n.toString().padStart(2, "0");

function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay }}
      className={className}
    >
      {children}
    </motion.section>
  );
}

function SectionTitle({ kicker, title }: { kicker: string; title: string }) {
  return (
    <>
      <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
        {kicker}
      </p>
      <h2 className="mt-1.5 font-display text-2xl font-black uppercase leading-none tracking-tight">
        {title}
      </h2>
    </>
  );
}

export function HuntLanding({ onEnterShow }: { onEnterShow: () => void }) {
  const { cfg } = useHuntConfig();
  const prizes = useMemo(() => prizesInRunOrder(cfg), [cfg]);
  const main = prizes[prizes.length - 1];
  const { stage, ms } = useStage(cfg.startsAt);
  const parts = split(ms);

  const [entries, setEntries] = useState<HuntEntry[]>([]);
  useEffect(() => {
    let dead = false;
    void fetchHuntEntries(12).then((list) => {
      if (!dead) setEntries(list);
    });
    return () => {
      dead = true;
    };
  }, []);

  const [tickets, setTickets] = useState(() => cfg.ticketStep * 2);
  const capsules = Math.max(0, Math.floor(tickets / cfg.ticketStep));

  const startLabel = new Date(cfg.startsAt).toLocaleString("ru-RU", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="relative min-h-[100svh] overflow-hidden bg-black pb-24">
      {/* лёгкое статичное свечение: без канваса и тяжёлых фильтров — страница не лагает */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[70svh]"
        style={{
          background: `radial-gradient(90% 55% at 50% 0%, ${TOXIC}12, transparent 70%)`,
        }}
      />

      <div className="relative z-10">
        {/* ------------------------------ герой ------------------------------ */}
        <section className="px-6 pt-10 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="font-display text-[15vw] font-black uppercase leading-[0.85] tracking-tighter text-white"
          >
            Hound
            <br />
            <span style={{ color: TOXIC }}>Hunt</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground"
          >
            Раз в неделю гончая выходит на охоту. В барабане только владельцы Platinum —
            выбивает всех, кроме одного.
          </motion.p>

          <div className="mx-auto -mt-4 h-[64svh] w-full max-w-md">
            <RiderCharacter mode="idle" dance className="h-full w-full" />
          </div>
        </section>


        {/* ------------------------------ таймер ------------------------------ */}
        <Reveal className="px-6">
          <div
            className="rounded-3xl border border-border/60 bg-card/60 p-5 text-center"
            style={{ boxShadow: `0 0 60px -30px ${TOXIC}` }}
          >
            {stage === "soon" && (
              <>
                <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
                  до начала охоты
                </p>
                <div className="mt-3 flex items-end justify-center gap-3 font-mono tabular-nums">
                  {[
                    { v: parts.d, l: "дней" },
                    { v: parts.h, l: "часов" },
                    { v: parts.m, l: "минут" },
                    { v: parts.s, l: "секунд" },
                  ].map((u) => (
                    <div key={u.l} className="flex flex-col items-center">
                      <span
                        className="text-3xl font-bold leading-none"
                        style={{ color: TOXIC }}
                      >
                        {pad(u.v)}
                      </span>
                      <span className="mt-1 text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                        {u.l}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-xs text-muted-foreground">Старт {startLabel}</p>
                <button
                  type="button"
                  onClick={() => {
                    haptic("light");
                    toast.success("Напомним перед стартом охоты");
                  }}
                  className="mt-4 w-full rounded-2xl border border-border/70 bg-background/40 px-6 py-3 font-display text-sm font-black uppercase tracking-wide transition active:scale-[0.98]"
                >
                  Напомнить
                </button>
              </>
            )}

            {stage === "live" && (
              <>
                <motion.p
                  animate={{ opacity: [1, 0.45, 1] }}
                  transition={{ duration: 1.4, repeat: Infinity }}
                  className="font-mono text-[11px] uppercase tracking-[0.3em]"
                  style={{ color: TOXIC }}
                >
                  охота идёт
                </motion.p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Гончая уже в барабане. Заходи — шоу идёт прямо сейчас.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    haptic("success");
                    onEnterShow();
                  }}
                  className="mt-4 w-full rounded-2xl px-6 py-4 font-display text-lg font-black uppercase tracking-wide text-background transition active:scale-[0.98]"
                  style={{ background: TOXIC, boxShadow: `0 0 50px -10px ${TOXIC}` }}
                >
                  Войти в шоу
                </button>
              </>
            )}

            {stage === "finished" && (
              <>
                <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-destructive">
                  охота завершилась
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Итоги подведены. Следующая охота — через неделю, готовь билеты.
                </p>
                <button
                  type="button"
                  onClick={onEnterShow}
                  className="mt-4 w-full rounded-2xl border border-border/70 bg-background/40 px-6 py-3 font-display text-sm font-black uppercase tracking-wide transition active:scale-[0.98]"
                >
                  Посмотреть шоу
                </button>
              </>
            )}
          </div>
        </Reveal>

        {/* ------------------------------ призы ------------------------------ */}
        <Reveal className="mt-10 px-6">
          <SectionTitle kicker={`${prizes.length} приза — ${prizes.length} раунда`} title="Что разыгрываем" />
          <div className="mt-4 space-y-2.5">
            {[...prizes].reverse().map((p, i) => (
              <div
                key={p.id}
                className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card/50 p-3"
                style={
                  i === 0
                    ? { borderColor: `${TOXIC}55`, boxShadow: `0 0 40px -24px ${TOXIC}` }
                    : undefined
                }
              >
                <img src={p.img} alt={p.title} className="size-14 shrink-0 object-contain" />
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    {p.place === 1 ? "главный приз" : `раунд ${prizes.length - p.place + 1}`}
                  </p>
                  <p className="truncate font-display text-base font-black uppercase leading-tight">
                    {p.title}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Reveal>

        {/* --------------------------- как участвовать --------------------------- */}
        <Reveal className="mt-10 px-6">
          <SectionTitle kicker="три шага" title="Как попасть в барабан" />
          <div className="mt-4 space-y-2.5">
            {[
              {
                n: "01",
                t: "Возьми Hell Pass Platinum",
                d: "Охота открыта только для платинового доступа. Без него в барабан не пускают.",
              },
              {
                n: "02",
                t: `Набери минимум ${cfg.ticketStep} билетов`,
                d: `Каждые ${cfg.ticketStep} билетов = одна твоя капсула в барабане. Больше билетов — больше шансов устоять.`,
              },
              {
                n: "03",
                t: "Зайди к старту",
                d: "Открой эту страницу в назначенное время — шоу начнётся автоматически.",
              },
            ].map((s) => (
              <div
                key={s.n}
                className="flex gap-3 rounded-2xl border border-border/60 bg-card/40 p-4"
              >
                <span
                  className="font-display text-2xl font-black leading-none"
                  style={{ color: TOXIC }}
                >
                  {s.n}
                </span>
                <div>
                  <p className="font-display text-sm font-black uppercase">{s.t}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{s.d}</p>
                </div>
              </div>
            ))}
          </div>
        </Reveal>

        {/* ------------------------- капсулы = шансы ------------------------- */}
        <Reveal className="mt-10 px-6">
          <SectionTitle kicker="считаем шансы" title="Билеты = капсулы" />
          <div className="mt-4 rounded-3xl border border-border/60 bg-card/50 p-5">
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                твои билеты
              </span>
              <span className="font-mono text-xl font-bold tabular-nums" style={{ color: TOXIC }}>
                {tickets}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={cfg.ticketStep * 10}
              step={cfg.ticketStep}
              value={tickets}
              onChange={(e) => setTickets(Number(e.target.value))}
              className="mt-3 w-full accent-primary"
              aria-label="Количество билетов"
            />
            <p className="mt-3 text-xs text-muted-foreground">
              {capsules === 0
                ? `Нужно минимум ${cfg.ticketStep} билетов, чтобы попасть в барабан.`
                : `${capsules} ${capsules === 1 ? "капсула" : "капсулы"} с твоей аватаркой крутится в барабане.`}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {Array.from({ length: Math.min(capsules, 10) }, (_, i) => (
                <motion.div
                  key={i}
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: i * 0.04 }}
                  className="size-10 rounded-full"
                  style={{
                    background: `linear-gradient(160deg, ${TOXIC}, color-mix(in oklab, var(--primary) 70%, transparent))`,
                    boxShadow: `0 0 18px -6px ${TOXIC}`,
                  }}
                />
              ))}
            </div>
          </div>
        </Reveal>

        {/* ------------------------------ лор ------------------------------ */}
        <Reveal className="mt-10 px-6">
          <SectionTitle kicker="почему так называется" title="Гончая спущена" />
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Hound — гончая. Hunt — охота. В барабане крутятся капсулы всех участников, и гончая
            выбивает их одну за другой. Никаких кнопок, никакого везения на реакцию: ты просто
            смотришь, как поле сужается, пока не останется один. Он и забирает приз.
          </p>

          {entries.length > 0 && (
            <div className="mt-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                кто уже в деле
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {entries.slice(0, 10).map((e) => {
                  const rc = rankColorsOf(e);
                  return (
                    <div key={e.id} className="w-12 shrink-0">
                      <HuntAvatar entry={e} className="size-12" />
                      <p
                        className="mt-1 truncate text-center font-display text-[8px] font-black uppercase"
                        style={{ color: rc.accent }}
                      >
                        {e.nick}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Reveal>

        {/* --------------------------- продажа Pass --------------------------- */}
        <Reveal className="mt-10 px-6">
          <div
            className="rounded-3xl border p-5"
            style={{
              borderColor: "color-mix(in oklab, var(--primary) 45%, transparent)",
              background:
                "linear-gradient(160deg, color-mix(in oklab, var(--primary) 18%, transparent), transparent)",
            }}
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-primary">
              вход в охоту
            </p>
            <h2 className="mt-1.5 font-display text-2xl font-black uppercase leading-none">
              Hell Pass Platinum
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Билеты при активации, Hell AI без лимитов, VIP-чат и единственный вход в HOUND HUNT.
              {main ? ` На этой неделе на кону ${main.title}.` : ""}
            </p>
            <Link
              to="/club/hell-pass"
              onClick={() => haptic("light")}
              className="mt-4 block w-full rounded-2xl bg-primary px-6 py-4 text-center font-display text-lg font-black uppercase tracking-wide text-primary-foreground transition active:scale-[0.98]"
            >
              Взять Platinum
            </Link>
            <Link
              to="/club/shop"
              className="mt-2 block w-full rounded-2xl border border-border/70 bg-background/40 px-6 py-3 text-center font-display text-sm font-black uppercase tracking-wide"
            >
              Добрать билеты
            </Link>
          </div>
        </Reveal>

        {/* ------------------------------ FAQ ------------------------------ */}
        <Reveal className="mt-10 px-6">
          <SectionTitle kicker="вопросы" title="Коротко о правилах" />
          <div className="mt-4 space-y-2">
            {[
              {
                q: "Что если я не зайду вовремя?",
                a: "Капсулы крутятся независимо от того, смотришь ты или нет. Приз всё равно твой, если гончая тебя не выбила — итоги увидишь на этой странице.",
              },
              {
                q: "Насколько это честно?",
                a: "Шанс пропорционален числу капсул: больше билетов — больше капсул в барабане. Результат каждой охоты сохраняется и виден всем участникам.",
              },
              {
                q: "Что происходит с билетами?",
                a: "Билеты, которые дали тебе капсулы, остаются на балансе — они работают как вес в охоте, а не как плата за вход.",
              },
              {
                q: "Как часто проходит охота?",
                a: "Раз в неделю. Время старта объявляем заранее, таймер сверху всегда показывает точный отсчёт.",
              },
            ].map((f) => (
              <details
                key={f.q}
                className="group rounded-2xl border border-border/60 bg-card/40 p-4"
              >
                <summary className="cursor-pointer list-none font-display text-sm font-black uppercase">
                  {f.q}
                </summary>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </Reveal>
      </div>
    </div>
  );
}
