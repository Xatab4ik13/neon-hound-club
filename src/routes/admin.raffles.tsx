import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Edit, Trash2, Image as ImageIcon, Package, ChevronRight, ArrowLeft } from "lucide-react";
import {
  PageHeader,
  Panel,
  PanelHeader,
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

type Prize = {
  id: string;
  name: string;
  description?: string;
  price: number; // в билетах
  ends: string;
  participants: number;
  images: string[]; // dataURL
  status: "active" | "draft" | "finished";
};

type Raffle = {
  id: string;
  name: string;
  description?: string;
  status: "active" | "draft" | "finished";
  createdAt: string;
  prizes: Prize[];
};

const SEED: Raffle[] = [
  {
    id: "1",
    name: "Летний розыгрыш №1",
    description: "Главная летняя серия призов от HELLHOUND.",
    status: "active",
    createdAt: "2026-05-01",
    prizes: [
      { id: "p1", name: "Шлем AGV K6", price: 50, status: "active", ends: "2026-05-20", participants: 284, images: [] },
      { id: "p2", name: "Перчатки v3", price: 20, status: "active", ends: "2026-05-22", participants: 127, images: [] },
      { id: "p3", name: "Худи Founder S01", price: 30, status: "active", ends: "2026-05-25", participants: 412, images: [] },
    ],
  },
  {
    id: "2",
    name: "Весенний розыгрыш",
    status: "finished",
    createdAt: "2026-03-01",
    prizes: [
      { id: "p4", name: "Перчатки Пит-крю", price: 15, status: "finished", ends: "2026-04-30", participants: 198, images: [] },
    ],
  },
];

function RafflesPage() {
  const [list, setList] = useState<Raffle[]>(SEED);
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
        onUpdate={(r) => setList((l) => l.map((x) => (x.id === r.id ? r : x)))}
      />
    );
  }

  const openNew = () => {
    setEditing({ id: "", name: "", status: "draft", createdAt: new Date().toISOString().slice(0, 10), prizes: [] });
    setOpen(true);
  };

  return (
    <div>
      <PageHeader
        title="Розыгрыши"
        description="Каждый розыгрыш — серия призов. Открой розыгрыш, чтобы управлять призами."
        actions={
          <Btn variant="primary" onClick={openNew}>
            <Plus className="h-4 w-4" /> Новый розыгрыш
          </Btn>
        }
      />

      <Panel>
        <DataTable
          headers={["Название", "Призов", "Создан", "Статус", ""]}
          rows={list.map((r) => [
            <span className="font-medium">{r.name}</span>,
            <Badge tone="zinc">{r.prizes.length}</Badge>,
            r.createdAt,
            <Badge tone={r.status === "active" ? "emerald" : r.status === "draft" ? "zinc" : "rose"}>
              {r.status === "active" ? "Активен" : r.status === "draft" ? "Черновик" : "Завершён"}
            </Badge>,
            <div className="flex gap-1">
              <Btn variant="ghost" onClick={() => setActiveId(r.id)}>
                Открыть <ChevronRight className="h-3.5 w-3.5" />
              </Btn>
              <Btn
                variant="ghost"
                onClick={() => {
                  setEditing(r);
                  setOpen(true);
                }}
              >
                <Edit className="h-3.5 w-3.5" />
              </Btn>
              <Btn variant="ghost" onClick={() => setConfirm(r)}>
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
            rows={4}
            value={r.description ?? ""}
            onChange={(e) => setR({ ...r, description: e.target.value })}
            placeholder="Кратко — про серию, тему, период…"
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
  const [editing, setEditing] = useState<Prize | null>(null);
  const [open, setOpen] = useState(false);
  const [del, setDel] = useState<Prize | null>(null);

  const openNew = () => {
    setEditing({
      id: "",
      name: "",
      price: 10,
      status: "draft",
      ends: "",
      participants: 0,
      images: [],
    });
    setOpen(true);
  };

  const savePrize = (p: Prize) => {
    const prizes = p.id
      ? raffle.prizes.map((x) => (x.id === p.id ? p : x))
      : [{ ...p, id: String(Date.now()) }, ...raffle.prizes];
    onUpdate({ ...raffle, prizes });
    setOpen(false);
  };

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
        actions={
          <Btn variant="primary" onClick={openNew}>
            <Plus className="h-4 w-4" /> Добавить приз
          </Btn>
        }
      />

      {raffle.prizes.length === 0 ? (
        <Panel>
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center text-sm text-zinc-500 dark:text-zinc-400">
            <Package className="mb-2 h-8 w-8" />
            Пока нет призов. Добавь первый.
          </div>
        </Panel>
      ) : (
        <Panel>
          <PanelHeader>
            <h3 className="text-sm font-semibold">Призы ({raffle.prizes.length})</h3>
          </PanelHeader>
          <DataTable
            headers={["", "Название", "Цена", "Окончание", "Участников", "Статус", ""]}
            rows={raffle.prizes.map((p) => [
              p.images[0] ? (
                <img src={p.images[0]} alt={p.name} className="h-10 w-10 rounded object-cover" />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded bg-zinc-100 dark:bg-zinc-800">
                  <ImageIcon className="h-4 w-4 text-zinc-400" />
                </div>
              ),
              <span className="font-medium">{p.name}</span>,
              `${p.price} 🎟`,
              p.ends || "—",
              p.participants,
              <Badge tone={p.status === "active" ? "emerald" : p.status === "draft" ? "zinc" : "rose"}>
                {p.status === "active" ? "Активен" : p.status === "draft" ? "Черновик" : "Завершён"}
              </Badge>,
              <div className="flex gap-1">
                <Btn
                  variant="ghost"
                  onClick={() => {
                    setEditing(p);
                    setOpen(true);
                  }}
                >
                  <Edit className="h-3.5 w-3.5" />
                </Btn>
                <Btn variant="ghost" onClick={() => setDel(p)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Btn>
              </div>,
            ])}
          />
        </Panel>
      )}

      {editing && (
        <PrizeModal open={open} initial={editing} onClose={() => setOpen(false)} onSave={savePrize} />
      )}

      <ConfirmModal
        open={!!del}
        onClose={() => setDel(null)}
        onConfirm={() =>
          del && onUpdate({ ...raffle, prizes: raffle.prizes.filter((x) => x.id !== del.id) })
        }
        title="Удалить приз?"
        message={`«${del?.name}» будет удалён из розыгрыша.`}
      />
    </div>
  );
}

function PrizeModal({
  open,
  initial,
  onClose,
  onSave,
}: {
  open: boolean;
  initial: Prize;
  onClose: () => void;
  onSave: (p: Prize) => void;
}) {
  const [p, setP] = useState<Prize>(initial);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial.id ? "Редактировать приз" : "Новый приз"}
      size="lg"
      footer={
        <>
          <Btn onClick={onClose}>Отмена</Btn>
          <Btn variant="primary" onClick={() => onSave(p)}>
            Сохранить
          </Btn>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Название приза">
          <TextInput value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} />
        </Field>
        <Field label="Описание">
          <TextArea
            rows={3}
            value={p.description ?? ""}
            onChange={(e) => setP({ ...p, description: e.target.value })}
            placeholder="Что входит, условия, доставка…"
          />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Цена билета">
            <TextInput
              type="number"
              value={p.price}
              onChange={(e) => setP({ ...p, price: Number(e.target.value) })}
            />
          </Field>
          <Field label="Окончание">
            <TextInput
              type="date"
              value={p.ends}
              onChange={(e) => setP({ ...p, ends: e.target.value })}
            />
          </Field>
          <Field label="Статус">
            <Select
              value={p.status}
              onChange={(e) => setP({ ...p, status: e.target.value as Prize["status"] })}
            >
              <option value="draft">Черновик</option>
              <option value="active">Активен</option>
              <option value="finished">Завершён</option>
            </Select>
          </Field>
        </div>
        <Field label="Изображения">
          <ImageUploader
            images={p.images}
            multiple
            onChange={(images) => setP({ ...p, images })}
          />
        </Field>
      </div>
    </Modal>
  );
}

// ============= Reusable Image uploader (локально, dataURL) =============
export function ImageUploader({
  images,
  onChange,
  multiple = false,
}: {
  images: string[];
  onChange: (images: string[]) => void;
  multiple?: boolean;
}) {
  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files);
    Promise.all(
      arr.map(
        (f) =>
          new Promise<string>((res) => {
            const r = new FileReader();
            r.onload = () => res(String(r.result));
            r.readAsDataURL(f);
          }),
      ),
    ).then((urls) => onChange(multiple ? [...images, ...urls] : urls.slice(0, 1)));
  };

  return (
    <div>
      <label className="flex h-28 cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-zinc-300 text-xs text-zinc-500 hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-600">
        <ImageIcon className="mb-2 h-5 w-5" />
        Нажмите, чтобы загрузить {multiple ? "файлы" : "файл"}
        <input
          type="file"
          accept="image/*"
          multiple={multiple}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </label>
      {images.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {images.map((src, i) => (
            <div key={i} className="relative">
              <img src={src} alt="" className="h-16 w-16 rounded object-cover" />
              <button
                type="button"
                onClick={() => onChange(images.filter((_, j) => j !== i))}
                className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-white hover:bg-rose-600"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
