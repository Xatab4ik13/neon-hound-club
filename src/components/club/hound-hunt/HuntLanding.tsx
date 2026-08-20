// Лендинг HOUND HUNT: продающая страница недельной охоты. Только фронт —
// призы, порог билетов и время старта берём из конфига админки (localStorage).

import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";

import { RiderCharacter } from "./RiderCharacter";
import { useHuntConfig, prizesInRunOrder } from "./hh-config";
import { HuntAvatar } from "./HuntAvatar";
import { type HuntEntry } from "./hh-mock";
import { getTier } from "@/data/hell-pass";
import { haptic } from "@/hooks/use-haptic";
import { useViewer } from "@/hooks/use-viewer";
import { useMyProfile } from "@/lib/garage-api";
import { useHuntPhase, msUntilStart } from "./hh-phase";
import { useMyBet } from "./hh-bets";
import { toast } from "sonner";

/** Ядовитый зелёный охоты — тот же, что в титре WINNER в шоу. */
const TOXIC = "#B6FF3C";

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


/** Цвета плашек в FAQ — тот же приём, что на странице инструктора школы. */
const FAQ_TINTS = [TOXIC, "#FF8A3C", "#F000C0", "#3CC8FF"];




/** Преимущества Platinum + кнопка покупки, в цвете тира. */
function PlatinumCard() {
  const tier = getTier("platinum");
  const color = tier?.color ?? "#F000C0";
  const perks = (tier?.perks ?? []).slice(0, 5);

  return (
    <div className="flex flex-col p-4">
      <h3 className="font-display text-xl font-black uppercase leading-none">
        Hell Pass <span style={{ color }}>Platinum</span>
      </h3>

      <ul className="mt-3 flex-1 space-y-2">
        {perks.map((perk) => (
          <li key={perk.label} className="flex gap-2 text-[12px] leading-tight">
            <span className="font-display font-black" style={{ color }}>
              {perk.value ?? "•"}
            </span>
            <span className="text-muted-foreground">{perk.label}</span>
          </li>
        ))}
      </ul>

      <Link
        to="/club/hell-pass/$tier"
        params={{ tier: "platinum" }}
        onClick={() => haptic("light")}
        className="mt-4 block w-full rounded-2xl px-3 py-3.5 text-center font-display text-base font-black uppercase tracking-wide text-background transition active:scale-[0.98]"
        style={{ background: color, boxShadow: `0 0 40px -14px ${color}` }}
      >
        Купить Hell Pass
      </Link>
    </div>
  );
}

