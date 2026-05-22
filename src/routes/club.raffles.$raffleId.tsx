import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Calendar, Check, Minus, Plus, Ticket, Zap } from "lucide-react";
import { Countdown } from "@/components/club/Countdown";
import { ACTIVE_TICKETS, type ActiveTicket } from "@/data/profile";
import { TICKET_LEDGER, summarizeLedger } from "@/data/tickets-ledger";
import { useIsMobile } from "@/hooks/use-mobile";

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
        className="mt-6 inline-flex items-center gap-2 rounded-xl border border-primary/40 px-4 py-2 font-mono text-xs uppercase tracking-wider text-primary active:scale-95"
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
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function RaffleDetailContent({ raffle }: { raffle: ActiveTicket }) {
  const initialBalance = summarizeLedger(TICKET_LEDGER).balance;
  const [balance, setBalance] = useState(initialBalance);
  const [myTickets, setMyTickets] = useState(raffle.myTickets);
  const [stake, setStake] = useState(0);
  const [flash, setFlash] = useState<string | null>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!flash) return;
    const id = setTimeout(() => setFlash(null), 2000);
    return () => clearTimeout(id);
  }, [flash]);

  const handleStake = () => {
    if (stake <= 0 || stake > balance) return;
    setBalance((b) => b - stake);
    setMyTickets((m) => m + stake);
    setFlash(`Поставлено ×${stake}`);
    setStake(0);
  };

  return (
    <main className="relative mx-auto w-full max-w-3xl px-4 py-5 md:py-8">
      {/* back link */}
      <Link
        to="/club/raffles"
        className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground active:opacity-60"
      >
        <ArrowLeft className="h-3.5 w-3.5" />к розыгрышам
      </Link>

      {/* flash */}
      {flash && (
        <div className="fixed left-1/2 top-16 z-50 -translate-x-1/2 rounded-xl border border-emerald-500/40 bg-black/85 px-4 py-2 font-mono text-[12px] uppercase tracking-wider text-emerald-300 shadow-lg backdrop-blur">
          <Check className="mr-1.5 inline h-3.5 w-3.5" />
          {flash}
        </div>
      )}

      {/* image */}
      <div className="mt-4 overflow-hidden rounded-2xl border border-white/[0.08] bg-card/40">
        <div className="relative aspect-[16/10] overflow-hidden bg-black">
          <img
            src={raffle.image}
            alt={raffle.title}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-primary px-2.5 py-1 font-mono text-[10px] font-black uppercase tracking-wider text-primary-foreground">
            <span className="h-1 w-1 animate-pulse rounded-full bg-white" />
            LIVE
          </span>
        </div>
      </div>

      {/* title + meta */}
      <section className="mt-5">
        <h1 className="font-display text-3xl font-black uppercase italic leading-tight tracking-tight text-foreground md:text-4xl">
          {raffle.title}
        </h1>
        {raffle.subtitle && (
          <p className="mt-1.5 text-[14px] text-muted-foreground">{raffle.subtitle}</p>
        )}
        <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/[0.08] px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-primary">
          <Calendar className="h-3 w-3" />
          до {formatDeadline(raffle.deadlineAt)}
        </div>
      </section>

      {/* status row — мои билеты + countdown */}
      <section className="mt-4 grid grid-cols-2 gap-2">
        <StatTile
          label="Мои билеты"
          value={
            <span className="flex items-baseline gap-1.5">
              <Ticket className="h-4 w-4 self-center text-primary" />
              <span className="tabular-nums">{myTickets}</span>
            </span>
          }
        />
        <StatTile
          label="До закрытия"
          value={<Countdown deadlineAt={raffle.deadlineAt} compact />}
        />
      </section>

      {/* desktop stake panel */}
      {!isMobile && (
        <section className="mt-5 rounded-2xl border border-primary/30 bg-card/40 p-4">
          <StakeControls
            balance={balance}
            stake={stake}
            onStakeChange={(v) => setStake(Math.max(0, Math.min(balance, v)))}
            onStake={handleStake}
          />
        </section>
      )}

      {/* description */}
      {raffle.description && (
        <section className="mt-6 space-y-3.5 text-[15px] leading-relaxed">
          {raffle.description.split("\n\n").map((p, i) => (
            <p key={i} className="text-foreground/85">
              {p}
            </p>
          ))}
        </section>
      )}

      {/* specs */}
      {raffle.specs && raffle.specs.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 px-1 font-display text-sm font-black uppercase italic tracking-widest text-foreground">
            Характеристики
          </h2>
          <ul className="overflow-hidden rounded-2xl border border-white/[0.06] bg-card/40 divide-y divide-white/[0.05]">
            {raffle.specs.map((s) => (
              <li key={s.label} className="flex items-center justify-between gap-3 px-4 py-3 text-[14px]">
                <span className="text-muted-foreground">{s.label}</span>
                <span className="text-right font-semibold text-foreground">{s.value}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* rules */}
      {raffle.rules && raffle.rules.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 px-1 font-display text-sm font-black uppercase italic tracking-widest text-foreground">
            Условия
          </h2>
          <ul className="overflow-hidden rounded-2xl border border-white/[0.06] bg-card/40 divide-y divide-white/[0.05]">
            {raffle.rules.map((r, i) => (
              <li key={i} className="flex items-start gap-3 px-4 py-3 text-[14px]">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                <span className="text-foreground/85">{r}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* mobile padding so sticky bar doesn't cover content */}
      {isMobile && <div aria-hidden className="h-44" />}

      {/* mobile sticky stake bar */}
      {isMobile && (
        <div
          className="fixed inset-x-0 z-30 border-t border-white/[0.08] bg-[#0d0d0d]/95 px-4 py-3 backdrop-blur"
          style={{
            bottom: "calc(52px + env(safe-area-inset-bottom))",
            paddingBottom: "calc(12px + env(safe-area-inset-bottom) * 0)",
          }}
        >
          <StakeControls
            balance={balance}
            stake={stake}
            onStakeChange={(v) => setStake(Math.max(0, Math.min(balance, v)))}
            onStake={handleStake}
            compact
          />
        </div>
      )}
    </main>
  );
}

function StatTile({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-card/40 px-4 py-3">
      <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 font-display text-xl font-black italic tabular-nums text-foreground">
        {value}
      </div>
    </div>
  );
}

function StakeControls({
  balance,
  stake,
  onStakeChange,
  onStake,
  compact = false,
}: {
  balance: number;
  stake: number;
  onStakeChange: (v: number) => void;
  onStake: () => void;
  compact?: boolean;
}) {
  const presets = [1, 5, balance].filter((v, i, arr) => v > 0 && arr.indexOf(v) === i);
  const noBalance = balance <= 0;
  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Поставить билеты
        </div>
        <div className="flex items-center gap-1 font-mono text-[11px] uppercase tracking-wider text-foreground">
          <Ticket className="h-3.5 w-3.5 text-primary" />
          <span className="tabular-nums">{balance}</span>
        </div>
      </div>

      <div className={`mt-2 flex items-center gap-3 ${compact ? "" : "py-1"}`}>
        <StepBtn onClick={() => onStakeChange(stake - 1)} disabled={stake <= 0}>
          <Minus className="h-4 w-4" />
        </StepBtn>
        <div className="flex-1 text-center font-display text-3xl font-black italic leading-none tabular-nums text-foreground">
          {stake}
        </div>
        <StepBtn onClick={() => onStakeChange(stake + 1)} disabled={stake >= balance}>
          <Plus className="h-4 w-4" />
        </StepBtn>
      </div>

      <div className="mt-2 flex gap-1.5">
        {presets.map((v, i) => (
          <button
            key={`${v}-${i}`}
            type="button"
            onClick={() => onStakeChange(v)}
            disabled={v > balance}
            className="flex-1 rounded-lg border border-white/[0.08] bg-white/[0.02] py-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground transition-colors active:bg-white/[0.06] disabled:opacity-30"
          >
            {i === presets.length - 1 && v === balance && v > 1 ? "MAX" : `×${v}`}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={onStake}
        disabled={stake <= 0 || stake > balance}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-display text-[15px] font-black uppercase italic tracking-wider text-primary-foreground transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Zap className="h-4 w-4" />
        Поставить
      </button>

      {noBalance && (
        <Link
          to="/club/tickets"
          className="mt-2 block text-center font-mono text-[11px] uppercase tracking-wider text-primary active:opacity-60"
        >
          Билетов нет — как их набрать →
        </Link>
      )}

    </div>
  );
}

function StepBtn({
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
      className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.1] bg-white/[0.02] text-foreground transition-all active:scale-90 disabled:opacity-30"
    >
      {children}
    </button>
  );
}
