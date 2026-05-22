// Админка розыгрышей. Подключено к бэку через admin-queries.
// Модель упрощённая под server/src/db/schema/raffles.ts:
// raffle = title + description + imageUrl + prize + ticketCost + maxEntriesPerUser + startsAt + endsAt + status
// Действия: создание/правка, выбор победителя, отмена (с возвратом билетов всем).

import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trophy, Ban } from "lucide-react";
import { toast } from "sonner";
import {
  PageHeader,
  Panel,
  Btn,
  Badge,
  Field,
  TextInput,
  TextArea,
  Select,
  Modal,
  ConfirmModal,
  DataTable,
} from "@/components/admin/ui";
import {
  adminQk,
  fetchAdminRaffles,
  createAdminRaffle,
  patchAdminRaffle,
  pickRaffleWinner,
  cancelRaffle,
  type CreateRaffleInput,
} from "@/lib/admin-queries";
import { ApiError } from "@/lib/api";
import type { RaffleListItem, RaffleStatus } from "@/lib/queries";

export const Route = createFileRoute("/admin/raffles")({
  component: RafflesPage,
});

const STATUS_LABEL: Record<RaffleStatus, string> = {
  draft: "Черновик",
  active: "Активен",
  finished: "Завершён",
  cancelled: "Отменён",
};
const STATUS_TONE: Record<RaffleStatus, "zinc" | "emerald" | "amber" | "rose"> = {
  draft: "zinc",
  active: "emerald",
  finished: "amber",
  cancelled: "rose",
};

function toDatetimeLocal(iso: string): string {
  // ISO → значение для <input type="datetime-local">
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocal(v: string): string {
  // Принимаем локальное время как локальное, превращаем в ISO.
  if (!v) return "";
  return new Date(v).toISOString();
}

function emptyRaffle(): CreateRaffleInput {
  const now = new Date();
  const week = new Date(now.getTime() + 7 * 24 * 3600 * 1000);
  return {
    title: "",
    description: "",
    imageUrl: null,
    prize: "",
    ticketCost: 1,
    maxEntriesPerUser: null,
    startsAt: now.toISOString(),
    endsAt: week.toISOString(),
    status: "draft",
  };
}

function RafflesPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: adminQk.raffles,
    queryFn: fetchAdminRaffles,
  });

  const [editing, setEditing] = useState<RaffleListItem | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [confirmPick, setConfirmPick] = useState<RaffleListItem | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<RaffleListItem | null>(null);

  const pick = useMutation({
    mutationFn: (id: string) => pickRaffleWinner(id),
    onSuccess: (r) => {
      if (r.alreadyPicked) toast.info("Победитель уже был выбран");
      else if (r.winnerUserId) toast.success("Победитель выбран");
      else toast.error("Нет участников — некого выбирать");
      qc.invalidateQueries({ queryKey: adminQk.raffles });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Не получилось"),
  });

  const cancel = useMutation({
    mutationFn: (id: string) => cancelRaffle(id),
    onSuccess: (r) => {
      toast.success(`Отменён. Возвращено ${r.refunded} 🎟`);
      qc.invalidateQueries({ queryKey: adminQk.raffles });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Не получилось"),
  });

  const items = data?.items ?? [];

  return (
    <div>
      <PageHeader
        title="Розыгрыши"
        description="Создавай розыгрыши, выбирай победителей, отменяй с возвратом билетов."
        actions={
          <Btn variant="primary" onClick={() => setNewOpen(true)}>
            <Plus className="h-4 w-4" /> Новый розыгрыш
          </Btn>
        }
      />

      <Panel>
        {isLoading ? (
          <div className="px-6 py-12 text-center text-sm text-zinc-500">Загрузка…</div>
        ) : items.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-zinc-500">Розыгрышей пока нет</div>
        ) : (
          <DataTable
            headers={["Название", "Приз", "Цена 🎟", "Окончание", "Статус", "Победитель", ""]}
            rows={items.map((r) => [
              <button
                type="button"
                onClick={() => setEditing(r)}
                className="text-left font-medium hover:underline"
              >
                {r.title}
              </button>,
              <span className="text-sm text-zinc-600 dark:text-zinc-300">{r.prize}</span>,
              `${r.ticketCost} 🎟`,
              new Date(r.endsAt).toLocaleString("ru-RU"),
              <Badge tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Badge>,
              r.winnerUserId ? (
                <code className="text-xs">{r.winnerUserId.slice(0, 8)}</code>
              ) : (
                "—"
              ),
              <div className="flex gap-1">
                <Btn variant="ghost" onClick={() => setEditing(r)} aria-label="Править">
                  <Edit className="h-3.5 w-3.5" />
                </Btn>
                {(r.status === "active" || r.status === "finished") && !r.winnerUserId && (
                  <Btn variant="ghost" onClick={() => setConfirmPick(r)} aria-label="Выбрать победителя">
                    <Trophy className="h-3.5 w-3.5" />
                  </Btn>
                )}
                {r.status !== "cancelled" && r.status !== "finished" && (
                  <Btn variant="ghost" onClick={() => setConfirmCancel(r)} aria-label="Отменить">
                    <Ban className="h-3.5 w-3.5" />
                  </Btn>
                )}
              </div>,
            ])}
          />
        )}
      </Panel>

      {newOpen && (
        <RaffleModal
          mode="create"
          initial={emptyRaffle()}
          onClose={() => setNewOpen(false)}
          onDone={() => {
            setNewOpen(false);
            qc.invalidateQueries({ queryKey: adminQk.raffles });
          }}
        />
      )}
      {editing && (
        <RaffleModal
          mode="edit"
          raffleId={editing.id}
          initial={{
            title: editing.title,
            description: editing.description,
            imageUrl: editing.imageUrl,
            prize: editing.prize,
            ticketCost: editing.ticketCost,
            maxEntriesPerUser: editing.maxEntriesPerUser,
            startsAt: editing.startsAt,
            endsAt: editing.endsAt,
            status: editing.status,
          }}
          onClose={() => setEditing(null)}
          onDone={() => {
            setEditing(null);
            qc.invalidateQueries({ queryKey: adminQk.raffles });
          }}
        />
      )}

      <ConfirmModal
        open={!!confirmPick}
        onClose={() => setConfirmPick(null)}
        onConfirm={() => confirmPick && pick.mutate(confirmPick.id)}
        title="Выбрать победителя?"
        message={`Случайный участник «${confirmPick?.title}» получит приз. Действие необратимо.`}
        confirmLabel="Выбрать"
        danger={false}
      />

      <ConfirmModal
        open={!!confirmCancel}
        onClose={() => setConfirmCancel(null)}
        onConfirm={() => confirmCancel && cancel.mutate(confirmCancel.id)}
        title="Отменить розыгрыш?"
        message={`«${confirmCancel?.title}» будет отменён. Всем участникам вернутся потраченные билеты.`}
        confirmLabel="Отменить розыгрыш"
      />
    </div>
  );
}

