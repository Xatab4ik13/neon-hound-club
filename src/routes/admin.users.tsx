import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, Gift, ShieldCheck, Trash2, Sparkles, Award } from "lucide-react";
import {
  PageHeader,
  Panel,
  DataTable,
  Badge,
  Btn,
  TextInput,
  Drawer,
  Field,
  ConfirmModal,
  Modal,
} from "@/components/admin/ui";
import {
  adminQk,
  creditTickets,
  deleteAdminUser,
  fetchAdminUser,
  fetchAdminUsers,
  fetchAdminUserBadges,
  fetchAdminBadges,
  grantXp,
  awardBadge,
  patchAdminUser,
  type AdminUserListItem,
} from "@/lib/admin-queries";
import { ApiError } from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/users")({
  component: UsersPage,
});

function UsersPage() {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [giftOpen, setGiftOpen] = useState(false);

  // дебаунс поиска
  if (query !== debounced) {
    // простая задержка через setTimeout снаружи рендера не сделать без эффекта;
    // ставим сразу, и пусть запрос ходит. 200 строк не страшно.
    setTimeout(() => setDebounced(query), 250);
  }

  const listQ = useQuery({
    queryKey: adminQk.users(debounced),
    queryFn: () => fetchAdminUsers(debounced || undefined),
  });

  const items = listQ.data?.items ?? [];

  return (
    <div>
      <PageHeader title="Пользователи" description={`Найдено: ${items.length}`} />

      <div className="mb-3 flex gap-2">
        <TextInput
          placeholder="Поиск по нику или email…"
          className="max-w-md"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <Panel>
        <DataTable
          headers={["Ник", "Email", "Город", "Роль", "Статус", "Регистрация", ""]}
          rows={items.map((u) => [
            <span className="font-medium">@{u.nick}</span>,
            <span className="text-zinc-600 dark:text-zinc-300">{u.email}</span>,
            <span>{u.city ?? "—"}</span>,
            <Badge tone={u.role === "admin" ? "rose" : "zinc"}>{u.role}</Badge>,
            <Badge tone={u.blocked ? "rose" : u.emailVerified ? "emerald" : "amber"}>
              {u.blocked ? "Бан" : u.emailVerified ? "Активен" : "Не подтв."}
            </Badge>,
            <span className="tabular-nums text-zinc-500 dark:text-zinc-400">
              {new Date(u.createdAt).toLocaleDateString("ru-RU")}
            </span>,
            <Btn variant="ghost" onClick={() => setSelectedId(u.id)}>
              Открыть
            </Btn>,
          ])}
        />
        {listQ.isLoading && <div className="p-6 text-center text-sm text-zinc-500">Загрузка…</div>}
        {!listQ.isLoading && items.length === 0 && (
          <div className="p-6 text-center text-sm text-zinc-500">Никого не найдено</div>
        )}
      </Panel>

      {selectedId && (
        <UserDrawer
          userId={selectedId}
          onClose={() => setSelectedId(null)}
          onGift={() => setGiftOpen(true)}
        />
      )}

      {selectedId && giftOpen && (
        <GiftModal userId={selectedId} onClose={() => setGiftOpen(false)} />
      )}
    </div>
  );
}

