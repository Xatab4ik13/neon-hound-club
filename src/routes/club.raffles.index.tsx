import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import {
  PlumpArrowRight as ChevronRight,
  PlumpTicket,
  Trophy,
  ShieldCheck,
} from "@/components/ui/icons";
import { PlumpNum } from "@/components/brand/PlumpNum";

import { Countdown } from "@/components/club/Countdown";
import { PageHeader } from "@/components/club/PageHeader";
import {
  fetchMyRaffles,
  fetchRaffles,
  qk,
  type MyRaffleItem,
  type RaffleListItem,
} from "@/lib/queries";
import { useViewer } from "@/hooks/use-viewer";

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

function RafflesPage() {
  const { isAuthed } = useViewer();

  const rafflesQ = useQuery({ queryKey: qk.raffles, queryFn: fetchRaffles });
  const balanceQ = useQuery({
    queryKey: qk.ticketsBalance,
    queryFn: fetchTicketsBalance,
    enabled: isAuthed,
  });
  const myQ = useQuery({
    queryKey: qk.myRaffles,
    queryFn: fetchMyRaffles,
    enabled: isAuthed,
  });

  const all = rafflesQ.data?.items ?? [];
  const active = all.filter((r) => r.status === "active");
  const finished = all.filter((r) => r.status === "finished");
  const my = myQ.data?.items ?? [];
  const wonCount = my.filter((r) => r.won).length;
  const balance = balanceQ.data?.balance ?? 0;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-5 pb-[calc(env(safe-area-inset-bottom)+96px)] md:py-8">
      <PageHeader title="Розыгрыши" />

      {isAuthed && (
        <section
          aria-label="Баланс"
          className="mb-6 flex items-center justify-between gap-3 rounded-3xl border-[3px] border-foreground bg-card px-4 py-3 shadow-[6px_6px_0_0_hsl(var(--foreground))]"
        >
          <Link to="/club/tickets" className="flex min-w-0 items-center gap-3 active:opacity-70">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border-[3px] border-foreground bg-[#FFD93D] shadow-[3px_3px_0_0_hsl(var(--foreground))]">
              <PlumpTicket className="h-5 w-5 text-black" />
            </span>
            <span className="min-w-0">
              <span className="block font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                Мой баланс
              </span>
              <span className="block text-foreground">
                <PlumpNum value={balance} size={22} format />
              </span>
            </span>
          </Link>
          <Link
            to="/club/tickets"
            className="shrink-0 rounded-full border-[3px] border-foreground bg-foreground px-3 py-1.5 font-display text-[11px] font-black uppercase tracking-widest text-background shadow-[3px_3px_0_0_hsl(var(--foreground))] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0_0_hsl(var(--foreground))]"
          >
            Как набрать
          </Link>
        </section>
      )}

      <section aria-label="Активные розыгрыши" className="mb-8">
        <SectionTitle>
          Активные <span className="opacity-60">·</span>{" "}
          <PlumpNum value={active.length} size={12} />
        </SectionTitle>
        {rafflesQ.isLoading ? (
          <SkeletonGrid />
        ) : active.length === 0 ? (
          <EmptyBlock text="Пока нет активных розыгрышей" />
        ) : (
          <CardsGrid items={active} />
        )}
      </section>

      {isAuthed && my.length > 0 && (
        <section aria-label="Мои розыгрыши" className="mb-8">
          <div className="mb-3 flex items-end justify-between px-1">
            <SectionTitle>Я участвовал</SectionTitle>
            <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              <PlumpNum value={wonCount} size={11} /> выиграно из{" "}
              <PlumpNum value={my.filter((r) => r.status === "finished").length} size={11} />
            </span>
          </div>
          <ul className="flex flex-col gap-4">
            {my.map((r) => (
              <MyRaffleRow key={r.id} raffle={r} />
            ))}
          </ul>
        </section>
      )}

      {finished.length > 0 && (
        <section aria-label="Архив клуба" className="mb-8">
          <SectionTitle>
            Архив клуба <span className="opacity-60">·</span>{" "}
            <PlumpNum value={finished.length} size={12} />
          </SectionTitle>
          <CardsGrid items={finished} finished />
        </section>
      )}

      <LegalNotice />
    </main>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 px-1 inline-flex items-center gap-1.5 font-display text-sm font-black uppercase italic tracking-widest text-foreground">
      {children}
    </h2>
  );
}

