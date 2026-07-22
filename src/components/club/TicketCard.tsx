// Plump-стилизованная карточка баланса: билет с перфорацией по вертикали,
// слева — число + подпись, справа «корешок» с CTA. Толстая рамка, hard-shadow,
// жёлтый стикер-иконка билета сверху.

import { Link } from "@tanstack/react-router";
import { PlumpTicket } from "@/components/ui/icons";
import { PlumpNum } from "@/components/brand/PlumpNum";

function pluralTickets(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "билет";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "билета";
  return "билетов";
}

export function TicketCard({
  balance,
  isLoading,
  isError,
  onRetry,
}: {
  balance: number;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
}) {
  const empty = !isLoading && !isError && balance === 0;
  const STUB_W = 116;

  const formatted = isLoading ? "—" : balance.toLocaleString("ru-RU");
  const len = formatted.length;
  const numberSize = len <= 4 ? 64 : len <= 6 ? 52 : len <= 8 ? 40 : 32;

  return (
    <section aria-label="Баланс билетов" className="relative mb-8 animate-fade-in">
      {/* жёлтый стикер-иконка сверху слева, как «печать» на билете */}
      <span className="absolute -left-2 -top-3 z-20 inline-flex -rotate-3 items-center gap-1.5 rounded-2xl border-[3px] border-foreground bg-[#FFD93D] px-2.5 py-1 font-display text-[11px] font-black uppercase italic tracking-tighter text-black shadow-[3px_3px_0_0_hsl(var(--foreground))]">
        <PlumpTicket className="h-3.5 w-3.5" />
        Мой баланс
      </span>

      <div className="relative flex h-[188px] overflow-hidden rounded-3xl border-[3px] border-foreground bg-card shadow-[6px_6px_0_0_hsl(var(--foreground))]">
        {/* основная часть */}
        <div className="relative z-10 flex min-w-0 flex-1 flex-col justify-end py-5 pl-5 pr-4">
          <div className="flex items-end gap-2">
            <span className="text-foreground">
              {isLoading ? (
                <span className="font-display text-[64px] font-black italic leading-none">—</span>
              ) : (
                <PlumpNum value={balance} size={numberSize} format />
              )}
            </span>
            <span className="pb-2 font-mono text-[12px] font-bold uppercase tracking-widest text-muted-foreground">
              {pluralTickets(balance)}
            </span>
          </div>

          {isError && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-2 self-start font-mono text-[11px] font-bold uppercase tracking-widest text-[#B6FF3C] active:opacity-70"
            >
              Повторить загрузку
            </button>
          )}
        </div>

        {/* линия отрыва */}
        <div aria-hidden className="relative shrink-0" style={{ width: 0 }}>
          <div
            className="absolute inset-y-4"
            style={{
              left: -1.5,
              borderLeft: "3px dashed hsl(var(--foreground))",
            }}
          />
        </div>

        {/* «корешок» — CTA */}
        <div
          className="relative z-10 flex shrink-0 items-center justify-center px-3"
          style={{ width: STUB_W }}
        >
          {empty ? (
            <Link
              to="/club/quests"
              aria-label="Набрать билеты — перейти к квестам"
              className="inline-flex flex-col items-center justify-center gap-1 rounded-2xl border-[3px] border-foreground bg-[#B6FF3C] px-3 py-3 font-display text-[12px] font-black uppercase italic tracking-tighter text-black shadow-[3px_3px_0_0_hsl(var(--foreground))] transition-all active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0_0_hsl(var(--foreground))]"
            >
              <PlumpTicket className="h-5 w-5" />
              Набрать
            </Link>
          ) : (
            <Link
              to="/club/raffles"
              aria-label="Поставить билеты"
              className="inline-flex flex-col items-center justify-center gap-1 rounded-2xl border-[3px] border-foreground bg-[#B6FF3C] px-3 py-3 font-display text-[12px] font-black uppercase italic tracking-tighter text-black shadow-[3px_3px_0_0_hsl(var(--foreground))] transition-all active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0_0_hsl(var(--foreground))]"
            >
              <PlumpTicket className="h-5 w-5" />
              Поставить
            </Link>
          )}
        </div>

        {/* перфорация */}
        <div
          aria-hidden
          className="absolute h-5 w-5 rounded-full border-[3px] border-foreground bg-background"
          style={{ top: -12, right: STUB_W - 10 }}
        />
        <div
          aria-hidden
          className="absolute h-5 w-5 rounded-full border-[3px] border-foreground bg-background"
          style={{ bottom: -12, right: STUB_W - 10 }}
        />
      </div>
    </section>
  );
}
