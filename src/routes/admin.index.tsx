import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ru } from "date-fns/locale";
import {
  TrendingUp,
  PlumpUsers as Users,
  PlumpTicket,
  Trophy,
  PlumpStore,
  Crown,
  Loader2,
  CalendarIcon,
} from "@/components/ui/icons";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { fetchAdminDashboard, type AdminDashboardProduct } from "@/lib/admin-queries";
import { Btn, Panel, PanelHeader, Select, TextInput } from "@/components/admin/ui";


export const Route = createFileRoute("/admin/")({
  component: Dashboard,
});

const ORDER_STATUS_RU: Record<string, string> = {
  pending_payment: "Ожидает оплаты",
  paid: "Оплачен",
  awaiting_stock: "Ждём партию",
  ready_to_ship: "Готов к отправке",
  waybill_created: "Накладная создана",
  shipped: "Отправлен",
  delivered: "Доставлен",
  cancelled: "Отменён",
  refunded: "Возврат",
};

const KIND_RU: Record<string, string> = {
  physical: "Физический",
  preorder: "Предзаказ",
  digital: "Цифровой",
  virtual: "Виртуальный",
};

const PASS_TIER_RU: Record<string, string> = {
  silver: "Silver",
  gold: "Gold",
  platinum: "Platinum",
};

function fmtRub(n: number): string {
  return `${n.toLocaleString("ru-RU")} ₽`;
}
function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
}
function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function monthLabel(m: string): string {
  const [y, mo] = m.split("-");
  return new Date(Number(y), Number(mo) - 1, 1).toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
}

type Preset = "30d" | "month" | "prev" | "year" | "custom";

function presetRange(p: Preset): { from: string; to: string } {
  const now = new Date();
  if (p === "month") return { from: iso(new Date(now.getFullYear(), now.getMonth(), 1)), to: iso(now) };
  if (p === "prev") {
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const to = new Date(now.getFullYear(), now.getMonth(), 0);
    return { from: iso(from), to: iso(to) };
  }
  if (p === "year") return { from: iso(new Date(now.getFullYear(), 0, 1)), to: iso(now) };
  return { from: iso(new Date(Date.now() - 30 * 86_400_000)), to: iso(now) };
}