function UserDrawer({
  userId,
  onClose,
  onGift,
}: {
  userId: string;
  onClose: () => void;
  onGift: () => void;
}) {
  const qc = useQueryClient();
  const userQ = useQuery({
    queryKey: adminQk.user(userId),
    queryFn: () => fetchAdminUser(userId),
  });
  const badgesQ = useQuery({
    queryKey: ["admin", "user", userId, "badges"],
    queryFn: () => fetchAdminUserBadges(userId),
  });
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [xpOpen, setXpOpen] = useState(false);
  const [badgeOpen, setBadgeOpen] = useState(false);

  const patchMut = useMutation({
    mutationFn: (patch: { role?: "user" | "blogger"; blocked?: boolean }) =>
      patchAdminUser(userId, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminQk.user(userId) });
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      toast.success("Обновлено");
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Ошибка"),
  });

  const deleteMut = useMutation({
    mutationFn: () => deleteAdminUser(userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      toast.success("Пользователь удалён");
      onClose();
    },
    onError: (e) => {
      const raw = e instanceof ApiError ? e.message : "Ошибка";
      const msg =
        raw === "cannot_delete_self"
          ? "Нельзя удалить самого себя. Залогинься под другим админом."
          : raw === "Bad Request"
            ? "Нельзя удалить этого юзера (возможно, это ты сам)."
            : raw;
      toast.error(msg);
    },
  });

  const u = userQ.data;

  return (
    <Drawer
      open
      onClose={onClose}
      title={u ? `@${u.nick}` : "…"}
      footer={
        u && (
          <>
            <Btn variant="danger" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="h-4 w-4" /> Удалить
            </Btn>
            {u.blocked ? (
              <Btn onClick={() => patchMut.mutate({ blocked: false })}>
                <ShieldCheck className="h-4 w-4" /> Разбанить
              </Btn>
            ) : (
              <Btn variant="danger" onClick={() => setConfirmBlock(true)}>
                <Ban className="h-4 w-4" /> Забанить
              </Btn>
            )}
            <Btn
              onClick={() =>
                patchMut.mutate({ role: u.role === "blogger" ? "user" : "blogger" })
              }
            >
              {u.role === "blogger" ? "Снять блогера" : "Сделать блогером"}
            </Btn>
          </>
        )
      }
    >
      {userQ.isLoading && <div className="text-sm text-zinc-500">Загрузка…</div>}
      {u && (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-200 text-xl font-bold dark:bg-zinc-800">
              {u.nick[0]?.toUpperCase()}
            </div>
            <div>
              <div className="text-lg font-semibold">@{u.nick}</div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">{u.email}</div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">
                {u.city ?? "—"} · {u.phone ?? "без телефона"}
              </div>
            </div>
          </div>

          <Section title="Активность">
            <InfoRow label="Регистрация" value={new Date(u.createdAt).toLocaleString("ru-RU")} />
            <InfoRow label="Email подтверждён" value={u.emailVerified ? "да" : "нет"} />
            <InfoRow label="Роль" value={u.role} />
            <InfoRow label="Статус" value={u.blocked ? "забанен" : "активен"} />
          </Section>

          <Section title="Билеты">
            <Metric label="Баланс" value={String(u.ticketsBalance)} />
            <Metric label="Всего заработано" value={String(u.ticketsEarned)} />
          </Section>

          <Section title="Магазин">
            <Metric label="Потрачено" value={`${u.totalSpentRub.toLocaleString("ru-RU")} ₽`} />
            <Metric label="Заказов" value={String(u.ordersCount)} />
          </Section>

          <Section title="Ранг / XP">
            <Metric label="XP" value={String(u.xpTotal)} />
            <Metric label="Ранг" value={u.rank?.rankLabel ?? "—"} />
            <div className="col-span-2 flex gap-2">
              <Btn onClick={() => setXpOpen(true)}>
                <Sparkles className="h-4 w-4" /> Начислить XP
              </Btn>
              <Btn onClick={() => setBadgeOpen(true)}>
                <Award className="h-4 w-4" /> Выдать значок
              </Btn>
            </div>
          </Section>

          <Section title="Значки">
            {badgesQ.data?.items?.length ? (
              <div className="col-span-2 flex flex-wrap gap-1.5">
                {badgesQ.data.items.map((b) => (
                  <Badge key={b.id} tone={b.category === "rank" ? "amber" : "zinc"}>
                    {b.name}
                  </Badge>
                ))}
              </div>
            ) : (
              <InfoRow label="—" value="нет значков" />
            )}
          </Section>

          <Section title="Hell Pass">
            {u.activePass ? (
              <>
                <InfoRow label="Тариф" value={u.activePass.tier} />
                <InfoRow
                  label="До"
                  value={
                    u.activePass.expiresAt
                      ? new Date(u.activePass.expiresAt).toLocaleDateString("ru-RU")
                      : "—"
                  }
                />
              </>
            ) : (
              <InfoRow label="—" value="нет активного" />
            )}
          </Section>

          <Btn onClick={onGift}>
            <Gift className="h-4 w-4" /> Начислить билеты
          </Btn>
        </div>
      )}

      <ConfirmModal
        open={confirmBlock}
        onClose={() => setConfirmBlock(false)}
        onConfirm={() => {
          patchMut.mutate({ blocked: true });
          setConfirmBlock(false);
        }}
        title="Забанить юзера?"
        message={u ? `@${u.nick} потеряет доступ к клубу.` : ""}
        confirmLabel="Забанить"
      />

      <ConfirmModal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          deleteMut.mutate();
          setConfirmDelete(false);
        }}
        title="Удалить юзера навсегда?"
        message={u ? `@${u.nick} и все связанные данные будут удалены. Действие необратимо.` : ""}
        confirmLabel="Удалить"
      />

      {xpOpen && u && (
        <GrantXpModal nick={u.nick} userId={userId} onClose={() => setXpOpen(false)} />
      )}
      {badgeOpen && u && (
        <AwardBadgeModal nick={u.nick} userId={userId} onClose={() => setBadgeOpen(false)} />
      )}
    </Drawer>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-500">{title}</div>
      <div className="grid grid-cols-2 gap-2">{children}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="col-span-2 flex justify-between gap-2 border-b border-zinc-100 py-1.5 text-sm dark:border-zinc-800/60">
      <span className="text-zinc-500">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-zinc-200 px-3 py-2 dark:border-zinc-800">
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="text-lg font-bold tabular-nums">{value}</div>
    </div>
  );
}