function RaffleModal({
  mode,
  raffleId,
  initial,
  onClose,
  onDone,
}: {
  mode: "create" | "edit";
  raffleId?: string;
  initial: CreateRaffleInput;
  onClose: () => void;
  onDone: () => void;
}) {
  const [r, setR] = useState<CreateRaffleInput>(initial);
  const [unlimited, setUnlimited] = useState(initial.maxEntriesPerUser == null);

  const save = useMutation({
    mutationFn: () => {
      const payload: CreateRaffleInput = {
        ...r,
        imageUrl: r.imageUrl?.trim() ? r.imageUrl.trim() : null,
        maxEntriesPerUser: unlimited ? null : Math.max(1, Number(r.maxEntriesPerUser) || 1),
      };
      return mode === "create" ? createAdminRaffle(payload) : patchAdminRaffle(raffleId!, payload);
    },
    onSuccess: () => {
      toast.success(mode === "create" ? "Розыгрыш создан" : "Сохранено");
      onDone();
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Не получилось"),
  });

  return (
    <Modal
      open
      onClose={onClose}
      title={mode === "create" ? "Новый розыгрыш" : "Редактировать розыгрыш"}
      size="lg"
      footer={
        <>
          <Btn onClick={onClose}>Отмена</Btn>
          <Btn variant="primary" disabled={save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? "Сохраняем…" : "Сохранить"}
          </Btn>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Название">
          <TextInput value={r.title} onChange={(e) => setR({ ...r, title: e.target.value })} />
        </Field>
        <Field label="Приз" hint="Короткое название приза. Покажется в карточке.">
          <TextInput
            value={r.prize}
            onChange={(e) => setR({ ...r, prize: e.target.value })}
            placeholder="Шлем AGV Pista GP RR"
          />
        </Field>
        <Field label="Описание">
          <TextArea
            rows={4}
            value={r.description ?? ""}
            onChange={(e) => setR({ ...r, description: e.target.value })}
          />
        </Field>
        <Field label="URL обложки" hint="Грузим в MinIO/сторонний хост, сюда вставляем ссылку.">
          <TextInput
            value={r.imageUrl ?? ""}
            onChange={(e) => setR({ ...r, imageUrl: e.target.value })}
            placeholder="https://cdn.hhr.pro/raffles/helmet.jpg"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Цена входа (🎟)">
            <TextInput
              type="number"
              min={1}
              value={r.ticketCost}
              onChange={(e) => setR({ ...r, ticketCost: Math.max(1, Number(e.target.value) || 1) })}
            />
          </Field>
          <Field label="Лимит участий с одного юзера">
            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={unlimited}
                  onChange={(e) => setUnlimited(e.target.checked)}
                />
                Без лимита
              </label>
              {!unlimited && (
                <TextInput
                  type="number"
                  min={1}
                  value={r.maxEntriesPerUser ?? 1}
                  onChange={(e) =>
                    setR({ ...r, maxEntriesPerUser: Math.max(1, Number(e.target.value) || 1) })
                  }
                  className="max-w-[120px]"
                />
              )}
            </div>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Старт">
            <TextInput
              type="datetime-local"
              value={toDatetimeLocal(r.startsAt)}
              onChange={(e) => setR({ ...r, startsAt: fromDatetimeLocal(e.target.value) })}
            />
          </Field>
          <Field label="Окончание">
            <TextInput
              type="datetime-local"
              value={toDatetimeLocal(r.endsAt)}
              onChange={(e) => setR({ ...r, endsAt: fromDatetimeLocal(e.target.value) })}
            />
          </Field>
        </div>

        <Field label="Статус">
          <Select
            value={r.status ?? "draft"}
            onChange={(e) => setR({ ...r, status: e.target.value as RaffleStatus })}
          >
            <option value="draft">Черновик (на сайте не виден)</option>
            <option value="active">Активен (можно участвовать)</option>
            <option value="finished">Завершён</option>
            <option value="cancelled">Отменён</option>
          </Select>
        </Field>
      </div>
    </Modal>
  );
}
