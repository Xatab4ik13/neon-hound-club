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
  type RaffleSpec,
} from "@/data/raffles-store";

export const Route = createFileRoute("/admin/raffles")({
  component: RafflesPage,
});

function emptyRaffle(): Raffle {
  return {
    id: "",
    name: "",
    subtitle: "",
    description: "",
    cover: "",
    endsAt: "",
    deadlineAt: "",
    createdAt: new Date().toISOString().slice(0, 10),
    participants: [],
    prizes: [],
    specs: [],
    rules: [],
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
        onDelete={() => setConfirm(active)}
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
              <span className="font-medium">{r.participants.length}</span>,
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
            const id = r.id || String(Date.now());
            rafflesStore.upsert({ ...r, id });
            setOpen(false);
          }}
        />
      )}

      <ConfirmModal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => confirm && rafflesStore.remove(confirm.id)}
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

function RulesEditor({
  rules,
  onChange,
}: {
  rules: string[];
  onChange: (r: string[]) => void;
}) {
  const update = (i: number, v: string) =>
    onChange(rules.map((x, j) => (j === i ? v : x)));
  const remove = (i: number) => onChange(rules.filter((_, j) => j !== i));
  const add = () => onChange([...rules, ""]);
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= rules.length) return;
    const next = [...rules];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <div className="space-y-2">
      {rules.length === 0 && (
        <div className="rounded border border-dashed border-zinc-200 px-3 py-6 text-center text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
          Условий пока нет
        </div>
      )}
      {rules.map((r, i) => (
        <div key={i} className="flex items-start gap-2">
          <span className="mt-2 w-5 select-none text-right text-xs text-zinc-400">{i + 1}.</span>
          <TextArea
            rows={1}
            value={r}
            onChange={(e) => update(i, e.target.value)}
            placeholder="Например: Победитель получает приз доставкой по РФ."
          />
          <div className="flex flex-col gap-0.5">
            <Btn variant="ghost" onClick={() => move(i, -1)} aria-label="Вверх">
              ↑
            </Btn>
            <Btn variant="ghost" onClick={() => move(i, 1)} aria-label="Вниз">
              ↓
            </Btn>
          </div>
          <Btn variant="ghost" onClick={() => remove(i)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Btn>
        </div>
      ))}
      <Btn onClick={add}>
        <Plus className="h-4 w-4" /> Добавить условие
      </Btn>
    </div>
  );
}

function SpecsEditor({
  specs,
  onChange,
}: {
  specs: RaffleSpec[];
  onChange: (s: RaffleSpec[]) => void;
}) {
  const update = (i: number, patch: Partial<RaffleSpec>) =>
    onChange(specs.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const remove = (i: number) => onChange(specs.filter((_, j) => j !== i));
  const add = () => onChange([...specs, { label: "", value: "" }]);
  return (
    <div className="space-y-2">
      {specs.length === 0 && (
        <div className="rounded border border-dashed border-zinc-200 px-3 py-6 text-center text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
          Характеристик пока нет
        </div>
      )}
      {specs.map((s, i) => (
        <div key={i} className="flex items-center gap-2">
          <TextInput
            value={s.label}
            placeholder="Параметр (например: Двигатель)"
            onChange={(e) => update(i, { label: e.target.value })}
            className="flex-1"
          />
          <TextInput
            value={s.value}
            placeholder="Значение (например: 998 cc)"
            onChange={(e) => update(i, { value: e.target.value })}
            className="flex-1"
          />
          <Btn variant="ghost" onClick={() => remove(i)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Btn>
        </div>
      ))}
      <Btn onClick={add}>
        <Plus className="h-4 w-4" /> Добавить характеристику
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
        <Field label="Подзаголовок (краткое описание под названием)" hint="Видно в карточке и над описанием.">
          <TextInput
            value={r.subtitle ?? ""}
            placeholder="Спортбайк 2024 · 998 cc · из салона"
            onChange={(e) => setR({ ...r, subtitle: e.target.value })}
          />
        </Field>
        <Field label="Описание" hint="Многострочный текст. Абзацы — пустая строка между ними.">
          <TextArea
            rows={6}
            value={r.description ?? ""}
            onChange={(e) => setR({ ...r, description: e.target.value })}
            placeholder="Расскажи про приз, серию, бэкграунд…"
          />
        </Field>
        <Field label="Обложка">
          <ImageUploader
            images={r.cover ? [r.cover] : []}
            onChange={(imgs) => setR({ ...r, cover: imgs[0] ?? "" })}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Дата окончания">
            <TextInput
              type="date"
              value={r.endsAt}
              onChange={(e) => setR({ ...r, endsAt: e.target.value })}
            />
          </Field>
          <Field label="Время окончания (необяз.)" hint="Если задано — таймер тикает с точностью до минут.">
            <TextInput
              type="time"
              value={r.deadlineAt ? r.deadlineAt.slice(11, 16) : ""}
              onChange={(e) => {
                const time = e.target.value;
                if (!time || !r.endsAt) {
                  setR({ ...r, deadlineAt: "" });
                  return;
                }
                setR({ ...r, deadlineAt: `${r.endsAt}T${time}:00` });
              }}
            />
          </Field>
        </div>
        <Field label="Характеристики приза" hint="Например: «Двигатель» / «998 cc, рядная четвёрка». Будут показаны таблицей.">
          <SpecsEditor specs={r.specs ?? []} onChange={(specs) => setR({ ...r, specs })} />
        </Field>
        <Field label="Условия участия" hint="Каждый пункт — отдельная строка. Появятся в блоке «Условия».">
          <RulesEditor rules={r.rules ?? []} onChange={(rules) => setR({ ...r, rules })} />
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
        <StatCard label="Участников" value={raffle.participants.length.toLocaleString("ru-RU")} />
        <StatCard label="Потрачено билетов" value={`${totalTickets(raffle).toLocaleString("ru-RU")} 🎟`} />
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
