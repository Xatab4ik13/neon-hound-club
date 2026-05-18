import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Ticket,
  Flame,
  Trophy,
  Zap,
  Plus,
  Minus,
  Sparkles,
  Check,
  Info,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Countdown } from "@/components/club/Countdown";
import { ACTIVE_TICKETS, ME, type ActiveTicket } from "@/data/profile";

export const Route = createFileRoute("/club/raffles/$raffleId")({
  head: ({ params }) => {
    const raffle = ACTIVE_TICKETS.find((r) => r.id === params.raffleId);
    return {
      meta: [
        { title: `${raffle?.title ?? "Розыгрыш"} · HELLHOUND` },
        {
          name: "description",
          content: raffle?.subtitle ?? "Розыгрыш клуба HELLHOUND Racing.",
        },
        { name: "robots", content: "noindex" },
      ],
    };
  },
  notFoundComponent: () => (
    <div className="mx-auto max-w-md p-10 text-center">
      <h1 className="font-display text-3xl font-black uppercase italic text-foreground">
        Розыгрыш не найден
      </h1>
      <Link
        to="/club/raffles"
        className="mt-6 inline-flex items-center gap-2 border border-primary/40 px-4 py-2 font-mono text-xs uppercase tracking-[0.22em] text-primary hover:bg-primary/10"
      >
        <ArrowLeft className="h-3 w-3" />к розыгрышам
      </Link>
    </div>
  ),
  component: RaffleDetailPage,
});

function RaffleDetailPage() {
  const { raffleId } = Route.useParams();
  const raffle = ACTIVE_TICKETS.find((r) => r.id === raffleId);

  if (!raffle) {
    return (
      <div className="mx-auto max-w-md p-10 text-center">
        <h1 className="font-display text-3xl font-black uppercase italic text-foreground">
          Розыгрыш не найден
        </h1>
        <Link
          to="/club/raffles"
          className="mt-6 inline-flex items-center gap-2 border border-primary/40 px-4 py-2 font-mono text-xs uppercase tracking-[0.22em] text-primary hover:bg-primary/10"
        >
          <ArrowLeft className="h-3 w-3" />к розыгрышам
        </Link>
      </div>
    );
  }

  return <RaffleDetailContent raffle={raffle} />;
}

