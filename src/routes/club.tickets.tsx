import { createFileRoute, Link } from "@tanstack/react-router";
import { Countdown } from "@/components/club/Countdown";
import { TicketLedger } from "@/components/club/TicketLedger";
import { COMPLETED_RAFFLES } from "@/data/my-raffles";
import { ACTIVE_TICKETS } from "@/data/profile";
import { TICKET_LEDGER, summarizeLedger } from "@/data/tickets-ledger";
import { ArrowRight, Trophy } from "lucide-react";
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
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 md:px-8 md:py-10">
      <PageHeader title="Билеты" subtitle={`Баланс: ${balance.toLocaleString("ru-RU")}`} />

      <section aria-label="Мои розыгрыши" className="mb-10">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="font-display text-xl font-black uppercase italic tracking-tight text-foreground md:text-2xl">
            Активные розыгрыши
          </h2>
          <Link
            to="/club/raffles"
            className="group flex items-center gap-1 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-primary"
          >
            Все розыгрыши
            <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {ACTIVE_TICKETS.map((t, idx) => {
            const code = `${String(idx + 1).padStart(3, "0")}-${t.id.toUpperCase()}`;
            return (
              <article
                key={t.id}
                className="group relative flex overflow-hidden border border-white/[0.06] bg-card/40 shadow-[0_0_20px_rgba(255,0,127,0.04)] transition-all duration-500 hover:border-primary/60"
              >
                <div className="relative w-[45%] shrink-0 overflow-hidden border-r border-white/[0.06] bg-black">
                  <img
                    src={t.image}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover opacity-80 transition-transform duration-700 group-hover:scale-110"
                  />
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-card/90"
                  />
                  <div className="absolute left-3 top-3">
                    <div className="flex items-center gap-2 bg-primary px-2 py-0.5 font-mono text-[10px] font-black uppercase tracking-wider text-primary-foreground shadow-lg shadow-primary/40">
                      <span className="block h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                      LIVE
                    </div>
                  </div>
                </div>

                <div className="relative flex min-w-0 flex-1 flex-col justify-between gap-4 p-5">
                  <div>
                    <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground/70">
                      ID: {code}
                    </div>
                    <h3 className="truncate font-display text-xl font-black uppercase italic tracking-tight text-foreground transition-colors group-hover:text-primary">
                      {t.title}
                    </h3>
                    <div className="mt-3 flex items-end gap-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-4xl font-bold leading-none tabular-nums tracking-tighter text-foreground">
                          {t.myTickets}
                        </span>
                        <span className="font-mono text-[10px] font-bold uppercase leading-tight text-muted-foreground">
                          моих
                          <br />
                          билетов
                        </span>
                      </div>
                      <div className="ml-auto text-right">
                        <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70">
                          шанс
                        </div>
                        <div className="font-mono text-lg font-bold tabular-nums text-primary">
                          {((t.myTickets / t.totalTickets) * 100).toFixed(2)}%
                        </div>
                        <div className="font-mono text-[10px] tabular-nums text-muted-foreground">
                          из {t.totalTickets.toLocaleString("ru-RU")}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-white/[0.06] pt-3">
                    <div className="mb-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                      <span>до завершения</span>
                      <span className="font-bold text-primary">● RUNNING</span>
                    </div>
                    <Countdown deadlineAt={t.deadlineAt} variant="tactical" />
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {COMPLETED_RAFFLES.length > 0 && (
          <div className="mt-8">
            <div className="mb-3 flex items-baseline justify-between">
              <h3 className="font-display text-lg font-black uppercase italic tracking-tight text-muted-foreground">
                Завершённые · {COMPLETED_RAFFLES.length}
              </h3>
              <span className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
                {COMPLETED_RAFFLES.filter((r) => r.status === "won").length}{" "}
                <span className="text-green-400">выиграно</span>
              </span>
            </div>
            <ul className="grid gap-2 md:grid-cols-2">
              {COMPLETED_RAFFLES.map((r) => {
                const won = r.status === "won";
                return (
                  <li
                    key={r.id}
                    className={`group flex items-center gap-3 border bg-card/40 p-3 transition-colors ${
                      won
                        ? "border-green-500/30 hover:border-green-500/60"
                        : "border-white/[0.04] hover:border-white/[0.12]"
                    }`}
                  >
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden border border-white/[0.06] bg-black">
                      <img src={r.image} alt="" loading="lazy" className="h-full w-full object-cover opacity-80" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Trophy className={`h-3 w-3 shrink-0 ${won ? "text-green-400" : "text-muted-foreground/40"}`} />
                        <span className="truncate text-sm font-bold text-foreground">{r.title}</span>
                      </div>
                      <div className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        {r.date} · {r.myTickets} из {r.totalTickets.toLocaleString("ru-RU")} билетов
                        {!won && r.winnerNick && (
                          <>
                            {" · "}
                            <span className="text-foreground/70">@{r.winnerNick}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <span
                      className={`shrink-0 whitespace-nowrap border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] ${
                        won ? "border-green-500/50 text-green-400" : "border-white/[0.1] text-muted-foreground"
                      }`}
                    >
                      {won ? r.delivery ?? "Выигрыш" : "Не выиграл"}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>

      <section aria-label="Журнал билетов">
        <h2 className="mb-4 font-display text-xl font-black uppercase italic tracking-tight text-foreground md:text-2xl">
          Журнал начислений
        </h2>
        <TicketLedger />
      </section>
    </main>
  );
}
