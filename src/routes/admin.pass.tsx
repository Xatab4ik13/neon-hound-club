// Админка · Hell Pass. Управление подписками:
// KPI по тирам, фильтры (статус/тир/поиск по нику/email), ручная активация и отзыв пасса.

import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Badge,
  Btn,
  ConfirmModal,
  DataTable,
  PageHeader,
  Panel,
  PanelHeader,
  Select,
  TextInput,
} from "@/components/admin/ui";
import { hhToast as toast } from "@/lib/hh-toast";
import { ApiError } from "@/lib/api";
import {
  activatePass,
  adminQk,
  expireOldPasses,
  fetchAdminPassList,
  fetchAdminPassStats,
  revokePass,
  type AdminPassListItem,
  type AdminPassStats,
} from "@/lib/admin-queries";
import type { PassRecord, PassTier } from "@/lib/queries";

export const Route = createFileRoute("/admin/pass")({
  component: AdminPassPage,
});

type StatusFilter = "" | PassRecord["status"];
type TierFilter = "" | PassTier;

const STATUS_LABEL: Record<PassRecord["status"], string> = {
  pending_payment: "Ждёт оплаты",
  active: "Активна",
  expired: "Истекла",
  cancelled: "Отменена",
  superseded: "Заменена",
};

const STATUS_TONE: Record<PassRecord["status"], "zinc" | "emerald" | "amber" | "rose" | "blue"> = {
  pending_payment: "amber",
  active: "emerald",
  expired: "zinc",
  cancelled: "rose",
  superseded: "blue",
};

const TIER_LABEL: Record<PassTier, string> = {
  silver: "Silver",
  gold: "Gold",
  platinum: "Platinum",
};

const TIER_TONE: Record<PassTier, "emerald" | "amber" | "violet"> = {
  silver: "emerald",
  gold: "amber",
  platinum: "violet",
};