function Dashboard() {
  const [preset, setPreset] = useState<Preset>("30d");
  const [range, setRange] = useState(() => presetRange("30d"));
  const [search, setSearch] = useState("");

  function applyPreset(p: Preset) {
    setPreset(p);
    if (p !== "custom") setRange(presetRange(p));
  }

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ["admin", "dashboard", range.from, range.to],
    queryFn: () => fetchAdminDashboard(range),
    placeholderData: (prev) => prev,
    staleTime: 30_000,
  });

  const q = search.trim().toLowerCase();
  const physical = useMemo(
    () =>
      (data?.products ?? []).filter(
        (p) => (p.kind === "physical" || p.kind === "preorder") && (!q || p.title.toLowerCase().includes(q)),
      ),
    [data?.products, q],
  );
  const digital = useMemo(
    () =>
      (data?.products ?? []).filter(
        (p) => (p.kind === "digital" || p.kind === "virtual") && (!q || p.title.toLowerCase().includes(q)),
      ),
    [data?.products, q],
  );

  if (isLoading && !data) {
    return (
      <div className="flex items-center justify-center p-12 text-zinc-500">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300">
        Не удалось загрузить дашборд
      </div>
    );
  }

  const k = data.kpi;

  return (
    <div className={`space-y-6 transition-opacity ${isFetching ? "opacity-60" : ""}`}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Дашборд</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Период: {fmtDate(data.range.from)} — {fmtDate(data.range.to)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              ["30d", "30 дней"],
              ["month", "Этот месяц"],
              ["prev", "Прошлый месяц"],
              ["year", "Год"],
            ] as [Preset, string][]
          ).map(([p, label]) => (
            <Btn key={p} variant={preset === p ? "primary" : "secondary"} onClick={() => applyPreset(p)}>
              {label}
            </Btn>
          ))}
          <Select
            className="w-[190px]"
            value={preset === "custom" ? "" : "-"}
            onChange={(e) => {
              const m = e.target.value;
              if (!m || m === "-") return;
              const [y, mo] = m.split("-").map(Number);
              setPreset("custom");
              setRange({ from: iso(new Date(y, mo - 1, 1)), to: iso(new Date(y, mo, 0)) });
            }}
          >
            <option value="-">Выбрать месяц…</option>
            {data.monthly
              .slice()
              .reverse()
              .map((m) => (
                <option key={m.month} value={m.month}>
                  {monthLabel(m.month)} · {fmtRub(m.revenue)}
                </option>
              ))}
          </Select>
          <div className="flex items-center gap-1">
            <DatePick
              value={range.from}
              onChange={(v) => {
                setPreset("custom");
                setRange((r) => ({ ...r, from: v }));
              }}
            />
            <span className="text-zinc-400">—</span>
            <DatePick
              value={range.to}
              onChange={(v) => {
                setPreset("custom");
                setRange((r) => ({ ...r, to: v }));
              }}
            />
          </div>

        </div>
      </div>

      {/* KPI */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Выручка за период" value={fmtRub(k.revenue)} icon={TrendingUp} accent />
        <Kpi
          label="Оплаченных заказов"
          value={k.ordersPaid}
          hint={`товары ${fmtRub(k.goodsRevenue)} · доставка ${fmtRub(k.shippingRevenue)}`}
          icon={PlumpStore}
        />
        <Kpi label="Средний чек" value={fmtRub(k.avgOrderRub)} hint={`скидки ${fmtRub(k.discountRub)}`} icon={TrendingUp} />
        <Kpi label="Hell Pass продано" value={k.passSold} hint={`${fmtRub(k.passRevenue)} · активных ${k.passActive} · бесплатно ${k.passGranted ?? 0}`} icon={Crown} />
        <Kpi label="Новых пользователей" value={k.newUsers} icon={Users} />
        <Kpi label="Билетов в обороте" value={k.ticketsInCirculation.toLocaleString("ru-RU")} icon={PlumpTicket} />
        <Kpi
          label="Активных розыгрышей"
          value={k.rafflesActive}
          hint={`${k.rafflesBankTickets.toLocaleString("ru-RU")} билетов в банке`}
          icon={Trophy}
        />
        <Kpi label="Позиций продано" value={data.products.reduce((s, p) => s + p.qty, 0)} icon={PlumpStore} />
      </div>

      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Продажи по товарам
        </h2>
        <TextInput
          className="w-[240px]"
          placeholder="Поиск по названию (напр. носки)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ProductTable title="Физические товары и предзаказы" rows={physical} />
        <ProductTable title="Цифровые и виртуальные товары" rows={digital} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <PanelHeader>Последние заказы</PanelHeader>
          {data.lastOrders.length === 0 ? (
            <Empty>Заказов пока нет</Empty>
          ) : (
            <Table
              headers={["№", "Клиент", "Сумма", "Статус"]}
              rows={data.lastOrders.map((o) => [
                `#${o.id.slice(0, 8)}`,
                o.nick,
                fmtRub(o.totalRub),
                ORDER_STATUS_RU[o.status] ?? o.status,
              ])}
            />
          )}
        </Panel>

        <Panel>
          <PanelHeader>Доставка: наша разница (с 11.08, 21:00 МСК)</PanelHeader>
          <Table
            headers={["Показатель", "Сумма"]}
            rows={[
              ["Собрано с клиентов", fmtRub(k.shippingRevenue)],
              ["Себестоимость СДЭК", fmtRub(k.shippingCostRub)],
              ["Заработали на доставке", fmtRub(k.shippingMarginRub)],
              ["Заказов с доставкой", String(k.shippingOrders)],
            ]}
          />
        </Panel>

        <Panel>
          <PanelHeader>Hell Pass: выручка за период</PanelHeader>
          <Table
            headers={["Тир", "Продано", "Сумма"]}
            rows={[
              ...(data.passByTier ?? []).map((t) => [
                PASS_TIER_RU[t.tier] ?? t.tier,
                String(t.cnt),
                fmtRub(t.sum),
              ]),
              ["Итого куплено", String(k.passSold), fmtRub(k.passRevenue)],
              ["Выдано бесплатно", String(k.passGranted ?? 0), "—"],
              ["Активных сейчас", String(k.passActive), "—"],
            ]}
          />
        </Panel>

      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  hint,
  icon: Icon,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-4 ${
        accent
          ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40"
          : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{label}</div>
        <Icon className={`h-4 w-4 ${accent ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-400"}`} />
      </div>
      <div
        className={`mt-2 text-2xl font-bold tabular-nums ${
          accent ? "text-emerald-700 dark:text-emerald-300" : ""
        }`}
      >
        {value}
      </div>
      {hint && <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{hint}</div>}
    </div>
  );
}