export function HuntLanding({ onEnterShow }: { onEnterShow: () => void }) {
  const { cfg } = useHuntConfig();
  const prizes = useMemo(() => prizesInRunOrder(cfg), [cfg]);
  
  const { phase } = useHuntPhase(cfg.startsAt);
  const parts = split(msUntilStart(cfg.startsAt, Date.now()));

  // Кто ставит: реальный юзер, его аватарка и ник, а не мок из базы.
  const { isAuthed, tier, tickets: balance } = useViewer();
  const profileQ = useMyProfile(isAuthed);
  const isPlatinum = tier === "platinum";

  const me: HuntEntry | null = useMemo(() => {
    const nick = profileQ.data?.nick ?? null;
    if (!nick) return null;
    return {
      id: profileQ.data?.userId ?? "me",
      nick,
      initials: nick.slice(0, 2).toUpperCase(),
      avatarUrl: profileQ.data?.avatarUrl ?? undefined,
      city: profileQ.data?.city ?? "",
      tickets: 0,
      slots: 0,
    } as HuntEntry;
  }, [profileQ.data]);

  const { bet, placeBet } = useMyBet(cfg.startsAt, cfg.ticketStep);
  const [tickets, setTickets] = useState(() => cfg.ticketStep);
  const capsules = Math.max(0, Math.floor(tickets / cfg.ticketStep));
  const canBet = phase === "betting" && isPlatinum && capsules > 0 && balance >= tickets;

  const submitBet = async () => {
    if (!canBet) return;
    haptic("success");
    await placeBet(tickets);
    toast.success(`В барабане ${capsules + bet.capsules} ${capsules + bet.capsules === 1 ? "капсула" : "капсул"}`);
  };

  const startLabel = `${new Date(cfg.startsAt).toLocaleString("ru-RU", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Moscow",
  })} МСК`;


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
            Hell
            <br />
            <span style={{ color: TOXIC }}>Hunt</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground"
          >
            Раз в неделю Хелл выходит на охоту. В барабане только владельцы Platinum —
            выбивает всех, кроме одного.
          </motion.p>


          <div className="mx-auto -mt-4 h-[64svh] w-full max-w-md">
            <RiderCharacter mode="idle" dance className="h-full w-full" />
          </div>
        </section>


        {/* ------------------------------ таймер ------------------------------ */}
        <Reveal className="relative z-20 -mt-[24svh] px-6">
          <div
            className="rounded-3xl border border-border/60 bg-card/60 p-5 text-center"
            style={{ boxShadow: `0 0 60px -30px ${TOXIC}` }}
          >
            {(phase === "betting" || phase === "locked" || phase === "idle") && (
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
                {phase === "locked" && (
                  <p className="mt-1 text-xs font-medium text-destructive">
                    Приём билетов закрыт — состав барабана зафиксирован.
                  </p>
                )}
                <Link
                  to="/club/hell-pass"
                  onClick={() => haptic("light")}
                  className="mt-4 block w-full rounded-2xl bg-primary px-6 py-3.5 text-center font-display text-base font-black uppercase tracking-wide text-primary-foreground transition active:scale-[0.98]"
                >
                  Купить Hell Pass
                </Link>
              </>
            )}

            {phase === "live" && (
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
                  Хелл уже в барабане. Шоу идёт прямо сейчас.
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

            {phase === "replay" && (
              <>
                <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-destructive">
                  охота завершилась
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Итоги подведены. Запись доступна сутки, потом страница откроет новую охоту.
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
          <h2 className="font-display text-2xl font-black uppercase leading-none tracking-tight">
            Что разыгрываем на этой неделе
          </h2>
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
          <h2 className="font-display text-2xl font-black uppercase leading-none tracking-tight">
            Как попасть в барабан
          </h2>
          <div className="mt-4 space-y-2.5">
            {[
              {
                n: "1",
                t: "Возьми Hell Pass Platinum",
                d: "Охота открыта только для платинового доступа. Без него в барабан не пускают.",
              },
              {
                n: "2",
                t: `Набери минимум ${cfg.ticketStep} билетов`,
                d: `Каждые ${cfg.ticketStep} билетов = одна твоя капсула в барабане. Больше билетов — больше шансов устоять.`,
              },
              {
                n: "3",
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
          <h2 className="font-display text-2xl font-black uppercase leading-none tracking-tight">
            Билеты — капсулы
          </h2>
          <div className="mt-4 rounded-3xl border border-border/60 bg-card/50 p-5">
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                твоя ставка
              </span>
              <span className="font-mono text-xl font-bold tabular-nums" style={{ color: TOXIC }}>
                {tickets}
              </span>
            </div>

            <div className="mt-3 flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  haptic("light");
                  setTickets((t) => Math.max(0, t - cfg.ticketStep));
                }}
                disabled={tickets <= 0}
                className="size-12 shrink-0 rounded-2xl border border-border/70 bg-background/50 font-display text-2xl font-black leading-none transition active:scale-95 disabled:opacity-35"
                aria-label={`Минус ${cfg.ticketStep} билетов`}
              >
                −
              </button>
              <input
                type="range"
                min={0}
                max={1000}
                step={cfg.ticketStep}
                value={tickets}
                onChange={(e) => setTickets(Number(e.target.value))}
                className="min-w-0 flex-1 accent-primary"
                aria-label="Количество билетов"
              />
              <button
                type="button"
                onClick={() => {
                  haptic("light");
                  setTickets((t) => Math.min(1000, t + cfg.ticketStep));
                }}
                disabled={tickets >= 1000}
                className="size-12 shrink-0 rounded-2xl border border-border/70 bg-background/50 font-display text-2xl font-black leading-none transition active:scale-95 disabled:opacity-35"
                aria-label={`Плюс ${cfg.ticketStep} билетов`}
              >
                +
              </button>
            </div>

            {bet.tickets > 0 && (
              <p className="mt-3 text-xs" style={{ color: TOXIC }}>
                Уже в барабане: {bet.capsules} {bet.capsules === 1 ? "капсула" : "капсул"} ({bet.tickets} билетов). Новая ставка суммируется.
              </p>
            )}

            <p className="mt-3 text-xs text-muted-foreground">
              {capsules === 0
                ? `Минимальная ставка — ${cfg.ticketStep} билетов. Шаг ${cfg.ticketStep}.`
                : `${capsules} ${capsules === 1 ? "капсула" : "капсул"} в барабане. Ставка сгорает целиком — это плата за участие.`}
            </p>

            {me && capsules > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {Array.from({ length: Math.min(capsules, 10) }, (_, i) => (
                  <motion.div
                    key={i}
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <HuntAvatar entry={me} hideNick scale={0.32} />
                  </motion.div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={submitBet}
              disabled={!canBet}
              className={
                "mt-5 w-full rounded-2xl px-6 py-3.5 font-display text-base font-black uppercase tracking-wide transition active:scale-[0.98] " +
                (canBet ? "text-black" : "border border-border/70 bg-background/40 text-muted-foreground")
              }
              style={
                canBet
                  ? { background: TOXIC, boxShadow: `0 0 45px -16px ${TOXIC}` }
                  : undefined
              }
            >
              {canBet ? (
                <>Поставить {tickets} билетов</>
              ) : (
                <>Поставить билеты</>
              )}
            </button>

            {/* Почему кнопка серая — говорим прямо, без догадок. */}
            {!canBet && (
              <p className="mt-2 text-center text-xs text-muted-foreground">
                {!isAuthed
                  ? "Войди в клуб, чтобы участвовать."
                  : !isPlatinum
                    ? "Ставить билеты могут только владельцы Hell Pass Platinum."
                    : phase !== "betting"
                      ? "Приём билетов на эту охоту закрыт."
                      : capsules === 0
                        ? `Минимум ${cfg.ticketStep} билетов.`
                        : `Не хватает билетов: на балансе ${balance}.`}
              </p>
            )}
          </div>
        </Reveal>

        {/* --------------------------- Hell Pass Platinum --------------------------- */}
        <Reveal className="mt-10 px-6">
          <div className="rounded-3xl border border-border/60 bg-card/40 p-2">
            <PlatinumCard />
          </div>
        </Reveal>



        {/* ------------------------------ FAQ ------------------------------ */}
        <Reveal className="mt-10 px-6">
          <h2 className="font-display text-2xl font-black uppercase leading-none tracking-tight">
            Коротко о правилах
          </h2>
          <div className="mt-4 space-y-2">
            {[
              {
                q: "Что если я не зайду вовремя?",
                a: "Капсулы крутятся независимо от того, смотришь ты или нет. Приз всё равно твой, если Хелл тебя не выбил — итоги увидишь на этой странице.",
              },
              {
                q: "Насколько это честно?",
                a: "Шанс пропорционален числу капсул: больше билетов — больше капсул в барабане. Результат каждой охоты сохраняется и виден всем участникам.",
              },
              {
                q: "Что происходит с билетами?",
                a: "Билеты сгорают. Ставка — это плата за участие: поставил 100 билетов — все 100 списываются, независимо от результата охоты.",
              },
              {
                q: "Как часто проходит охота?",
                a: "Раз в неделю. Время старта объявляем заранее, таймер сверху всегда показывает точный отсчёт.",
              },
            ].map((f, i) => {
              const tint = FAQ_TINTS[i % FAQ_TINTS.length];
              return (
                <details
                  key={f.q}
                  className="group rounded-3xl border-[3px] border-foreground p-4"
                  style={{ background: tint, boxShadow: "6px 6px 0 0 hsl(var(--foreground))" }}
                >
                  <summary className="cursor-pointer list-none font-display text-sm font-black uppercase leading-tight text-black">
                    {f.q}
                  </summary>
                  <p className="mt-2 text-xs leading-relaxed text-black/80">{f.a}</p>
                </details>
              );
            })}
          </div>
        </Reveal>
      </div>
    </div>
  );
}
