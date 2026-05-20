import { createFileRoute } from "@tanstack/react-router";
import { TrendingUp, Users, Ticket, Trophy, ShoppingBag, Crown } from "lucide-react";
import { PRODUCTS } from "@/data/products";
import { PUBLIC_USERS } from "@/data/users";

export const Route = createFileRoute("/admin/")({
  component: Dashboard,
});

function Dashboard() {
  const stats = [
    { label: "Выручка за месяц", value: "284 500 ₽", delta: "+12%", icon: TrendingUp, tone: "emerald" },
    { label: "Активных подписок Pass", value: "412", delta: "+38", icon: Crown, tone: "violet" },
    { label: "Новых пользователей / 7д", value: "67", delta: "+9", icon: Users, tone: "blue" },
    { label: "Билетов в обороте", value: "18 240", delta: "−320", icon: Ticket, tone: "amber" },
    { label: "Активных розыгрышей", value: "3", delta: "5 480 ₽ в банке", icon: Trophy, tone: "rose" },
    { label: "Заказов за неделю", value: "29", delta: "+4", icon: ShoppingBag, tone: "cyan" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Дашборд</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Сводка за последние 30 дней</p>
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
            <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{s.delta}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Последние заказы">
          <Table
            headers={["№", "Клиент", "Сумма", "Статус"]}
            rows={[
              ["#1042", "ASPHALT_DOG", "12 990 ₽", "Оплачен"],
              ["#1041", "vasya_pit", "8 490 ₽", "В сборке"],
              ["#1040", "moto_anya", "3 290 ₽", "Доставлен"],
              ["#1039", "wheelie_kid", "5 980 ₽", "Оплачен"],
              ["#1038", "captain_volk", "12 990 ₽", "Отменён"],
            ]}
          />
        </Card>

        <Card title="Розыгрыши, осталось <48ч">
          <Table
            headers={["Приз", "До конца", "Участников"]}
            rows={[
              ["Шлем AGV K6", "12ч 40м", "284"],
              ["Перчатки v3", "1д 8ч", "127"],
              ["Худи Founder", "1д 22ч", "412"],
            ]}
          />
        </Card>

        <Card title="Подписки, истекают за 7 дней">
          <Table
            headers={["Юзер", "Тир", "Истекает"]}
            rows={Object.values(PUBLIC_USERS)
              .slice(0, 5)
              .map((u) => [u.nick, ["Silver", "Gold", "Platinum"][u.xpPct % 3], "через 3д"])}
          />
        </Card>

        <Card title="Топ товаров">
          <Table
            headers={["Товар", "Продаж", "Выручка"]}
            rows={PRODUCTS.slice(0, 5).map((p, i) => [
              p.name,
              String(20 - i * 3),
              `${(p.price * (20 - i * 3)).toLocaleString("ru-RU")} ₽`,
            ])}
          />
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
