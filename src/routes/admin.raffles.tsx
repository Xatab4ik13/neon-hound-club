import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Edit, Trash2, Image as ImageIcon } from "lucide-react";
import {
  PageHeader,
  Panel,
  Btn,
  DataTable,
  Badge,
  TextInput,
  TextArea,
  Select,
  Field,
  Modal,
  ConfirmModal,
} from "@/components/admin/ui";

export const Route = createFileRoute("/admin/raffles")({
  component: RafflesPage,
});

type Raffle = {
  id: string;
  name: string;
  description?: string;
  price: number;
  status: "active" | "draft" | "finished";
  ends: string;
  participants: number;
};

const SEED: Raffle[] = [
  { id: "1", name: "Шлем AGV K6", price: 50, status: "active", ends: "2026-05-20", participants: 284 },
  { id: "2", name: "Перчатки v3", price: 20, status: "active", ends: "2026-05-22", participants: 127 },
  { id: "3", name: "Худи Founder S01", price: 30, status: "active", ends: "2026-05-25", participants: 412 },
  { id: "4", name: "Race Pass Gold (3 мес)", price: 100, status: "draft", ends: "—", participants: 0 },
  { id: "5", name: "Перчатки Пит-крю", price: 15, status: "finished", ends: "2026-04-30", participants: 198 },
];

function RafflesPage() {
  const [list, setList] = useState<Raffle[]>(SEED);
  const [editing, setEditing] = useState<Raffle | null>(null);
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState<Raffle | null>(null);
  const [query, setQuery] = useState("");

  const filtered = list.filter((r) => r.name.toLowerCase().includes(query.toLowerCase()));

  const openNew = () => {
    setEditing({ id: "", name: "", price: 10, status: "draft", ends: "", participants: 0 });
    setOpen(true);
  };
  const openEdit = (r: Raffle) => {
    setEditing(r);
    setOpen(true);
  };
  const save = (r: Raffle) => {
    if (r.id) setList((l) => l.map((x) => (x.id === r.id ? r : x)));
    else setList((l) => [{ ...r, id: String(Date.now()) }, ...l]);
    setOpen(false);
  };

  return (
    <div>
      <PageHeader
        title="Розыгрыши"
        description="Управление лотами и участием"
        actions={
          <Btn variant="primary" onClick={openNew}>
            <Plus className="h-4 w-4" />
            Новый розыгрыш
          </Btn>
        }
      />

      <div className="mb-3 flex gap-2">
        <TextInput
          placeholder="Поиск по названию…"
          className="max-w-sm"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <Panel>
        <DataTable
          headers={["Название", "Цена", "Окончание", "Участников", "Статус", ""]}
          rows={filtered.map((r) => [
            <span className="font-medium">{r.name}</span>,
            `${r.price} 🎟`,
            r.ends || "—",
            r.participants,
            <Badge tone={r.status === "active" ? "emerald" : r.status === "draft" ? "zinc" : "rose"}>
              {r.status === "active" ? "Активен" : r.status === "draft" ? "Черновик" : "Завершён"}
            </Badge>,
            <div className="flex gap-1">
              <Btn variant="ghost" onClick={() => openEdit(r)} aria-label="Редактировать">
                <Edit className="h-3.5 w-3.5" />
              </Btn>
              <Btn variant="ghost" onClick={() => setConfirm(r)} aria-label="Удалить">
                <Trash2 className="h-3.5 w-3.5" />
              </Btn>
            </div>,
          ])}
        />
      </Panel>

      {editing && (
        <RaffleModal
          open={open}
          initial={editing}
          onClose={() => setOpen(false)}
          onSave={save}
        />
      )}

      <ConfirmModal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => confirm && setList((l) => l.filter((x) => x.id !== confirm.id))}
        title="Удалить розыгрыш?"
        message={`«${confirm?.name}» будет удалён. Действие необратимо.`}
      />
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
        <Field label="Название приза">
          <TextInput value={r.name} onChange={(e) => setR({ ...r, name: e.target.value })} />
        </Field>
        <Field label="Описание (markdown)">
          <TextArea
            rows={4}
            value={r.description ?? ""}
            onChange={(e) => setR({ ...r, description: e.target.value })}
            placeholder="Условия, ссылка на видео, что входит в комплект…"
          />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Цена билета">
            <TextInput
              type="number"
              value={r.price}
              onChange={(e) => setR({ ...r, price: Number(e.target.value) })}
            />
          </Field>
          <Field label="Окончание">
            <TextInput
              type="date"
              value={r.ends}
              onChange={(e) => setR({ ...r, ends: e.target.value })}
            />
          </Field>
          <Field label="Статус">
            <Select
              value={r.status}
              onChange={(e) => setR({ ...r, status: e.target.value as Raffle["status"] })}
            >
              <option value="draft">Черновик</option>
              <option value="active">Активен</option>
              <option value="finished">Завершён</option>
            </Select>
          </Field>
        </div>
        <Field label="Изображения">
          <div className="flex h-28 flex-col items-center justify-center rounded-md border-2 border-dashed border-zinc-300 text-xs text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
            <ImageIcon className="mb-2 h-5 w-5" />
            Перетащите файлы сюда или нажмите для выбора
          </div>
        </Field>
      </div>
    </Modal>
  );
}
