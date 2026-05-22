// Админка челленджей. CRUD по категориям и задачам.
// Сейчас работает на in-memory state (seed из src/data/quests.ts),
// при переезде на бэк — поменяем источник на server fn без правок UI.

import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Edit, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import {
  PageHeader,
  Panel,
  PanelHeader,
  Btn,
  Badge,
  Modal,
  ConfirmModal,
  Field,
  TextInput,
  TextArea,
  Select,
  Switch,
} from "@/components/admin/ui";
import {
  CLUB_QUESTS,
  CATEGORY_LABEL,
  type Quest,
  type QuestCategory,
  type QuestKind,
} from "@/data/quests";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/quests")({
  component: AdminQuestsPage,
});

type Category = { id: QuestCategory | string; label: string };

const SEED_CATEGORIES: Category[] = (
  Object.entries(CATEGORY_LABEL) as [QuestCategory, string][]
).map(([id, label]) => ({ id, label }));

type EditableQuest = Quest & { enabled: boolean };

const SEED_QUESTS: EditableQuest[] = CLUB_QUESTS.map((q) => ({ ...q, enabled: true }));

function AdminQuestsPage() {
  const [cats, setCats] = useState<Category[]>(SEED_CATEGORIES);
  const [quests, setQuests] = useState<EditableQuest[]>(SEED_QUESTS);

  const [catOpen, setCatOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [catDelete, setCatDelete] = useState<Category | null>(null);

  const [questOpen, setQuestOpen] = useState(false);
  const [editingQuest, setEditingQuest] = useState<EditableQuest | null>(null);
  const [questDelete, setQuestDelete] = useState<EditableQuest | null>(null);

  const grouped = useMemo(() => {
    const m = new Map<string, EditableQuest[]>();
    cats.forEach((c) => m.set(c.id, []));
    quests.forEach((q) => {
      const arr = m.get(q.category) ?? [];
      arr.push(q);
      m.set(q.category, arr);
    });
    return m;
  }, [cats, quests]);

  const totalXp = quests
    .filter((q) => q.enabled)
    .reduce((s, q) => s + q.xp, 0);
  const totalTickets = quests
    .filter((q) => q.enabled)
    .reduce((s, q) => s + q.tickets, 0);

  function moveQuest(id: string, dir: -1 | 1) {
    setQuests((list) => {
      const idx = list.findIndex((x) => x.id === id);
      if (idx < 0) return list;
      const target = idx + dir;
      if (target < 0 || target >= list.length) return list;
      const copy = [...list];
      [copy[idx], copy[target]] = [copy[target], copy[idx]];
      return copy;
    });
  }

  return (
    <div>
      <PageHeader
        title="Челленджи"
        description="Категории и задания клуба. XP + билеты задаёшь сам, ступенчатые награды — для Hell AI и подобного."
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Stat label="Категорий" value={String(cats.length)} />
        <Stat label="Челленджей (включено)" value={`${quests.filter((q) => q.enabled).length} / ${quests.length}`} />
        <Stat label="Суммарно за всё" value={`${totalXp} XP · ${totalTickets} 🎟`} />
      </div>

      <Panel className="mb-4">
        <PanelHeader>
          <h3 className="text-sm font-semibold">Категории</h3>
          <Btn
            variant="primary"
            onClick={() => {
              setEditingCat({ id: "", label: "" });
              setCatOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> Категория
          </Btn>
        </PanelHeader>
        <div className="flex flex-wrap gap-2 p-4">
          {cats.map((c) => {
            const count = grouped.get(c.id)?.length ?? 0;
            return (
              <span
                key={c.id}
                className="inline-flex items-center gap-2 rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-medium dark:border-zinc-800 dark:bg-zinc-900"
              >
                <span className="text-zinc-700 dark:text-zinc-200">{c.label}</span>
                <span className="text-zinc-400">· {count}</span>
                <button
                  type="button"
                  onClick={() => {
                    setEditingCat(c);
                    setCatOpen(true);
                  }}
                  className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                  aria-label="Редактировать"
                >
                  <Edit className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => setCatDelete(c)}
                  className="text-zinc-400 hover:text-rose-500"
                  aria-label="Удалить"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </span>
            );
          })}
        </div>
      </Panel>

      {cats.map((cat) => {
        const items = grouped.get(cat.id) ?? [];
        return (
          <Panel key={cat.id} className="mb-4">
            <PanelHeader>
              <h3 className="text-sm font-semibold">
                {cat.label}{" "}
                <span className="ml-2 text-xs font-normal text-zinc-500">
                  {items.length} {items.length === 1 ? "задача" : "задач"}
                </span>
              </h3>
              <Btn
                variant="primary"
                onClick={() => {
                  setEditingQuest({
                    id: "",
                    title: "",
                    description: "",
                    category: cat.id as QuestCategory,
                    progress: 0,
                    goal: 1,
                    unit: "",
                    xp: 100,
                    tickets: 0,
                    kind: "one-time",
                    enabled: true,
                  });
                  setQuestOpen(true);
                }}
              >
                <Plus className="h-4 w-4" /> Челлендж
              </Btn>
            </PanelHeader>
            {items.length === 0 ? (
              <div className="px-6 py-8 text-center text-sm text-zinc-500">Пока пусто</div>
            ) : (
              <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {items.map((q) => (
                  <li
                    key={q.id}
                    className="flex items-start gap-3 px-4 py-3"
                  >
                    <div className="flex flex-col gap-1 pt-0.5">
                      <button
                        type="button"
                        onClick={() => moveQuest(q.id, -1)}
                        className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800"
                        aria-label="Выше"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveQuest(q.id, 1)}
                        className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800"
                        aria-label="Ниже"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={cn("font-medium", !q.enabled && "text-zinc-400 line-through")}>
                          {q.title || "(без названия)"}
                        </span>
                        <Badge tone={q.kind === "one-time" ? "blue" : "violet"}>
                          {q.kind === "one-time" ? "Разово" : "Повторяемо"}
                        </Badge>
                        {q.bloggerOnly && <Badge tone="amber">Только блогер</Badge>}
                        {q.ladder && <Badge tone="emerald">Лесенка · {q.ladder.length}</Badge>}
                      </div>
                      <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                        Цель: {q.goal} {q.unit} · {q.xp} XP
                        {q.tickets > 0 && ` · ${q.tickets} 🎟`}
                      </div>
                      {q.description && (
                        <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2">
                          {q.description}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={q.enabled}
                        onChange={(v) =>
                          setQuests((l) => l.map((x) => (x.id === q.id ? { ...x, enabled: v } : x)))
                        }
                      />
                      <Btn
                        variant="ghost"
                        onClick={() => {
                          setEditingQuest(q);
                          setQuestOpen(true);
                        }}
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Btn>
                      <Btn variant="ghost" onClick={() => setQuestDelete(q)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Btn>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        );
      })}

      {editingCat && (
        <CategoryModal
          open={catOpen}
          initial={editingCat}
          onClose={() => setCatOpen(false)}
          onSave={(c) => {
            if (editingCat.id) {
              setCats((l) => l.map((x) => (x.id === editingCat.id ? c : x)));
              if (editingCat.id !== c.id) {
                setQuests((l) =>
                  l.map((q) => (q.category === editingCat.id ? { ...q, category: c.id as QuestCategory } : q)),
                );
              }
            } else {
              setCats((l) => [...l, c]);
            }
            setCatOpen(false);
          }}
        />
      )}

      <ConfirmModal
        open={!!catDelete}
        onClose={() => setCatDelete(null)}
        onConfirm={() => {
          if (!catDelete) return;
          setQuests((l) => l.filter((q) => q.category !== catDelete.id));
          setCats((l) => l.filter((c) => c.id !== catDelete.id));
          setCatDelete(null);
        }}
        title={`Удалить категорию «${catDelete?.label}»?`}
        message="Все челленджи внутри этой категории тоже будут удалены."
        confirmLabel="Удалить"
      />

      {editingQuest && (
        <QuestModal
          open={questOpen}
          initial={editingQuest}
          categories={cats}
          onClose={() => setQuestOpen(false)}
          onSave={(q) => {
            if (editingQuest.id) {
              setQuests((l) => l.map((x) => (x.id === editingQuest.id ? q : x)));
            } else {
              setQuests((l) => [...l, { ...q, id: `q-${Date.now()}` }]);
            }
            setQuestOpen(false);
          }}
        />
      )}

      <ConfirmModal
        open={!!questDelete}
        onClose={() => setQuestDelete(null)}
        onConfirm={() => {
          if (!questDelete) return;
          setQuests((l) => l.filter((q) => q.id !== questDelete.id));
          setQuestDelete(null);
        }}
        title={`Удалить челлендж «${questDelete?.title}»?`}
        message="Действие нельзя отменить."
        confirmLabel="Удалить"
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold tabular-nums">{value}</div>
    </div>
  );
}

function CategoryModal({
  open,
  initial,
  onClose,
  onSave,
}: {
  open: boolean;
  initial: Category;
  onClose: () => void;
  onSave: (c: Category) => void;
}) {
  const [label, setLabel] = useState(initial.label);
  const [id, setId] = useState(initial.id);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial.id ? "Редактировать категорию" : "Новая категория"}
      footer={
        <>
          <Btn onClick={onClose}>Отмена</Btn>
          <Btn
            variant="primary"
            onClick={() => {
              const finalId = id || slugify(label);
              if (!finalId || !label) return;
              onSave({ id: finalId, label });
            }}
          >
            Сохранить
          </Btn>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Название">
          <TextInput
            value={label}
            onChange={(e) => {
              setLabel(e.target.value);
              if (!initial.id) setId(slugify(e.target.value));
            }}
            placeholder="Например: Покатушки"
          />
        </Field>
        <Field label="Идентификатор" hint="Латиницей, без пробелов. Меняется только в крайнем случае.">
          <TextInput value={id} onChange={(e) => setId(slugify(e.target.value))} placeholder="ride" />
        </Field>
      </div>
    </Modal>
  );
}

function QuestModal({
  open,
  initial,
  categories,
  onClose,
  onSave,
}: {
  open: boolean;
  initial: EditableQuest;
  categories: Category[];
  onClose: () => void;
  onSave: (q: EditableQuest) => void;
}) {
  const [q, setQ] = useState<EditableQuest>(initial);
  const [useLadder, setUseLadder] = useState(!!initial.ladder);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial.id ? "Редактировать челлендж" : "Новый челлендж"}
      footer={
        <>
          <Btn onClick={onClose}>Отмена</Btn>
          <Btn
            variant="primary"
            onClick={() => {
              const out: EditableQuest = {
                ...q,
                ladder: useLadder ? (q.ladder ?? []).filter((s) => s.at > 0) : undefined,
              };
              onSave(out);
            }}
          >
            Сохранить
          </Btn>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Название">
          <TextInput value={q.title} onChange={(e) => setQ({ ...q, title: e.target.value })} />
        </Field>
        <Field label="Описание">
          <TextArea rows={2} value={q.description} onChange={(e) => setQ({ ...q, description: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Категория">
            <Select
              value={q.category}
              onChange={(e) => setQ({ ...q, category: e.target.value as QuestCategory })}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Тип">
            <Select value={q.kind} onChange={(e) => setQ({ ...q, kind: e.target.value as QuestKind })}>
              <option value="one-time">Разовое</option>
              <option value="repeatable">Повторяемое</option>
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Цель (число)">
            <TextInput
              type="number"
              value={q.goal}
              onChange={(e) => setQ({ ...q, goal: Number(e.target.value) })}
            />
          </Field>
          <Field label="Единица измерения" hint="км, заказ, друг, вопросов…">
            <TextInput value={q.unit} onChange={(e) => setQ({ ...q, unit: e.target.value })} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="XP за выполнение">
            <TextInput
              type="number"
              value={q.xp}
              onChange={(e) => setQ({ ...q, xp: Number(e.target.value) })}
            />
          </Field>
          <Field label="Билеты">
            <TextInput
              type="number"
              value={q.tickets}
              onChange={(e) => setQ({ ...q, tickets: Number(e.target.value) })}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Только для блогеров">
            <Switch checked={!!q.bloggerOnly} onChange={(v) => setQ({ ...q, bloggerOnly: v })} />
          </Field>
          <Field label="Включён">
            <Switch checked={q.enabled} onChange={(v) => setQ({ ...q, enabled: v })} />
          </Field>
        </div>
        <Field label="Ссылка действия (опционально)" hint="Куда ведёт кнопка на странице задания">
          <div className="grid grid-cols-2 gap-2">
            <TextInput
              placeholder="Текст: «В магазин»"
              value={q.action?.label ?? ""}
              onChange={(e) =>
                setQ({
                  ...q,
                  action: { label: e.target.value, to: q.action?.to ?? "" },
                })
              }
            />
            <TextInput
              placeholder="Путь: /club/shop"
              value={q.action?.to ?? ""}
              onChange={(e) =>
                setQ({
                  ...q,
                  action: { label: q.action?.label ?? "", to: e.target.value },
                })
              }
            />
          </div>
        </Field>

        <div className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Ступенчатая награда</div>
              <div className="text-xs text-zinc-500">Для Hell AI и подобных: XP даётся за каждый порог.</div>
            </div>
            <Switch
              checked={useLadder}
              onChange={(v) => {
                setUseLadder(v);
                if (v && (!q.ladder || q.ladder.length === 0)) {
                  setQ({ ...q, ladder: [{ at: 5, xp: 50 }] });
                }
              }}
            />
          </div>
          {useLadder && (
            <div className="space-y-2">
              {(q.ladder ?? []).map((step, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_auto] items-center gap-2">
                  <TextInput
                    type="number"
                    placeholder="Порог"
                    value={step.at}
                    onChange={(e) => {
                      const ladder = [...(q.ladder ?? [])];
                      ladder[i] = { ...ladder[i], at: Number(e.target.value) };
                      setQ({ ...q, ladder });
                    }}
                  />
                  <TextInput
                    type="number"
                    placeholder="XP"
                    value={step.xp}
                    onChange={(e) => {
                      const ladder = [...(q.ladder ?? [])];
                      ladder[i] = { ...ladder[i], xp: Number(e.target.value) };
                      setQ({ ...q, ladder });
                    }}
                  />
                  <Btn
                    variant="ghost"
                    onClick={() => {
                      const ladder = (q.ladder ?? []).filter((_, j) => j !== i);
                      setQ({ ...q, ladder });
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Btn>
                </div>
              ))}
              <Btn
                onClick={() => {
                  const ladder = [...(q.ladder ?? [])];
                  const last = ladder[ladder.length - 1];
                  ladder.push({ at: (last?.at ?? 0) + 5, xp: last?.xp ?? 50 });
                  setQ({ ...q, ladder });
                }}
              >
                <Plus className="h-4 w-4" /> Ступень
              </Btn>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u0400-\u04ff\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/^-+|-+$/g, "");
}