function RaffleDetailContent({ raffle }: { raffle: ActiveTicket }) {
  const [balance, setBalance] = useState(ME.totals.tickets);
  const [stake, setStake] = useState(0);
  const [flash, setFlash] = useState<string | null>(null);

  const odds = useMemo(() => {
    const mine = raffle.myTickets + stake;
    if (mine <= 0) return 0;
    return (mine / raffle.totalTickets) * 100;
  }, [raffle, stake]);

  const totalFund = useMemo(() => {
    if (!raffle.prizes) return null;
    return raffle.prizes.reduce((s, p) => s + (p.valueRub ?? 0), 0);
  }, [raffle.prizes]);

  const handleStake = () => {
    if (stake <= 0 || stake > balance) return;
    setBalance((b) => b - stake);
    setFlash(`Поставлено ×${stake} на ${raffle.title}`);
    setStake(0);
    setTimeout(() => setFlash(null), 2200);
  };

  const gallery = raffle.gallery && raffle.gallery.length > 0
    ? raffle.gallery
    : [raffle.image];

  return (
    <main className="relative mx-auto w-full max-w-7xl px-4 py-6 md:px-8 md:py-10">
      {/* ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px] overflow-hidden"
      >
        <motion.div
          initial={{ opacity: 0.4 }}
          animate={{ opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-32 left-1/2 h-[420px] w-[820px] -translate-x-1/2 rounded-full bg-primary/30 blur-[140px]"
        />
      </div>

      {/* breadcrumb */}
      <Link
        to="/club/raffles"
        className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowLeft className="h-3 w-3" />к розыгрышам
      </Link>

      <AnimatePresence>
        {flash && (
          <motion.div
            initial={{ y: -8, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -8, opacity: 0 }}
            className="fixed left-1/2 top-20 z-50 -translate-x-1/2 border border-primary/40 bg-black/80 px-5 py-2 font-mono text-[11px] uppercase tracking-[0.22em] text-primary shadow-[0_0_36px_-8px_var(--primary)] backdrop-blur"
          >
            <Sparkles className="mr-2 inline h-3 w-3" />
            {flash}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        {/* main column */}
        <div className="min-w-0 space-y-6">
          <Gallery images={gallery} title={raffle.title} />

          <HeaderBlock raffle={raffle} totalFund={totalFund} />

          {raffle.description && (
            <Section title="Описание">
              <div className="space-y-4 text-[15px] leading-relaxed text-muted-foreground">
                {raffle.description.split("\n\n").map((p, i) => (
                  <p key={i} className="text-foreground/85">
                    {p}
                  </p>
                ))}
              </div>
            </Section>
          )}

          {raffle.prizes && raffle.prizes.length > 0 && (
            <Section
              title="Что разыгрываем"
              count={`${raffle.prizes.length} приз${
                raffle.prizes.length === 1
                  ? ""
                  : raffle.prizes.length < 5
                    ? "а"
                    : "ов"
              }`}
            >
              <div className="space-y-3">
                {raffle.prizes.map((p, i) => (
                  <PrizeRow key={i} prize={p} />
                ))}
              </div>
            </Section>
          )}

          {raffle.specs && raffle.specs.length > 0 && (
            <Section title="Характеристики">
              <dl className="grid grid-cols-1 divide-y divide-white/[0.06] border border-white/[0.06] sm:grid-cols-2 sm:divide-y-0">
                {raffle.specs.map((s, i) => (
                  <div
                    key={i}
                    className="flex items-baseline justify-between gap-4 border-white/[0.06] px-4 py-3 sm:[&:nth-child(odd)]:border-r sm:[&:nth-child(n+3)]:border-t"
                  >
                    <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                      {s.label}
                    </dt>
                    <dd className="text-right text-sm font-semibold text-foreground">
                      {s.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </Section>
          )}

          {raffle.rules && raffle.rules.length > 0 && (
            <Section title="Как это работает">
              <ul className="space-y-2.5">
                {raffle.rules.map((r, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-3 text-[14px] leading-relaxed text-foreground/85"
                  >
                    <div className="mt-1.5 flex h-4 w-4 shrink-0 items-center justify-center border border-primary/40 bg-primary/10">
                      <Check className="h-2.5 w-2.5 text-primary" />
                    </div>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>

        {/* sticky stake panel */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <StakePanel
            raffle={raffle}
            balance={balance}
            stake={stake}
            odds={odds}
            onStakeChange={(v) =>
              setStake(Math.max(0, Math.min(balance, v)))
            }
            onStake={handleStake}
          />
        </aside>
      </div>
    </main>
  );
}

// ───────── Gallery ─────────

function Gallery({ images, title }: { images: string[]; title: string }) {
  const [idx, setIdx] = useState(0);
  const prev = () => setIdx((i) => (i - 1 + images.length) % images.length);
  const next = () => setIdx((i) => (i + 1) % images.length);

  return (
    <div className="space-y-3">
      <div className="relative h-[280px] overflow-hidden border border-white/[0.08] bg-card/40 md:h-[460px]">
        <AnimatePresence mode="wait">
          <motion.img
            key={idx}
            src={images[idx]}
            alt={`${title} — фото ${idx + 1}`}
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="absolute inset-0 h-full w-full object-cover"
          />
        </AnimatePresence>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />

        {/* scanlines */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, white 0 1px, transparent 1px 3px)",
          }}
        />

        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              className="absolute left-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center border border-white/[0.15] bg-black/50 text-foreground backdrop-blur transition-all hover:border-primary hover:bg-primary/20"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={next}
              className="absolute right-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center border border-white/[0.15] bg-black/50 text-foreground backdrop-blur transition-all hover:border-primary hover:bg-primary/20"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5">
              {images.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIdx(i)}
                  className={`h-1 transition-all ${
                    i === idx ? "w-8 bg-primary" : "w-4 bg-white/30 hover:bg-white/60"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {images.length > 1 && (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
          {images.map((src, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIdx(i)}
              className={`relative aspect-square overflow-hidden border transition-all ${
                i === idx
                  ? "border-primary shadow-[0_0_20px_-6px_var(--primary)]"
                  : "border-white/[0.08] opacity-60 hover:opacity-100"
              }`}
            >
              <img
                src={src}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ───────── Header block ─────────

function HeaderBlock({
  raffle,
  totalFund,
}: {
  raffle: ActiveTicket;
  totalFund: number | null;
}) {
  return (
    <section>
      <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.24em] text-primary">
        <Flame className="h-3 w-3" />
        live арена
      </div>
      <h1 className="mt-2 font-display text-4xl font-black uppercase italic leading-none tracking-tight text-foreground md:text-5xl">
        {raffle.title}
      </h1>
      {raffle.subtitle && (
        <p className="mt-2 font-mono text-[12px] uppercase tracking-[0.18em] text-muted-foreground">
          {raffle.subtitle}
        </p>
      )}

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="до закрытия" valueNode={
          <Countdown deadlineAt={raffle.deadlineAt} compact />
        } />
        <Stat label="мои билеты" value={String(raffle.myTickets)} />
        <Stat
          label="всего билетов"
          value={raffle.totalTickets.toLocaleString("ru-RU")}
        />
        {totalFund ? (
          <Stat
            label="призовой фонд"
            value={`${totalFund.toLocaleString("ru-RU")} ₽`}
            accent
          />
        ) : (
          <Stat
            label="призов"
            value={String(raffle.prizes?.length ?? 1)}
            accent
          />
        )}
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  valueNode,
  accent,
}: {
  label: string;
  value?: string;
  valueNode?: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="border border-white/[0.06] bg-black/30 px-3 py-2.5">
      <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </div>
      <div
        className={`mt-1 font-display text-xl font-black tabular-nums ${
          accent ? "text-primary" : "text-foreground"
        }`}
      >
        {valueNode ?? value}
      </div>
    </div>
  );
}

// ───────── Section wrapper ─────────

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4 }}
      className="border-t border-white/[0.06] pt-5"
    >
      <div className="mb-4 flex items-end justify-between gap-3 border-b border-white/[0.06] pb-2">
        <h2 className="font-display text-xl font-black uppercase italic tracking-tight text-foreground">
          {title}
        </h2>
        {count && (
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            {count}
          </span>
        )}
      </div>
      {children}
    </motion.section>
  );
}

// ───────── Prize row ─────────

function PrizeRow({ prize }: { prize: NonNullable<ActiveTicket["prizes"]>[number] }) {
  const isMain = prize.place === 1;
  return (
    <motion.div
      whileHover={{ x: 2 }}
      className={`group flex items-stretch gap-4 border bg-card/30 p-3 transition-all ${
        isMain
          ? "border-primary/50 bg-primary/[0.05] shadow-[0_0_28px_-12px_var(--primary)]"
          : "border-white/[0.08] hover:border-primary/40"
      }`}
    >
      <div className="relative h-24 w-24 shrink-0 overflow-hidden border border-white/[0.08] sm:h-28 sm:w-28">
        {prize.image ? (
          <img
            src={prize.image}
            alt={prize.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-black/40">
            <Trophy className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
        <div
          className={`absolute left-1 top-1 flex h-6 min-w-6 items-center justify-center px-1.5 font-mono text-[10px] font-bold ${
            isMain
              ? "border border-primary bg-primary text-primary-foreground"
              : "border border-white/20 bg-black/70 text-foreground"
          }`}
        >
          #{prize.place}
        </div>
      </div>

      <div className="min-w-0 flex-1 self-center">
        <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">
          {isMain ? "главный приз" : `место №${prize.place}`}
        </div>
        <div className="mt-0.5 font-display text-base font-black uppercase italic leading-tight tracking-tight text-foreground sm:text-lg">
          {prize.title}
        </div>
        {prize.note && (
          <div className="mt-1 text-[12px] leading-snug text-muted-foreground">
            {prize.note}
          </div>
        )}
      </div>

      {prize.valueRub && (
        <div className="hidden shrink-0 self-center text-right sm:block">
          <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
            оценка
          </div>
          <div className="mt-0.5 font-display text-base font-black tabular-nums text-primary">
            {prize.valueRub.toLocaleString("ru-RU")} ₽
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ───────── Stake panel ─────────

function StakePanel({
  raffle,
  balance,
  stake,
  odds,
  onStakeChange,
  onStake,
}: {
  raffle: ActiveTicket;
  balance: number;
  stake: number;
  odds: number;
  onStakeChange: (v: number) => void;
  onStake: () => void;
}) {
  return (
    <div className="relative overflow-hidden border border-primary/30 bg-card/40 p-5">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-primary/40 blur-3xl"
      />
      <div className="relative">
        <div className="flex items-center justify-between">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            поставить билеты
          </div>
          <div className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.2em] text-foreground">
            <Ticket className="h-3 w-3 text-primary" />
            {balance}
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <StakeBtn
            onClick={() => onStakeChange(stake - 1)}
            disabled={stake <= 0}
          >
            <Minus className="h-4 w-4" />
          </StakeBtn>
          <div className="flex-1 text-center font-display text-4xl font-black italic tabular-nums text-foreground">
            {stake}
          </div>
          <StakeBtn
            onClick={() => onStakeChange(stake + 1)}
            disabled={stake >= balance}
          >
            <Plus className="h-4 w-4" />
          </StakeBtn>
        </div>

        <div className="mt-2 flex justify-between gap-2">
          {[1, 5, balance].map((v, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onStakeChange(v)}
              disabled={v <= 0 || v > balance}
              className="flex-1 border border-white/[0.08] py-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary disabled:opacity-30"
            >
              {i === 2 ? "max" : `×${v}`}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onStake}
          disabled={stake <= 0 || stake > balance}
          className="group/btn relative mt-4 flex w-full items-center justify-center gap-2 overflow-hidden bg-primary py-3 font-display text-sm font-black uppercase italic tracking-widest text-primary-foreground transition-all hover:shadow-[0_0_32px_-4px_var(--primary)] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
        >
          <span className="relative z-10 flex items-center gap-2">
            <Zap className="h-4 w-4" />
            поставить
          </span>
          <motion.div
            aria-hidden
            className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent"
            animate={
              stake > 0 && stake <= balance
                ? { x: ["-100%", "200%"] }
                : {}
            }
            transition={{
              duration: 1.6,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        </button>

        {/* odds + countdown */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="border border-white/[0.06] bg-black/30 px-3 py-2">
            <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
              мой шанс
            </div>
            <div className="mt-0.5 font-display text-lg font-black tabular-nums text-primary">
              {odds.toFixed(odds < 1 ? 2 : 1)}%
            </div>
          </div>
          <div className="border border-white/[0.06] bg-black/30 px-3 py-2">
            <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
              до закрытия
            </div>
            <div className="mt-0.5 font-display text-lg font-black tabular-nums text-foreground">
              <Countdown deadlineAt={raffle.deadlineAt} compact />
            </div>
          </div>
        </div>

        <Link
          to="/club/raffles"
          className="mt-4 flex items-center justify-center gap-2 border border-white/[0.08] py-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
        >
          <Info className="h-3 w-3" />
          купить ещё билетов
        </Link>
      </div>
    </div>
  );
}

function StakeBtn({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex h-10 w-10 items-center justify-center border border-white/[0.10] text-muted-foreground transition-all hover:border-primary/60 hover:bg-primary/10 hover:text-primary active:scale-90 disabled:opacity-30"
    >
      {children}
    </button>
  );
}
