import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import { motion, AnimatePresence } from "framer-motion";
import {
  Ticket,
  Flame,
  Trophy,
  Plus,
  Minus,
  Sparkles,
  Check,
  ChevronRight,
  Zap,
  ExternalLink,
} from "lucide-react";
import { Countdown } from "@/components/club/Countdown";
import { ACTIVE_TICKETS, ME } from "@/data/profile";
import { PUBLIC_USERS } from "@/data/users";

export const Route = createFileRoute("/club/raffles/")({
  head: () => ({
    meta: [
      { title: "Розыгрыши · HELLHOUND" },
      { name: "description", content: "Активные розыгрыши клуба HELLHOUND Racing." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RafflesPage,
});

// ───────── Mock data ─────────

const TICKET_PACKS = [
  { id: "p1", count: 1, price: 300 },
  { id: "p2", count: 3, price: 500, tag: "−45%" },
  { id: "p3", count: 5, price: 700, tag: "−54%" },
  { id: "p4", count: 10, price: 1000, hot: true, tag: "−67%" },
  { id: "p5", count: 20, price: 1500, tag: "−75%" },
  { id: "p6", count: 50, price: 3000, tag: "−80%" },
];

type Past = {
  id: string;
  title: string;
  date: string;
  winnerSlug: string;
  total: number;
  image: string;
};

const PAST_RAFFLES: Past[] = [
  {
    id: "h1",
    title: "Kawasaki ZX-6R",
    date: "март 2026",
    winnerSlug: "captain_volk",
    total: 2840,
    image:
      "https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=800&q=80",
  },
  {
    id: "h2",
    title: "Шлем Arai RX-7V",
    date: "февр 2026",
    winnerSlug: "tankslapper",
    total: 1120,
    image:
      "https://images.unsplash.com/photo-1599839575945-a9e5af0c3fa5?w=800&q=80",
  },
  {
    id: "h3",
    title: "Перчатки HELLHOUND v1",
    date: "янв 2026",
    winnerSlug: "asphalt_dog",
    total: 640,
    image:
      "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=800&q=80",
  },
  {
    id: "h4",
    title: "GoPro Hero 11",
    date: "дек 2025",
    winnerSlug: "moto_anya",
    total: 480,
    image:
      "https://images.unsplash.com/photo-1502945015378-0e284ca1a5be?w=800&q=80",
  },
];

// ───────── Page ─────────

function RafflesPage() {
  const [balance, setBalance] = useState(ME.totals.tickets);
  const [selectedId, setSelectedId] = useState<string>(ACTIVE_TICKETS[0].id);
  const [stake, setStake] = useState<number>(0);
  const [flash, setFlash] = useState<string | null>(null);
  const [cart, setCart] = useState<Record<string, number>>({});

  const featured = ACTIVE_TICKETS[0];
  const others = ACTIVE_TICKETS.slice(1);
  const selected =
    ACTIVE_TICKETS.find((r) => r.id === selectedId) ?? featured;

  const cartTotalTickets = useMemo(() => {
    return Object.entries(cart).reduce((sum, [id, qty]) => {
      const pack = TICKET_PACKS.find((p) => p.id === id);
      return sum + (pack ? pack.count * qty : 0);
    }, 0);
  }, [cart]);

  const cartTotalPrice = useMemo(() => {
    return Object.entries(cart).reduce((sum, [id, qty]) => {
      const pack = TICKET_PACKS.find((p) => p.id === id);
      return sum + (pack ? pack.price * qty : 0);
    }, 0);
  }, [cart]);

  const handleAddPack = (id: string) => {
    setCart((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
  };

  const handleRemovePack = (id: string) => {
    setCart((prev) => {
      const next = { ...prev };
      if (next[id] > 1) next[id] -= 1;
      else delete next[id];
      return next;
    });
  };

  const handleCheckout = () => {
    if (cartTotalTickets <= 0) return;
    setBalance((b) => b + cartTotalTickets);
    setFlash(
      `+${cartTotalTickets} билет${cartTotalTickets === 1 ? "" : cartTotalTickets < 5 ? "а" : "ов"} куплено`
    );
    setCart({});
    setTimeout(() => setFlash(null), 2000);
  };

  const handleStake = () => {
    if (stake <= 0 || stake > balance) return;
    setBalance((b) => b - stake);
    setFlash(`Поставлено ×${stake} на ${selected.title}`);
    setStake(0);
    setTimeout(() => setFlash(null), 2200);
  };

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

      <Header balance={balance} />

      {/* flash toast */}
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

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-6">
          <FeaturedRaffle
            raffle={selected}
            balance={balance}
            stake={stake}
            onStakeChange={(v) =>
              setStake(Math.max(0, Math.min(balance, v)))
            }
            onStake={handleStake}
          />

          {others.length > 0 && (
            <section>
              <SectionTitle>Активные розыгрыши</SectionTitle>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {others.map((r) => (
                  <MiniRaffle key={r.id} raffle={r} />
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <TicketStore
            balance={balance}
            cart={cart}
            totalTickets={cartTotalTickets}
            totalPrice={cartTotalPrice}
            onAdd={handleAddPack}
            onRemove={handleRemovePack}
            onCheckout={handleCheckout}
          />
        </aside>
      </div>

      <PastRaffles items={PAST_RAFFLES} />
    </main>
  );
}

// ───────── Header ─────────

function Header({ balance }: { balance: number }) {
  return (
    <div className="flex flex-col items-start justify-between gap-3 border-b border-white/[0.06] pb-4 md:flex-row md:items-end">
      <div>
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.24em] text-primary">
          <Flame className="h-3 w-3" />
          live арена
        </div>
        <h1 className="mt-2 font-display text-3xl font-black uppercase italic tracking-tight text-foreground md:text-4xl">
          Розыгрыши
        </h1>
      </div>
      <BalancePill balance={balance} />
    </div>
  );
}

function BalancePill({ balance }: { balance: number }) {
  return (
    <motion.div
      key={balance}
      initial={{ scale: 0.96 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 280, damping: 18 }}
      className="relative overflow-hidden border border-primary/30 bg-gradient-to-br from-primary/15 via-black to-black px-4 py-2"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "repeating-linear-gradient(135deg, color-mix(in oklab, var(--primary) 35%, transparent) 0 1px, transparent 1px 10px)",
        }}
      />
      <div className="relative flex items-center gap-3">
        <Ticket className="h-5 w-5 text-primary" />
        <div className="leading-tight">
          <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">
            мой баланс
          </div>
          <div className="font-display text-2xl font-black tabular-nums text-foreground">
            {balance}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ───────── Featured raffle ─────────

function FeaturedRaffle({
  raffle,
  balance,
  stake,
  onStakeChange,
  onStake,
}: {
  raffle: (typeof ACTIVE_TICKETS)[number];
  balance: number;
  stake: number;
  onStakeChange: (v: number) => void;
  onStake: () => void;
}) {
  const odds =
    raffle.myTickets + stake > 0
      ? ((raffle.myTickets + stake) / raffle.totalTickets) * 100
      : 0;

  return (
    <motion.section
      layout
      className="group relative overflow-hidden border border-white/[0.08] bg-card/40"
    >
      {/* image */}
      <div className="relative h-[200px] overflow-hidden sm:h-[280px] md:h-[420px]">
        <img
          key={raffle.id}
          src={raffle.image}
          alt={raffle.title}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
        <div
          aria-hidden
          className="absolute inset-0 mix-blend-overlay opacity-40"
          style={{
            background:
              "radial-gradient(60% 80% at 50% 100%, color-mix(in oklab, var(--primary) 60%, transparent), transparent 60%)",
          }}
        />

        {/* scanlines */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, white 0 1px, transparent 1px 3px)",
          }}
        />

        {/* corner tag */}
        <div className="absolute left-5 top-5 flex items-center gap-2 border border-primary/40 bg-black/60 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-primary backdrop-blur">
          <motion.span
            animate={{ opacity: [1, 0.2, 1] }}
            transition={{ duration: 1.4, repeat: Infinity }}
            className="h-1.5 w-1.5 rounded-full bg-primary"
          />
          идёт сейчас
        </div>

        {/* title block */}
        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-8">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground md:text-[11px] md:tracking-[0.24em]">
            до закрытия
          </div>
          <div className="mt-1">
            <Countdown deadlineAt={raffle.deadlineAt} variant="tactical" />
          </div>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
            <h2 className="font-display text-2xl font-black uppercase italic leading-none tracking-tight text-foreground sm:text-3xl md:text-5xl">
              {raffle.title}
            </h2>
            <Link
              to="/club/raffles/$raffleId"
              params={{ raffleId: raffle.id }}
              className="group/link inline-flex items-center gap-2 border border-primary/40 bg-black/60 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-primary backdrop-blur transition-all hover:border-primary hover:bg-primary/10 hover:shadow-[0_0_24px_-6px_var(--primary)] md:px-4 md:py-2"
            >
              подробнее
              <ExternalLink className="h-3 w-3 transition-transform group-hover/link:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* body */}
      <div className="grid grid-cols-1 gap-5 p-4 md:grid-cols-[1fr_auto] md:gap-6 md:p-8">
        {/* stats */}
        <div className="min-w-0 space-y-5">

          <div className="grid grid-cols-3 gap-2 md:gap-3">
            <Stat label="мои билеты" value={String(raffle.myTickets)} />
            <Stat
              label="ставлю"
              value={stake > 0 ? `+${stake}` : "0"}
              accent={stake > 0}
            />
            <Stat
              label="мой шанс"
              value={`${odds.toFixed(odds < 1 ? 2 : 1)}%`}
              accent
            />
          </div>
        </div>

        {/* stake panel */}
        <div className="md:w-[280px]">
          <div className="relative overflow-hidden border border-primary/30 bg-black p-4">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-primary/40 blur-3xl"
            />
            <div className="relative">
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                поставить билеты
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
              <div className="mt-2 text-center font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                в балансе: <span className="text-foreground">{balance}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="border border-white/[0.06] bg-black/30 px-3 py-2.5">
      <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </div>
      <div
        key={value}
        className={`mt-1 font-display text-xl font-black tabular-nums ${
          accent ? "text-primary" : "text-foreground"
        }`}
      >
        {value}
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

// ───────── Mini raffle card ─────────

function MiniRaffle({
  raffle,
}: {
  raffle: (typeof ACTIVE_TICKETS)[number];
}) {
  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="group relative overflow-hidden border border-white/[0.08] bg-card/30 transition-all hover:border-primary/40"
    >
      <Link
        to="/club/raffles/$raffleId"
        params={{ raffleId: raffle.id }}
        className="block"
      >
        <div className="relative h-32 overflow-hidden">
          <img
            src={raffle.image}
            alt={raffle.title}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
          <div className="absolute bottom-2 left-3 right-3 flex items-end justify-between">
            <h3 className="font-display text-base font-black uppercase italic leading-tight tracking-tight text-foreground">
              {raffle.title}
            </h3>
            <ChevronRight className="h-4 w-4 shrink-0 text-primary opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
        </div>
        <div className="space-y-2 p-3">
          <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            <span>
              мои: <span className="text-foreground">{raffle.myTickets}</span>
            </span>
            <Countdown deadlineAt={raffle.deadlineAt} compact />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

// ───────── Ticket store ─────────

function TicketStore({
  balance,
  cart,
  totalTickets,
  totalPrice,
  onAdd,
  onRemove,
  onCheckout,
}: {
  balance: number;
  cart: Record<string, number>;
  totalTickets: number;
  totalPrice: number;
  onAdd: (id: string) => void;
  onRemove: (id: string) => void;
  onCheckout: () => void;
}) {
  const hasItems = totalTickets > 0;
  return (
    <div className="relative overflow-hidden border border-white/[0.08] bg-card/40 p-5">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/30 blur-3xl"
      />
      <div className="relative">
        <SectionTitle small>Купить билеты</SectionTitle>
        <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          1 билет = 1 шанс
        </div>

        <div className="mt-4 space-y-2">
          {TICKET_PACKS.map((p, i) => (
            <PackRow
              key={p.id}
              pack={p}
              index={i}
              qty={cart[p.id] || 0}
              onAdd={() => onAdd(p.id)}
              onRemove={() => onRemove(p.id)}
            />
          ))}
        </div>

        {/* totals + checkout */}
        <div
          className={`mt-4 border-t border-white/[0.06] pt-4 transition-all ${
            hasItems ? "opacity-100" : "opacity-60"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              к покупке
            </div>
            <div className="font-display text-lg font-black italic tabular-nums text-foreground">
              {totalTickets}
            </div>
          </div>
          <div className="mt-1 flex items-center justify-between">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              сумма
            </div>
            <div className="font-display text-lg font-black italic tabular-nums text-primary">
              {totalPrice.toLocaleString("ru-RU")} ₽
            </div>
          </div>

          <motion.button
            type="button"
            onClick={onCheckout}
            disabled={!hasItems}
            whileTap={{ scale: 0.97 }}
            className="group relative mt-4 flex w-full items-center justify-center gap-2 overflow-hidden bg-primary py-3 font-display text-sm font-black uppercase italic tracking-widest text-primary-foreground transition-all hover:shadow-[0_0_32px_-4px_var(--primary)] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
          >
            <span className="relative z-10 flex items-center gap-2">
              <Zap className="h-4 w-4" />
              купить
            </span>
            {hasItems && (
              <motion.div
                aria-hidden
                className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent"
                animate={{ x: ["-100%", "200%"] }}
                transition={{
                  duration: 1.6,
                  repeat: Infinity,
                  ease: "linear",
                }}
              />
            )}
          </motion.button>

          <div className="mt-3 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            баланс: <span className="text-primary">{balance}</span> билет
            {balance === 1 ? "" : "а"}
          </div>
        </div>
      </div>
    </div>
  );
}

function PackRow({
  pack,
  index,
  qty,
  onAdd,
  onRemove,
}: {
  pack: (typeof TICKET_PACKS)[number];
  index: number;
  qty: number;
  onAdd: () => void;
  onRemove: () => void;
}) {
  const active = qty > 0;
  return (
    <div
      className={`group flex items-center justify-between gap-2 border px-3 py-2.5 transition-all ${
        active
          ? "border-primary/60 bg-primary/[0.08] shadow-[0_0_20px_-6px_var(--primary)]"
          : pack.hot
            ? "border-primary/50 bg-primary/[0.06] hover:border-primary"
            : "border-white/[0.08] bg-black/30 hover:border-primary/40 hover:bg-primary/[0.04]"
      }`}
    >
      <button
        type="button"
        onClick={onAdd}
        className="flex flex-1 items-center gap-3 text-left"
      >
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center border ${
            active
              ? "border-primary/80 bg-primary/20 text-primary"
              : pack.hot
                ? "border-primary/60 bg-primary/10 text-primary"
                : "border-white/[0.10] text-muted-foreground group-hover:text-primary"
          }`}
        >
          <Ticket className="h-4 w-4" />
        </div>
        <div className="leading-tight">
          <div className="font-display text-lg font-black tabular-nums text-foreground">
            ×{pack.count}
          </div>
          {pack.tag && (
            <div className="font-mono text-[9px] uppercase tracking-wider text-primary">
              {pack.tag}
            </div>
          )}
        </div>
      </button>

      <div className="flex items-center gap-2">
        {active && (
          <>
            <button
              type="button"
              onClick={onRemove}
              className="flex h-7 w-7 items-center justify-center border border-white/[0.10] text-muted-foreground transition-all hover:border-primary/60 hover:text-primary"
            >
              <Minus className="h-3 w-3" />
            </button>
            <motion.div
              key={qty}
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="min-w-[1.5rem] text-center font-display text-base font-black italic tabular-nums text-primary"
            >
              {qty}
            </motion.div>
          </>
        )}
        <div className="text-right">
          <div className="font-display text-sm font-black tabular-nums text-foreground">
            {pack.price.toLocaleString("ru-RU")} ₽
          </div>
          <div
            className={`font-mono text-[9px] uppercase tracking-wider transition-opacity ${
              active ? "text-primary opacity-100" : "text-muted-foreground opacity-0 group-hover:opacity-100"
            }`}
          >
            {active ? "в корзине" : "добавить"}
          </div>
        </div>
      </div>
    </div>
  );
}

// ───────── Past raffles ─────────

function PastRaffles({ items }: { items: Past[] }) {
  return (
    <section className="mt-12 border-t border-white/[0.06] pt-8">
      <div className="flex items-end justify-between border-b border-white/[0.06] pb-3">
        <div>
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
            <Trophy className="h-3 w-3" />
            архив
          </div>
          <h2 className="mt-1 font-display text-2xl font-black uppercase italic tracking-tight text-foreground">
            Прошедшие розыгрыши
          </h2>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          {items.length} итогов
        </span>
      </div>

      <ul className="mt-4 divide-y divide-white/[0.04]">
        {items.map((p, i) => (
          <PastRow key={p.id} item={p} index={i} />
        ))}
      </ul>
    </section>
  );
}

function PastRow({ item, index }: { item: Past; index: number }) {
  const winner = PUBLIC_USERS[item.winnerSlug];
  const winnerNick = winner?.nick ?? item.winnerSlug.toUpperCase();
  return (
    <li
      className="group flex items-center gap-4 py-4 transition-colors hover:bg-white/[0.02]"
    >
      <div className="relative h-16 w-16 shrink-0 overflow-hidden border border-white/[0.08] sm:h-20 sm:w-20">
        <img
          src={item.image}
          alt={item.title}
          loading="lazy"
          className="h-full w-full object-cover grayscale transition-all duration-500 group-hover:grayscale-0 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-black/40 to-transparent" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          {item.date} · {item.total} билетов
        </div>
        <div className="mt-0.5 truncate font-display text-base font-black uppercase italic tracking-tight text-foreground">
          {item.title}
        </div>
      </div>

      <div className="hidden items-center gap-2 sm:flex">
        <div className="flex h-7 w-7 items-center justify-center border border-primary/50 bg-primary/10">
          <Check className="h-3.5 w-3.5 text-primary" />
        </div>
        <div className="leading-tight">
          <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
            забрал
          </div>
          <div className="font-display text-sm font-black uppercase italic tracking-tight text-foreground">
            {winnerNick}
          </div>
        </div>
      </div>

      <div className="min-w-0 max-w-[90px] text-right sm:hidden">
        <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
          забрал
        </div>
        <div className="truncate font-display text-xs font-black uppercase italic tracking-tight text-primary">
          {winnerNick}
        </div>
      </div>
    </li>
  );
}

// ───────── Misc ─────────

function SectionTitle({
  children,
  small,
}: {
  children: React.ReactNode;
  small?: boolean;
}) {
  return (
    <h2
      className={`font-display font-black uppercase italic tracking-tight text-foreground ${
        small ? "text-base" : "text-xl"
      }`}
    >
      {children}
    </h2>
  );
}

// Suppress unused-import warning if reordering
