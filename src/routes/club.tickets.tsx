import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  PlumpArrowRight as ChevronRight,
  Trophy,
  PlumpStore,
  PlumpTicket,
} from "@/components/ui/icons";
import { ShieldAlert } from "lucide-react";
import { TicketLedger } from "@/components/club/TicketLedger";
import { TicketCard } from "@/components/club/TicketCard";
import { PageHeader } from "@/components/club/PageHeader";
import {
  fetchTicketsBalance,
  fetchTicketsHistory,
  fetchHomeRaffles,
  qk,
} from "@/lib/queries";
import { useViewer } from "@/hooks/use-viewer";
import { useMyProfile } from "@/lib/garage-api";

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
  const profileQ = useMyProfile(isAuthed);
  const rafflesQ = useQuery({
    queryKey: qk.raffles,
    queryFn: fetchHomeRaffles,
    staleTime: 60_000,
  });

  const balance = balanceQ.data?.balance ?? 0;
  const entries = historyQ.data?.items ?? [];

  const activeRaffle = (rafflesQ.data?.items ?? []).find((r) => r.status === "active") ?? null;
  const phoneNeedsVerify = isAuthed && profileQ.data && !profileQ.data.phoneVerified;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-5 md:py-8">
      <PageHeader title="Билеты" />

      {phoneNeedsVerify && <PhoneVerifyBanner />}

      <TicketCard
        balance={balance}
        isLoading={balanceQ.isLoading}
        isError={balanceQ.isError}
        onRetry={() => balanceQ.refetch()}
      />

      {activeRaffle && (
        <Link
          to="/club/raffles/$raffleId"
          params={{ raffleId: activeRaffle.id }}
          className="group relative mb-8 flex items-center gap-3 rounded-3xl border-[3px] border-foreground bg-card px-4 py-3 shadow-[6px_6px_0_0_hsl(var(--foreground))] transition-transform active:translate-x-[2px] active:translate-y-[2px] active:shadow-[3px_3px_0_0_hsl(var(--foreground))]"
        >
          <span className="absolute -left-2 -top-3 z-10 inline-flex -rotate-3 items-center gap-1.5 rounded-2xl border-[3px] border-foreground bg-[#B6FF3C] px-2.5 py-1 font-display text-[10px] font-black uppercase italic tracking-tighter text-black shadow-[3px_3px_0_0_hsl(var(--foreground))]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-black" />
            Идёт сейчас
          </span>
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border-[3px] border-foreground bg-[#C6A8FF] shadow-[3px_3px_0_0_hsl(var(--foreground))]">
            <Trophy className="h-5 w-5 text-black" />
          </span>
          <span className="min-w-0 flex-1 pt-1">
            <span className="block font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Активный розыгрыш
            </span>
            <span className="mt-0.5 block truncate font-display text-[15px] font-black uppercase italic tracking-tight text-foreground">
              {activeRaffle.title}
            </span>
          </span>
          <ChevronRight className="h-5 w-5 shrink-0 text-foreground transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}

      <TicketLedger
        entries={entries}
        isLoading={historyQ.isLoading}
        isError={historyQ.isError}
        onRetry={() => historyQ.refetch()}
      />

      <section aria-label="Как набрать билеты" className="mb-2">
        <h2 className="mb-3 px-1 inline-flex items-center gap-1.5 font-display text-sm font-black uppercase italic tracking-widest text-foreground">
          Как набрать билеты
        </h2>
        <ul className="flex flex-col gap-3">
          <EarnRow
            title="Покупки в магазине"
            hint="К каждому товару — свой бонус билетов"
            to="/club/shop"
            icon={<PlumpStore className="h-5 w-5 text-black" />}
            tone="bg-[#FFD93D]"
          />
          <EarnRow
            title="Hell Pass"
            hint="Пакет билетов при покупке любого тира"
            to="/club/hell-pass"
            icon={<PlumpTicket className="h-5 w-5 text-black" />}
            tone="bg-[#C6A8FF]"
          />
          <EarnRow
            title="Квесты и активность"
            hint="Задания клуба — за каждое начисляются билеты"
            to="/club/quests"
            icon={<Trophy className="h-5 w-5 text-black" />}
            tone="bg-[#B6FF3C]"
          />
        </ul>
      </section>
    </main>
  );
}

function PhoneVerifyBanner() {
  return (
    <Link
      to="/club/me"
      search={{ settings: "1" }}
      className="mb-6 flex items-center gap-3 rounded-3xl border-[3px] border-foreground bg-[#FFD93D] px-4 py-3 shadow-[6px_6px_0_0_hsl(var(--foreground))] transition-transform active:translate-x-[2px] active:translate-y-[2px] active:shadow-[3px_3px_0_0_hsl(var(--foreground))]"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border-[3px] border-foreground bg-background shadow-[3px_3px_0_0_hsl(var(--foreground))]">
        <ShieldAlert className="h-5 w-5 text-[#FFD93D]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-[14px] font-black uppercase italic tracking-tight text-black">
          Телефон не подтверждён
        </span>
        <span className="mt-0.5 block truncate font-mono text-[10px] font-bold uppercase tracking-widest text-black/70">
          Нужно для участия в розыгрышах
        </span>
      </span>
      <span className="shrink-0 rounded-full border-[3px] border-foreground bg-foreground px-3 py-1 font-display text-[11px] font-black uppercase italic tracking-tighter text-background shadow-[2px_2px_0_0_hsl(var(--foreground))]">
        Подтвердить
      </span>
    </Link>
  );
}

function EarnRow({
  title,
  hint,
  icon,
  to,
  tone,
}: {
  title: string;
  hint: string;
  icon: React.ReactNode;
  to: "/club/shop" | "/club/hell-pass" | "/club/quests";
  tone: string;
}) {
  return (
    <li>
      <Link
        to={to}
        className="flex items-center gap-3 rounded-2xl border-[3px] border-foreground bg-card px-3 py-3 shadow-[4px_4px_0_0_hsl(var(--foreground))] transition-transform active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_0_hsl(var(--foreground))]"
      >
        <span
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border-[3px] border-foreground ${tone} shadow-[3px_3px_0_0_hsl(var(--foreground))]`}
        >
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-[15px] font-black uppercase italic tracking-tight text-foreground">
            {title}
          </span>
          <span className="mt-0.5 block truncate text-[12px] text-muted-foreground">{hint}</span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      </Link>
    </li>
  );
}