function ProductTable({ title, rows }: { title: string; rows: AdminDashboardProduct[] }) {
  const qty = rows.reduce((s, p) => s + p.qty, 0);
  const revenue = rows.reduce((s, p) => s + p.revenue, 0);
  return (
    <Panel>
      <PanelHeader>
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <span>{title}</span>
          <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400">
            {qty} шт · <span className="font-semibold text-emerald-600 dark:text-emerald-400">{fmtRub(revenue)}</span>
          </span>
        </div>
      </PanelHeader>
      {rows.length === 0 ? (
        <Empty>Продаж за период нет</Empty>
      ) : (
        <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                <th className="px-3 py-2 font-medium">Товар</th>
                <th className="px-3 py-2 font-medium">Тип</th>
                <th className="px-3 py-2 text-right font-medium">Шт</th>
                <th className="px-3 py-2 text-right font-medium">Заказов</th>
                <th className="px-3 py-2 text-right font-medium">Покупателей</th>
                <th className="px-3 py-2 text-right font-medium">Выручка</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.productId ?? p.title} className="border-t border-zinc-100 dark:border-zinc-800">
                  <td className="px-3 py-2 font-medium">{p.title}</td>
                  <td className="px-3 py-2 text-zinc-500 dark:text-zinc-400">{KIND_RU[p.kind] ?? p.kind}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{p.qty}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{p.ordersCount}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{p.buyers}</td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                    {fmtRub(p.revenue)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-zinc-200 bg-zinc-50 text-xs font-semibold dark:border-zinc-800 dark:bg-zinc-950/50">
                <td className="px-3 py-2" colSpan={2}>
                  Итого
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{qty}</td>
                <td className="px-3 py-2" colSpan={2} />
                <td className="px-3 py-2 text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                  {fmtRub(revenue)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </Panel>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="px-3 py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">{children}</div>;
}

function Table({ headers, rows }: { headers: string[]; rows: (string | number)[][] }) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
      <table className="w-full min-w-[480px] text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            {headers.map((h) => (
              <th key={h} className="px-3 py-2 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-zinc-100 dark:border-zinc-800">
              {r.map((c, j) => (
                <td key={j} className="px-3 py-2">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DatePick({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : undefined;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-9 w-[150px] items-center justify-between gap-2 rounded-md border border-zinc-300 bg-white px-3 text-sm tabular-nums dark:border-zinc-700 dark:bg-zinc-900"
        >
          {date ? date.toLocaleDateString("ru-RU") : "Выбрать дату"}
          <CalendarIcon className="h-4 w-4 shrink-0 text-zinc-400" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          locale={ru}
          weekStartsOn={1}
          captionLayout="dropdown"
          defaultMonth={date}
          selected={date}
          onSelect={(d) => {
            if (!d) return;
            const mm = String(d.getMonth() + 1).padStart(2, "0");
            const dd = String(d.getDate()).padStart(2, "0");
            onChange(`${d.getFullYear()}-${mm}-${dd}`);
            setOpen(false);
          }}
          className="pointer-events-auto p-3"
        />
      </PopoverContent>
    </Popover>
  );
}
