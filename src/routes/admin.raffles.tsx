import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Edit, Trash2, ChevronRight, ArrowLeft, Minus } from "lucide-react";
import {
  PageHeader,
  Panel,
  PanelHeader,
  Btn,
  DataTable,
  Badge,
  TextInput,
  TextArea,
  Field,
  Modal,
  ConfirmModal,
  ImageUploader,
} from "@/components/admin/ui";
import {
  rafflesStore,
  useRaffles,
  totalTickets,
  type Raffle,
  type RafflePrize as Prize,
} from "@/data/raffles-store";

export const Route = createFileRoute("/admin/raffles")({
  component: RafflesPage,
});

function emptyRaffle(): Raffle {
  return {
    id: "",
    name: "",
    description: "",
    cover: "",
    endsAt: "",
    createdAt: new Date().toISOString().slice(0, 10),
    participants: [],
    prizes: [],
  };
}

function RafflesPage() {
  const list = useRaffles();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Raffle | null>(null);
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState<Raffle | null>(null);

  const active = list.find((r) => r.id === activeId) ?? null;

  if (active) {
    return (
      <RaffleDetail
        raffle={active}
        onBack={() => setActiveId(null)}
        onUpdate={(r) => rafflesStore.upsert(r)}
      />
    );
  }

  const openNew = () => {
    setEditing(emptyRaffle());
    setOpen(true);
  };

  const now = Date.now();
  const statusOf = (r: Raffle) =>
    r.endsAt && new Date(r.endsAt).getTime() < now ? "finished" : "active";

  return (
    <div>
      <PageHeader
        title="Розыгрыши"
        description="Создай розыгрыш, добавь призы и дату окончания — на сайте запустится таймер."
        actions={
          <Btn variant="primary" onClick={openNew}>
            <Plus className="h-4 w-4" /> Новый розыгрыш
          </Btn>
        }
      />

      <Panel>
        <DataTable
          headers={["Название", "Призов", "Участников", "Окончание", "Статус", ""]}
          rows={list.map((r) => {
            const totalQty = r.prizes.reduce((s, p) => s + (p.qty || 0), 0);
            const st = statusOf(r);
            return [
              <span className="font-medium">{r.name}</span>,
              <Badge tone="zinc">{r.prizes.length} поз. / {totalQty} шт.</Badge>,
              <span className="font-medium">{r.participants}</span>,
              r.endsAt || "—",
              <Badge tone={st === "active" ? "emerald" : "rose"}>
                {st === "active" ? "Активен" : "Завершён"}
              </Badge>,
              <div className="flex gap-1">
                <Btn variant="ghost" onClick={() => setActiveId(r.id)}>
                  Открыть <ChevronRight className="h-3.5 w-3.5" />
                </Btn>
                <Btn variant="ghost" onClick={() => { setEditing(r); setOpen(true); }}>
                  <Edit className="h-3.5 w-3.5" />
                </Btn>
                <Btn variant="ghost" onClick={() => setConfirm(r)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Btn>
              </div>,
            ];
          })}
        />
      </Panel>

      {editing && (
        <RaffleModal
          open={open}
          initial={editing}
          onClose={() => setOpen(false)}
          onSave={(r) => {
            if (r.id) setList((l) => l.map((x) => (x.id === r.id ? r : x)));
            else setList((l) => [{ ...r, id: String(Date.now()) }, ...l]);
            setOpen(false);
          }}
        />
      )}

      <ConfirmModal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => confirm && setList((l) => l.filter((x) => x.id !== confirm.id))}
        title="Удалить розыгрыш?"
        message={`«${confirm?.name}» и все его призы будут удалены.`}
      />
    </div>
  );
}

