import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Download, Upload } from "lucide-react";
import { PageHeader, Panel, Btn, DataTable, Badge, PanelHeader } from "@/components/admin/ui";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/economy")({
  component: EconomyPage,
});

type Tab = "overview" | "operations" | "categories" | "partners";

const OPERATIONS = [
  { date: "18.05", type: "income", category: "Магазин", amount: 12990, note: "Заказ #1042", source: "auto" },
  { date: "18.05", type: "income", category: "Hell Pass", amount: 1290, note: "Продление Gold (vasya_pit)", source: "auto" },
  { date: "17.05", type: "expense", category: "Реклама", amount: 35000, note: "Yandex Direct, май", source: "manual" },
  { date: "16.05", type: "expense", category: "Призы", amount: 24500, note: "Шлем AGV для розыгрыша", source: "manual" },
  { date: "15.05", type: "income", category: "Магазин", amount: 8490, note: "Заказ #1038", source: "auto" },
  { date: "14.05", type: "expense", category: "Себестоимость", amount: 89000, note: "Партия худи (40 шт)", source: "manual" },
];

const CATEGORIES = ["Продакшн", "Себестоимость", "Призы", "Налоги", "Реклама", "Эквайринг", "Прочее"];

const PARTNERS = [
  { name: "Hell", share: 60 },
  { name: "Pavel (команда)", share: 25 },
  { name: "Резервный фонд", share: 15 },
];

function EconomyPage() {
  const [tab, setTab] = useState<Tab>("overview");

  const income = OPERATIONS.filter((o) => o.type === "income").reduce((s, o) => s + o.amount, 0);
  const expense = OPERATIONS.filter((o) => o.type === "expense").reduce((s, o) => s + o.amount, 0);
  const profit = income - expense;

  return (
    <div>
      <PageHeader title="Экономика" description="Кешфлоу, доли прибыли, P&L по месяцам" />

      <div className="mb-4 inline-flex rounded-md border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-900">
        {([
          ["overview", "Обзор"],
          ["operations", "Операции"],
          ["categories", "Категории"],
          ["partners", "Доли партнёров"],
        ] as [Tab, string][]).map(([t, label]) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "rounded px-3 py-1.5 text-sm font-medium",
              tab === t
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <StatCard label="Доходы за май" value={`${income.toLocaleString("ru-RU")} ₽`} tone="emerald" />
            <StatCard label="Расходы за май" value={`${expense.toLocaleString("ru-RU")} ₽`} tone="rose" />
            <StatCard label="Чистая прибыль" value={`${profit.toLocaleString("ru-RU")} ₽`} tone={profit > 0 ? "emerald" : "rose"} />
          </div>
          <Panel>
            <PanelHeader>
              <h3 className="text-sm font-semibold">P&L по месяцам</h3>
              <Btn><Download className="h-4 w-4" /> PDF</Btn>
            </PanelHeader>
            <div className="flex h-64 items-center justify-center px-6 text-sm text-zinc-500 dark:text-zinc-400">
              График подключим после связи с БД
            </div>
          </Panel>
        </>
      )}

      {tab === "operations" && (
        <Panel>
          <PanelHeader>
            <h3 className="text-sm font-semibold">Операции</h3>
            <div className="flex gap-2">
              <Btn><Upload className="h-4 w-4" /> Импорт</Btn>
              <Btn><Download className="h-4 w-4" /> Экспорт</Btn>
              <Btn variant="primary"><Plus className="h-4 w-4" /> Операция</Btn>
            </div>
          </PanelHeader>
          <DataTable
            headers={["Дата", "Тип", "Категория", "Сумма", "Источник", "Комментарий"]}
            rows={OPERATIONS.map((o) => [
              o.date,
              <Badge tone={o.type === "income" ? "emerald" : "rose"}>
                {o.type === "income" ? "Доход" : "Расход"}
              </Badge>,
              o.category,
              <span className={cn("font-medium tabular-nums", o.type === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                {o.type === "income" ? "+" : "−"}{o.amount.toLocaleString("ru-RU")} ₽
              </span>,
              <Badge tone={o.source === "auto" ? "blue" : "zinc"}>{o.source === "auto" ? "Авто" : "Ручная"}</Badge>,
              <span className="text-zinc-500 dark:text-zinc-400">{o.note}</span>,
            ])}
          />
        </Panel>
      )}

      {tab === "categories" && (
        <Panel>
          <PanelHeader>
            <h3 className="text-sm font-semibold">Категории расходов</h3>
            <Btn variant="primary"><Plus className="h-4 w-4" /> Категория</Btn>
          </PanelHeader>
          <div className="flex flex-wrap gap-2 p-4">
            {CATEGORIES.map((c) => <Badge key={c}>{c}</Badge>)}
          </div>
        </Panel>
      )}

      {tab === "partners" && (
        <Panel>
          <PanelHeader>
            <h3 className="text-sm font-semibold">Доли партнёров</h3>
            <Btn variant="primary">Распределить за май</Btn>
          </PanelHeader>
          <DataTable
            headers={["Партнёр", "Доля", "Расчётная выплата за май"]}
            rows={PARTNERS.map((p) => [
              <span className="font-medium">{p.name}</span>,
              <Badge tone="violet">{p.share}%</Badge>,
              <span className="font-medium tabular-nums">
                {Math.round((profit * p.share) / 100).toLocaleString("ru-RU")} ₽
              </span>,
            ])}
          />
        </Panel>
      )}
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: string; tone: "emerald" | "rose" }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        {label}
      </div>
      <div className={cn("mt-1 text-2xl font-bold tabular-nums", tone === "emerald" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
        {value}
      </div>
    </div>
  );
}