function GiftModal({ userId, onClose }: { userId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [amount, setAmount] = useState("10");
  const [reason, setReason] = useState("Бонус");

  const mut = useMutation({
    mutationFn: () =>
      creditTickets({
        userId,
        amount: Number(amount),
        reason: reason.trim() || "Бонус",
        source: "admin",
      }),
    onSuccess: (res) => {
      toast.success(`Баланс: ${res.balance}`);
      qc.invalidateQueries({ queryKey: adminQk.user(userId) });
      onClose();
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Ошибка"),
  });

  return (
    <Modal open onClose={onClose} title="Начислить билеты">
      <div className="space-y-3">
        <Field label="Количество (отрицательное = списать)">
          <TextInput value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="numeric" />
        </Field>
        <Field label="Причина">
          <TextInput value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Btn onClick={onClose}>Отмена</Btn>
          <Btn variant="primary" disabled={mut.isPending || !Number(amount)} onClick={() => mut.mutate()}>
            {mut.isPending ? "…" : "Применить"}
          </Btn>
        </div>
      </div>
    </Modal>
  );
}

function GrantXpModal({
  nick,
  userId,
  onClose,
}: {
  nick: string;
  userId: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [amount, setAmount] = useState("100");
  const [reason, setReason] = useState("Бонус от админа");

  const mut = useMutation({
    mutationFn: () => grantXp(nick, Number(amount), reason.trim() || "Бонус"),
    onSuccess: () => {
      toast.success("XP начислено");
      qc.invalidateQueries({ queryKey: adminQk.user(userId) });
      onClose();
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Ошибка"),
  });

  return (
    <Modal open onClose={onClose} title={`Начислить XP — @${nick}`}>
      <div className="space-y-3">
        <div className="text-xs text-zinc-500">
          Ранги вычисляются из XP. Пороги: 0 / 2 000 / 4 000 / 6 000 / 8 000.
        </div>
        <Field label="XP (отрицательное = списать)">
          <TextInput value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="numeric" />
        </Field>
        <Field label="Причина">
          <TextInput value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Btn onClick={onClose}>Отмена</Btn>
          <Btn variant="primary" disabled={mut.isPending || !Number(amount)} onClick={() => mut.mutate()}>
            {mut.isPending ? "…" : "Начислить"}
          </Btn>
        </div>
      </div>
    </Modal>
  );
}

function AwardBadgeModal({
  nick,
  userId,
  onClose,
}: {
  nick: string;
  userId: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const badgesQ = useQuery({
    queryKey: ["admin", "badges-all"],
    queryFn: fetchAdminBadges,
  });
  const [code, setCode] = useState("");

  const mut = useMutation({
    mutationFn: () => awardBadge(nick, code),
    onSuccess: () => {
      toast.success("Значок выдан");
      qc.invalidateQueries({ queryKey: ["admin", "user", userId, "badges"] });
      onClose();
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Ошибка"),
  });

  const items = badgesQ.data?.items ?? [];

  return (
    <Modal open onClose={onClose} title={`Выдать значок — @${nick}`}>
      <div className="space-y-3">
        <Field label="Значок">
          <select
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          >
            <option value="">— выбери —</option>
            {["rank", "club", "pass", "event", "achievement", "founder"].map((cat) => {
              const group = items.filter((b) => b.category === cat && b.active);
              if (!group.length) return null;
              return (
                <optgroup key={cat} label={cat}>
                  {group.map((b) => (
                    <option key={b.id} value={b.code}>
                      {b.name} ({b.rarity})
                    </option>
                  ))}
                </optgroup>
              );
            })}
          </select>
        </Field>
        <div className="text-xs text-zinc-500">
          Категория <b>rank</b> — ранговые значки (Rookie, Pit Crew, Road Captain, Alpha Hound, Hell Legend).
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Btn onClick={onClose}>Отмена</Btn>
          <Btn variant="primary" disabled={mut.isPending || !code} onClick={() => mut.mutate()}>
            {mut.isPending ? "…" : "Выдать"}
          </Btn>
        </div>
      </div>
    </Modal>
  );
}
