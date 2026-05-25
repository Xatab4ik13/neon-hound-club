// Карточка баланса в форме отрывного билета.
// Слева — основная часть с числом и CTA, справа — узкий «корешок».
// Полукруглые вырезы по бокам пунктирной линии отрыва имитируют перфорацию.
// Сверху — лёгкая глянцевая засветка и медленный «шиммер» в стиле iOS.

import { Link } from "@tanstack/react-router";
import { Ticket } from "lucide-react";


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
}: {
  balance: number;
  isLoading?: boolean;
}) {
  const STUB_W = 44; // ширина «корешка» в px

  // Размер числа подстраиваем под длину — чтобы 1 000 000 не вылетал за край.
  const formatted = isLoading ? "—" : balance.toLocaleString("ru-RU");
  const len = formatted.length;
  const numberSize =
    len <= 4 ? "text-[76px]" : len <= 6 ? "text-[60px]" : len <= 8 ? "text-[48px]" : "text-[38px]";

  return (
    <section aria-label="Баланс билетов" className="relative mb-6">
      <div className="relative flex h-[220px] overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/15 via-card/70 to-black shadow-[0_8px_28px_-12px_color-mix(in_oklab,var(--primary)_45%,transparent)]">
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
        {/* верхний глянец — узкая полоса света сверху, как на iOS-карточках */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/[0.09] to-transparent"
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

          <div className="flex items-end justify-between gap-4">
            <div className="flex min-w-0 items-baseline gap-2">
              <span
                className={`${numberSize} font-semibold leading-none tabular-nums text-foreground`}
              >
                {formatted}
              </span>
              <span className="pb-1.5 text-[14px] text-muted-foreground">
                {pluralTickets(balance)}
              </span>
            </div>

            <Link
              to="/club/raffles"
              aria-label="Поставить билеты"
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 text-[13px] font-semibold text-primary-foreground shadow-[0_4px_14px_-4px_color-mix(in_oklab,var(--primary)_70%,transparent)] transition-all active:scale-[0.97] hover:brightness-110"
            >
              <Ticket className="h-3.5 w-3.5" strokeWidth={2.2} />
              Поставить
            </Link>
          </div>
        </div>

        {/* линия отрыва */}
        <div aria-hidden className="relative shrink-0" style={{ width: 0 }}>
          <div
            className="absolute inset-y-3"
            style={{
              left: -0.5,
              borderLeft: "1.5px dashed color-mix(in oklab, white 18%, transparent)",
            }}
          />
        </div>

        {/* «корешок» — только декоративные точки */}
        <div
          className="relative z-10 flex shrink-0 flex-col items-center justify-center gap-1.5 py-5"
          style={{ width: STUB_W }}
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <span
              key={i}
              className="h-1 w-1 rounded-full bg-muted-foreground/40"
            />
          ))}
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
