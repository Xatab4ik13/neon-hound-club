import { useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { PlumpNum } from "@/components/brand/PlumpNum";
import type { LedgerEntry, BackendTicketSource } from "@/lib/queries";

/**
 * История билетов в Plump-стиле: толстая рамка карточки, hard-shadow, цветные
 * сегментные чипы фильтра, строки-разделители 2px, знак операции — плашка
 * с цветным фоном (лайм / фиолет).
 */

const SOURCE_META: Record<
  BackendTicketSource,
  { label: string; bg: string }
> = {
  pass_monthly:  { label: "Hell Pass",      bg: "bg-[#C6A8FF]" },
  quest:         { label: "Квест",          bg: "bg-[#B6FF3C]" },
  product_bonus: { label: "Бонус за товар", bg: "bg-[#FFD93D]" },
  raffle_entry:  { label: "Розыгрыш",       bg: "bg-[#6EE7FF]" },
  admin:         { label: "Админ",          bg: "bg-white" },
  refund:        { label: "Возврат",        bg: "bg-white" },
};

const ALL_SOURCES: BackendTicketSource[] = [
  "pass_monthly",
  "quest",
  "product_bonus",
  "raffle_entry",
  "admin",
  "refund",
];

function summarize(entries: LedgerEntry[]) {
  let income = 0;
  let outcome = 0;
  for (const e of entries) {
    if (e.amount > 0) income += e.amount;
    else outcome += -e.amount;
  }
  return { income, outcome };
}

export function TicketLedger({
  entries,
  isLoading,
  isError,
  onRetry,
}: {
  entries: LedgerEntry[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
}) {
  const [filter, setFilter] = useState<BackendTicketSource | "all">("all");
  const [expanded, setExpanded] = useState(false);

  const filtered = useMemo(
    () => (filter === "all" ? entries : entries.filter((e) => e.source === filter)),
    [entries, filter],
  );
  const COLLAPSED = 3;
  const visible = expanded ? filtered : filtered.slice(0, COLLAPSED);
  const hiddenCount = Math.max(0, filtered.length - visible.length);

  const totals = useMemo(() => summarize(entries), [entries]);
  const visibleTotals = useMemo(() => summarize(filtered), [filtered]);

  const presentSources = useMemo(() => {
    const set = new Set(entries.map((e) => e.source));
    return ["all", ...ALL_SOURCES.filter((s) => set.has(s))] as Array<BackendTicketSource | "all">;
  }, [entries]);

  return (
    <section aria-label="История билетов" className="mb-8">
      <h2 className="mb-3 px-1 inline-flex items-center gap-1.5 font-display text-sm font-black uppercase italic tracking-widest text-foreground">
        История
      </h2>

      {/* Сводка */}
      {entries.length > 0 && (
        <div className="mb-4 grid grid-cols-2 gap-3">
          <SummaryTile
            label="Получено"
            value={totals.income}
            sign="+"
            bg="bg-[#B6FF3C]"
          />
          <SummaryTile
            label="Потрачено"
            value={totals.outcome}
            sign="−"
            bg="bg-[#C6A8FF]"
          />
        </div>
      )}

      {/* Фильтр — Plump-чипы */}
      {presentSources.length > 1 && (
        <div
          className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0 [&::-webkit-scrollbar]:hidden"
          role="tablist"
          aria-label="Фильтр по источнику"
        >
          {presentSources.map((s) => {
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
                  "shrink-0 rounded-full border-[3px] border-foreground px-3 py-1 font-display text-[11px] font-black uppercase italic tracking-tighter transition-transform active:translate-x-[1px] active:translate-y-[1px] " +
                  (isActive
                    ? "bg-foreground text-background shadow-[2px_2px_0_0_hsl(var(--foreground))]"
                    : "bg-card text-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))] active:shadow-[1px_1px_0_0_hsl(var(--foreground))]")
                }
              >
                {label}
              </button>
            );
          })}
        </div>
      )}

      <div className="overflow-hidden rounded-3xl border-[3px] border-foreground bg-card shadow-[4px_4px_0_0_hsl(var(--foreground))]">
        {isLoading && entries.length === 0 ? (
          <div>
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 border-b-[2px] border-foreground/80 px-4 py-3 last:border-b-0"
              >
                <Skeleton className="h-8 w-8 rounded-lg" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-1/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-6 w-14 rounded-md" />
              </div>
            ))}
          </div>
        ) : isError && entries.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
            <span className="font-mono text-[12px] font-bold uppercase tracking-widest text-muted-foreground">
              Не удалось загрузить историю
            </span>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="rounded-full border-[3px] border-foreground bg-[#B6FF3C] px-3 py-1 font-display text-[11px] font-black uppercase italic tracking-tighter text-black shadow-[2px_2px_0_0_hsl(var(--foreground))] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0_0_hsl(var(--foreground))]"
              >
                Повторить
              </button>
            )}
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-10 text-center font-mono text-[12px] font-bold uppercase tracking-widest text-muted-foreground">
            {entries.length === 0
              ? "Пока пусто — выполни первый квест, и сюда упадут билеты"
              : "Нет операций по фильтру"}
          </div>
        ) : (
          <ul>
            {visible.map((e, i) => (
              <LedgerRow key={e.id} entry={e} isLast={i === visible.length - 1 && hiddenCount === 0} />
            ))}
          </ul>
        )}

        {hiddenCount > 0 && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="block w-full border-t-[3px] border-foreground bg-card px-4 py-3 text-center font-display text-[12px] font-black uppercase italic tracking-tighter text-foreground transition-colors active:bg-foreground/10"
          >
            Показать ещё {hiddenCount}
          </button>
        )}
        {expanded && filtered.length > COLLAPSED && (
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="block w-full border-t-[3px] border-foreground bg-card px-4 py-3 text-center font-display text-[12px] font-black uppercase italic tracking-tighter text-foreground transition-colors active:bg-foreground/10"
          >
            Свернуть
          </button>
        )}

        {filter !== "all" && filtered.length > 0 && (
          <div className="flex items-center justify-between border-t-[3px] border-foreground bg-background/40 px-4 py-2.5 font-mono text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            <span>Итог по фильтру</span>
            <span className="inline-flex items-center gap-2 tabular-nums">
              {visibleTotals.income > 0 && (
                <span className="text-[#B6FF3C]">+{visibleTotals.income}</span>
              )}
              {visibleTotals.income > 0 && visibleTotals.outcome > 0 && (
                <span className="opacity-40">·</span>
              )}
              {visibleTotals.outcome > 0 && (
                <span className="text-[#C6A8FF]">−{visibleTotals.outcome}</span>
              )}
            </span>
          </div>
        )}
      </div>
    </section>
  );
}

