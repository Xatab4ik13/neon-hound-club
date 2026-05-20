import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Ticket } from "lucide-react";
import {
  SOURCE_META,
  TICKET_LEDGER,
  summarizeLedger,
  type TicketSource,
} from "@/data/tickets-ledger";

/**
 * Журнал билетов. Полностью на фронт-моках сейчас (data/tickets-ledger).
 * Контракт DTO стабильный — потом подменим источник на server fn.
 */
export function TicketLedger() {
  const [filter, setFilter] = useState<TicketSource | "all">("all");
  const [expanded, setExpanded] = useState(false);

  const all = TICKET_LEDGER;
  const filtered = useMemo(
    () => (filter === "all" ? all : all.filter((e) => e.source === filter)),
    [all, filter],
  );
  const COLLAPSED = 6;
  const visible = expanded ? filtered : filtered.slice(0, COLLAPSED);
  const hiddenCount = Math.max(0, filtered.length - visible.length);

  const totals = useMemo(() => summarizeLedger(all), [all]);
  const visibleTotals = useMemo(() => summarizeLedger(filtered), [filtered]);

  const sources: (TicketSource | "all")[] = [
    "all",
    "pass",
    "cashback",
    "purchase",
    "raffle",
    "reward",
    "admin",
  ];

  return (
    <section aria-label="Журнал билетов" className="mb-10">
      <div className="mb-3 flex items-baseline justify-between border-b border-white/[0.06] pb-2">
        <h2 className="font-display text-sm font-black uppercase italic tracking-widest text-foreground">
          Журнал билетов
        </h2>
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          всего операций: {all.length}
        </span>
      </div>

      {/* Сводка */}
      <div className="mb-3 grid grid-cols-3 gap-2 sm:gap-3">
        <SummaryCard
          label="Баланс"
          value={totals.balance}
          accent="text-foreground"
          icon={<Ticket className="h-4 w-4 text-primary" strokeWidth={1.8} />}
        />
        <SummaryCard
          label="Получено"
          value={totals.income}
          prefix="+"
          accent="text-emerald-400"
          icon={<ArrowDown className="h-4 w-4 text-emerald-400" strokeWidth={2} />}
        />
        <SummaryCard
          label="Потрачено"
          value={totals.outcome}
          prefix="−"
          accent="text-muted-foreground"
          icon={<ArrowUp className="h-4 w-4 text-muted-foreground" strokeWidth={2} />}
        />
      </div>

      {/* Фильтр по источнику */}
      <div
        className="-mx-4 mb-3 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0 [&::-webkit-scrollbar]:hidden"
        role="tablist"
        aria-label="Фильтр по источнику"
      >
        {sources.map((s) => {
          const isActive = filter === s;
          const label = s === "all" ? "Все" : SOURCE_META[s].label;
          return (
            <button
              key={s}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setFilter(s)}
              className={
                "shrink-0 border px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] transition-colors " +
                (isActive
                  ? "border-primary/60 bg-primary/15 text-primary"
                  : "border-white/[0.08] bg-card/40 text-muted-foreground hover:border-white/30 hover:text-foreground")
              }
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Таблица */}
      <div className="overflow-hidden border border-white/[0.06] bg-card/40">
        {filtered.length === 0 ? (
          <div className="px-4 py-10 text-center font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            нет операций по фильтру
          </div>
        ) : (
          <ul className="divide-y divide-white/[0.04]">
            {filtered.map((e) => (
              <LedgerRow key={e.id} entry={e} />
            ))}
          </ul>
        )}
        {/* Подсумма по фильтру (когда применён) */}
        {filter !== "all" && filtered.length > 0 && (
          <div className="flex items-baseline justify-between border-t border-white/[0.06] bg-black/30 px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            <span>Итог по фильтру</span>
            <span className="tabular-nums">
              {visibleTotals.income > 0 && (
                <span className="text-emerald-400">+{visibleTotals.income}</span>
              )}
              {visibleTotals.income > 0 && visibleTotals.outcome > 0 && (
                <span className="mx-1 opacity-40">/</span>
              )}
              {visibleTotals.outcome > 0 && (
                <span className="text-foreground">−{visibleTotals.outcome}</span>
              )}
              {" "}
              <span className="opacity-60">билетов</span>
            </span>
          </div>
        )}
      </div>
    </section>
  );
}

function SummaryCard({
  label,
  value,
  prefix = "",
  accent,
  icon,
}: {
  label: string;
  value: number;
  prefix?: string;
  accent: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 border border-white/[0.06] bg-card/40 px-3 py-2.5 sm:gap-3 sm:px-4">
      <div className="hidden sm:block">{icon}</div>
      <div className="flex min-w-0 flex-col">
        <span
          className={
            "font-display text-xl font-black italic leading-none tabular-nums sm:text-2xl " +
            accent
          }
        >
          {prefix}
          {value.toLocaleString("ru-RU")}
        </span>
        <span className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground sm:text-[10px]">
          {label}
        </span>
      </div>
    </div>
  );
}

function LedgerRow({
  entry,
}: {
  entry: (typeof TICKET_LEDGER)[number];
}) {
  const isPositive = entry.delta > 0;
  const meta = SOURCE_META[entry.source];

  return (
    <li className="grid grid-cols-[1fr_auto] items-center gap-3 px-3 py-2.5 transition-colors hover:bg-white/[0.02] sm:grid-cols-[auto_1fr_auto] sm:gap-4 sm:px-4 sm:py-3">
      {/* Источник — на десктопе отдельной колонкой, на мобиле в шапке строки */}
      <div className="col-span-2 -mb-0.5 flex items-center gap-2 sm:col-span-1 sm:mb-0">
        <SourceTag tone={meta.tone}>{meta.label}</SourceTag>
        <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground/80 sm:hidden">
          {formatDate(entry.at)}
        </span>
      </div>

      {/* Описание */}
      <div className="min-w-0">
        <div className="truncate text-sm text-foreground">{entry.note}</div>
        <div className="hidden font-mono text-[10px] uppercase tracking-wider text-muted-foreground sm:block">
          {formatDate(entry.at)}
          {entry.ref?.label && (
            <>
              <span className="mx-1.5 opacity-40">·</span>
              <span className="text-muted-foreground/80">{entry.ref.label}</span>
            </>
          )}
        </div>
      </div>

      {/* Сумма */}
      <div
        className={
          "whitespace-nowrap text-right font-mono text-sm font-bold tabular-nums " +
          (isPositive ? "text-emerald-400" : "text-foreground")
        }
      >
        {isPositive ? "+" : "−"}
        {Math.abs(entry.delta)}
        <span className="ml-1 font-normal text-muted-foreground/70 text-[10px] uppercase tracking-wider">
          бил.
        </span>
      </div>
    </li>
  );
}

function SourceTag({
  tone,
  children,
}: {
  tone: "green" | "pink" | "amber" | "violet" | "neutral" | "red";
  children: React.ReactNode;
}) {
  const toneMap: Record<typeof tone, string> = {
    green:   "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
    pink:    "border-primary/40 bg-primary/10 text-primary",
    amber:   "border-amber-500/40 bg-amber-500/10 text-amber-300",
    violet:  "border-violet-400/40 bg-violet-400/10 text-violet-300",
    neutral: "border-white/[0.1] bg-white/[0.03] text-muted-foreground",
    red:     "border-red-500/40 bg-red-500/10 text-red-300",
  };
  return (
    <span
      className={
        "whitespace-nowrap border px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.2em] " +
        toneMap[tone]
      }
    >
      {children}
    </span>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}.${mm}.${yy} · ${hh}:${mi}`;
}
