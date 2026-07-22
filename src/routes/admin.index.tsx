import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, PlumpUsers as Users, PlumpTicket, Trophy, PlumpStore, Crown, Loader2 } from "@/components/ui/icons";
import { fetchAdminDashboard } from "@/lib/admin-queries";

export const Route = createFileRoute("/admin/")({
  component: Dashboard,
});

const ORDER_STATUS_RU: Record<string, string> = {
  pending_payment: "Ожидает оплаты",
  paid: "Оплачен",
  shipped: "Отправлен",
  delivered: "Доставлен",
  cancelled: "Отменён",
  refunded: "Возврат",
};

function fmtRub(n: number): string {
  return `${n.toLocaleString("ru-RU")} ₽`;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
}

function fmtRemain(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "истёк";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h >= 24) {
    const d = Math.floor(h / 24);
    return `${d}д ${h % 24}ч`;
  }
  return `${h}ч ${m}м`;
}

function Dashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: fetchAdminDashboard,
    refetchInterval: 60_000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12 text-zinc-500">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }
  if (error || !data) {
    return <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300">Не удалось загрузить дашборд</div>;
  }

  const stats: { label: string; value: React.ReactNode; delta?: React.ReactNode; icon: React.ComponentType<{ className?: string }> }[] = [
    { label: "Выручка за 30 дней", value: `${(data.kpi.revenue30d).toLocaleString("ru-RU")} ₽`, icon: TrendingUp },
    { label: "Активных Hell Pass", value: (data.kpi.passActive), icon: Crown },
    { label: "Новых пользователей / 7д", value: (data.kpi.newUsers7d), icon: Users },
    { label: "Билетов в обороте", value: (data.kpi.ticketsInCirculation).toLocaleString("ru-RU"), icon: PlumpTicket },
    {
      label: "Активных розыгрышей",
      value: (data.kpi.rafflesActive),
      delta: (
        <span className="inline-flex items-center gap-1">
          {(data.kpi.rafflesBankTickets).toLocaleString("ru-RU")} билетов в банке
        </span>
      ),
      icon: Trophy,
    },
    { label: "Заказов за 7 дней", value: (data.kpi.orders7d), icon: PlumpStore },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Дашборд</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Сводка по реальным данным</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex items-start justify-between">
              <div className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                {s.label}
              </div>
              <s.icon className="h-4 w-4 text-zinc-400" />
            </div>
            <div className="mt-2 text-2xl font-bold">{s.value}</div>
            {s.delta && <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{s.delta}</div>}
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Последние заказы">
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
        </Card>

        <Card title="Розыгрыши, осталось <48ч">
          {data.rafflesSoon.length === 0 ? (
            <Empty>Нет розыгрышей в ближайшие 48 часов</Empty>
          ) : (
            <Table
              headers={["Приз", "До конца", "Заявок"]}
              rows={data.rafflesSoon.map((r) => [r.prize ?? r.title, fmtRemain(r.endsAt), String(r.entries)])}
            />
          )}
        </Card>

        <Card title="Pass истекают за 7 дней">
          {data.passExpiring.length === 0 ? (
            <Empty>Ни один Pass не истекает в ближайшую неделю</Empty>
          ) : (
            <Table
              headers={["Юзер", "Тир", "Истекает"]}
              rows={data.passExpiring.map((p) => [p.nick, p.tier, fmtDate(p.expiresAt)])}
            />
          )}
        </Card>

        <Card title="Топ товаров за 30 дней">
          {data.topProducts.length === 0 ? (
            <Empty>Нет продаж за 30 дней</Empty>
          ) : (
            <Table
              headers={["Товар", "Продаж", "Выручка"]}
              rows={data.topProducts.map((p) => [p.title, String(p.qty), fmtRub(p.revenue)])}
            />
          )}
        </Card>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <div className="p-2">{children}</div>
    </div>
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
