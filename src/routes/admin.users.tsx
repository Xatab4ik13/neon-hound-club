import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, Gift, ShieldCheck, Trash2, Sparkles, Award, PlumpSmile as Smile } from "@/components/ui/icons";
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
import { AdminPager, type AdminPageSize } from "@/components/admin/AdminPager";
import {
  adminQk,
  creditTickets,
  deleteAdminUser,
  fetchAdminUser,
  fetchAdminUsers,
  fetchAdminUsersStats,
  fetchAdminUserBadges,
  fetchAdminBadges,
  fetchGiftableStickerPacks,
  giftPass,
  giftStickerPack,
  grantXp,
  awardBadge,
  patchAdminUser,
  type AdminUserListItem,
  type AdminUsersSort,
  type AdminUsersStats,
} from "@/lib/admin-queries";


import { ApiError } from "@/lib/api";
import {
  adminCreatePromoCode,
  adminDeletePromoCode,
  adminListPromoCodes,
  promoQk,
} from "@/lib/promo-api";

import { hhToast as toast } from "@/lib/hh-toast";

export const Route = createFileRoute("/admin/users")({
  component: UsersPage,
});

function UsersPage() {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [giftOpen, setGiftOpen] = useState(false);
  const [giftPassOpen, setGiftPassOpen] = useState(false);
  const [giftStickersOpen, setGiftStickersOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<AdminPageSize>(50);
  const [sort, setSort] = useState<{ key: AdminUsersSort; dir: "asc" | "desc" }>({
    key: "createdAt",
    dir: "desc",
  });

  // дебаунс поиска
  if (query !== debounced) {
    setTimeout(() => {
      setDebounced(query);
      setPage(1);
    }, 250);
  }

  const listQ = useQuery({
    queryKey: [...adminQk.users(debounced), page, pageSize, sort.key, sort.dir],
    queryFn: () =>
      fetchAdminUsers({
        q: debounced || undefined,
        page,
        pageSize,
        sort: sort.key,
        dir: sort.dir,
      }),
    placeholderData: (prev) => prev,
  });

  const items = listQ.data?.items ?? [];
  const total = listQ.data?.total ?? 0;

  const statsQ = useQuery({
    queryKey: adminQk.usersStats,
    queryFn: fetchAdminUsersStats,
    staleTime: 60_000,
  });
  const stats = statsQ.data;

  return (
    <div>
      <PageHeader title="Пользователи" description={`Всего: ${total}`} />

      <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <TextInput
          placeholder="Поиск по нику или email…"
          className="max-w-md"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {stats && (
          <div className="flex flex-wrap items-center gap-2 text-[13px]">
            <StatPill label="Телефон ✓" value={stats.phoneVerified} total={stats.total} />
            <StatPill label="Пуш вкл" value={stats.hasPush} total={stats.total} />
          </div>
        )}
      </div>

      {stats && <AudienceStats stats={stats} />}




      <Panel>
        <DataTable
          sort={sort}
          onSortChange={(key, dir) => {
            setSort({ key: key as AdminUsersSort, dir });
            setPage(1);
          }}
          headers={[
            { label: "Ник", sortKey: "nick" },
            { label: "Email", sortKey: "email" },
            { label: "Email ✓", sortKey: "emailVerified" },
            { label: "Телефон ✓", sortKey: "phoneVerified" },
            { label: "Онлайн", sortKey: "lastSeenAt" },
            { label: "Пуш", sortKey: "hasPush" },
            { label: "Регистрация", sortKey: "createdAt" },
            "",
          ]}
          rows={items.map((u) => [
            <span className="font-medium">@{u.nick}</span>,
            <span className="text-zinc-600 dark:text-zinc-300">{u.email}</span>,
            <VerifiedDot ok={u.emailVerified} />,
            <VerifiedDot ok={u.phoneVerified} />,
            <OnlineCell lastSeenAt={u.lastSeenAt} />,
            <VerifiedDot ok={u.hasPush} />,
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
        <AdminPager
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
          onPageSizeChange={(s) => {
            setPageSize(s);
            setPage(1);
          }}
        />
      </Panel>


      {selectedId && (
        <UserDrawer
          userId={selectedId}
          onClose={() => setSelectedId(null)}
          onGift={() => setGiftOpen(true)}
          onGiftPass={() => setGiftPassOpen(true)}
          onGiftStickers={() => setGiftStickersOpen(true)}
        />
      )}

      {selectedId && giftOpen && (
        <GiftModal userId={selectedId} onClose={() => setGiftOpen(false)} />
      )}
      {selectedId && giftPassOpen && (
        <GiftPassModal userId={selectedId} onClose={() => setGiftPassOpen(false)} />
      )}
      {selectedId && giftStickersOpen && (
        <GiftStickersModal userId={selectedId} onClose={() => setGiftStickersOpen(false)} />
      )}
    </div>
  );
}

function UserDrawer({
  userId,
  onClose,
  onGift,
  onGiftPass,
  onGiftStickers,
}: {
  userId: string;
  onClose: () => void;
  onGift: () => void;
  onGiftPass: () => void;
  onGiftStickers: () => void;
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
            {u.avatarUrl ? (
              <img
                src={u.avatarUrl}
                alt={`@${u.nick}`}
                loading="lazy"
                decoding="async"
                className="h-14 w-14 rounded-full object-cover ring-1 ring-zinc-200 dark:ring-zinc-800"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-zinc-200 to-zinc-300 text-xl font-bold text-zinc-700 dark:from-zinc-700 dark:to-zinc-800 dark:text-zinc-100">
                {u.nick[0]?.toUpperCase()}
              </div>
            )}
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
            <InfoRow
              label="Последний раз онлайн"
              value={
                u.lastSeenAt
                  ? (() => {
                      const diff = Date.now() - new Date(u.lastSeenAt).getTime();
                      return diff < 5 * 60 * 1000
                        ? "сейчас онлайн"
                        : `${formatAgo(diff)} (${new Date(u.lastSeenAt).toLocaleString("ru-RU")})`;
                    })()
                  : "никогда"
              }
            />
            <InfoRow label="Пуш-уведомления" value={u.hasPush ? "включены" : "выключены"} />
            <InfoRow label="Email подтверждён" value={u.emailVerified ? "да" : "нет"} />
            <InfoRow label="Телефон подтверждён" value={u.phoneVerified ? "да" : "нет"} />
            <InfoRow label="Статус" value={u.blocked ? "забанен" : "активен"} />
          </Section>


          <Section title="Билеты">
            <AudienceMetric label="Баланс" value={(u.ticketsBalance).toLocaleString("ru-RU")} />
            <AudienceMetric label="Всего заработано" value={(u.ticketsEarned).toLocaleString("ru-RU")} />
          </Section>

          <Section title="Магазин">
            <AudienceMetric label="Потрачено" value={`${(u.totalSpentRub).toLocaleString("ru-RU")} ₽`} />
            <AudienceMetric label="Заказов" value={(u.ordersCount)} />
          </Section>

          <Section title="Ранг / XP">
            <AudienceMetric label="XP" value={(u.xpTotal).toLocaleString("ru-RU")} />
            <AudienceMetric label="Ранг" value={u.rank?.rankLabel ?? "—"} />
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

          <UserPromoSection userId={userId} nick={u.nick} />


          <div className="flex flex-wrap gap-2">
            <Btn onClick={onGift}>
              <Gift className="h-4 w-4" /> Начислить билеты
            </Btn>
            <Btn onClick={onGiftPass}>
              <Gift className="h-4 w-4" /> Подарить Hell Pass
            </Btn>
            <Btn onClick={onGiftStickers}>
              <Smile className="h-4 w-4" /> Подарить стикерпак
            </Btn>
          </div>
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

function VerifiedDot({ ok }: { ok: boolean }) {
  return ok ? (
    <span
      aria-label="Да"
      title="Да"
      className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
    >
      <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3.5 8.5l3 3 6-7" />
      </svg>
    </span>
  ) : (
    <span
      aria-label="Нет"
      title="Нет"
      className="inline-block h-2 w-2 rounded-full bg-zinc-300 dark:bg-zinc-700"
    />
  );
}

function OnlineCell({ lastSeenAt }: { lastSeenAt: string | null }) {
  if (!lastSeenAt) {
    return <span className="text-xs text-zinc-400">никогда</span>;
  }
  const last = new Date(lastSeenAt).getTime();
  const diffMs = Date.now() - last;
  const online = diffMs < 5 * 60 * 1000;
  if (online) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
        <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.18)]" />
        онлайн
      </span>
    );
  }
  return (
    <span
      className="text-xs tabular-nums text-zinc-500 dark:text-zinc-400"
      title={new Date(lastSeenAt).toLocaleString("ru-RU")}
    >
      {formatAgo(diffMs)}
    </span>
  );
}

function formatAgo(ms: number): string {
  const min = Math.floor(ms / 60000);
  if (min < 60) return `${min} мин назад`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} ч назад`;
  const d = Math.floor(hr / 24);
  if (d < 30) return `${d} д назад`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo} мес назад`;
  return `${Math.floor(mo / 12)} г назад`;
}


function Metric({ label, value }: { label: string; value: React.ReactNode }) {
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

function GiftPassModal({ userId, onClose }: { userId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [tier, setTier] = useState<"silver" | "gold" | "platinum">("silver");

  const mut = useMutation({
    mutationFn: () => giftPass(userId, tier),
    onSuccess: () => {
      toast.success(`Hell Pass ${tier} подарен на 30 дней`);
      qc.invalidateQueries({ queryKey: adminQk.user(userId) });
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      onClose();
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Ошибка"),
  });

  const tiers: Array<{ key: "silver" | "gold" | "platinum"; label: string; hint: string }> = [
    { key: "silver", label: "Silver", hint: "3 билета · 15 вопросов AI / день" },
    { key: "gold", label: "Gold", hint: "10 билетов · 40 вопросов AI / день" },
    { key: "platinum", label: "Platinum", hint: "30 билетов · безлимит AI" },
  ];

  return (
    <Modal open onClose={onClose} title="Подарить Hell Pass">
      <div className="space-y-3">
        <div className="text-xs text-zinc-500">
          Пасс активируется сразу на 30 дней. Цена = 0 ₽ (подарок). Билеты и XP начислятся автоматически.
        </div>
        <div className="space-y-2">
          {tiers.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTier(t.key)}
              className={`w-full rounded-md border px-3 py-2 text-left text-sm transition ${
                tier === t.key
                  ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30"
                  : "border-zinc-200 hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
              }`}
            >
              <div className="font-semibold">{t.label}</div>
              <div className="text-xs text-zinc-500">{t.hint}</div>
            </button>
          ))}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Btn onClick={onClose}>Отмена</Btn>
          <Btn variant="primary" disabled={mut.isPending} onClick={() => mut.mutate()}>
            {mut.isPending ? "…" : "Подарить"}
          </Btn>
        </div>
      </div>
    </Modal>
  );
}

function GiftStickersModal({ userId, onClose }: { userId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const packsQ = useQuery({
    queryKey: ["admin", "sticker-packs"],
    queryFn: fetchGiftableStickerPacks,
  });
  const [slug, setSlug] = useState("");

  const mut = useMutation({
    mutationFn: () => giftStickerPack(userId, slug),
    onSuccess: () => {
      toast.success("Стикерпак подарен");
      qc.invalidateQueries({ queryKey: adminQk.user(userId) });
      onClose();
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Ошибка"),
  });

  const items = packsQ.data?.items ?? [];

  return (
    <Modal open onClose={onClose} title="Подарить стикерпак">
      <div className="space-y-3">
        <div className="text-xs text-zinc-500 dark:text-zinc-400">
          Пак появится у пользователя сразу. Повторное дарение не дублируется.
        </div>
        <div className="space-y-2">
          {packsQ.isLoading && (
            <div className="text-sm text-zinc-500">Загрузка…</div>
          )}
          {items.map((p) => (
            <button
              key={p.slug}
              type="button"
              onClick={() => setSlug(p.slug)}
              className={`w-full rounded-md border px-3 py-2 text-left text-sm transition ${
                slug === p.slug
                  ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30"
                  : "border-zinc-200 hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
              }`}
            >
              <div className="font-semibold">{p.title}</div>
              <div className="text-xs text-zinc-500">{p.slug}</div>
            </button>
          ))}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Btn onClick={onClose}>Отмена</Btn>
          <Btn variant="primary" disabled={!slug || mut.isPending} onClick={() => mut.mutate()}>
            {mut.isPending ? "…" : "Подарить"}
          </Btn>
        </div>
      </div>
    </Modal>
  );
}

/** Статистика аудитории для рекламодателей: онлайн, DAU/WAU/MAU, время на сайте, прирост. */
function AudienceStats({ stats }: { stats: AdminUsersStats }) {
  const fmt = (n: number) => n.toLocaleString("ru-RU");
  const maxUsers = Math.max(1, ...stats.daily.map((d) => d.users));

  return (
    <div className="mb-4 grid gap-3 lg:grid-cols-3">
      <Panel className="lg:col-span-2">
        <div className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-4">
          <AudienceMetric
            label="Сейчас онлайн"
            value={fmt(stats.onlineNow)}
            hint="активность за 5 минут"
          />
          <AudienceMetric label="DAU (24 ч)" value={fmt(stats.dau)} hint={`из ${fmt(stats.total)} всего`} />
          <AudienceMetric label="WAU (7 дн)" value={fmt(stats.wau)} />
          <AudienceMetric label="MAU (30 дн)" value={fmt(stats.mau)} hint={`липкость ${stats.stickiness}%`} />
          <AudienceMetric
            label="Среднее время"
            value={`${stats.avgMinutesPerDay} мин`}
            hint="за активный день"
          />
          <AudienceMetric label="Сессий в день" value={`${stats.avgSessionsPerDay}`} hint="в среднем" />
          <AudienceMetric
            label="Активных дней"
            value={`${stats.avgActiveDays30d}`}
            hint="на юзера за 30 дн"
          />
          <AudienceMetric
            label="Всего времени"
            value={`${fmt(Math.round(stats.totalMinutes30d / 60))} ч`}
            hint="аудитория за 30 дн"
          />
        </div>
        <div className="grid grid-cols-3 gap-4 border-t border-zinc-200 p-4 dark:border-zinc-800">
          <AudienceMetric label="Новых за сутки" value={`+${fmt(stats.newToday)}`} />
          <AudienceMetric label="Новых за 7 дней" value={`+${fmt(stats.new7d)}`} />
          <AudienceMetric label="Новых за 30 дней" value={`+${fmt(stats.new30d)}`} />
        </div>
      </Panel>

      <Panel>
        <div className="p-4">
          <div className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Активность за 14 дней
          </div>
          {stats.daily.length === 0 ? (
            <div className="py-8 text-center text-sm text-zinc-500">Пока нет данных</div>
          ) : (
            <div className="flex h-32 items-end gap-1">
              {stats.daily.map((d) => (
                <div key={d.day} className="group flex flex-1 flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t bg-zinc-900 transition-opacity group-hover:opacity-70 dark:bg-zinc-100"
                    style={{ height: `${Math.max(4, (d.users / maxUsers) * 100)}%` }}
                    title={`${d.day}: ${d.users} юзеров, ${d.avgMinutes} мин`}
                  />
                  <span className="text-[9px] tabular-nums text-zinc-400">
                    {d.day.slice(8, 10)}
                  </span>
                </div>
              ))}
            </div>
          )}
          <div className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
            Столбцы — уникальные активные пользователи за день. Наведи, чтобы увидеть среднее время
            на сайте.
          </div>
        </div>
      </Panel>
    </div>
  );
}

function AudienceMetric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <div className="text-xs text-zinc-500 dark:text-zinc-400">{label}</div>
      <div className="mt-0.5 text-xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
        {value}
      </div>
      {hint && <div className="text-[11px] text-zinc-400">{hint}</div>}
    </div>
  );
}


function StatPill({ label, value, total }: { label: string; value: number; total: number }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 dark:border-zinc-800 dark:bg-zinc-900">
      <span className="text-zinc-500 dark:text-zinc-400">{label}</span>
      <span className="inline-flex items-center gap-1 font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
        {(value)}
        <span className="text-zinc-400">/</span>
        <span className="text-zinc-400">{(total)}</span>
      </span>
      <span className="text-zinc-400">{`${(pct)}%`}</span>
    </div>
  );
}