function CardsGrid({ items, finished = false }: { items: RaffleListItem[]; finished?: boolean }) {
  const gridRef = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setVisible(true);
            io.disconnect();
            break;
          }
        }
      },
      { threshold: 0.05, rootMargin: "0px 0px -5% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={gridRef} className="grid grid-cols-1 gap-6 pt-2 [perspective:1000px] sm:grid-cols-2">
      {items.map((r, i) => (
        <RaffleCard key={r.id} raffle={r} index={i} visible={visible} finished={finished} />
      ))}
    </div>
  );
}

function LegalNotice() {
  return (
    <section aria-label="Юридическая информация" className="mt-8">
      <details className="group rounded-2xl border-[3px] border-foreground bg-card shadow-[4px_4px_0_0_hsl(var(--foreground))]">
        <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
          <ShieldCheck className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="flex-1 font-mono text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Юр. информация о розыгрышах
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
        </summary>
        <div className="border-t-[3px] border-foreground px-4 py-4">
          <p className="text-[12px] leading-relaxed text-muted-foreground">
            Розыгрыши проводятся в порядке ст. 9 ФЗ-38 «О рекламе». Билеты можно получить{" "}
            <span className="text-foreground">бесплатно</span> за активность в клубе — покупка не
            обязательна. НДФЛ с призов платит организатор.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px]">
            <Link
              to="/club/legal/promo-rules"
              className="inline-flex items-center gap-1 font-mono text-[11px] font-bold uppercase tracking-widest text-primary hover:underline"
            >
              Полные правила
              <ChevronRight className="h-3 w-3" />
            </Link>
            <Link
              to="/club/legal/requisites"
              className="text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              Организатор
            </Link>
            <Link
              to="/club/legal/privacy"
              className="text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              Персональные данные
            </Link>
          </div>
        </div>
      </details>
    </section>
  );
}

function EmptyBlock({ text }: { text: string }) {
  return (
    <div className="rounded-3xl border-[3px] border-foreground bg-card px-6 py-14 text-center font-display text-lg font-black uppercase tracking-tight text-muted-foreground shadow-[6px_6px_0_0_hsl(var(--foreground))]">
      {text}
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
      {[0, 1].map((i) => (
        <div key={i} className="skeleton-shimmer aspect-[16/10] rounded-3xl" />
      ))}
    </div>
  );
}

