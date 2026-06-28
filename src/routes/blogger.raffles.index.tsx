// Список розыгрышей блогера. Реальные данные с бекенда.

import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Trophy, Users, PlumpTicket as TicketIcon } from "@/components/ui/icons";
import { bloggerQk, fetchBloggerRaffles } from "@/lib/blogger-raffles";

export const Route = createFileRoute("/blogger/raffles/")({
  component: BloggerRafflesPage,
});

function BloggerRafflesPage() {
  const { data, isLoading } = useQuery({
    queryKey: bloggerQk.list,
    queryFn: fetchBloggerRaffles,
  });
  const items = data?.items ?? [];

  return (
    <main className="relative flex-1 px-4 py-8 md:px-8 md:py-10">
      <div className="mx-auto max-w-5xl">
        <h1 className="font-display text-3xl font-black italic uppercase tracking-tight md:text-4xl">
          Розыгрыши
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Выбери розыгрыш и запусти рандомайзер на стриме. Шансы пропорциональны
          количеству заявок. Один билет = одна заявка, выигравший билет выбывает.
        </p>

        {isLoading ? (
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton-shimmer h-40 rounded-2xl" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="mt-10 text-sm text-muted-foreground">Розыгрышей пока нет</p>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {items.map((r) => {
              const remainSlots = Math.max(0, r.totalSlots - r.totalWinners);
              const statusLabel =
                r.status === "finished"
                  ? "Завершён"
                  : r.status === "cancelled"
                    ? "Отменён"
                    : r.status === "draft"
                      ? "Черновик"
                      : "Активен";
              return (
                <Link
                  key={r.id}
                  to="/blogger/raffles/$raffleId"
                  params={{ raffleId: r.id }}
                  className="group relative flex flex-col border border-white/[0.08] bg-card/40 p-5 transition-colors hover:border-primary/50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="font-display text-xl font-black italic uppercase tracking-tight transition-colors group-hover:text-primary">
                      {r.title}
                    </h2>
                    <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                  </div>
                  {r.description && (
                    <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">
                      {r.description}
                    </p>
                  )}

                  <div className="mt-4 grid grid-cols-3 gap-3 border-t border-white/[0.06] pt-4">
                    <Stat icon={<Users className="h-3.5 w-3.5" />} label="заявок" value={r.totalEntries} />
                    <Stat icon={<TicketIcon className="h-3.5 w-3.5" />} label="цена" value={`${r.ticketCost} 🎟`} />
                    <Stat
                      icon={<Trophy className="h-3.5 w-3.5" />}
                      label="призов"
                      value={`${remainSlots}/${r.totalSlots}`}
                    />
                  </div>

                  <div className="mt-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    {statusLabel}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className="font-display text-lg font-black italic">{value}</span>
    </div>
  );
}