/**
 * Промокоды пользователя: список + выдача персонального кода со своей скидкой и сроком.
 * Скидка действует только на товары (не на доставку) и не суммируется с Hell Pass.
 */
function UserPromoSection({ userId, nick }: { userId: string; nick: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const listQ = useQuery({
    queryKey: promoQk.admin(userId),
    queryFn: () => adminListPromoCodes(userId),
  });

  const [code, setCode] = useState("");
  const [pct, setPct] = useState("10");
  const [expires, setExpires] = useState("");

  const createMut = useMutation({
    mutationFn: () =>
      adminCreatePromoCode({
        code: code.trim() ? code.trim().toUpperCase() : undefined,
        discountPct: Number(pct),
        userId,
        expiresAt: expires ? new Date(`${expires}T23:59:59`).toISOString() : null,
      }),
    onSuccess: (res) => {
      toast.success(`Промокод ${res.promo.code} выдан @${nick}`);
      setOpen(false);
      setCode("");
      void qc.invalidateQueries({ queryKey: ["admin", "promo"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Не удалось выдать промокод"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => adminDeletePromoCode(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "promo"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Не удалось удалить"),
  });

  const items = listQ.data?.items ?? [];
  const pctNum = Number(pct);
  const valid = Number.isFinite(pctNum) && pctNum >= 1 && pctNum <= 100;

  return (
    <>
      <Section title="Промокоды">
        <div className="col-span-2 space-y-1.5">
          {listQ.isLoading ? (
            <div className="text-sm text-zinc-500">Загрузка…</div>
          ) : items.length === 0 ? (
            <div className="text-sm text-zinc-500">Персональных промокодов нет</div>
          ) : (
            items.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-2 border-b border-zinc-100 py-1.5 text-sm dark:border-zinc-800/60"
              >
                <span className="font-mono font-semibold uppercase">{p.code}</span>
                <span className="text-zinc-500">
                  −{p.discountPct}% ·{" "}
                  {p.usedAt
                    ? "использован"
                    : p.expired
                      ? "истёк"
                      : p.expiresAt
                        ? `до ${new Date(p.expiresAt).toLocaleDateString("ru-RU")}`
                        : "без срока"}
                </span>
                <button
                  type="button"
                  onClick={() => deleteMut.mutate(p.id)}
                  className="text-zinc-400 transition-colors hover:text-rose-500"
                  aria-label="Удалить промокод"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
          <Btn onClick={() => setOpen(true)}>
            <Gift className="h-4 w-4" /> Выдать промокод
          </Btn>
        </div>
      </Section>

      {open && (
        <Modal open onClose={() => setOpen(false)} title={`Промокод для @${nick}`}>
          <div className="space-y-3">
            <Field label="Код" hint="Пусто — сгенерируем случайный">
              <TextInput
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="HELL10"
                className="font-mono uppercase"
              />
            </Field>
            <Field label="Скидка, %" hint="Только на товары, доставка без скидки">
              <TextInput
                type="number"
                min={1}
                max={100}
                value={pct}
                onChange={(e) => setPct(e.target.value)}
              />
            </Field>
            <Field label="Действует до" hint="Пусто — без срока">
              <TextInput type="date" value={expires} onChange={(e) => setExpires(e.target.value)} />
            </Field>
            <div className="flex justify-end gap-2 pt-1">
              <Btn onClick={() => setOpen(false)}>Отмена</Btn>
              <Btn
                variant="primary"
                disabled={!valid || createMut.isPending}
                onClick={() => createMut.mutate()}
              >
                {createMut.isPending ? "…" : "Выдать"}
              </Btn>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