function PrizeEditor({
  prizes,
  onChange,
}: {
  prizes: Prize[];
  onChange: (p: Prize[]) => void;
}) {
  const update = (id: string, patch: Partial<Prize>) =>
    onChange(prizes.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const remove = (id: string) => onChange(prizes.filter((x) => x.id !== id));
  const add = () =>
    onChange([...prizes, { id: String(Date.now()) + Math.random(), name: "", qty: 1 }]);

  return (
    <div className="space-y-2">
      {prizes.length === 0 && (
        <div className="rounded border border-dashed border-zinc-200 px-3 py-6 text-center text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
          Призов пока нет
        </div>
      )}
      {prizes.map((p) => (
        <div key={p.id} className="flex items-center gap-2">
          <TextInput
            value={p.name}
            placeholder="Название приза"
            onChange={(e) => update(p.id, { name: e.target.value })}
          />
          <div className="flex items-center gap-1">
            <Btn variant="ghost" onClick={() => update(p.id, { qty: Math.max(1, p.qty - 1) })}>
              <Minus className="h-3.5 w-3.5" />
            </Btn>
            <TextInput
              type="number"
              value={p.qty}
              onChange={(e) => update(p.id, { qty: Math.max(1, Number(e.target.value) || 1) })}
              className="w-16 text-center"
            />
            <Btn variant="ghost" onClick={() => update(p.id, { qty: p.qty + 1 })}>
              <Plus className="h-3.5 w-3.5" />
            </Btn>
          </div>
          <Btn variant="ghost" onClick={() => remove(p.id)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Btn>
        </div>
      ))}
      <Btn onClick={add}>
        <Plus className="h-4 w-4" /> Добавить приз
      </Btn>
    </div>
  );
}

function RaffleModal({
  open,
  initial,
  onClose,
  onSave,
}: {
  open: boolean;
  initial: Raffle;
  onClose: () => void;
  onSave: (r: Raffle) => void;
}) {
  const [r, setR] = useState<Raffle>(initial);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial.id ? "Редактировать розыгрыш" : "Новый розыгрыш"}
      size="lg"
      footer={
        <>
          <Btn onClick={onClose}>Отмена</Btn>
          <Btn variant="primary" onClick={() => onSave(r)}>
            Сохранить
          </Btn>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Название розыгрыша">
          <TextInput
            value={r.name}
            placeholder="Например: Летний розыгрыш №1"
            onChange={(e) => setR({ ...r, name: e.target.value })}
          />
        </Field>
        <Field label="Описание">
          <TextArea
            rows={3}
            value={r.description ?? ""}
            onChange={(e) => setR({ ...r, description: e.target.value })}
            placeholder="Кратко — про серию, тему, период…"
          />
        </Field>
        <Field label="Обложка (картинка для сайта)">
          <ImageUploader
            images={r.cover ? [r.cover] : []}
            onChange={(imgs) => setR({ ...r, cover: imgs[0] ?? "" })}
          />
        </Field>
        <Field label="Дата окончания (запустит таймер на сайте)">
          <TextInput
            type="date"
            value={r.endsAt}
            onChange={(e) => setR({ ...r, endsAt: e.target.value })}
          />
        </Field>
        <Field label="Призы">
          <PrizeEditor prizes={r.prizes} onChange={(prizes) => setR({ ...r, prizes })} />
        </Field>
      </div>
    </Modal>
  );
}

// ============= Детальная страница розыгрыша =============
function RaffleDetail({
  raffle,
  onBack,
  onUpdate,
}: {
  raffle: Raffle;
  onBack: () => void;
  onUpdate: (r: Raffle) => void;
}) {
  const setPrizes = (prizes: Prize[]) => onUpdate({ ...raffle, prizes });

  const totalQty = raffle.prizes.reduce((s, p) => s + (p.qty || 0), 0);

  return (
    <div>
      <button
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
      >
        <ArrowLeft className="h-4 w-4" /> Все розыгрыши
      </button>
      <PageHeader
        title={raffle.name}
        description={raffle.description ?? "Управление призами этого розыгрыша"}
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Участников" value={raffle.participants.toLocaleString("ru-RU")} />
        <StatCard label="Потрачено билетов" value={`${raffle.ticketsSpent.toLocaleString("ru-RU")} 🎟`} />
        <StatCard label="Призов" value={`${raffle.prizes.length} поз. / ${totalQty} шт.`} />
        <StatCard label="Окончание" value={raffle.endsAt || "—"} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Panel className="md:col-span-1">
          <PanelHeader>
            <h3 className="text-sm font-semibold">Обложка</h3>
          </PanelHeader>
          <div className="space-y-3 p-4 text-sm">
            <ImageUploader
              images={raffle.cover ? [raffle.cover] : []}
              onChange={(imgs) => onUpdate({ ...raffle, cover: imgs[0] ?? "" })}
            />
            <div className="flex justify-between"><span className="text-zinc-500">Создан</span><b>{raffle.createdAt}</b></div>
          </div>
        </Panel>

        <Panel className="md:col-span-2">
          <PanelHeader>
            <h3 className="text-sm font-semibold">Призы</h3>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              Можно менять кол-во, добавлять и удалять
            </span>
          </PanelHeader>
          <div className="p-4">
            <PrizeEditor prizes={raffle.prizes} onChange={setPrizes} />
          </div>
        </Panel>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="text-xs text-zinc-500 dark:text-zinc-400">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}