function SummaryTile({
  label,
  value,
  sign,
  bg,
}: {
  label: string;
  value: number;
  sign: "+" | "−";
  bg: string;
}) {
  return (
    <div
      className={`flex flex-col rounded-2xl border-[3px] border-foreground ${bg} px-3 py-2.5 shadow-[3px_3px_0_0_hsl(var(--foreground))]`}
    >
      <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-black/70">
        {label}
      </span>
      <span className="mt-1 inline-flex items-baseline gap-1 text-black">
        <span className="font-display text-[20px] font-black italic leading-none">{sign}</span>
        <PlumpNum value={value} size={22} format className="text-black" />
      </span>
    </div>
  );
}

function LedgerRow({ entry, isLast }: { entry: LedgerEntry; isLast: boolean }) {
  const isPositive = entry.amount > 0;
  const meta = SOURCE_META[entry.source] ?? SOURCE_META.admin;

  return (
    <li
      className={
        "flex items-center gap-3 px-4 py-3 transition-colors active:bg-foreground/5 " +
        (isLast ? "" : "border-b-[2px] border-foreground/80")
      }
    >
      <span
        aria-hidden
        className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg border-[2px] border-foreground ${meta.bg}`}
      >
        <span className="font-display text-[13px] font-black italic leading-none text-black">
          {meta.label.charAt(0)}
        </span>
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-semibold text-foreground">{entry.reason}</div>
        <div className="mt-0.5 flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          <span>{meta.label}</span>
          <span className="opacity-40">·</span>
          <span>{formatDate(entry.createdAt)}</span>
        </div>
      </div>
      <div
        className={
          "shrink-0 whitespace-nowrap rounded-lg border-[2px] border-foreground px-2 py-0.5 font-display text-[13px] font-black italic tracking-tight tabular-nums " +
          (isPositive ? "bg-[#B6FF3C] text-black" : "bg-card text-foreground")
        }
      >
        {isPositive ? "+" : "−"}
        {Math.abs(entry.amount)}
      </div>
    </li>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  if (sameDay) return `сегодня · ${hh}:${mi}`;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}.${mm} · ${hh}:${mi}`;
}
