// Админ · Школа. Реальные данные из `/api/v1/admin/school`.
// KPI за период → таблица инструкторов → выплаты (генерация недельного пула,
// отметка «выплачено»).

import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Badge,
  Btn,
  PageHeader,
  Panel,
  PanelHeader,
  TextInput,
} from "@/components/admin/ui";
import { cn } from "@/lib/utils";
import {
  adminSchoolQk,
  fetchAdminInstructors,
  fetchAdminKpi,
  fetchAdminPayouts,
  generatePayouts,
  markPayoutPaid,
  type AdminPayoutRow,
} from "@/lib/api-school";
import { ApiError } from "@/lib/api";

export const Route = createFileRoute("/admin/school")({
  component: AdminSchoolPage,
});

type Tab = "overview" | "instructors" | "payouts";

function AdminSchoolPage() {
  const [tab, setTab] = useState<Tab>("overview");
  const [days, setDays] = useState(30);

  const kpiQ = useQuery({
    queryKey: adminSchoolQk.kpi(days),
    queryFn: () => fetchAdminKpi(days),
    retry: (c, err) => (err instanceof ApiError && err.status === 403 ? false : c < 2),
  });
  const instructorsQ = useQuery({
    queryKey: adminSchoolQk.instructors,
    queryFn: fetchAdminInstructors,
  });

  const kpi = kpiQ.data;
  const netProfit = kpi ? kpi.commission : 0;

  return (
    <div>
      <PageHeader
        title="Школа"
        description="Инструкторы, экономика и еженедельные выплаты."
        actions={
          <div className="flex items-center gap-2">
            <label className="text-xs text-zinc-500 dark:text-zinc-400">Период, дней</label>
            <TextInput
              value={String(days)}
              onChange={(e) => {
                const n = parseInt(e.target.value, 10);
                if (Number.isFinite(n) && n > 0 && n <= 365) setDays(n);
              }}
              className="w-20"
              inputMode="numeric"
            />
            <Btn variant="ghost" onClick={() => kpiQ.refetch()}>
              Обновить
            </Btn>
          </div>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Уроков (оплачено)" value={kpi ? String(kpi.lessons) : "—"} />
        <StatCard label="Выручка" value={kpi ? fmtMoney(kpi.gross) : "—"} />
        <StatCard
          label="Выплаты инструкторам"
          value={kpi ? fmtMoney(kpi.instructorPayouts) : "—"}
          tone="blue"
        />
        <StatCard
          label="Комиссия 20%"
          value={kpi ? fmtMoney(kpi.commission) : "—"}
          tone={netProfit >= 0 ? "emerald" : "amber"}
        />
      </div>

      <div className="mb-4 inline-flex rounded-md border border-zinc-200 bg-white p-0.5 dark:border-zinc-800 dark:bg-zinc-900">
        <TabBtn active={tab === "overview"} onClick={() => setTab("overview")}>
          Обзор
        </TabBtn>
        <TabBtn active={tab === "instructors"} onClick={() => setTab("instructors")}>
          Инструкторы
        </TabBtn>
        <TabBtn active={tab === "payouts"} onClick={() => setTab("payouts")}>
          Выплаты
        </TabBtn>
      </div>

      {tab === "overview" && <OverviewPanel />}
      {tab === "instructors" && (
        <InstructorsPanel
          rows={instructorsQ.data?.items ?? []}
          loading={instructorsQ.isLoading}
        />
      )}
      {tab === "payouts" && <PayoutsPanel />}
    </div>
  );
}

// ============= Overview =============

function OverviewPanel() {
  return (
    <Panel>
      <PanelHeader>
        <div className="text-sm font-medium">Как это работает</div>
      </PanelHeader>
      <div className="space-y-2 p-4 text-sm text-zinc-600 dark:text-zinc-300">
        <p>
          Ученик оплачивает счёт из чата с инструктором. Мы берём 20% комиссии платформы,
          остальное — доля инструктора.
        </p>
        <p>
          Раз в неделю во вкладке «Выплаты» жмёшь «Собрать за период» — система соберёт
          все оплаченные заказы за интервал в отдельные записи по инструктору.
          После банковского перевода отмечаешь запись как «выплачено».
        </p>
      </div>
    </Panel>
  );
}

// ============= Instructors =============

function InstructorsPanel({
  rows,
  loading,
}: {
  rows: {
    id: string;
    slug: string;
    displayName: string;
    city: string;
    active: boolean;
    hourlyRateRub: number;
  }[];
  loading: boolean;
}) {
  return (
    <Panel>
      <PanelHeader>
        <div className="text-sm font-medium">Инструкторы</div>
        <div className="text-xs text-zinc-500 dark:text-zinc-400">
          Всего: {rows.length}
        </div>
      </PanelHeader>
      <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
        <table className="w-full min-w-max text-sm md:min-w-0">
          <thead className="bg-zinc-50 dark:bg-zinc-900/50">
            <tr className="text-left text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              <th className="whitespace-nowrap px-4 py-2.5 font-medium">Имя</th>
              <th className="whitespace-nowrap px-4 py-2.5 font-medium">Slug</th>
              <th className="whitespace-nowrap px-4 py-2.5 font-medium">Город</th>
              <th className="whitespace-nowrap px-4 py-2.5 font-medium text-right">
                Ставка/час
              </th>
              <th className="whitespace-nowrap px-4 py-2.5 font-medium text-right">
                Статус
              </th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-zinc-500">
                  Загрузка…
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-zinc-500">
                  Пока нет инструкторов
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr
                key={r.id}
                className="border-t border-zinc-100 hover:bg-zinc-50/50 dark:border-zinc-800 dark:hover:bg-zinc-800/30"
              >
                <td className="whitespace-nowrap px-4 py-2.5 font-medium">{r.displayName}</td>
                <td className="whitespace-nowrap px-4 py-2.5 text-xs text-zinc-500">
                  {r.slug}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5">{r.city || "—"}</td>
                <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums">
                  {fmtMoney(r.hourlyRateRub)}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-right">
                  {r.active ? (
                    <Badge tone="emerald">Активен</Badge>
                  ) : (
                    <Badge tone="zinc">Выключен</Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

// ============= Payouts =============

function toIsoDay(d: Date, endOfDay = false) {
  const x = new Date(d);
  if (endOfDay) {
    x.setHours(23, 59, 59, 999);
  } else {
    x.setHours(0, 0, 0, 0);
  }
  return x.toISOString();
}

function startOfLastWeek(): { periodStart: string; periodEnd: string } {
  const now = new Date();
  const end = new Date(now);
  const start = new Date(now);
  start.setDate(start.getDate() - 7);
  return {
    periodStart: toIsoDay(start),
    periodEnd: toIsoDay(end, true),
  };
}

function PayoutsPanel() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "paid">("all");
  const [range, setRange] = useState(startOfLastWeek());
  const [taxRate, setTaxRate] = useState("6");

  const q = useQuery({
    queryKey: adminSchoolQk.payouts(statusFilter),
    queryFn: () =>
      fetchAdminPayouts(statusFilter === "all" ? undefined : statusFilter),
  });

  const generateMut = useMutation({
    mutationFn: () =>
      generatePayouts({
        periodStart: range.periodStart,
        periodEnd: range.periodEnd,
        taxRatePercent: parseFloat(taxRate.replace(",", ".")) || 6,
      }),
    onSuccess: (r) => {
      toast.success(
        r.created > 0
          ? `Создано выплат: ${r.created}`
          : "За период нет оплаченных заказов",
      );
      qc.invalidateQueries({ queryKey: ["admin-school", "payouts"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Ошибка"),
  });

  const markPaidMut = useMutation({
    mutationFn: (id: string) => markPayoutPaid(id),
    onSuccess: () => {
      toast.success("Отмечено как выплачено");
      qc.invalidateQueries({ queryKey: ["admin-school", "payouts"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Ошибка"),
  });

  const rows: AdminPayoutRow[] = q.data?.items ?? [];

  const totals = useMemo(() => {
    let payout = 0;
    let paid = 0;
    let pending = 0;
    for (const r of rows) {
      payout += r.payoutRub;
      if (r.status === "paid") paid += r.payoutRub;
      else pending += r.payoutRub;
    }
    return { payout, paid, pending };
  }, [rows]);

  return (
    <div className="space-y-3">
      <Panel>
        <PanelHeader>
          <div className="text-sm font-medium">Собрать выплаты</div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400">
            Группирует все оплаченные заказы за период по инструктору.
          </div>
        </PanelHeader>
        <div className="grid gap-3 p-4 md:grid-cols-4">
          <div>
            <div className="mb-1 text-xs text-zinc-500">Начало периода</div>
            <TextInput
              type="date"
              value={range.periodStart.slice(0, 10)}
              onChange={(e) => {
                const d = new Date(e.target.value);
                if (!Number.isNaN(d.getTime()))
                  setRange((r) => ({ ...r, periodStart: toIsoDay(d) }));
              }}
            />
          </div>
          <div>
            <div className="mb-1 text-xs text-zinc-500">Конец периода</div>
            <TextInput
              type="date"
              value={range.periodEnd.slice(0, 10)}
              onChange={(e) => {
                const d = new Date(e.target.value);
                if (!Number.isNaN(d.getTime()))
                  setRange((r) => ({ ...r, periodEnd: toIsoDay(d, true) }));
              }}
            />
          </div>
          <div>
            <div className="mb-1 text-xs text-zinc-500">Ставка налога, %</div>
            <TextInput
              value={taxRate}
              onChange={(e) => setTaxRate(e.target.value)}
              inputMode="decimal"
            />
          </div>
          <div className="flex items-end">
            <Btn
              variant="primary"
              onClick={() => generateMut.mutate()}
              disabled={generateMut.isPending}
            >
              {generateMut.isPending ? "Собираем…" : "Собрать за период"}
            </Btn>
          </div>
        </div>
      </Panel>

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Всего к переводу" value={fmtMoney(totals.payout)} />
        <StatCard label="Ожидает" value={fmtMoney(totals.pending)} tone="blue" />
        <StatCard label="Выплачено" value={fmtMoney(totals.paid)} tone="emerald" />
      </div>

      <Panel>
        <PanelHeader>
          <div className="flex items-center gap-2">
            <div className="text-sm font-medium">Записи выплат</div>
            <div className="inline-flex rounded-md border border-zinc-200 bg-white p-0.5 dark:border-zinc-800 dark:bg-zinc-900">
              <TabBtn
                active={statusFilter === "all"}
                onClick={() => setStatusFilter("all")}
              >
                Все
              </TabBtn>
              <TabBtn
                active={statusFilter === "pending"}
                onClick={() => setStatusFilter("pending")}
              >
                Ожидают
              </TabBtn>
              <TabBtn
                active={statusFilter === "paid"}
                onClick={() => setStatusFilter("paid")}
              >
                Выплачены
              </TabBtn>
            </div>
          </div>
        </PanelHeader>
        <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
          <table className="w-full min-w-max text-sm md:min-w-0">
            <thead className="bg-zinc-50 dark:bg-zinc-900/50">
              <tr className="text-left text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                <th className="whitespace-nowrap px-4 py-2.5 font-medium">Инструктор</th>
                <th className="whitespace-nowrap px-4 py-2.5 font-medium">Период</th>
                <th className="whitespace-nowrap px-4 py-2.5 font-medium text-right">
                  Выручка
                </th>
                <th className="whitespace-nowrap px-4 py-2.5 font-medium text-right">
                  Налог
                </th>
                <th className="whitespace-nowrap px-4 py-2.5 font-medium text-right">
                  Комиссия
                </th>
                <th className="whitespace-nowrap px-4 py-2.5 font-medium text-right">
                  К переводу
                </th>
                <th className="whitespace-nowrap px-4 py-2.5 font-medium text-right">
                  Статус
                </th>
                <th className="whitespace-nowrap px-4 py-2.5 font-medium text-right">
                  Действие
                </th>
              </tr>
            </thead>
            <tbody>
              {q.isLoading && (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-zinc-500">
                    Загрузка…
                  </td>
                </tr>
              )}
              {!q.isLoading && rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-zinc-500">
                    Пока нет выплат — собери за нужный период выше.
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className="border-t border-zinc-100 hover:bg-zinc-50/50 dark:border-zinc-800 dark:hover:bg-zinc-800/30"
                >
                  <td className="whitespace-nowrap px-4 py-2.5">
                    <div className="font-medium">{r.instructorName}</div>
                    <div className="text-xs text-zinc-500">{r.instructorSlug}</div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-xs">
                    {fmtDate(r.periodStart)} → {fmtDate(r.periodEnd)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums">
                    {fmtMoney(r.grossRub)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums text-amber-600 dark:text-amber-400">
                    − {fmtMoney(r.taxRub)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                    {fmtMoney(r.commissionRub)}
                  </td>
                  <td
                    className={cn(
                      "whitespace-nowrap px-4 py-2.5 text-right tabular-nums font-medium",
                      r.status === "pending"
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-zinc-500",
                    )}
                  >
                    {fmtMoney(r.payoutRub)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right">
                    {r.status === "paid" ? (
                      <Badge tone="emerald">Выплачено</Badge>
                    ) : (
                      <Badge tone="blue">Ожидает</Badge>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right">
                    {r.status === "pending" && (
                      <Btn
                        variant="primary"
                        onClick={() => markPaidMut.mutate(r.id)}
                        disabled={markPaidMut.isPending}
                      >
                        Отметить выплаченным
                      </Btn>
                    )}
                    {r.status === "paid" && r.paidAt && (
                      <span className="text-xs text-zinc-500">{fmtDate(r.paidAt)}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

// ============= UI atoms =============

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50",
      )}
    >
      {children}
    </button>
  );
}

function StatCard({
  label,
  value,
  tone = "zinc",
}: {
  label: string;
  value: string;
  tone?: "zinc" | "emerald" | "amber" | "blue";
}) {
  const toneCls =
    tone === "emerald"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "amber"
        ? "text-amber-600 dark:text-amber-400"
        : tone === "blue"
          ? "text-blue-600 dark:text-blue-400"
          : "text-zinc-900 dark:text-zinc-100";
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="text-xs text-zinc-500 dark:text-zinc-400">{label}</div>
      <div className={cn("mt-0.5 text-lg font-semibold tabular-nums", toneCls)}>
        {value}
      </div>
    </div>
  );
}

function fmtMoney(n: number): string {
  return `${new Intl.NumberFormat("ru-RU").format(n)} ₽`;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}
