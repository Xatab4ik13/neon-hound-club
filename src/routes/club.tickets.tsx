import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, ShoppingBag, Ticket, Trophy } from "lucide-react";
import { TicketLedger } from "@/components/club/TicketLedger";
import { PageHeader } from "@/components/club/PageHeader";
import { fetchTicketsBalance, fetchTicketsHistory, qk } from "@/lib/queries";
import { useViewer } from "@/hooks/use-viewer";

export const Route = createFileRoute("/club/tickets")({
  head: () => ({
    meta: [
      { title: "Билеты — клуб HELLHOUND" },
      { name: "description", content: "Мои билеты и история начислений." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TicketsPage,
});

function TicketsPage() {
  const { isAuthed } = useViewer();

  const balanceQ = useQuery({
    queryKey: qk.ticketsBalance,
    queryFn: fetchTicketsBalance,
    enabled: isAuthed,
  });
  const historyQ = useQuery({
    queryKey: qk.ticketsHistory(60),
    queryFn: () => fetchTicketsHistory(60),
    enabled: isAuthed,
  });

  const balance = balanceQ.data?.balance ?? 0;
  const entries = historyQ.data?.items ?? [];

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-5 md:py-8">
      <PageHeader title="Билеты" subtitle="Единая валюта клуба" />

      {/* Balance card */}
      <section
        aria-label="Баланс"
        className="relative mb-6 overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/15 via-card/60 to-black p-5"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/30 blur-3xl"
        />
        <div className="relative flex items-end justify-between gap-4">
          <div>
            <div className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
              Мой баланс
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-display text-5xl font-black italic leading-none tabular-nums text-foreground">
                {balanceQ.isLoading ? "…" : balance}
              </span>
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {pluralTickets(balance)}
              </span>
            </div>
          </div>
          <Link
            to="/club/raffles"
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-wider text-primary-foreground transition-all active:scale-95"
          >
            <Ticket className="h-3.5 w-3.5" />
            Поставить
          </Link>
        </div>
      </section>

      {/* Журнал */}
      <TicketLedger entries={entries} isLoading={historyQ.isLoading} />

      {/* Откуда взять билеты */}
      <section aria-label="Как набрать билеты" className="mb-2">
        <div className="mb-2 flex items-end justify-between px-1">
          <h2 className="font-display text-sm font-black uppercase italic tracking-widest text-foreground">
            Как набрать билеты
          </h2>
        </div>
        <ul className="overflow-hidden rounded-2xl border border-white/[0.06] bg-card/40 divide-y divide-white/[0.05]">
          <EarnRow
            title="Покупки в магазине"
            hint="К каждому товару — свой бонус билетов, указан на карточке"
            to="/shop"
            icon={<ShoppingBag className="h-4 w-4" />}
          />
          <EarnRow
            title="Hell Pass"
            hint="Silver / Gold / Platinum — пакет билетов при покупке пасса"
            to="/club/hell-pass"
            icon={<Ticket className="h-4 w-4" />}
          />
          <EarnRow
            title="Квесты и активность"
            hint="Задания клуба — за каждое начисляются билеты"
            to="/club/quests"
            icon={<Trophy className="h-4 w-4" />}
          />
        </ul>
      </section>
    </main>
  );
}

function EarnRow({
  title,
  hint,
  icon,
  to,
}: {
  title: string;
  hint: string;
  icon: React.ReactNode;
  to: "/shop" | "/club/hell-pass" | "/club/quests";
}) {
  return (
    <li>
      <Link
        to={to}
        className="flex items-center gap-3 px-4 py-3.5 transition-colors active:bg-white/[0.05]"
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold text-foreground">{title}</span>
          <span className="mt-0.5 block truncate text-[12px] text-muted-foreground">{hint}</span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/70" />
      </Link>
    </li>
  );
}

function pluralTickets(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "билет";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "билета";
  return "билетов";
}
