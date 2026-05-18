import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Ticket, Zap, Plus, Minus, Sparkles, Calendar } from "lucide-react";
import { Countdown } from "@/components/club/Countdown";
import { ACTIVE_TICKETS, ME, type ActiveTicket } from "@/data/profile";

export const Route = createFileRoute("/club/raffles/$raffleId")({
  head: ({ params }) => {
    const raffle = ACTIVE_TICKETS.find((r) => r.id === params.raffleId);
    return {
      meta: [
        { title: `${raffle?.title ?? "Розыгрыш"} · HELLHOUND` },
        { name: "description", content: raffle?.subtitle ?? "Розыгрыш клуба HELLHOUND Racing." },
        { name: "robots", content: "noindex" },
      ],
    };
  },
  notFoundComponent: () => <NotFound />,
  component: RaffleDetailPage,
});

function NotFound() {
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

function RaffleDetailPage() {
  const { raffleId } = Route.useParams();
  const raffle = ACTIVE_TICKETS.find((r) => r.id === raffleId);
  if (!raffle) return <NotFound />;
  return <RaffleDetailContent raffle={raffle} />;
}

function formatDeadline(iso: string) {
  try {
    return new Date(iso).toLocaleString("ru-RU", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
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

  const handleStake = () => {
    if (stake <= 0 || stake > balance) return;
    setBalance((b) => b - stake);
    setFlash(`Поставлено ×${stake}`);
    setStake(0);
    setTimeout(() => setFlash(null), 2200);
  };

  return (
    <main className="relative mx-auto w-full max-w-5xl px-4 py-6 md:px-8 md:py-10">
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
        <div className="min-w-0 space-y-6">
          {/* one photo */}
          <motion.div
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="relative h-[280px] overflow-hidden border border-white/[0.08] bg-card/40 md:h-[460px]"
          >
            <img
              src={raffle.image}
              alt={raffle.title}
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-[0.06]"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(0deg, white 0 1px, transparent 1px 3px)",
              }}
            />
          </motion.div>

          {/* title + deadline */}
          <section>
            <h1 className="font-display text-4xl font-black uppercase italic leading-none tracking-tight text-foreground md:text-5xl">
              {raffle.title}
            </h1>
            <div className="mt-3 inline-flex items-center gap-2 border border-primary/30 bg-primary/[0.06] px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-primary">
              <Calendar className="h-3 w-3" />
              до {formatDeadline(raffle.deadlineAt)}
            </div>
          </section>

          {/* description */}
          {raffle.description && (
            <section className="space-y-4 text-[15px] leading-relaxed">
              {raffle.description.split("\n\n").map((p, i) => (
                <p key={i} className="text-foreground/85">
                  {p}
                </p>
              ))}
            </section>
          )}
        </div>

        {/* stake panel */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <StakePanel
            raffle={raffle}
            balance={balance}
            stake={stake}
            odds={odds}
            onStakeChange={(v) => setStake(Math.max(0, Math.min(balance, v)))}
            onStake={handleStake}
          />
        </aside>
      </div>
    </main>
  );
}

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
          <StakeBtn onClick={() => onStakeChange(stake - 1)} disabled={stake <= 0}>
            <Minus className="h-4 w-4" />
          </StakeBtn>
          <div className="flex-1 text-center font-display text-4xl font-black italic tabular-nums text-foreground">
            {stake}
          </div>
          <StakeBtn onClick={() => onStakeChange(stake + 1)} disabled={stake >= balance}>
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
            animate={stake > 0 && stake <= balance ? { x: ["-100%", "200%"] } : {}}
            transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
          />
        </button>

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
