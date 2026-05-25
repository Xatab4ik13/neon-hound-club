// Карточка баланса в форме отрывного билета.
// Слева — основная часть с числом и CTA, справа — узкий «корешок» с серийником.
// Полукруглые вырезы по бокам пунктирной линии отрыва имитируют перфорацию.

import { Link } from "@tanstack/react-router";
import { Ticket } from "lucide-react";

function pluralTickets(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "билет";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "билета";
  return "билетов";
}

function serial(balance: number): string {
  // Стабильный «серийный» для красоты — не уникальный, просто декор.
  const n = (balance * 7 + 1024) % 1000000;
  return `№ ${String(n).padStart(6, "0")}`;
}

export function TicketCard({
  balance,
  isLoading,
}: {
  balance: number;
  isLoading?: boolean;
}) {
  const STUB_W = 56; // ширина «корешка» в px — совпадает с w-14

  return (
    <section aria-label="Баланс билетов" className="relative mb-6">
      <div
        className="relative flex h-[220px] overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/15 via-card/70 to-black shadow-[0_8px_28px_-12px_color-mix(in_oklab,var(--primary)_45%,transparent)]"
      >
        {/* мягкое свечение */}
        <div
          aria-hidden
          className="pointer-events-none absolute -left-8 -top-10 h-52 w-52 rounded-full bg-primary/25 blur-3xl"
        />
        {/* тонкая диагональная защитная сетка */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-overlay"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, #fff 0 1px, transparent 1px 8px)",
          }}
        />

        {/* основная часть */}
        <div className="relative z-10 flex min-w-0 flex-1 flex-col justify-between p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Мой баланс
            </span>
            <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground/70">
              HHR · Tickets
            </span>
          </div>

          <div className="flex items-end justify-between gap-3">
            <div className="flex items-baseline gap-2">
              <span className="text-[80px] font-semibold leading-none tabular-nums text-foreground">
                {isLoading ? "—" : balance.toLocaleString("ru-RU")}
              </span>
              <span className="pb-2 text-[15px] text-muted-foreground">
                {pluralTickets(balance)}
              </span>
            </div>

            <Link
              to="/club/raffles"
              className="flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-[0_6px_16px_-6px_color-mix(in_oklab,var(--primary)_70%,transparent)] transition-all active:scale-95"
            >
              <Ticket className="h-4 w-4" />
              Поставить
            </Link>
          </div>
        </div>

        {/* линия отрыва */}
        <div
          aria-hidden
          className="relative shrink-0"
          style={{ width: 0 }}
        >
          <div
            className="absolute inset-y-3"
            style={{
              left: -0.5,
              borderLeft: "1.5px dashed color-mix(in oklab, white 18%, transparent)",
            }}
          />
        </div>

        {/* «корешок» */}
        <div
          className="relative z-10 flex shrink-0 flex-col items-center justify-between py-5"
          style={{ width: STUB_W }}
        >
          <Ticket className="h-4 w-4 text-primary/80" strokeWidth={1.8} />
          <span
            className="text-[10px] font-medium uppercase tracking-[0.32em] text-muted-foreground"
            style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
          >
            HHR · Ticket
          </span>
          <span className="text-[9px] tabular-nums text-muted-foreground/70">
            {serial(balance)}
          </span>
        </div>

        {/* перфорация — полукруглые вырезы в цвет фона страницы */}
        <div
          aria-hidden
          className="absolute h-4 w-4 rounded-full bg-background"
          style={{ top: -8, right: STUB_W - 8 }}
        />
        <div
          aria-hidden
          className="absolute h-4 w-4 rounded-full bg-background"
          style={{ bottom: -8, right: STUB_W - 8 }}
        />
      </div>
    </section>
  );
}