function fmtDate(d: string | null): string {
  if (!d) return "—";
  const dt = new Date(d);
  return dt.toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function daysLeft(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - Date.now();
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

function fmtRub(n: number) {
  return `${n.toLocaleString("ru-RU")} ₽`;
}

function AdminPassPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<StatusFilter>("");
  const [tier, setTier] = useState<TierFilter>("");
  const [q, setQ] = useState("");
  const [qInput, setQInput] = useState("");

  const filters = useMemo(
    () => ({
      status: (status || undefined) as PassRecord["status"] | undefined,
      tier: (tier || undefined) as PassTier | undefined,
      q: q || undefined,
    }),
    [status, tier, q],
  );

  const listQ = useQuery({
    queryKey: adminQk.passList({ status: filters.status, tier: filters.tier, q: filters.q }),
    queryFn: () => fetchAdminPassList(filters),
  });

  const statsQ = useQuery<AdminPassStats>({
    queryKey: adminQk.passStats,
    queryFn: fetchAdminPassStats,
    staleTime: 30_000,
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["admin", "pass"] });
  };

  const activateM = useMutation({
    mutationFn: (id: string) => activatePass(id),
    onSuccess: () => {
      toast.success("Пасс активирован");
      invalidateAll();
    },
    onError: (e) => {
      toast.error("Не удалось активировать", { meta: e instanceof ApiError ? e.message : String(e) });
    },
  });

  const revokeM = useMutation({
    mutationFn: (id: string) => revokePass(id),
    onSuccess: () => {
      toast.success("Пасс отозван");
      invalidateAll();
    },
    onError: (e) => {
      toast.error("Не удалось отозвать", { meta: e instanceof ApiError ? e.message : String(e) });
    },
  });

  const expireM = useMutation({
    mutationFn: () => expireOldPasses(),
    onSuccess: (res) => {
      toast.success(`Прогон истёкших: ${res.expired}`);
      invalidateAll();
    },
    onError: (e) => {
      toast.error("Не удалось прогнать", { meta: e instanceof ApiError ? e.message : String(e) });
    },
  });

  const [revokeTarget, setRevokeTarget] = useState<AdminPassListItem | null>(null);

  const items = listQ.data?.items ?? [];
  const stats = statsQ.data;

  const rows = items.map((p) => {
    const dl = daysLeft(p.expiresAt);
    return [
      <div key={`u-${p.id}`} className="min-w-0">
        <div className="truncate font-medium">{p.nick}</div>
        <div className="truncate text-[11px] text-zinc-500 dark:text-zinc-400">{p.email}</div>
      </div>,
      <Badge key={`t-${p.id}`} tone={TIER_TONE[p.tier]}>{TIER_LABEL[p.tier]}</Badge>,
      <Badge key={`s-${p.id}`} tone={STATUS_TONE[p.status]}>{STATUS_LABEL[p.status]}</Badge>,
      <span key={`price-${p.id}`} className="font-mono text-xs">{fmtRub(p.priceRub)}</span>,
      <span key={`tk-${p.id}`} className="font-mono text-xs">+{p.ticketsGranted}</span>,
      <span key={`c-${p.id}`} className="whitespace-nowrap text-xs text-zinc-600 dark:text-zinc-400">{fmtDate(p.createdAt)}</span>,
      <span key={`p-${p.id}`} className="whitespace-nowrap text-xs text-zinc-600 dark:text-zinc-400">{fmtDate(p.paidAt)}</span>,
      <span key={`e-${p.id}`} className="whitespace-nowrap text-xs">
        {p.expiresAt ? (
          <>
            <span className="text-zinc-600 dark:text-zinc-400">{fmtDate(p.expiresAt)}</span>
            {p.status === "active" && dl != null && (
              <span className={`ml-2 font-mono ${dl <= 3 ? "text-rose-600 dark:text-rose-400" : "text-zinc-500"}`}>
                {dl}д
              </span>
            )}
          </>
        ) : (
          "—"
        )}
      </span>,
      <div key={`a-${p.id}`} className="flex justify-end gap-1.5">
        {p.status === "pending_payment" && (
          <Btn
            variant="primary"
            className="px-2.5 py-1 text-xs"
            onClick={() => activateM.mutate(p.id)}
            disabled={activateM.isPending}
          >
            Активировать
          </Btn>
        )}
        {(p.status === "active" || p.status === "pending_payment") && (
          <Btn
            variant="danger"
            className="px-2.5 py-1 text-xs"
            onClick={() => setRevokeTarget(p)}
          >
            Отозвать
          </Btn>
        )}
      </div>,
    ];
  });

  return (
    <div>
      <PageHeader
        title="Hell Pass"
        description="Управление подписками, ручная активация и отзыв"
        actions={
          <Btn variant="secondary" onClick={() => expireM.mutate()} disabled={expireM.isPending}>
            Прогнать истёкшие
          </Btn>
        }
      />

      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="Silver активных" value={stats?.activeByTier.silver ?? 0} tone="emerald" />
        <KpiCard label="Gold активных" value={stats?.activeByTier.gold ?? 0} tone="amber" />
        <KpiCard label="Platinum активных" value={stats?.activeByTier.platinum ?? 0} tone="violet" />
        <KpiCard label="Всего активных" value={stats?.activeTotal ?? 0} />
        <KpiCard label="Ждут оплаты" value={stats?.pendingCount ?? 0} tone="amber" />
        <KpiCard label="Истекают ≤ 7 дн" value={stats?.expiringWithin7d ?? 0} tone="rose" />
        <KpiCard label="Выручка 30 дн" value={fmtRub(stats?.revenue30dRub ?? 0)} span={2} />
      </div>

      <Panel className="mt-4">
        <PanelHeader>
          <div>
            <div className="text-sm font-semibold">Все подписки</div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">Найдено: {items.length}</div>
          </div>
        </PanelHeader>

        <div className="p-4">
        {/* Фильтры */}
        <div className="mb-3 flex flex-wrap items-end gap-2">
          <div className="w-full max-w-xs">
            <TextInput
              placeholder="Поиск по нику или email"
              value={qInput}
              onChange={(e) => setQInput(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") setQ(qInput.trim());
              }}
              onBlur={() => setQ(qInput.trim())}
            />
          </div>
          <Select
            value={status}
            onChange={(e) => setStatus(e.currentTarget.value as StatusFilter)}
          >
            <option value="">Все статусы</option>
            <option value="active">Активные</option>
            <option value="pending_payment">Ждут оплаты</option>
            <option value="expired">Истёкшие</option>
            <option value="cancelled">Отменённые</option>
            <option value="superseded">Заменённые</option>
          </Select>
          <Select
            value={tier}
            onChange={(e) => setTier(e.currentTarget.value as TierFilter)}
          >
            <option value="">Все тиры</option>
            <option value="silver">Silver</option>
            <option value="gold">Gold</option>
            <option value="platinum">Platinum</option>
          </Select>
          {(status || tier || q) && (
            <Btn
              variant="ghost"
              onClick={() => {
                setStatus("");
                setTier("");
                setQ("");
                setQInput("");
              }}
            >
              Сбросить
            </Btn>
          )}
        </div>

        {listQ.isLoading ? (
          <div className="py-8 text-center text-sm text-zinc-500">Загружаю…</div>
        ) : items.length === 0 ? (
          <div className="py-8 text-center text-sm text-zinc-500">Ничего не найдено</div>
        ) : (
          <DataTable
            headers={[
              "Юзер",
              "Тир",
              "Статус",
              "Цена",
              "Билеты",
              "Создана",
              "Оплачена",
              "Истекает",
              { label: "" },
            ]}
            rows={rows}
          />
        )}
      </Panel>

      <ConfirmModal
        open={!!revokeTarget}
        onClose={() => setRevokeTarget(null)}
        onConfirm={() => {
          if (revokeTarget) revokeM.mutate(revokeTarget.id);
          setRevokeTarget(null);
        }}
        title="Отозвать пасс?"
        message={
          revokeTarget
            ? `${revokeTarget.nick} · ${TIER_LABEL[revokeTarget.tier]} · ${STATUS_LABEL[revokeTarget.status]}. Активная запись перейдёт в «Истекла», ожидающая оплату — в «Отменена». Действие необратимо.`
            : ""
        }
        confirmLabel="Отозвать"
        danger
      />
    </div>
  );
}

function KpiCard({
  label,
  value,
  tone,
  span = 1,
}: {
  label: string;
  value: number | string;
  tone?: "emerald" | "amber" | "violet" | "rose";
  span?: 1 | 2;
}) {
  const toneCls = tone
    ? {
        emerald: "text-emerald-600 dark:text-emerald-400",
        amber: "text-amber-600 dark:text-amber-400",
        violet: "text-violet-600 dark:text-violet-400",
        rose: "text-rose-600 dark:text-rose-400",
      }[tone]
    : "text-zinc-900 dark:text-zinc-100";
  return (
    <div
      className={`rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 ${
        span === 2 ? "col-span-2" : ""
      }`}
    >
      <div className="text-xs text-zinc-500 dark:text-zinc-400">{label}</div>
      <div className={`mt-1 font-display text-2xl font-bold tabular-nums ${toneCls}`}>{value}</div>
    </div>
  );
}
