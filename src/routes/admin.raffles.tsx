// Админка розыгрышей. 1 билет = 1 заявка (хардкод на бэке). Призы — отдельный список.
// Картинка обложки грузится файлом в MinIO через /api/v1/uploads/direct (kind=raffle).
// Флаг showOnHome — попадание в hero-блок главной.

import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trophy, Ban, Upload, X, Trash2, Users } from "lucide-react";
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
  fetchAdminRaffleWinners,
  deleteAdminRaffle,
  type CreateRaffleInput,
} from "@/lib/admin-queries";
import {
  fetchRafflePrizes,
  createRafflePrize,
  patchRafflePrize,
  deleteRafflePrize,
  type RafflePrizeDto,
} from "@/lib/blogger-raffles";
import { ApiError } from "@/lib/api";
import { uploadFileToS3 } from "@/lib/garage-api";
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
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocal(v: string): string {
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
    maxEntriesPerUser: null,
    showOnHome: false,
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

  const [editingId, setEditingId] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [confirmPick, setConfirmPick] = useState<RaffleListItem | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<RaffleListItem | null>(null);
  const [winnersOf, setWinnersOf] = useState<RaffleListItem | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<RaffleListItem | null>(null);

  const del = useMutation({
    mutationFn: (id: string) => deleteAdminRaffle(id),
    onSuccess: () => {
      toast.success("Розыгрыш удалён");
      qc.invalidateQueries({ queryKey: adminQk.raffles });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Не получилось"),
  });

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
  const editing = items.find((r) => r.id === editingId) ?? null;

  return (
    <div>
      <PageHeader
        title="Розыгрыши"
        description="1 билет = 1 заявка. Призы добавляются списком. Картинка грузится файлом."
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
            headers={["Название", "На главной", "Окончание", "Статус", "Победитель", ""]}
            rows={items.map((r) => [
              <button
                type="button"
                onClick={() => setEditingId(r.id)}
                className="text-left font-medium hover:underline"
              >
                {r.title}
              </button>,
              r.showOnHome ? <Badge tone="emerald">Да</Badge> : <span className="text-zinc-400">—</span>,
              new Date(r.endsAt).toLocaleString("ru-RU"),
              <Badge tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Badge>,
              r.winnerUserId ? (
                <code className="text-xs">{r.winnerUserId.slice(0, 8)}</code>
              ) : (
                "—"
              ),
              <div className="flex gap-1">
                <Btn variant="ghost" onClick={() => setEditingId(r.id)} aria-label="Править">
                  <Edit className="h-3.5 w-3.5" />
                </Btn>
                <Btn variant="ghost" onClick={() => setWinnersOf(r)} aria-label="Победители">
                  <Users className="h-3.5 w-3.5" />
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
                <Btn variant="ghost" onClick={() => setConfirmDelete(r)} aria-label="Удалить">
                  <Trash2 className="h-3.5 w-3.5" />
                </Btn>
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
          onCreated={(id) => {
            setNewOpen(false);
            qc.invalidateQueries({ queryKey: adminQk.raffles });
            // Сразу открываем созданный раффл — там доступен блок призов.
            setEditingId(id);
          }}
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
            maxEntriesPerUser: editing.maxEntriesPerUser,
            showOnHome: editing.showOnHome,
            startsAt: editing.startsAt,
            endsAt: editing.endsAt,
            status: editing.status,
          }}
          onClose={() => setEditingId(null)}
          onDone={() => {
            setEditingId(null);
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

      <ConfirmModal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (confirmDelete) del.mutate(confirmDelete.id);
          setConfirmDelete(null);
        }}
        title="Удалить розыгрыш?"
        message={`«${confirmDelete?.title}» и все его призы, заявки и победители будут удалены навсегда. Билеты участникам НЕ возвращаются — если нужно вернуть, сначала отмени розыгрыш.`}
        confirmLabel="Удалить"
      />

      {winnersOf && (
        <WinnersModal raffle={winnersOf} onClose={() => setWinnersOf(null)} />
      )}
    </div>
  );
}

function WinnersModal({ raffle, onClose }: { raffle: RaffleListItem; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "raffles", raffle.id, "winners"],
    queryFn: () => fetchAdminRaffleWinners(raffle.id),
  });
  const items = data?.items ?? [];

  return (
    <Modal open onClose={onClose} title={`Победители — ${raffle.title}`} size="lg">
      {isLoading && <div className="py-8 text-center text-sm text-zinc-500">Загрузка…</div>}
      {!isLoading && items.length === 0 && (
        <div className="py-8 text-center text-sm text-zinc-500">Победителей пока нет.</div>
      )}
      {!isLoading && items.length > 0 && (
        <ul className="space-y-2">
          {items.map((w) => (
            <li
              key={w.id}
              className="flex items-start gap-3 rounded-md border border-zinc-200 p-3 dark:border-zinc-800"
            >
              {w.avatarUrl ? (
                <img src={w.avatarUrl} alt="" className="h-12 w-12 rounded-full object-cover" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-200 font-bold dark:bg-zinc-800">
                  {w.nick[0]?.toUpperCase()}
                </div>
              )}
              <div className="flex-1 text-sm">
                <div className="font-semibold">@{w.nick}</div>
                <div className="text-xs text-zinc-500">{w.email}</div>
                <div className="text-xs text-zinc-500">
                  {w.phone ?? "без телефона"} · {w.city ?? "город не указан"}
                </div>
                <div className="mt-1 text-xs">
                  Приз: <span className="font-medium">{w.prizeName}</span>
                </div>
                <div className="text-[11px] text-zinc-400">
                  {new Date(w.createdAt).toLocaleString("ru-RU")}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

function RaffleModal({
  mode,
  raffleId,
  initial,
  onClose,
  onDone,
  onCreated,
}: {
  mode: "create" | "edit";
  raffleId?: string;
  initial: CreateRaffleInput;
  onClose: () => void;
  onDone: () => void;
  onCreated?: (id: string) => void;
}) {
  const [r, setR] = useState<CreateRaffleInput>(initial);
  const [unlimited, setUnlimited] = useState(initial.maxEntriesPerUser == null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const save = useMutation({
    mutationFn: () => {
      const payload: CreateRaffleInput = {
        ...r,
        imageUrl: r.imageUrl?.trim() ? r.imageUrl.trim() : null,
        maxEntriesPerUser: unlimited ? null : Math.max(1, Number(r.maxEntriesPerUser) || 1),
      };
      return mode === "create" ? createAdminRaffle(payload) : patchAdminRaffle(raffleId!, payload);
    },
    onSuccess: (row) => {
      toast.success(mode === "create" ? "Розыгрыш создан — теперь добавь призы" : "Сохранено");
      if (mode === "create" && onCreated) onCreated(row.id);
      else onDone();
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Не получилось"),
  });

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const url = await uploadFileToS3(file, "raffle", raffleId || "new");
      setR((cur) => ({ ...cur, imageUrl: url }));
      toast.success("Картинка загружена");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Не получилось загрузить");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={mode === "create" ? "Новый розыгрыш" : "Редактировать розыгрыш"}
      size="lg"
      footer={
        <>
          <Btn onClick={onClose}>{mode === "create" ? "Отмена" : "Закрыть"}</Btn>
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
        <Field label="Описание">
          <TextArea
            rows={4}
            value={r.description ?? ""}
            onChange={(e) => setR({ ...r, description: e.target.value })}
          />
        </Field>

        <Field label="Обложка" hint="JPG/PNG/WEBP, до 10 МБ. Грузится в MinIO.">
          <div className="flex items-start gap-3">
            {r.imageUrl ? (
              <div className="relative">
                <img
                  src={r.imageUrl}
                  alt=""
                  className="h-24 w-24 rounded-md object-cover ring-1 ring-zinc-200 dark:ring-zinc-800"
                />
                <button
                  type="button"
                  onClick={() => setR({ ...r, imageUrl: null })}
                  className="absolute -right-2 -top-2 rounded-full bg-zinc-900 p-1 text-white shadow"
                  aria-label="Убрать"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-md border border-dashed border-zinc-300 text-xs text-zinc-400 dark:border-zinc-700">
                Нет
              </div>
            )}
            <div className="flex-1">
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleFile(f);
                }}
              />
              <Btn
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                aria-label="Загрузить картинку"
              >
                <Upload className="h-4 w-4" />
                {uploading ? "Загружаем…" : r.imageUrl ? "Заменить файл" : "Загрузить файл"}
              </Btn>
            </div>
          </div>
        </Field>

        <Field label="Лимит участий с одного юзера" hint="1 билет = 1 заявка. Без лимита — можно сколько угодно билетов из одного аккаунта.">
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

        <div className="grid grid-cols-2 gap-3">
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
          <Field label="Показать на главной" hint="Попадёт в hero-блок (только если статус «Активен»).">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!!r.showOnHome}
                onChange={(e) => setR({ ...r, showOnHome: e.target.checked })}
              />
              На главной
            </label>
          </Field>
        </div>

        {mode === "edit" && raffleId && <PrizesEditor raffleId={raffleId} />}
        {mode === "create" && (
          <div className="rounded-md border border-dashed border-zinc-300 p-3 text-xs text-zinc-500 dark:border-zinc-700">
            Призы добавляются после сохранения розыгрыша.
          </div>
        )}
      </div>
    </Modal>
  );
}

// ───────── Управление призами раффла ─────────
// Призы — отдельная таблица raffle_prizes. Один раффл = много призов, у каждого qty слотов.
// Победители фиксируются блогером в рулетке. 1 заявка может выиграть только 1 раз во всём раффле.

function PrizesEditor({ raffleId }: { raffleId: string }) {
  const qc = useQueryClient();
  const prizesQk = ["admin", "raffles", raffleId, "prizes"] as const;
  const { data } = useQuery({
    queryKey: prizesQk,
    queryFn: () => fetchRafflePrizes(raffleId),
  });

  const [draftName, setDraftName] = useState("");
  const [draftQty, setDraftQty] = useState(1);

  const add = useMutation({
    mutationFn: () =>
      createRafflePrize(raffleId, { name: draftName.trim(), qty: Math.max(1, draftQty) }),
    onSuccess: () => {
      setDraftName("");
      setDraftQty(1);
      qc.invalidateQueries({ queryKey: prizesQk });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Не получилось"),
  });

  const patch = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: { name?: string; qty?: number } }) =>
      patchRafflePrize(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: prizesQk }),
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Не получилось"),
  });

  const del = useMutation({
    mutationFn: (id: string) => deleteRafflePrize(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: prizesQk }),
    onError: (e) => {
      if (e instanceof ApiError && e.code === "has_winners") {
        toast.error("Нельзя удалить — по этому призу уже есть зафиксированные победители");
      } else {
        toast.error(e instanceof ApiError ? e.message : "Не получилось");
      }
    },
  });

  const items: RafflePrizeDto[] = data?.items ?? [];

  return (
    <div className="border-t border-zinc-200 pt-4 dark:border-zinc-800">
      <div className="mb-3 text-sm font-medium">Призы</div>
      <p className="mb-3 text-xs text-zinc-500">
        Один приз — одна строка. qty = сколько слотов этого приза разыгрывается.
        Раффл завершится, когда зафиксированы все слоты.
      </p>

      <ul className="space-y-2">
        {items.map((p) => (
          <li key={p.id} className="flex items-center gap-2">
            <TextInput
              value={p.name}
              onChange={(e) => patch.mutate({ id: p.id, patch: { name: e.target.value } })}
              className="flex-1"
            />
            <TextInput
              type="number"
              min={1}
              value={p.qty}
              onChange={(e) =>
                patch.mutate({ id: p.id, patch: { qty: Math.max(1, Number(e.target.value) || 1) } })
              }
              className="w-20"
            />
            <Btn variant="ghost" onClick={() => del.mutate(p.id)} aria-label="Удалить приз">
              <Trash2 className="h-3.5 w-3.5" />
            </Btn>
          </li>
        ))}
        {items.length === 0 && (
          <li className="text-xs text-zinc-500">Пока нет призов — добавьте ниже.</li>
        )}
      </ul>

      <div className="mt-3 flex items-end gap-2">
        <div className="flex-1">
          <Field label="Название приза">
            <TextInput
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              placeholder="Шлем AGV K6"
            />
          </Field>
        </div>
        <Field label="qty">
          <TextInput
            type="number"
            min={1}
            value={draftQty}
            onChange={(e) => setDraftQty(Math.max(1, Number(e.target.value) || 1))}
            className="w-20"
          />
        </Field>
        <Btn
          variant="primary"
          disabled={!draftName.trim() || add.isPending}
          onClick={() => add.mutate()}
        >
          Добавить
        </Btn>
      </div>
    </div>
  );
}
