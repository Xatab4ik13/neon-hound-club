import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Ticket, Trophy, ShoppingBag, Bike } from "lucide-react";
import { RANKS } from "@/data/ranks";
import { PageHeader } from "@/components/club/PageHeader";
import { useViewer } from "@/hooks/use-viewer";
import { useMyProfile, useBikes } from "@/lib/garage-api";
import {
  qk,
  fetchTicketsBalance,
  fetchMyRaffles,
  fetchMyOrders,
} from "@/lib/queries";

export const Route = createFileRoute("/club/rank")({
  head: () => ({
    meta: [
      { title: "Ранг и XP — клуб HELLHOUND" },
      { name: "description", content: "Прогресс по рангам и статистика райдера." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RankPage,
});

function RankPage() {
  const viewer = useViewer();
  const profile = useMyProfile(viewer.isAuthed);

  const r = profile.data?.rank;
  const rankIndex = r?.rankIndex ?? 0;
  const rank = RANKS[rankIndex];
  const next = RANKS[rankIndex + 1] ?? null;
  const isMax = r?.isMax ?? false;
  const xp = r?.inRank ?? 0;
  const xpMax = r?.span ?? 0;
  const xpPct = r?.pct ?? 0;
  const toNext = r?.toNext ?? 0;

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 md:px-8 md:py-10">
      <PageHeader title="Ранг и XP" subtitle={rank.label} />

      {/* XP bar */}
      <section className="mb-8 border border-white/[0.06] bg-card/40 p-5 md:p-6">
        <div className="mb-3 flex items-baseline justify-between">
          <span
            className="font-display text-2xl font-black italic uppercase tracking-tight"
            style={{ color: rank.accent }}
          >
            {rank.label}
          </span>
          {isMax ? (
            <span
              className="font-mono text-xs font-extrabold uppercase tracking-[0.2em]"
              style={{ color: rank.accent }}
            >
              MAX
            </span>
          ) : next ? (
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
              до{" "}
              <span className="font-bold" style={{ color: rank.accent }}>
                {next.label}
              </span>{" "}
              ·{" "}
              <span className="font-bold tabular-nums text-foreground">{toNext}</span> XP
            </span>
          ) : null}
        </div>

        <div className="relative h-4 overflow-hidden rounded-sm bg-black/55 ring-1 ring-inset ring-white/10">
          <div
            className="absolute inset-y-0 left-0 overflow-hidden rounded-sm transition-[width] duration-500"
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
        {!isMax && (
          <div className="mt-3 font-mono text-sm tabular-nums text-muted-foreground">
            <span className="font-bold text-foreground">{xp.toLocaleString("ru-RU")}</span>
            <span className="opacity-40"> / </span>
            <span>{xpMax.toLocaleString("ru-RU")} XP</span>
          </div>
        )}
      </section>

      {/* Stats */}
      <StatsRow isAuthed={viewer.isAuthed} />

      {/* Rank ladder */}
      <section className="mb-4 mt-10">
        <h2 className="mb-4 font-display text-xl font-black uppercase italic tracking-tight text-foreground md:text-2xl">
          Лестница рангов
        </h2>
        <RankLadderVertical rankIndex={rankIndex} />
      </section>
    </main>
  );
}

function StatsRow({ isAuthed }: { isAuthed: boolean }) {
  const balanceQ = useQuery({
    queryKey: qk.ticketsBalance,
    queryFn: fetchTicketsBalance,
    enabled: isAuthed,
    staleTime: 30_000,
  });
  const rafflesQ = useQuery({
    queryKey: qk.myRaffles,
    queryFn: fetchMyRaffles,
    enabled: isAuthed,
    staleTime: 30_000,
  });
  const ordersQ = useQuery({
    queryKey: qk.shopOrders,
    queryFn: fetchMyOrders,
    enabled: isAuthed,
    staleTime: 30_000,
  });
  const bikesQ = useBikes(isAuthed);

  const items = [
    {
      label: "Билеты",
      value: balanceQ.data?.balance ?? 0,
      icon: Ticket,
    },
    {
      label: "Выигрыши",
      value: rafflesQ.data?.items.filter((r) => r.won).length ?? 0,
      icon: Trophy,
    },
    {
      label: "Заказы",
      value: ordersQ.data?.items.length ?? 0,
      icon: ShoppingBag,
    },
    {
      label: "Байки",
      value: bikesQ.data?.length ?? 0,
      icon: Bike,
    },
  ];

  return (
    <section aria-label="Статистика" className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {items.map(({ label, value, icon: Icon }) => (
        <div
          key={label}
          className="flex items-center gap-3 border border-white/[0.06] bg-card/40 px-4 py-4 transition-colors hover:border-white/[0.12]"
        >
          <Icon className="h-6 w-6 text-primary" strokeWidth={1.8} />
          <div className="flex min-w-0 flex-col">
            <span className="font-display text-3xl font-black italic leading-none text-foreground tabular-nums">
              {value}
            </span>
            <span className="mt-1 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              {label}
            </span>
          </div>
        </div>
      ))}
    </section>
  );
}

function RankLadderVertical({ rankIndex }: { rankIndex: number }) {
  return (
    <ul className="flex flex-col gap-2">
      {RANKS.map((r, i) => {
        const isPast = i < rankIndex;
        const isActive = i === rankIndex;
        const isFuture = i > rankIndex;
        return (
          <li
            key={r.id}
            className="flex items-center gap-4 border bg-card/40 px-4 py-4 md:px-5"
            style={{
              borderColor: isActive ? r.accent : "rgba(255,255,255,0.06)",
              boxShadow: isActive ? `0 0 0 1px ${r.accentSoft}` : undefined,
            }}
          >
            <div
              className="grid h-12 w-12 shrink-0 place-items-center font-display text-base font-black italic uppercase"
              style={{
                backgroundColor: isActive || isPast ? r.accent : "rgba(255,255,255,0.04)",
                color: isActive || isPast ? r.onAccent : "rgba(167,167,167,0.6)",
              }}
            >
              {r.short}
            </div>
            <div className="min-w-0 flex-1">
              <div
                className="font-display text-lg font-black italic uppercase tracking-tight md:text-xl"
                style={{ color: isFuture ? "rgba(167,167,167,0.7)" : r.accent }}
              >
                {r.label}
              </div>
            </div>

            {isActive && (
              <span className="shrink-0 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                Сейчас
              </span>
            )}
            {isPast && (
              <span className="shrink-0 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Пройдено
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
