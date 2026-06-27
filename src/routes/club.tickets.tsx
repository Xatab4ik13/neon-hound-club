import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, ShoppingBag, Ticket, Trophy } from "lucide-react";
import { TicketLedger } from "@/components/club/TicketLedger";
import { TicketCard } from "@/components/club/TicketCard";
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
      <PageHeader title="Билеты" />

      <TicketCard
        balance={balance}
        isLoading={balanceQ.isLoading}
        isError={balanceQ.isError}
        onRetry={() => balanceQ.refetch()}
      />

      <TicketLedger
        entries={entries}
        isLoading={historyQ.isLoading}
        isError={historyQ.isError}
        onRetry={() => historyQ.refetch()}
      />

      {/* Откуда взять билеты — iOS inset list */}
      <section aria-label="Как набрать билеты" className="mb-2">
        <h2 className="mb-3 px-1 text-[17px] font-semibold text-foreground">
          Как набрать билеты
        </h2>
        <ul className="overflow-hidden rounded-2xl border border-white/[0.06] bg-card/40">
          <EarnRow
            title="Покупки в магазине"
            hint="К каждому товару — свой бонус билетов"
            to="/club/shop"
            icon={<ShoppingBag className="h-4 w-4" />}
          />
          <EarnRow
            title="Hell Pass"
            hint="Пакет билетов при покупке любого тира"
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
  to: "/club/shop" | "/club/hell-pass" | "/club/quests";
}) {
  return (
    <li className="border-b border-white/[0.05] last:border-b-0">
      <Link
        to={to}
        className="flex items-center gap-3 px-4 py-3.5 transition-colors active:bg-white/[0.04]"
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-medium text-foreground">{title}</span>
          <span className="mt-0.5 block truncate text-[12px] text-muted-foreground">{hint}</span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />
      </Link>
    </li>
  );
}

