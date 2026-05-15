import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { SettingsModal } from "@/components/club/SettingsModal";
import {
  ACTIVE_TICKETS,
  GARAGE,
  ME,
  ORDERS,
  WIN_HISTORY,
  type Order,
} from "@/data/profile";
import { PlaqueBackground, ProfilePlaque } from "./club";
import { RANKS } from "@/data/ranks";
import {
  setRankIndex,
  setXpPct,
  useCurrentRank,
  useRankState,
} from "@/data/rank-state";
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
      <RankSwitcher />
    </main>
  );
}

// ---------- Dashboard (приборка) ----------

function Dashboard() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { rank, plaqueBg, next, xp, xpMax, xpPct, isMax } = useCurrentRank();
  const isPaid = !!rank.isPaid;

  return (
    <section
      aria-label="Прогресс райдера"
      className="relative mb-8 overflow-hidden border border-white/[0.06] bg-[#0b0b0b]"
    >
      {/* Decor: фон по текущему рангу */}
      <PlaqueBackground bg={plaqueBg} />
      {/* Тёмная подложка для читаемости текста */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/55 via-black/25 to-black/55" />

      <div className="relative grid gap-8 p-6 md:grid-cols-[auto_1fr] md:p-8">
        {/* Left: avatar + identity */}
        <div className="flex items-center gap-5 md:flex-col md:items-start md:gap-4">
          <div className="relative">
            <div
              aria-hidden
              className="absolute -inset-1 rounded-full blur-xl"
              style={{
                backgroundColor: rank.accentSoft,
                animation: "xp-pulse 3s ease-in-out infinite",
              }}
            />
            <div
              className="relative h-24 w-24 overflow-hidden rounded-full ring-4 ring-offset-4 ring-offset-[#0b0b0b] md:h-28 md:w-28"
              style={{
                backgroundColor: rank.accent,
                boxShadow: `0 0 0 4px ${rank.accentSoft}`,
              }}
            >
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
                <span
                  className="font-display text-3xl font-black italic uppercase md:text-4xl"
                  style={{ color: rank.onAccent }}
                >
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
              onClick={() => setSettingsOpen(true)}
              className="mt-3 inline-flex items-center gap-1.5 border border-white/[0.08] bg-black/30 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:border-white/30 hover:text-foreground"
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
            {isPaid ? (
              <span
                className="flex items-center gap-1 font-mono text-[10px] font-extrabold uppercase tracking-[0.25em]"
                style={{ color: rank.accent }}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect x="4" y="11" width="16" height="10" rx="1" />
                  <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                </svg>
                Платный · {rank.priceLabel}
              </span>
            ) : next ? (
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                до{" "}
                <span className="font-bold" style={{ color: rank.accent }}>
                  {next.label}
                </span>{" "}
                ·{" "}
                <span className="font-bold tabular-nums text-foreground">
                  {xpMax - xp}
                </span>{" "}
                XP
              </span>
            ) : (
              <span
                className="font-mono text-[10px] font-extrabold uppercase tracking-[0.25em]"
                style={{ color: rank.accent }}
              >
                Достигнут максимум
              </span>
            )}
          </div>

          <RankLadder />

          <div className="mt-5">
            <div className="relative h-3 overflow-hidden rounded-sm bg-black/55 ring-1 ring-inset ring-white/10">
              <div
                aria-hidden
                className="absolute inset-0 opacity-60"
                style={{
                  backgroundImage:
                    "linear-gradient(90deg, transparent 0, rgba(255,255,255,0.05) 50%, transparent 100%)",
                }}
              />
              <div
                className="absolute inset-y-0 left-0 overflow-hidden rounded-sm"
                style={{
                  width: `${xpPct}%`,
                  backgroundColor: rank.accent,
                  boxShadow: `0 0 12px ${rank.accentSoft}, 0 0 24px ${rank.accentSoft}`,
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
              <span
                className="font-bold uppercase tracking-[0.2em]"
                style={{ color: rank.accent }}
              >
                {rank.label}
              </span>
              {isPaid ? (
                <span
                  className="flex items-center gap-1.5 font-extrabold uppercase tracking-[0.2em]"
                  style={{ color: rank.accent }}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2 L15 9 L22 9 L16.5 13.5 L18.5 21 L12 16.5 L5.5 21 L7.5 13.5 L2 9 L9 9 Z" />
                  </svg>
                  {rank.priceLabel}
                </span>
              ) : isMax ? (
                <span
                  className="font-extrabold uppercase tracking-[0.2em]"
                  style={{ color: rank.accent }}
                >
                  MAX
                </span>
              ) : (
                <span className="text-muted-foreground">
                  <span className="font-bold text-foreground">
                    {xp.toLocaleString("ru-RU")}
                  </span>{" "}
                  <span className="opacity-40">/</span>{" "}
                  {xpMax.toLocaleString("ru-RU")} XP
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}

function DashboardWrapperFix() { return null; }
// eslint-disable-next-line

function RankLadder() {
  const { rankIndex } = useRankState();
  return (
    <div className="flex items-stretch gap-1.5">
      {RANKS.map((rank, i) => {
        const isPast = i < rankIndex;
        const isActive = i === rankIndex;
        return (
          <div
            key={rank.id}
            className="group relative flex h-12 flex-1 items-center justify-center"
            aria-current={isActive ? "step" : undefined}
          >
            <div
              aria-hidden
              className="absolute inset-0 -skew-x-12 transition-all"
              style={
                isActive
                  ? {
                      backgroundColor: rank.accent,
                      boxShadow: `0 8px 24px -6px ${rank.accentSoft}`,
                      animation: "xp-pulse 2.4s ease-in-out infinite",
                    }
                  : isPast
                    ? {
                        backgroundColor: rank.accentSoft,
                        boxShadow: `inset 0 0 0 1px ${rank.accentSoft}`,
                      }
                    : {
                        border: "1px solid rgba(255,255,255,0.08)",
                        backgroundColor: "rgba(255,255,255,0.02)",
                      }
              }
            />
            <span
              className="relative font-display text-[11px] font-black uppercase italic tracking-wider md:text-xs"
              style={{
                color: isActive
                  ? rank.onAccent
                  : isPast
                    ? rank.accent
                    : "rgba(167,167,167,0.6)",
              }}
            >
              {rank.short}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ---------- Dev rank switcher (плавающая панелька) ----------

function RankSwitcher() {
  const { rankIndex, xpPct } = useRankState();
  return (
    <div className="fixed bottom-4 right-4 z-50 w-72 border border-white/10 bg-black/85 p-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)] backdrop-blur-md">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-bold text-foreground">Dev · ранг</span>
        <span className="text-[9px] opacity-60">только превью</span>
      </div>
      <div className="mb-3 grid grid-cols-6 gap-1">
        {RANKS.map((r, i) => {
          const active = i === rankIndex;
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => setRankIndex(i)}
              className={`flex flex-col items-center gap-1 border px-1 py-1.5 transition-colors ${
                active ? "border-transparent" : "border-white/10 hover:border-white/30"
              }`}
              style={
                active
                  ? { backgroundColor: r.accent, color: r.onAccent }
                  : { color: r.accent }
              }
              title={r.label}
            >
              <span
                aria-hidden
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: active ? r.onAccent : r.accent }}
              />
              <span className="text-[9px] font-bold leading-none">{r.short}</span>
            </button>
          );
        })}
      </div>

      <label className="flex items-center gap-2">
        <span className="w-6 text-[10px] tabular-nums text-foreground">XP</span>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={xpPct}
          onChange={(e) => setXpPct(Number(e.target.value))}
          className="flex-1 accent-primary"
          aria-label="Прогресс XP"
        />
        <span className="w-8 text-right text-[10px] tabular-nums text-foreground">
          {xpPct}%
        </span>
      </label>
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
