// Список розыгрышей для блогера. Использует общий стор с админкой.

import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, Trophy, Users, Ticket as TicketIcon } from "lucide-react";
import { useRaffles, totalTickets, totalPrizeQty, prizeRemaining } from "@/data/raffles-store";

export const Route = createFileRoute("/blogger/raffles/")({
  component: BloggerRafflesPage,
});

function BloggerRafflesPage() {
  const raffles = useRaffles();
  const now = Date.now();

  return (
    <main className="relative flex-1 px-4 py-8 md:px-8 md:py-10">
      <div className="mx-auto max-w-5xl">
        <h1 className="font-display text-3xl font-black italic uppercase tracking-tight md:text-4xl">
          Розыгрыши
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Выбери розыгрыш и запусти рандомайзер на стриме. Шансы — пропорциональны
          потраченным билетам. Выигравший билет выбывает.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {raffles.map((r) => {
            const remainPrizes = r.prizes.reduce((s, p) => s + prizeRemaining(p), 0);
            const status = r.endsAt && new Date(r.endsAt).getTime() < now ? "Завершён" : "Активен";
            return (
              <Link
                key={r.id}
                to="/blogger/raffles/$raffleId"
                params={{ raffleId: r.id }}
                className="group relative flex flex-col border border-white/[0.08] bg-card/40 p-5 transition-colors hover:border-primary/50"
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-display text-xl font-black italic uppercase tracking-tight transition-colors group-hover:text-primary">
                    {r.name}
                  </h2>
                  <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                </div>
                {r.description && (
                  <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">{r.description}</p>
                )}

                <div className="mt-4 grid grid-cols-3 gap-3 border-t border-white/[0.06] pt-4">
                  <Stat icon={<Users className="h-3.5 w-3.5" />} label="участ." value={r.participants.length} />
                  <Stat icon={<TicketIcon className="h-3.5 w-3.5" />} label="билеты" value={totalTickets(r)} />
                  <Stat
                    icon={<Trophy className="h-3.5 w-3.5" />}
                    label="призов"
                    value={`${remainPrizes}/${totalPrizeQty(r)}`}
                  />
                </div>

                <div className="mt-3 inline-flex w-fit border border-white/10 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {status} · до {r.endsAt || "—"}
                </div>
              </Link>
            );
          })}
        </div>

        {raffles.length === 0 && (
          <div className="mt-8 flex h-40 items-center justify-center border border-dashed border-white/[0.08] bg-white/[0.02] text-sm text-muted-foreground">
            Розыгрышей пока нет — создай в админке
          </div>
        )}
      </div>
    </main>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
        {icon} {label}
      </div>
      <div className="mt-0.5 font-display text-lg font-black italic tabular-nums">{value}</div>
    </div>
  );
}
