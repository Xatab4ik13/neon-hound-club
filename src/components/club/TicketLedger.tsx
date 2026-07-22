import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp } from "@/components/ui/icons";
import { Skeleton } from "@/components/ui/skeleton";
import type { LedgerEntry, BackendTicketSource } from "@/lib/queries";

/**
 * Журнал билетов в iOS-стиле: скруглённые контейнеры, сегментный фильтр,
 * строка = цветная точка источника + название + дата + сумма.
 */

const SOURCE_META: Record<
  BackendTicketSource,
  { label: string; dot: string }
> = {
  pass_monthly:  { label: "Hell Pass",      dot: "bg-[#C6A8FF]" },
  quest:         { label: "Квест",          dot: "bg-[#B6FF3C]" },
  product_bonus: { label: "Бонус за товар", dot: "bg-[#FFD93D]" },
  raffle_entry:  { label: "Розыгрыш",       dot: "bg-[#FF8A3D]" },
  admin:         { label: "Админ",          dot: "bg-white/40" },
  refund:        { label: "Возврат",        dot: "bg-[#6EE7FF]" },
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
  const COLLAPSED = 2;
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
      <h2 className="mb-3 px-1 text-[17px] font-semibold text-foreground">
        История
      </h2>

      {/* Сводка — только когда есть операции (баланс уже сверху) */}
      {entries.length > 0 && (
        <div className="mb-3 grid grid-cols-2 gap-2">
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
            muted
          />
        </div>
      )}

      {/* iOS-сегментный фильтр */}
      {presentSources.length > 1 && (
        <div
          className="-mx-4 mb-3 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0 [&::-webkit-scrollbar]:hidden"
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
                  "shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors " +
                  (isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-white/[0.06] text-muted-foreground active:bg-white/[0.1]")
                }
              >
                {label}
              </button>
            );
          })}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-card/40">
        {isLoading && entries.length === 0 ? (
          <div>
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 border-b border-white/[0.04] px-4 py-3 last:border-b-0">
                <Skeleton className="h-2 w-2 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-1/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-4 w-12 rounded-md" />
              </div>
            ))}
          </div>
        ) : isError && entries.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
            <span className="text-[13px] text-muted-foreground">Не удалось загрузить историю</span>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="text-[13px] font-medium text-primary active:opacity-70"
              >
                Повторить
              </button>
            )}
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-10 text-center text-[13px] text-muted-foreground">
            {entries.length === 0
              ? "Пока пусто — выполни первый квест, и сюда упадут билеты"
              : "Нет операций по фильтру"}
          </div>
        ) : (
          <ul className="divide-y divide-white/[0.05]">
            {visible.map((e) => (
              <LedgerRow key={e.id} entry={e} />
            ))}
          </ul>
        )}

        {hiddenCount > 0 && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="block w-full border-t border-white/[0.06] px-4 py-3 text-center text-[13px] font-medium text-muted-foreground transition-colors active:bg-white/[0.04]"
          >
            Показать ещё {hiddenCount}
          </button>
        )}
        {expanded && filtered.length > COLLAPSED && (
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="block w-full border-t border-white/[0.06] px-4 py-3 text-center text-[13px] font-medium text-muted-foreground transition-colors active:bg-white/[0.04]"
          >
            Свернуть
          </button>
        )}

        {filter !== "all" && filtered.length > 0 && (
          <div className="flex items-center justify-between border-t border-white/[0.06] bg-black/20 px-4 py-2.5 text-[12px] text-muted-foreground">
            <span>Итог по фильтру</span>
            <span className="tabular-nums">
              {visibleTotals.income > 0 && (
                <span className="text-emerald-400">+{visibleTotals.income}</span>
              )}
              {visibleTotals.income > 0 && visibleTotals.outcome > 0 && (
                <span className="mx-1 opacity-40">·</span>
              )}
              {visibleTotals.outcome > 0 && (
                <span className="text-foreground">−{visibleTotals.outcome}</span>
              )}
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
  muted = false,
}: {
  label: string;
  value: number;
  prefix?: string;
  accent: string;
  icon: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-card/40 px-4 py-3">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/[0.04]">
        {icon}
      </div>
      <div className="flex min-w-0 flex-col">
        <span
          className={
            (muted ? "text-[18px] font-medium" : "text-[22px] font-semibold") +
            " leading-none tabular-nums " +
            accent
          }
        >
          {prefix}
          {value.toLocaleString("ru-RU")}
        </span>
        <span className="mt-1 text-[12px] text-muted-foreground">{label}</span>
      </div>
    </div>
  );
}

function LedgerRow({ entry }: { entry: LedgerEntry }) {
  const isPositive = entry.amount > 0;
  const meta = SOURCE_META[entry.source] ?? SOURCE_META.admin;

  return (
    <li className="flex items-center gap-3 px-4 py-3 transition-colors active:bg-white/[0.03]">
      <span className={"h-2 w-2 shrink-0 rounded-full " + meta.dot} aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-[15px] text-foreground">{entry.reason}</span>
        </div>
        <div className="mt-0.5 flex items-center gap-1.5 text-[12px] text-muted-foreground">
          <span>{meta.label}</span>
          <span className="opacity-40">·</span>
          <span>{formatDate(entry.createdAt)}</span>
        </div>
      </div>
      <div
        className={
          "shrink-0 whitespace-nowrap text-right text-[15px] font-semibold tabular-nums " +
          (isPositive ? "text-emerald-400" : "text-foreground")
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
