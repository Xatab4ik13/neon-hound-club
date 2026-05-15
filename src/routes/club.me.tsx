import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ACTIVE_TICKETS,
  GARAGE,
  ME,
  ORDERS,
  RANKS,
  WIN_HISTORY,
  type Order,
} from "@/data/profile";
import { ProfilePlaque } from "./club";
import {
  ArrowRight,
  Bike,
  Calendar,
  MapPin,
  Settings,
  ShoppingBag,
  Ticket,
  Trophy,
} from "lucide-react";

export const Route = createFileRoute("/club/me")({
  head: () => ({
    meta: [
      { title: `Профиль ${ME.nick} — клуб HELLHOUND` },
      { name: "description", content: "Личный кабинет райдера HELLHOUND." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MePage,
});

function MePage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 md:px-8 md:py-10">
      <Dashboard />
      <StatsRow />
      <SectionTickets />
      <SectionOrders />
      <SectionGarage />
    </main>
  );
}

// ---------- Dashboard (приборка) ----------

function Dashboard() {
  const xpPct = Math.round((ME.xp / ME.xpMax) * 100);
  const next = RANKS[ME.rankIndex + 1];

  return (
    <section
      aria-label="Прогресс райдера"
      className="relative mb-8 overflow-hidden border border-white/[0.06] bg-[#0b0b0b]"
    >
      {/* Decor: molten gold (Hell Legend) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 50% 115%, #ffb648 0%, #ff5a00 18%, #7a1a00 40%, transparent 70%)",
          animation: "plaque-lava-pulse 4s ease-in-out infinite",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(2px 60% at 22% 50%, #ffcf6b 0%, transparent 70%), radial-gradient(2px 80% at 58% 60%, #ffb648 0%, transparent 70%), radial-gradient(2px 50% at 82% 40%, #ffe28a 0%, transparent 70%)",
          mixBlendMode: "screen",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(110deg, transparent 0%, transparent 35%, rgba(255, 215, 120, 0.55) 48%, rgba(255, 245, 200, 0.85) 50%, rgba(255, 215, 120, 0.55) 52%, transparent 65%, transparent 100%)",
          backgroundSize: "250% 100%",
          animation: "plaque-gold-sweep 6s linear infinite",
          mixBlendMode: "screen",
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/65 via-transparent to-black/40" />
      {/* Decor: glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/30 blur-[120px]"
      />

      <div className="relative grid gap-8 p-6 md:grid-cols-[auto_1fr] md:p-8">
        {/* Left: avatar + identity */}
        <div className="flex items-center gap-5 md:flex-col md:items-start md:gap-4">
          <div className="relative">
            <div
              aria-hidden
              className="absolute -inset-1 rounded-full bg-primary/30 blur-xl"
              style={{ animation: "xp-pulse 3s ease-in-out infinite" }}
            />
            <div className="relative h-24 w-24 overflow-hidden rounded-full bg-primary ring-4 ring-primary/30 ring-offset-4 ring-offset-[#0b0b0b] md:h-28 md:w-28">
              <div
                aria-hidden
                className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(45deg, #000 0, #000 1px, transparent 0, transparent 50%)",
                  backgroundSize: "5px 5px",
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-display text-3xl font-black italic uppercase text-black md:text-4xl">
                  {ME.nick.slice(0, 2)}
                </span>
              </div>
            </div>
          </div>

          <div className="min-w-0">
            <h1 className="truncate font-display text-2xl font-black italic uppercase tracking-tight text-foreground md:text-3xl">
              {ME.nick}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {ME.city}
              </span>
              <span className="flex items-center gap-1">
                <Bike className="h-3 w-3" />
                {ME.bike}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />в клубе с {ME.joined}
              </span>
            </div>
            <button
              type="button"
              className="mt-3 inline-flex items-center gap-1.5 border border-white/[0.08] px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:border-primary/60 hover:text-primary"
            >
              <Settings className="h-3 w-3" />
              Настройки
            </button>
          </div>
        </div>

        {/* Right: rank ladder + xp meter */}
        <div className="flex flex-col justify-center">
          <div className="mb-3 flex items-baseline justify-between">
            <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              Ранг
            </span>
            {next && (
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                до{" "}
                <span className="font-bold text-primary">{next}</span> ·{" "}
                <span className="font-bold tabular-nums text-foreground">
                  {ME.xpMax - ME.xp}
                </span>{" "}
                XP
              </span>
            )}
          </div>

          <RankLadder />

          <div className="mt-5">
            <div className="relative h-3 overflow-hidden rounded-sm bg-neutral-900/80 ring-1 ring-inset ring-white/5">
              <div
                aria-hidden
                className="absolute inset-0 opacity-60"
                style={{
                  backgroundImage:
                    "linear-gradient(90deg, transparent 0, rgba(255,255,255,0.05) 50%, transparent 100%)",
                }}
              />
              <div
                className="absolute inset-y-0 left-0 overflow-hidden rounded-sm bg-primary"
                style={{
                  width: `${xpPct}%`,
                  animation: "xp-pulse 2.4s ease-in-out infinite",
                }}
              >
                <div
                  aria-hidden
                  className="absolute inset-y-0 w-1/3"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.55) 50%, transparent 100%)",
                    animation: "xp-shimmer 2.8s ease-in-out infinite",
                  }}
                />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between font-mono text-[11px] tabular-nums">
              <span className="font-bold uppercase tracking-[0.2em] text-primary">
                {ME.rank}
              </span>
              <span className="text-muted-foreground">
                <span className="font-bold text-foreground">{ME.xp.toLocaleString("ru-RU")}</span>{" "}
                <span className="opacity-40">/</span>{" "}
                {ME.xpMax.toLocaleString("ru-RU")} XP
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function RankLadder() {
  return (
    <div className="flex items-stretch gap-1.5">
      {RANKS.map((rank, i) => {
        const isPast = i < ME.rankIndex;
        const isActive = i === ME.rankIndex;
        return (
          <div
            key={rank}
            className="group relative flex h-12 flex-1 items-center justify-center"
            aria-current={isActive ? "step" : undefined}
          >
            <div
              aria-hidden
              className={`absolute inset-0 -skew-x-12 transition-all ${
                isActive
                  ? "bg-primary shadow-[0_8px_24px_-6px_color-mix(in_oklab,var(--primary)_55%,transparent)]"
                  : isPast
                    ? "bg-primary/25 ring-1 ring-inset ring-primary/40"
                    : "border border-white/[0.08] bg-white/[0.02]"
              }`}
              style={
                isActive ? { animation: "xp-pulse 2.4s ease-in-out infinite" } : undefined
              }
            />
            <span
              className={`relative font-display text-[11px] font-black uppercase italic tracking-wider md:text-xs ${
                isActive
                  ? "text-black"
                  : isPast
                    ? "text-primary"
                    : "text-muted-foreground/60"
              }`}
            >
              {rank}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ---------- Stats ----------

function StatsRow() {
  const items = [
    { label: "Билеты", value: ME.totals.tickets, icon: Ticket },
    { label: "Выигрыши", value: ME.totals.wins, icon: Trophy },
    { label: "Заказы", value: ME.totals.orders, icon: ShoppingBag },
    { label: "Байки", value: ME.totals.bikes, icon: Bike },
  ];
  return (
    <section aria-label="Статистика" className="mb-10 grid grid-cols-2 gap-3 md:grid-cols-4">
      {items.map(({ label, value, icon: Icon }) => (
        <div
          key={label}
          className="flex items-center gap-3 border border-white/[0.06] bg-card/40 px-4 py-3 transition-colors hover:border-white/[0.12]"
        >
          <Icon className="h-5 w-5 text-primary" strokeWidth={1.8} />
          <div className="flex min-w-0 flex-col">
            <span className="font-display text-2xl font-black italic leading-none text-foreground tabular-nums">
              {value}
            </span>
            <span className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              {label}
            </span>
          </div>
        </div>
      ))}
    </section>
  );
}

// ---------- Sections ----------

function SectionHeader({
  title,
  href,
  hrefLabel = "Все",
}: {
  title: string;
  href?: string;
  hrefLabel?: string;
}) {
  return (
    <div className="mb-3 flex items-baseline justify-between">
      <h2 className="font-display text-sm font-black uppercase italic tracking-widest text-foreground">
        {title}
      </h2>
      {href && (
        <Link
          to={href}
          className="group flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-primary"
        >
          {hrefLabel}
          <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}

function SectionTickets() {
  return (
    <section aria-label="Мои розыгрыши" className="mb-10">
      <SectionHeader title="Мои розыгрыши" href="/club/raffles" hrefLabel="Все розыгрыши" />
      <div className="grid gap-3 md:grid-cols-2">
        {ACTIVE_TICKETS.map((t) => {
          const sharePct = Math.min(100, Math.round((t.myTickets / t.totalTickets) * 100 * 5));
          return (
            <article
              key={t.id}
              className="group relative flex overflow-hidden border border-white/[0.06] bg-card/40 transition-colors hover:border-primary/40"
            >
              <div className="relative h-auto w-28 shrink-0 overflow-hidden bg-black">
                <img
                  src={t.image}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent to-card/40" />
              </div>
              <div className="flex min-w-0 flex-1 flex-col justify-between p-4">
                <div>
                  <h3 className="truncate font-display text-base font-black uppercase italic tracking-tight text-foreground">
                    {t.title}
                  </h3>
                  <div className="mt-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                    закрытие: <span className="text-primary">{t.deadline}</span>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="flex items-baseline justify-between font-mono text-[11px] tabular-nums">
                    <span>
                      <span className="font-bold text-foreground">{t.myTickets}</span>
                      <span className="text-muted-foreground"> моих</span>
                    </span>
                    <span className="text-muted-foreground">
                      из {t.totalTickets.toLocaleString("ru-RU")}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1 overflow-hidden bg-neutral-900">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${sharePct}%` }}
                      aria-label={`Доля моих билетов: ${sharePct}%`}
                    />
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {WIN_HISTORY.length > 0 && (
        <div className="mt-4 border border-white/[0.06] bg-card/30 p-4">
          <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            <Trophy className="h-3 w-3 text-primary" />
            История выигрышей
          </div>
          <ul className="divide-y divide-white/[0.04]">
            {WIN_HISTORY.map((w) => (
              <li key={w.id} className="flex items-center justify-between py-2 text-sm">
                <span className="truncate text-foreground">{w.title}</span>
                <span className="ml-3 shrink-0 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                  {w.date} · <span className="text-primary">{w.status}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function SectionOrders() {
  return (
    <section aria-label="Мои заказы" className="mb-10">
      <SectionHeader title="Мои заказы" href="/shop" hrefLabel="В магазин" />
      <div className="border border-white/[0.06] bg-card/40">
        <ul className="divide-y divide-white/[0.04]">
          {ORDERS.map((o) => (
            <li
              key={o.id}
              className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-4 py-3 transition-colors hover:bg-white/[0.02]"
            >
              <div className="min-w-0">
                <div className="truncate text-sm text-foreground">{o.title}</div>
                <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  {o.date}
                </div>
              </div>
              <div className="font-mono text-[12px] tabular-nums text-foreground">{o.price}</div>
              <OrderStatus status={o.status} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function OrderStatus({ status }: { status: Order["status"] }) {
  const tone: Record<Order["status"], string> = {
    "В пути": "border-primary/50 text-primary",
    "Доставлено": "border-white/[0.1] text-muted-foreground",
    "Waitlist": "border-yellow-500/40 text-yellow-400",
    "Ожидает оплаты": "border-red-500/40 text-red-400",
  };
  return (
    <span
      className={`whitespace-nowrap border px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.2em] ${tone[status]}`}
    >
      {status}
    </span>
  );
}

function SectionGarage() {
  return (
    <section aria-label="Мой гараж" className="mb-10">
      <SectionHeader title="Мой гараж" href="/club/garage" hrefLabel="Открыть гараж" />
      <div className="grid gap-3 md:grid-cols-2">
        {GARAGE.map((b) => (
          <article
            key={b.id}
            className="group relative overflow-hidden border border-white/[0.06] bg-card/40 transition-colors hover:border-primary/40"
          >
            <div className="aspect-[16/9] overflow-hidden bg-black">
              <img
                src={b.image}
                alt={`${b.brand} ${b.model}`}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </div>
            <div className="flex items-end justify-between p-4">
              <div className="min-w-0">
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  {b.brand} · {b.year}
                </div>
                <h3 className="mt-0.5 truncate font-display text-xl font-black uppercase italic tracking-tight text-foreground">
                  {b.model}
                </h3>
              </div>
              <div className="text-right font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                <span className="text-foreground">{b.mileage}</span>
                <div className="opacity-60">пробег</div>
              </div>
            </div>
          </article>
        ))}
        <button
          type="button"
          className="flex min-h-[200px] items-center justify-center border border-dashed border-white/[0.1] bg-card/20 p-4 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
        >
          + Добавить байк
        </button>
      </div>
    </section>
  );
}