function MyRaffleRow({ raffle }: { raffle: MyRaffleItem }) {
  const won = raffle.won;
  const finished = raffle.status === "finished";
  const badge = won
    ? { label: "Выигрыш", bg: "bg-[#B6FF3C]", tone: "text-black" }
    : finished
      ? { label: "Не выиграл", bg: "bg-background", tone: "text-muted-foreground" }
      : { label: "В игре", bg: "bg-[#FFD93D]", tone: "text-black" };
  return (
    <li className="flex items-center gap-3 rounded-2xl border-[3px] border-foreground bg-card px-3 py-3 shadow-[4px_4px_0_0_hsl(var(--foreground))]">
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border-[2px] border-foreground bg-black">
        {raffle.imageUrl && (
          <img
            src={raffle.imageUrl}
            alt=""
            loading="lazy"
            className={`h-full w-full object-cover ${won || !finished ? "" : "grayscale opacity-70"}`}
          />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          {won && <Trophy className="h-3.5 w-3.5 shrink-0 text-[#B6FF3C]" />}
          <span className="truncate font-display text-[15px] font-black uppercase tracking-tight text-foreground">
            {raffle.title}
          </span>
        </div>
        {won && raffle.wonPrizes.length > 0 && (
          <div className="mt-0.5 truncate text-[12px] font-semibold text-[#B6FF3C]">
            🏆 {raffle.wonPrizes.join(" · ")}
          </div>
        )}
        <div className="mt-0.5 flex flex-wrap items-center gap-x-1 text-[12px] text-muted-foreground">
          <span>{formatMonth(raffle.endsAt)}</span>
          <span>· мои билеты:</span>
          <PlumpNum value={raffle.myEntries} size={11} />
          {finished && !won && raffle.winnerNick ? <span>· забрал @{raffle.winnerNick}</span> : null}
        </div>
      </div>
      <span
        className={`shrink-0 rounded-full px-2.5 py-0.5 font-display text-[10px] font-black uppercase tracking-widest ${badge.bg} ${badge.tone}`}
      >
        {badge.label}
      </span>
    </li>
  );
}

function RaffleCard({
  raffle,
  index,
  visible,
  finished = false,
}: {
  raffle: RaffleListItem;
  index: number;
  visible: boolean;
  finished?: boolean;
}) {
  return (
    <Link
      to="/club/raffles/$raffleId"
      params={{ raffleId: raffle.id }}
      className={`skill-card group relative block rounded-3xl border-[3px] border-foreground bg-card shadow-[6px_6px_0_0_hsl(var(--foreground))] transition-transform duration-200 ease-out active:translate-x-[2px] active:translate-y-[2px] active:shadow-[3px_3px_0_0_hsl(var(--foreground))] ${
        visible ? "skill-card--in" : "skill-card--pre"
      }`}
      style={{
        animationDelay: visible ? `${index * 90}ms` : "0ms",
        willChange: "transform, opacity",
      }}
    >
      {/* status sticker — same style as detail page */}
      <span
        className={`absolute -left-2 -top-3 z-20 inline-flex items-center gap-1.5 -rotate-3 rounded-2xl border-[3px] border-foreground px-2.5 py-1 font-display text-[11px] font-black uppercase italic tracking-tighter text-black shadow-[3px_3px_0_0_hsl(var(--foreground))] ${
          finished ? "bg-[#C6A8FF]" : "bg-[#B6FF3C]"
        }`}
      >
        {!finished && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-black" />}
        {finished ? "Завершён" : "Идёт сейчас"}
      </span>

      <div className="relative aspect-[16/10] overflow-hidden rounded-t-[calc(1.5rem-3px)] border-b-[3px] border-foreground bg-black">
        {raffle.imageUrl && (
          <img
            src={raffle.imageUrl}
            alt={raffle.title}
            loading="lazy"
            className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 ${
              finished ? "grayscale opacity-80" : ""
            }`}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        <div className="absolute inset-x-3 bottom-3">
          <h3 className="font-display text-xl font-black uppercase italic leading-tight tracking-tight text-foreground">
            {raffle.title}
          </h3>
          {raffle.prize && (
            <p className="mt-1 truncate text-[12px] text-foreground/70">{raffle.prize}</p>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <span className="inline-flex items-center gap-1.5 font-mono text-[12px] text-muted-foreground">
          <span className="grid h-6 w-6 place-items-center rounded-lg border-[2px] border-foreground bg-[#FFD93D]">
            <PlumpTicket className="h-3.5 w-3.5 text-black" />
          </span>
          <PlumpNum value={raffle.ticketCost} size={13} className="text-foreground" />
          <span>/ билет</span>
        </span>
        {finished ? (
          <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            {formatMonth(raffle.endsAt)}
          </span>
        ) : (
          <Countdown deadlineAt={raffle.endsAt} compact />
        )}
      </div>
    </Link>
  );
}

function formatMonth(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
  } catch {
    return iso;
  }
}
