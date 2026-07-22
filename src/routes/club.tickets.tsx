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

  // Активный розыгрыш — первый со статусом "active" (бэк сортирует по дедлайну).
  const activeRaffle = (rafflesQ.data?.items ?? []).find((r) => r.status === "active") ?? null;

  // Если телефон не подтверждён — показываем плашку. Если у нас ещё нет данных профиля
  // или юзер не залогинен — ничего не показываем.
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
          className="group relative mb-5 flex items-center gap-3 rounded-2xl border-[2px] border-foreground bg-card px-4 py-3 shadow-[4px_4px_0_0_hsl(var(--foreground))] transition-transform active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_0_hsl(var(--foreground))]"
        >
          <span className="absolute -left-1.5 -top-2.5 z-10 inline-flex -rotate-3 items-center gap-1 rounded-lg border-[2px] border-foreground bg-[#B6FF3C] px-2 py-0.5 font-display text-[10px] font-black uppercase italic tracking-tight text-black shadow-[2px_2px_0_0_hsl(var(--foreground))]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-black" />
            Идёт сейчас
          </span>
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border-[2px] border-foreground bg-[#C6A8FF] shadow-[2px_2px_0_0_hsl(var(--foreground))]">
            <Trophy className="h-4 w-4 text-black" />
          </span>
          <span className="min-w-0 flex-1 pt-1">
            <span className="block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Активный розыгрыш
            </span>
            <span className="mt-0.5 block truncate text-[14px] font-semibold text-foreground">
              {activeRaffle.title}
            </span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-foreground/70" />
        </Link>
      )}

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
        <ul className="overflow-hidden rounded-2xl border-[2px] border-foreground bg-card shadow-[4px_4px_0_0_hsl(var(--foreground))]">
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
            icon={<Trophy className="h-4 w-4 text-black" />}
            tone="bg-[#B6FF3C]"
          />
        </ul>
      </section>
    </main>
  );
}

/**
 * Плашка «телефон не подтверждён» — клик ведёт в профиль и сразу открывает
 * SettingsModal на вкладке «Профиль» (см. validateSearch в club.me).
 */
function PhoneVerifyBanner() {
  return (
    <Link
      to="/club/me"
      search={{ settings: "1" }}
      className="mb-4 flex items-center gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/[0.06] px-4 py-3 transition-colors active:bg-amber-400/[0.12]"
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-400/15 text-amber-300">
        <ShieldAlert className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-semibold text-foreground">
          Номер телефона не подтверждён
        </span>
        <span className="mt-0.5 block truncate text-[12px] text-muted-foreground">
          Нужно для участия в розыгрышах
        </span>
      </span>
      <span className="shrink-0 font-mono text-[11px] font-bold uppercase tracking-wider text-amber-300">
        Подтвердить
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-amber-300/70" />
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
    <li className="border-b border-white/[0.05] last:border-b-0">
      <Link
        to={to}
        className="flex items-center gap-3 px-4 py-3.5 transition-colors active:bg-white/[0.04]"
      >
        <span
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl border-[2px] border-foreground ${tone} shadow-[2px_2px_0_0_hsl(var(--foreground))]`}
        >
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
