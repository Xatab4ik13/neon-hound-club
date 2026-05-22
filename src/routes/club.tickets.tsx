import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ChevronRight,
  ShoppingBag,
  Ticket,
  Trophy,
} from "lucide-react";
import { Countdown } from "@/components/club/Countdown";
import { TicketLedger } from "@/components/club/TicketLedger";
import { COMPLETED_RAFFLES } from "@/data/my-raffles";
import { ACTIVE_TICKETS } from "@/data/profile";
import { TICKET_LEDGER, summarizeLedger } from "@/data/tickets-ledger";
import { PageHeader } from "@/components/club/PageHeader";

export const Route = createFileRoute("/club/tickets")({
  head: () => ({
    meta: [
      { title: "Билеты — клуб HELLHOUND" },
      { name: "description", content: "Мои билеты, активные розыгрыши и история начислений." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TicketsPage,
});

function TicketsPage() {
  const balance = summarizeLedger(TICKET_LEDGER).balance;
  const wonCount = COMPLETED_RAFFLES.filter((r) => r.status === "won").length;

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
                {balance}
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

      {/* Активные розыгрыши */}
      <section aria-label="Активные розыгрыши" className="mb-6">
        <SectionHeader
          title={`Активные · ${ACTIVE_TICKETS.length}`}
          actionLabel="Все"
          to="/club/raffles"
        />
        <ul className="overflow-hidden rounded-2xl border border-white/[0.06] bg-card/40 divide-y divide-white/[0.05]">
          {ACTIVE_TICKETS.map((t) => (
            <li key={t.id}>
              <Link
                to="/club/raffles/$raffleId"
                params={{ raffleId: t.id }}
                className="flex items-center gap-3 px-3 py-3 transition-colors active:bg-white/[0.05]"
              >
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-white/[0.06] bg-black">
                  <img
                    src={t.image}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                  <span className="absolute left-1 top-1 inline-flex items-center gap-1 rounded-sm bg-primary px-1.5 py-px font-mono text-[8px] font-black uppercase tracking-wider text-primary-foreground">
                    <span className="h-1 w-1 animate-pulse rounded-full bg-white" />
                    LIVE
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15px] font-semibold text-foreground">
                    {t.title}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-[12px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Ticket className="h-3 w-3 text-primary" />
                      <span className="tabular-nums text-foreground/85">
                        {t.myTickets}
                      </span>
                    </span>
                    <span className="opacity-40">·</span>
                    <Countdown deadlineAt={t.deadlineAt} compact />
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/70" />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Завершённые */}
      {COMPLETED_RAFFLES.length > 0 && (
        <section aria-label="Завершённые" className="mb-6">
          <SectionHeader
            title="Завершённые"
            hint={`${wonCount} выиграно из ${COMPLETED_RAFFLES.length}`}
          />
          <ul className="overflow-hidden rounded-2xl border border-white/[0.06] bg-card/40 divide-y divide-white/[0.05]">
            {COMPLETED_RAFFLES.map((r) => {
              const won = r.status === "won";
              return (
                <li key={r.id}>
                  <div className="flex items-center gap-3 px-3 py-3">
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
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Журнал */}
      <section aria-label="Журнал начислений" className="mb-6">
        <SectionHeader title="Журнал начислений" />
        <TicketLedger />
      </section>

      {/* Откуда взять билеты */}
      <section aria-label="Как набрать билеты" className="mb-2">
        <SectionHeader title="Как набрать билеты" />
        <ul className="overflow-hidden rounded-2xl border border-white/[0.06] bg-card/40 divide-y divide-white/[0.05]">
          <EarnRow
            title="Покупки в магазине"
            hint="1 билет за каждые 200 ₽ заказа"
            to="/shop"
            icon={<ShoppingBag className="h-4 w-4" />}
          />
          <EarnRow
            title="Hell Pass"
            hint="Silver 2 · Gold 7 · Platinum 18 / мес"
            to="/club/hell-pass"
            icon={<Ticket className="h-4 w-4" />}
          />
          <EarnRow
            title="Квесты и активность"
            hint="Ежемесячные задания клуба"
            to="/club/quests"
            icon={<Trophy className="h-4 w-4" />}
          />
        </ul>
      </section>
    </main>
  );
}

function SectionHeader({
  title,
  hint,
  actionLabel,
  to,
}: {
  title: string;
  hint?: string;
  actionLabel?: string;
  to?: "/club/raffles";
}) {
  return (
    <div className="mb-2 flex items-end justify-between px-1">
      <h2 className="font-display text-sm font-black uppercase italic tracking-widest text-foreground">
        {title}
      </h2>
      {actionLabel && to ? (
        <Link
          to={to}
          className="flex items-center gap-0.5 font-mono text-[11px] font-bold uppercase tracking-wider text-primary active:opacity-60"
        >
          {actionLabel}
          <ChevronRight className="h-3 w-3" />
        </Link>
      ) : hint ? (
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {hint}
        </span>
      ) : null}
    </div>
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
