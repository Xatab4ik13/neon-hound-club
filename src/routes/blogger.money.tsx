import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { CircleDollarSign, Loader2 } from "@/components/ui/icons";
import { fetchBloggerMoney } from "@/lib/blogger-money";

export const Route = createFileRoute("/blogger/money")({
  component: BloggerMoneyPage,
});

const MIN_DATE = "2026-08-09";

function localDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function defaultRange() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    from: localDateValue(monthStart) < MIN_DATE ? MIN_DATE : localDateValue(monthStart),
    to: localDateValue(now),
  };
}

function BloggerMoneyPage() {
  const initial = defaultRange();
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const today = localDateValue(new Date());
  const validRange = from >= MIN_DATE && from <= to && to <= today;
  const { data, isLoading, isFetching, isError } = useQuery({
    queryKey: ["blogger", "money", from, to],
    queryFn: () => fetchBloggerMoney(from, to),
    enabled: validRange,
    placeholderData: (previous) => previous,
  });

  return (
    <main className="relative flex-1 px-4 py-8 md:px-8 md:py-10">
      <div className="mx-auto max-w-5xl">
        <h1 className="font-display text-3xl font-black uppercase tracking-tight md:text-4xl">
          БАБЛО
        </h1>

        <div className="mt-8 border-y border-border bg-card/30 px-4 py-10 md:px-8 md:py-14">
          <div className="flex items-center gap-3 text-primary">
            <CircleDollarSign className="h-7 w-7" strokeWidth={2.5} aria-hidden />
            <span className="font-mono text-xs font-bold uppercase tracking-wider">Цифровые и виртуальные товары</span>
          </div>
          <div className="mt-5 min-h-[64px] font-display text-5xl font-black leading-none tabular-nums text-foreground md:text-7xl">
            {isLoading ? (
              <Loader2 className="h-10 w-10 animate-spin text-primary" aria-label="Загрузка" />
            ) : isError ? (
              <span className="text-2xl text-destructive md:text-3xl">Не удалось загрузить</span>
            ) : (
              `${(data?.amountRub ?? 0).toLocaleString("ru-RU")} ₽`
            )}
          </div>
        </div>

        <div className={`mt-6 grid gap-4 sm:grid-cols-2 transition-opacity ${isFetching ? "opacity-60" : ""}`}>
          <DateField
            label="От"
            value={from}
            min={MIN_DATE}
            max={to}
            onChange={(value) => setFrom(value < MIN_DATE ? MIN_DATE : value)}
          />
          <DateField
            label="До"
            value={to}
            min={from}
            max={today}
            onChange={setTo}
          />
        </div>
      </div>
    </main>
  );
}

function DateField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: string;
  min: string;
  max: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <input
        type="date"
        value={value}
        min={min}
        max={max}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-md border border-input bg-background px-4 text-base font-semibold text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
      />
    </label>
  );
}