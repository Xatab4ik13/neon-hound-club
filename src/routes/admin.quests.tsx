// Админка квестов. CRUD по бэк-модели: code, title, description, ticketsReward,
// kind (auto/manual), repeatable, sortOrder, active.
// Доп. возможность: вручную засчитать manual-квест конкретному пользователю по нику.

import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, CheckCircle2, PlumpSearch as Search } from "@/components/ui/icons";
import { hhToast as toast } from "@/lib/hh-toast";
import {
  PageHeader,
  Panel,
  Btn,
  Badge,
  Field,
  TextInput,
  TextArea,
  Select,
  Switch,
  Modal,
  ConfirmModal,
  DataTable,
} from "@/components/admin/ui";
import {
  adminQk,
  fetchAdminQuests,
  createAdminQuest,
  patchAdminQuest,
  deleteAdminQuest,
  completeQuestForUser,
  fetchAdminUsers,
  type AdminQuest,
  type CreateQuestInput,
} from "@/lib/admin-queries";
import { ApiError } from "@/lib/api";

export const Route = createFileRoute("/admin/quests")({
  component: AdminQuestsPage,
});

function emptyQuest(): CreateQuestInput {
  return {
    code: "",
    title: "",
    description: "",
    ticketsReward: 0,
    kind: "auto",
    repeatable: false,
    sortOrder: 0,
    active: true,
  };
}

function AdminQuestsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: adminQk.quests,
    queryFn: fetchAdminQuests,
  });

  const [editing, setEditing] = useState<AdminQuest | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [del, setDel] = useState<AdminQuest | null>(null);
  const [completeFor, setCompleteFor] = useState<AdminQuest | null>(null);

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteAdminQuest(id),
    onSuccess: () => {
      toast.success("Квест удалён");
      qc.invalidateQueries({ queryKey: adminQk.quests });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Не получилось"),
  });

  const items = data?.items ?? [];
  const active = items.filter((q) => q.active).length;
  const totalTickets = items.filter((q) => q.active).reduce((s, q) => s + q.ticketsReward, 0);

  return (
    <div>
      <PageHeader
        title="Квесты"
        description="Задания клуба. Auto — засчитываются логикой бэка. Manual — руками отсюда."
        actions={
          <Btn variant="primary" onClick={() => setNewOpen(true)}>
            <Plus className="h-4 w-4" /> Новый квест
          </Btn>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Stat label="Всего квестов" value={String(items.length)} />
        <Stat label="Активных" value={String(active)} />
        <Stat label="Билетов за всё" value={`${totalTickets} 🎟`} />
      </div>

      <Panel>
        {isLoading ? (
          <div className="px-6 py-12 text-center text-sm text-zinc-500">Загрузка…</div>
        ) : items.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-zinc-500">Квестов пока нет</div>
        ) : (
          <DataTable
            headers={["Code", "Название", "Тип", "Билетов", "Повтор", "Порядок", "Статус", ""]}
            rows={items.map((q) => [
              <code className="text-xs text-zinc-500">{q.code}</code>,
              <button
                type="button"
                onClick={() => setEditing(q)}
                className="text-left font-medium hover:underline"
              >
                {q.title}
              </button>,
              <Badge tone={q.kind === "auto" ? "blue" : "violet"}>
                {q.kind === "auto" ? "Auto" : "Manual"}
              </Badge>,
              `${q.ticketsReward} 🎟`,
              q.repeatable ? "Да" : "Нет",
              q.sortOrder,
              <Badge tone={q.active ? "emerald" : "zinc"}>{q.active ? "Активен" : "Скрыт"}</Badge>,
              <div className="flex gap-1">
                {q.kind === "manual" && (
                  <Btn variant="ghost" onClick={() => setCompleteFor(q)} aria-label="Засчитать">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </Btn>
                )}
                <Btn variant="ghost" onClick={() => setEditing(q)}>
                  <Edit className="h-3.5 w-3.5" />
                </Btn>
                <Btn variant="ghost" onClick={() => setDel(q)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Btn>
              </div>,
            ])}
          />
        )}
      </Panel>

      {newOpen && (
        <QuestModal
          mode="create"
          initial={emptyQuest()}
          onClose={() => setNewOpen(false)}
          onDone={() => {
            setNewOpen(false);
            qc.invalidateQueries({ queryKey: adminQk.quests });
          }}
        />
      )}
      {editing && (
        <QuestModal
          mode="edit"
          questId={editing.id}
          initial={{
            code: editing.code,
            title: editing.title,
            description: editing.description,
            ticketsReward: editing.ticketsReward,
            kind: editing.kind,
            repeatable: editing.repeatable,
            sortOrder: editing.sortOrder,
            active: editing.active,
          }}
          onClose={() => setEditing(null)}
          onDone={() => {
            setEditing(null);
            qc.invalidateQueries({ queryKey: adminQk.quests });
          }}
        />
      )}

      <ConfirmModal
        open={!!del}
        onClose={() => setDel(null)}
        onConfirm={() => del && deleteMut.mutate(del.id)}
        title="Удалить квест?"
        message={`«${del?.title}» исчезнет с фронта. История завершений сохранится.`}
      />

      {completeFor && (
        <CompleteForUserModal
          quest={completeFor}
          onClose={() => setCompleteFor(null)}
        />
      )}
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

function QuestModal({
  mode,
  questId,
  initial,
  onClose,
  onDone,
}: {
  mode: "create" | "edit";
  questId?: string;
  initial: CreateQuestInput;
  onClose: () => void;
  onDone: () => void;
}) {
  const [q, setQ] = useState<CreateQuestInput>(initial);

  const save = useMutation({
    mutationFn: () => {
      if (mode === "create") return createAdminQuest(q);
      const { code: _code, ...patch } = q;
      return patchAdminQuest(questId!, patch);
    },
    onSuccess: () => {
      toast.success(mode === "create" ? "Квест создан" : "Сохранено");
      onDone();
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Не получилось"),
  });

  return (
    <Modal
      open
      onClose={onClose}
      title={mode === "create" ? "Новый квест" : "Редактировать квест"}
      footer={
        <>
          <Btn onClick={onClose}>Отмена</Btn>
          <Btn variant="primary" disabled={save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? "Сохраняем…" : "Сохранить"}
          </Btn>
        </>
      }
    >
      <div className="space-y-3">
        <Field
          label="Code"
          hint="Уникальный машинный идентификатор. После создания не меняется."
        >
          <TextInput
            value={q.code}
            onChange={(e) =>
              setQ({ ...q, code: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "") })
            }
            placeholder="profile_complete"
            disabled={mode === "edit"}
          />
        </Field>
        <Field label="Название">
          <TextInput value={q.title} onChange={(e) => setQ({ ...q, title: e.target.value })} />
        </Field>
        <Field label="Описание">
          <TextArea
            rows={2}
            value={q.description ?? ""}
            onChange={(e) => setQ({ ...q, description: e.target.value })}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Тип">
            <Select
              value={q.kind}
              onChange={(e) => setQ({ ...q, kind: e.target.value as "auto" | "manual" })}
            >
              <option value="auto">Auto (бэк сам)</option>
              <option value="manual">Manual (руками)</option>
            </Select>
          </Field>
          <Field label="Билетов за выполнение">
            <TextInput
              type="number"
              min={0}
              value={q.ticketsReward}
              onChange={(e) =>
                setQ({ ...q, ticketsReward: Math.max(0, Number(e.target.value) || 0) })
              }
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Повторяемое" hint="Можно выполнить несколько раз и каждый раз получать билеты.">
            <Switch checked={q.repeatable ?? false} onChange={(v) => setQ({ ...q, repeatable: v })} />
          </Field>
          <Field label="Активный">
            <Switch checked={q.active ?? true} onChange={(v) => setQ({ ...q, active: v })} />
          </Field>
        </div>
        <Field label="Порядок">
          <TextInput
            type="number"
            value={q.sortOrder ?? 0}
            onChange={(e) => setQ({ ...q, sortOrder: Number(e.target.value) || 0 })}
          />
        </Field>
      </div>
    </Modal>
  );
}

function CompleteForUserModal({ quest, onClose }: { quest: AdminQuest; onClose: () => void }) {
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<{ id: string; nick: string } | null>(null);

  const usersQ = useQuery({
    queryKey: adminQk.users(search),
    queryFn: () => fetchAdminUsers({ q: search }),
    enabled: search.length >= 2,
  });

  const complete = useMutation({
    mutationFn: () => completeQuestForUser(quest.code, picked!.id),
    onSuccess: (res) => {
      if ("credited" in res && res.credited) {
        toast.success(`@${picked!.nick}: +${res.tickets} 🎟`);
        onClose();
      } else {
        toast.error(`Не получилось: ${"reason" in res ? res.reason : "unknown"}`);
      }
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Не получилось"),
  });

  return (
    <Modal
      open
      onClose={onClose}
      title={`Засчитать: ${quest.title}`}
      description={`Начислится ${quest.ticketsReward} 🎟. Не-повторяемый квест не зачтётся повторно.`}
      footer={
        <>
          <Btn onClick={onClose}>Отмена</Btn>
          <Btn
            variant="primary"
            disabled={!picked || complete.isPending}
            onClick={() => complete.mutate()}
          >
            {complete.isPending ? "…" : "Засчитать"}
          </Btn>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Найти пользователя" hint="Ник, email или часть. Минимум 2 символа.">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <TextInput
              className="pl-8"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPicked(null);
              }}
              placeholder="hellrider"
            />
          </div>
        </Field>

        {picked ? (
          <div className="flex items-center justify-between rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm dark:border-emerald-900/40 dark:bg-emerald-900/20">
            <div>
              Выбран: <b>@{picked.nick}</b>
            </div>
            <button
              type="button"
              onClick={() => setPicked(null)}
              className="text-xs text-zinc-500 hover:underline"
            >
              Сменить
            </button>
          </div>
        ) : search.length >= 2 ? (
          <div className="max-h-60 overflow-y-auto rounded-md border border-zinc-200 dark:border-zinc-800">
            {usersQ.isLoading ? (
              <div className="px-3 py-4 text-center text-sm text-zinc-500">Ищем…</div>
            ) : usersQ.data?.items.length === 0 ? (
              <div className="px-3 py-4 text-center text-sm text-zinc-500">Не найдено</div>
            ) : (
              <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {usersQ.data?.items.map((u) => (
                  <li key={u.id}>
                    <button
                      type="button"
                      onClick={() => setPicked({ id: u.id, nick: u.nick })}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800"
                    >
                      <div>
                        <div className="font-medium">@{u.nick}</div>
                        <div className="text-xs text-zinc-500">{u.email}</div>
                      </div>
                      {u.blocked && <Badge tone="rose">Заблокирован</Badge>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
