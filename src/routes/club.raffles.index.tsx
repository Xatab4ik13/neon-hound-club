import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Ticket, Trophy, ShieldCheck } from "lucide-react";
import { Countdown } from "@/components/club/Countdown";
import { PageHeader } from "@/components/club/PageHeader";
import {
  fetchMyRaffles,
  fetchRaffles,
  fetchTicketsBalance,
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

  const rafflesQ = useQuery({
    queryKey: qk.raffles,
    queryFn: fetchRaffles,
  });

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
    <main className="mx-auto w-full max-w-3xl px-4 py-5 md:py-8">
      <PageHeader title="Розыгрыши" />

      {isAuthed && (
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
      )}

      <section aria-label="Активные розыгрыши" className="mb-7">
        <h2 className="mb-2 px-1 font-display text-sm font-black uppercase italic tracking-widest text-foreground">
          Активные · {active.length}
        </h2>
        {rafflesQ.isLoading ? (
          <SkeletonGrid />
        ) : active.length === 0 ? (
          <EmptyBlock text="Пока нет активных розыгрышей" />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {active.map((r) => (
              <RaffleCard key={r.id} raffle={r} />
            ))}
          </div>
        )}
      </section>

      {isAuthed && my.length > 0 && (
        <section aria-label="Мои завершённые" className="mb-7">
          <div className="mb-2 flex items-end justify-between px-1">
            <h2 className="font-display text-sm font-black uppercase italic tracking-widest text-foreground">
              Я участвовал
            </h2>
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {wonCount} выиграно из {my.filter((r) => r.status === "finished").length}
            </span>
          </div>
          <ul className="overflow-hidden rounded-2xl border border-white/[0.06] bg-card/40 divide-y divide-white/[0.05]">
            {my.map((r) => (
              <MyRaffleRow key={r.id} raffle={r} />
            ))}
          </ul>
        </section>
      )}

      {finished.length > 0 && (
        <section aria-label="Архив клуба">
          <h2 className="mb-2 px-1 font-display text-sm font-black uppercase italic tracking-widest text-foreground">
            Архив клуба
          </h2>
          <ul className="overflow-hidden rounded-2xl border border-white/[0.06] bg-card/40 divide-y divide-white/[0.05]">
            {finished.map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-3 py-3">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-white/[0.06] bg-black">
                  {p.imageUrl && (
                    <img
                      src={p.imageUrl}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover grayscale opacity-90"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15px] font-semibold text-foreground">{p.title}</div>
                  <div className="mt-0.5 text-[12px] text-muted-foreground">
                    {formatMonth(p.endsAt)}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </li>
            ))}
          </ul>
        </section>
      )}

      <LegalNotice />
    </main>
  );
}

function LegalNotice() {
  // Юр-блок свёрнут по умолчанию: это требование закона, а не контент.
  // Юзер раскрывает только если ему правда надо посмотреть условия.
  return (
    <section aria-label="Юридическая информация" className="mt-10">
      <details className="group rounded-2xl border border-white/[0.06] bg-card/40">
        <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
          <ShieldCheck className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="flex-1 font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Юр. информация о розыгрышах
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
        </summary>
        <div className="border-t border-white/[0.06] px-4 py-4">
          <p className="text-[12px] leading-relaxed text-muted-foreground">
            Розыгрыши проводятся в порядке ст. 9 ФЗ-38 «О рекламе». Билеты
            можно получить <span className="text-foreground">бесплатно</span>{" "}
            за активность в клубе — покупка не обязательна. НДФЛ с призов
            платит организатор.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px]">
            <Link
              to="/club/legal/promo-rules"
              className="inline-flex items-center gap-1 font-mono text-[11px] font-bold uppercase tracking-wider text-primary hover:underline"
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
    <div className="rounded-2xl border border-white/[0.06] bg-card/40 px-4 py-8 text-center font-mono text-[12px] uppercase tracking-wider text-muted-foreground">
      {text}
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {[0, 1].map((i) => (
        <div key={i} className="skeleton-shimmer aspect-[16/10] rounded-2xl" />
      ))}
    </div>
  );
}

function MyRaffleRow({ raffle }: { raffle: MyRaffleItem }) {
  const won = raffle.won;
  const finished = raffle.status === "finished";
  return (
    <li className="flex items-center gap-3 px-3 py-3">
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-white/[0.06] bg-black">
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
          {won && <Trophy className="h-3 w-3 shrink-0 text-emerald-400" />}
          <span className="truncate text-[15px] font-semibold text-foreground">{raffle.title}</span>
        </div>
        {won && raffle.wonPrizes.length > 0 && (
          <div className="mt-0.5 truncate text-[12px] font-semibold text-emerald-300">
            🏆 {raffle.wonPrizes.join(" · ")}
          </div>
        )}
        <div className="mt-0.5 text-[12px] text-muted-foreground">
          {formatMonth(raffle.endsAt)} · мои билеты: {raffle.myEntries}
          {finished && !won && raffle.winnerNick ? ` · забрал @${raffle.winnerNick}` : ""}
        </div>
      </div>
      <span
        className={`shrink-0 rounded-md border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${
          won
            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
            : finished
              ? "border-white/[0.08] bg-white/[0.02] text-muted-foreground"
              : "border-primary/40 bg-primary/10 text-primary"
        }`}
      >
        {won ? "Выигрыш" : finished ? "Не выиграл" : "В игре"}
      </span>
    </li>
  );
}

function RaffleCard({ raffle }: { raffle: RaffleListItem }) {
  return (
    <Link
      to="/club/raffles/$raffleId"
      params={{ raffleId: raffle.id }}
      className="group relative block overflow-hidden rounded-2xl border border-white/[0.08] bg-card/40 transition-colors active:bg-white/[0.03]"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-black">
        {raffle.imageUrl && (
          <img
            src={raffle.imageUrl}
            alt={raffle.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-primary px-2 py-0.5 font-mono text-[10px] font-black uppercase tracking-wider text-primary-foreground">
          <span className="h-1 w-1 animate-pulse rounded-full bg-white" />
          LIVE
        </span>
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
          <Ticket className="h-3.5 w-3.5 text-primary" />
          {raffle.ticketCost} / билет
        </span>
        <Countdown deadlineAt={raffle.endsAt} compact />
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
