import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Gift, Edit, Trash2 } from "lucide-react";
import {
  PageHeader,
  Panel,
  Btn,
  DataTable,
  Badge,
  PanelHeader,
  Field,
  TextInput,
  Modal,
  ConfirmModal,
} from "@/components/admin/ui";

export const Route = createFileRoute("/admin/tickets")({
  component: TicketsPage,
});

type Tariff = { id: string; name: string; tickets: number; price: number };

const SEED: Tariff[] = [
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
  const [tariffs, setTariffs] = useState<Tariff[]>(SEED);
  const [editing, setEditing] = useState<Tariff | null>(null);
  const [open, setOpen] = useState(false);
  const [del, setDel] = useState<Tariff | null>(null);

  return (
    <div>
      <PageHeader title="Билеты" description="Внутренняя валюта клуба. Кешбэк 1 билет за 200 ₽." />

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <PanelHeader>
            <h3 className="text-sm font-semibold">Тарифы покупки</h3>
            <Btn
              variant="primary"
              onClick={() => {
                setEditing({ id: "", name: "", tickets: 10, price: 199 });
                setOpen(true);
              }}
            >
              <Plus className="h-4 w-4" /> Тариф
            </Btn>
          </PanelHeader>
          <DataTable
            headers={["Название", "Билетов", "Цена", ""]}
            rows={tariffs.map((t) => [
              <span className="font-medium">{t.name}</span>,
              <Badge tone="amber">{t.tickets} 🎟</Badge>,
              `${t.price.toLocaleString("ru-RU")} ₽`,
              <div className="flex gap-1">
                <Btn
                  variant="ghost"
                  onClick={() => {
                    setEditing(t);
                    setOpen(true);
                  }}
                >
                  <Edit className="h-3.5 w-3.5" />
                </Btn>
                <Btn variant="ghost" onClick={() => setDel(t)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Btn>
              </div>,
            ])}
          />
        </Panel>

        <BulkGivePanel />
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
              <span
                className={
                  l.delta.startsWith("+")
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                }
              >
                {l.delta} 🎟
              </span>,
              <span className="text-zinc-500 dark:text-zinc-400">{l.reason}</span>,
            ])}
          />
        </Panel>
      </div>

      {editing && (
        <TariffModal
          open={open}
          initial={editing}
          onClose={() => setOpen(false)}
          onSave={(t) => {
            if (t.id) setTariffs((l) => l.map((x) => (x.id === t.id ? t : x)));
            else setTariffs((l) => [...l, { ...t, id: String(Date.now()) }]);
            setOpen(false);
          }}
        />
      )}

      <ConfirmModal
        open={!!del}
        onClose={() => setDel(null)}
        onConfirm={() => del && setTariffs((l) => l.filter((x) => x.id !== del.id))}
        title="Удалить тариф?"
        message={`«${del?.name}» больше не будет показываться пользователям.`}
      />
    </div>
  );
}

function BulkGivePanel() {
  const [confirmOpen, setConfirmOpen] = useState(false);
  return (
    <>
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
          <Btn variant="primary" className="w-full" onClick={() => setConfirmOpen(true)}>
            <Gift className="h-4 w-4" /> Выдать
          </Btn>
        </div>
      </Panel>
      <ConfirmModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {}}
        title="Подтвердить выдачу?"
        message="Билеты будут начислены сразу. Отменить можно только вручную через журнал."
        confirmLabel="Выдать"
        danger={false}
      />
    </>
  );
}

function TariffModal({
  open,
  initial,
  onClose,
  onSave,
}: {
  open: boolean;
  initial: Tariff;
  onClose: () => void;
  onSave: (t: Tariff) => void;
}) {
  const [t, setT] = useState<Tariff>(initial);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial.id ? "Редактировать тариф" : "Новый тариф"}
      footer={
        <>
          <Btn onClick={onClose}>Отмена</Btn>
          <Btn variant="primary" onClick={() => onSave(t)}>
            Сохранить
          </Btn>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Название">
          <TextInput value={t.name} onChange={(e) => setT({ ...t, name: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Билетов">
            <TextInput
              type="number"
              value={t.tickets}
              onChange={(e) => setT({ ...t, tickets: Number(e.target.value) })}
            />
          </Field>
          <Field label="Цена (₽)">
            <TextInput
              type="number"
              value={t.price}
              onChange={(e) => setT({ ...t, price: Number(e.target.value) })}
            />
          </Field>
        </div>
      </div>
    </Modal>
  );
}
