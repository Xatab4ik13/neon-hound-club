import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, Ticket, Trophy } from "lucide-react";
import { Countdown } from "@/components/club/Countdown";
import { ACTIVE_TICKETS, type ActiveTicket } from "@/data/profile";
import { COMPLETED_RAFFLES } from "@/data/my-raffles";
import { PUBLIC_USERS } from "@/data/users";
import { TICKET_LEDGER, summarizeLedger } from "@/data/tickets-ledger";
import { PageHeader } from "@/components/club/PageHeader";

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

// Архив без участия (организационный). Свой опыт — в COMPLETED_RAFFLES.
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
    image: "https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=800&q=80",
  },
  {
    id: "h2",
    title: "Шлем Arai RX-7V",
    date: "февр 2026",
    winnerSlug: "tankslapper",
    total: 1120,
    image: "https://images.unsplash.com/photo-1599839575945-a9e5af0c3fa5?w=800&q=80",
  },
  {
    id: "h3",
    title: "Перчатки HELLHOUND v1",
    date: "янв 2026",
    winnerSlug: "asphalt_dog",
    total: 640,
    image: "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=800&q=80",
  },
  {
    id: "h4",
    title: "GoPro Hero 11",
    date: "дек 2025",
    winnerSlug: "moto_anya",
    total: 480,
    image: "https://images.unsplash.com/photo-1502945015378-0e284ca1a5be?w=800&q=80",
  },
];

function RafflesPage() {
  const balance = summarizeLedger(TICKET_LEDGER).balance;
  const wonCount = COMPLETED_RAFFLES.filter((r) => r.status === "won").length;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-5 md:py-8">
      <PageHeader title="Розыгрыши" subtitle="Лоты клуба и архив" />

      {/* Balance pill — без покупки билетов: подсказка ведёт на «как набрать» */}
      <section
        aria-label="Баланс"
        className="mb-5 flex items-center justify-between gap-3 rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 via-card/60 to-black px-4 py-3"
      >
        <Link to="/club/tickets" className="flex min-w-0 items-center gap-3 active:opacity-70">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
            <Ticket className="h-5 w-5" />
          </span>
          <span className="min-w-0">
            <span className="block font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Мой баланс
            </span>
            <span className="block font-display text-2xl font-black italic leading-none tabular-nums text-foreground">
              {balance}
            </span>
          </span>
        </Link>
        <Link
          to="/club/tickets"
          className="shrink-0 rounded-full border border-primary/40 px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-primary active:scale-95"
        >
          Как набрать
        </Link>
      </section>


      {/* Активные — крупные карточки в сетке */}
      <section aria-label="Активные розыгрыши" className="mb-7">
        <h2 className="mb-2 px-1 font-display text-sm font-black uppercase italic tracking-widest text-foreground">
          Активные · {ACTIVE_TICKETS.length}
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {ACTIVE_TICKETS.map((r) => (
            <RaffleCard key={r.id} raffle={r} />
          ))}
        </div>
      </section>

      {/* Мои завершённые */}
      {COMPLETED_RAFFLES.length > 0 && (
        <section aria-label="Мои завершённые" className="mb-7">
          <div className="mb-2 flex items-end justify-between px-1">
            <h2 className="font-display text-sm font-black uppercase italic tracking-widest text-foreground">
              Я участвовал
            </h2>
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {wonCount} выиграно из {COMPLETED_RAFFLES.length}
            </span>
          </div>
          <ul className="overflow-hidden rounded-2xl border border-white/[0.06] bg-card/40 divide-y divide-white/[0.05]">
            {COMPLETED_RAFFLES.map((r) => {
              const won = r.status === "won";
              return (
                <li key={r.id} className="flex items-center gap-3 px-3 py-3">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-white/[0.06] bg-black">
                    <img
                      src={r.image}
                      alt=""
                      loading="lazy"
                      className={`h-full w-full object-cover ${won ? "" : "grayscale opacity-70"}`}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      {won && <Trophy className="h-3 w-3 shrink-0 text-emerald-400" />}
                      <span className="truncate text-[15px] font-semibold text-foreground">
                        {r.title}
                      </span>
                    </div>
                    <div className="mt-0.5 text-[12px] text-muted-foreground">
                      {r.date}
                      {won
                        ? r.delivery
                          ? ` · ${r.delivery}`
                          : ""
                        : r.winnerNick
                          ? ` · забрал @${r.winnerNick}`
                          : ""}
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-md border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${
                      won
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                        : "border-white/[0.08] bg-white/[0.02] text-muted-foreground"
                    }`}
                  >
                    {won ? "Выигрыш" : "Не выиграл"}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Архив клуба */}
      <section aria-label="Архив клуба">
        <h2 className="mb-2 px-1 font-display text-sm font-black uppercase italic tracking-widest text-foreground">
          Архив клуба
        </h2>
        <ul className="overflow-hidden rounded-2xl border border-white/[0.06] bg-card/40 divide-y divide-white/[0.05]">
          {PAST_RAFFLES.map((p) => {
            const winner = PUBLIC_USERS[p.winnerSlug];
            const nick = winner?.nick ?? p.winnerSlug.toUpperCase();
            return (
              <li key={p.id} className="flex items-center gap-3 px-3 py-3">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-white/[0.06] bg-black">
                  <img
                    src={p.image}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover grayscale opacity-90"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15px] font-semibold text-foreground">
                    {p.title}
                  </div>
                  <div className="mt-0.5 text-[12px] text-muted-foreground">
                    {p.date} · забрал{" "}
                    <span className="text-primary">@{nick}</span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}

function RaffleCard({ raffle }: { raffle: ActiveTicket }) {
  return (
    <Link
      to="/club/raffles/$raffleId"
      params={{ raffleId: raffle.id }}
      className="group relative block overflow-hidden rounded-2xl border border-white/[0.08] bg-card/40 transition-colors active:bg-white/[0.03]"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-black">
        <img
          src={raffle.image}
          alt={raffle.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-primary px-2 py-0.5 font-mono text-[10px] font-black uppercase tracking-wider text-primary-foreground">
          <span className="h-1 w-1 animate-pulse rounded-full bg-white" />
          LIVE
        </span>
        <div className="absolute inset-x-3 bottom-3">
          <h3 className="font-display text-xl font-black uppercase italic leading-tight tracking-tight text-foreground">
            {raffle.title}
          </h3>
          {raffle.subtitle && (
            <p className="mt-1 truncate text-[12px] text-foreground/70">{raffle.subtitle}</p>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <span className="inline-flex items-center gap-1.5 font-mono text-[12px] text-muted-foreground">
          <Ticket className="h-3.5 w-3.5 text-primary" />
          мои:{" "}
          <span className="tabular-nums text-foreground/90">{raffle.myTickets}</span>
        </span>
        <span className="flex items-center gap-2">
          <Countdown deadlineAt={raffle.deadlineAt} compact />
          <ChevronRight className="h-4 w-4 text-muted-foreground/70" />
        </span>
      </div>
    </Link>
  );
}
