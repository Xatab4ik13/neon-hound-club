import { createFileRoute } from "@tanstack/react-router";
import { Plus, Gift, Edit, Trash2 } from "lucide-react";
import { PageHeader, Panel, Btn, DataTable, Badge, PanelHeader, Field, TextInput } from "@/components/admin/ui";

export const Route = createFileRoute("/admin/tickets")({
  component: TicketsPage,
});

const TARIFFS = [
  { id: "1", name: "Малый пакет", tickets: 10, price: 199 },
  { id: "2", name: "Средний пакет", tickets: 50, price: 899 },
  { id: "3", name: "Большой пакет", tickets: 150, price: 2490 },
];

const LOG = [
  { date: "18.05", user: "ASPHALT_DOG", delta: "+50", reason: "Покупка пакета" },
  { date: "18.05", user: "vasya_pit", delta: "−20", reason: "Розыгрыш «Шлем AGV»" },
  { date: "17.05", user: "moto_anya", delta: "+10", reason: "Кешбэк за заказ #1037" },
  { date: "17.05", user: "wheelie_kid", delta: "+100", reason: "Подарок: Платформа Pass" },
  { date: "16.05", user: "captain_volk", delta: "−30", reason: "Розыгрыш «Худи Founder»" },
];

function TicketsPage() {
  return (
    <div>
      <PageHeader title="Билеты" description="Внутренняя валюта клуба. Кешбэк 1 билет за 200 ₽." />

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <PanelHeader>
            <h3 className="text-sm font-semibold">Тарифы покупки</h3>
            <Btn variant="primary"><Plus className="h-4 w-4" /> Тариф</Btn>
          </PanelHeader>
          <DataTable
            headers={["Название", "Билетов", "Цена", ""]}
            rows={TARIFFS.map((t) => [
              <span className="font-medium">{t.name}</span>,
              <Badge tone="amber">{t.tickets} 🎟</Badge>,
              `${t.price.toLocaleString("ru-RU")} ₽`,
              <div className="flex gap-1">
                <Btn variant="ghost"><Edit className="h-3.5 w-3.5" /></Btn>
                <Btn variant="ghost"><Trash2 className="h-3.5 w-3.5" /></Btn>
              </div>,
            ])}
          />
        </Panel>

        <Panel>
          <PanelHeader>
            <h3 className="text-sm font-semibold">Массовая выдача</h3>
            <Gift className="h-4 w-4 text-zinc-400" />
          </PanelHeader>
          <div className="space-y-3 p-4">
            <Field label="Кому">
              <TextInput placeholder="Все Gold-подписчики / список ников через запятую" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Количество билетов">
                <TextInput type="number" defaultValue={10} />
              </Field>
              <Field label="Причина (для журнала)">
                <TextInput placeholder="Конкурс в Telegram" />
              </Field>
            </div>
            <Btn variant="primary" className="w-full">
              <Gift className="h-4 w-4" /> Выдать
            </Btn>
          </div>
        </Panel>
      </div>

      <div className="mt-4">
        <Panel>
          <PanelHeader>
            <h3 className="text-sm font-semibold">Журнал операций</h3>
            <Btn>Экспорт CSV</Btn>
          </PanelHeader>
          <DataTable
            headers={["Дата", "Пользователь", "Изменение", "Причина"]}
            rows={LOG.map((l) => [
              l.date,
              <span className="font-medium">{l.user}</span>,
              <span className={l.delta.startsWith("+") ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>
                {l.delta} 🎟
              </span>,
              <span className="text-zinc-500 dark:text-zinc-400">{l.reason}</span>,
            ])}
          />
        </Panel>
      </div>
    </div>
  );
}
