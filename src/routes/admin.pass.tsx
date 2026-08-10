// Админка · Hell Pass. Управление разовыми пассами (30 дней):
// KPI по тирам и источникам, фильтры (статус/тир/источник/поиск), ручная активация и отзыв.
// Неоплаченные заявки живут 1 час и удаляются автоматически (фоновая уборка на бэке).

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
  cleanupPendingPasses,
  expireOldPasses,
  fetchAdminPassList,
  fetchAdminPassStats,
  revokePass,
  type AdminPassListItem,
  type AdminPassStats,
} from "@/lib/admin-queries";
import type { PassRecord, PassSource, PassTier } from "@/lib/queries";

export const Route = createFileRoute("/admin/pass")({
  component: AdminPassPage,
});

type StatusFilter = "" | PassRecord["status"];
type TierFilter = "" | PassTier;
type SourceFilter = "" | PassSource;

const STATUS_LABEL: Record<PassRecord["status"], string> = {
  pending_payment: "Ждёт оплаты",
  active: "Активен",
  expired: "Истёк",
  cancelled: "Отменён",
  superseded: "Заменён",
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

const SOURCE_LABEL: Record<PassSource, string> = {
  purchase: "Покупка",
  spin: "Рулетка",
  streak: "Календарь",
  grant: "Выдан вручную",
};

const SOURCE_TONE: Record<PassSource, "zinc" | "emerald" | "amber" | "rose" | "blue" | "violet"> = {
  purchase: "emerald",
  spin: "violet",
  streak: "blue",
  grant: "zinc",
};

function fmtDate(d: string | null): string {
  if (!d) return "—";
  const dt = new Date(d);
  return dt.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function daysLeft(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - Date.now();
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

/** Сколько минут осталось до автоудаления неоплаченной заявки (TTL 60 мин). */
function pendingMinutesLeft(createdAt: string): number {
  const ms = new Date(createdAt).getTime() + 60 * 60 * 1000 - Date.now();
  return Math.max(0, Math.ceil(ms / 60_000));
}

function fmtRub(n: number) {
  return `${n.toLocaleString("ru-RU")} ₽`;
}

function AdminPassPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<StatusFilter>("");
  const [tier, setTier] = useState<TierFilter>("");
  const [source, setSource] = useState<SourceFilter>("");
  const [q, setQ] = useState("");
  const [qInput, setQInput] = useState("");

  const filters = useMemo(
    () => ({
      status: (status || undefined) as PassRecord["status"] | undefined,
      tier: (tier || undefined) as PassTier | undefined,
      source: (source || undefined) as PassSource | undefined,
      q: q || undefined,
    }),
    [status, tier, source, q],
  );

  const listQ = useQuery({
    queryKey: adminQk.passList({
      status: filters.status,
      tier: filters.tier,
      source: filters.source,
      q: filters.q,
    }),
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

  const cleanupM = useMutation({
    mutationFn: () => cleanupPendingPasses(),
    onSuccess: (res) => {
      toast.success(res.removed ? `Удалено заявок: ${res.removed}` : "Мусора нет — всё чисто");
      invalidateAll();
    },
    onError: (e) => {
      toast.error("Не удалось почистить", { meta: e instanceof ApiError ? e.message : String(e) });
    },
  });

  const expireM = useMutation({
    mutationFn: () => expireOldPasses(),
    onSuccess: (res) => {
      toast.success(res.expired ? `Закрыто истёкших: ${res.expired}` : "Истёкших нет");
      invalidateAll();
    },
    onError: (e) => {
      toast.error("Не удалось прогнать", { meta: e instanceof ApiError ? e.message : String(e) });
    },
  });

  const [revokeTarget, setRevokeTarget] = useState<AdminPassListItem | null>(null);

  const items = listQ.data?.items ?? [];
  const stats = statsQ.data;
  const bySource = stats?.activeBySource;

  const rows = items.map((p) => {
    const dl = daysLeft(p.expiresAt);
    const src = (p.source ?? "purchase") as PassSource;
    return [
      <div key={`u-${p.id}`} className="min-w-0">
        <div className="truncate font-medium">{p.nick}</div>
        <div className="truncate text-[11px] text-zinc-500 dark:text-zinc-400">{p.email}</div>
      </div>,
      <Badge key={`t-${p.id}`} tone={TIER_TONE[p.tier]}>
        {TIER_LABEL[p.tier]}
      </Badge>,
      <Badge key={`s-${p.id}`} tone={STATUS_TONE[p.status]}>
        {STATUS_LABEL[p.status]}
      </Badge>,
      <Badge key={`src-${p.id}`} tone={SOURCE_TONE[src]}>
        {SOURCE_LABEL[src]}
      </Badge>,
      <span key={`price-${p.id}`} className="font-mono text-xs">
        {p.priceRub > 0 ? fmtRub(p.priceRub) : <span className="text-zinc-400">бесплатно</span>}
      </span>,
      <span key={`tk-${p.id}`} className="font-mono text-xs">
        +{p.ticketsGranted}
      </span>,
      <span key={`c-${p.id}`} className="whitespace-nowrap text-xs text-zinc-600 dark:text-zinc-400">
        {fmtDate(p.createdAt)}
        {p.status === "pending_payment" && (
          <span className="ml-2 font-mono text-amber-600 dark:text-amber-400">
            −{pendingMinutesLeft(p.createdAt)}мин
          </span>
        )}
      </span>,
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
          <Btn variant="danger" className="px-2.5 py-1 text-xs" onClick={() => setRevokeTarget(p)}>
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
        description="Разовый доступ на 30 дней. Неоплаченные заявки удаляются через час автоматически."
        actions={
          <div className="flex flex-wrap gap-2">
            <Btn variant="secondary" onClick={() => cleanupM.mutate()} disabled={cleanupM.isPending}>
              Удалить неоплаченные
            </Btn>
            <Btn variant="secondary" onClick={() => expireM.mutate()} disabled={expireM.isPending}>
              Прогнать истёкшие
            </Btn>
          </div>
        }
      />

      {/* Активные пассы */}
      <Panel>
        <PanelHeader>
          <div className="text-sm font-semibold">Активные пассы</div>
          <div className="font-display text-lg font-bold tabular-nums">{stats?.activeTotal ?? 0}</div>
        </PanelHeader>
        <div className="grid grid-cols-3 divide-x divide-zinc-200 dark:divide-zinc-800">
          <Stat label="Silver" value={stats?.activeByTier.silver ?? 0} tone="emerald" />
          <Stat label="Gold" value={stats?.activeByTier.gold ?? 0} tone="amber" />
          <Stat label="Platinum" value={stats?.activeByTier.platinum ?? 0} tone="violet" />
        </div>
      </Panel>

      {/* Откуда пассы */}
      <Panel className="mt-3">
        <PanelHeader>
          <div>
            <div className="text-sm font-semibold">Откуда пассы</div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              Только активные. Рулетка и календарь выдают пассы бесплатно.
            </div>
          </div>
        </PanelHeader>
        <div className="grid grid-cols-2 divide-x divide-y divide-zinc-200 dark:divide-zinc-800 md:grid-cols-4 md:divide-y-0">
          <Stat label="Куплено" value={bySource?.purchase ?? 0} tone="emerald" />
          <Stat label="Из рулетки" value={bySource?.spin ?? 0} tone="violet" />
          <Stat label="За календарь" value={bySource?.streak ?? 0} tone="blue" />
          <Stat label="Выдано вручную" value={bySource?.grant ?? 0} />
        </div>
      </Panel>

      {/* Деньги и сроки */}
      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
        <KpiCard label="Выручка 30 дн" value={fmtRub(stats?.revenue30dRub ?? 0)} />
        <KpiCard label="Истекают ≤ 7 дней" value={stats?.expiringWithin7d ?? 0} tone="rose" />
        <KpiCard
          label="Ждут оплаты (< 1 часа)"
          value={stats?.pendingCount ?? 0}
          tone="amber"
          hint="Старые заявки удаляются сами"
        />
      </div>

      {/* Повторные покупки */}
      <Panel className="mt-3">
        <PanelHeader>
          <div>
            <div className="text-sm font-semibold">Повторные покупки</div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              Только оплаченные покупки. Призовые пассы (рулетка, календарь) не учитываются.
            </div>
          </div>
          <div className="text-right">
            <div className="font-display text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
              {rep ? `${rep.repeatRatePct}%` : "—"}
            </div>
            <div className="text-[11px] text-zinc-500">покупают снова</div>
          </div>
        </PanelHeader>

        <div className="grid grid-cols-2 divide-x divide-y divide-zinc-200 dark:divide-zinc-800 md:grid-cols-4 md:divide-y-0">
          <Stat label="Покупателей" value={rep?.buyers ?? 0} />
          <Stat label="Купили ≥ 2 раза" value={rep?.repeatBuyers ?? 0} tone="emerald" />
          <Stat
            label="Покупок на человека"
            value={rep ? rep.avgPurchasesPerBuyer.toFixed(2) : "—"}
            tone="violet"
          />
          <Stat
            label="Средний интервал"
            value={rep && rep.avgGapDays > 0 ? `${rep.avgGapDays} дн` : "—"}
            tone="blue"
          />
        </div>

        <div className="border-t border-zinc-200 p-4 dark:border-zinc-800">
          <div className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">
            Сколько раз покупали · всего покупок: {rep?.purchases ?? 0} · повторных за 30 дней:{" "}
            <span className="font-mono">{rep?.repeatLast30d ?? 0}</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            <DistCell label="1 раз" value={rep?.distribution.one ?? 0} total={rep?.buyers ?? 0} />
            <DistCell label="2 раза" value={rep?.distribution.two ?? 0} total={rep?.buyers ?? 0} />
            <DistCell label="3 раза" value={rep?.distribution.three ?? 0} total={rep?.buyers ?? 0} />
            <DistCell label="4+ раза" value={rep?.distribution.fourPlus ?? 0} total={rep?.buyers ?? 0} />
          </div>
        </div>

        {rep && rep.top.length > 0 && (
          <div className="border-t border-zinc-200 p-4 dark:border-zinc-800">
            <div className="mb-2 text-xs font-semibold">Кто покупает чаще всех</div>
            <div className="space-y-1.5">
              {rep.top.map((u) => (
                <div
                  key={u.userId}
                  className="flex items-center justify-between gap-3 rounded-xl bg-zinc-50 px-3 py-2 dark:bg-zinc-800/50"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{u.nick}</div>
                    <div className="truncate text-[11px] text-zinc-500 dark:text-zinc-400">
                      последняя: {fmtDate(u.lastAt)}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-mono text-sm">{u.purchases}×</div>
                    <div className="text-[11px] text-zinc-500">{fmtRub(u.totalRub)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Panel>



      <Panel className="mt-4">
        <PanelHeader>
          <div>
            <div className="text-sm font-semibold">Все пассы</div>
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
            <Select value={status} onChange={(e) => setStatus(e.currentTarget.value as StatusFilter)}>
              <option value="">Все статусы</option>
              <option value="active">Активные</option>
              <option value="pending_payment">Ждут оплаты</option>
              <option value="expired">Истёкшие</option>
              <option value="cancelled">Отменённые</option>
              <option value="superseded">Заменённые</option>
            </Select>
            <Select value={tier} onChange={(e) => setTier(e.currentTarget.value as TierFilter)}>
              <option value="">Все тиры</option>
              <option value="silver">Silver</option>
              <option value="gold">Gold</option>
              <option value="platinum">Platinum</option>
            </Select>
            <Select value={source} onChange={(e) => setSource(e.currentTarget.value as SourceFilter)}>
              <option value="">Все источники</option>
              <option value="purchase">Покупка</option>
              <option value="spin">Рулетка</option>
              <option value="streak">Календарь активности</option>
              <option value="grant">Выдан вручную</option>
            </Select>
            {(status || tier || source || q) && (
              <Btn
                variant="ghost"
                onClick={() => {
                  setStatus("");
                  setTier("");
                  setSource("");
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
                "Источник",
                "Цена",
                "Билеты",
                "Создан",
                "Истекает",
                { label: "" },
              ]}
              rows={rows}
            />
          )}
        </div>
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
            ? `${revokeTarget.nick} · ${TIER_LABEL[revokeTarget.tier]} · ${STATUS_LABEL[revokeTarget.status]}. Активная запись перейдёт в «Истёк», ожидающая оплату — в «Отменён». Действие необратимо.`
            : ""
        }
        confirmLabel="Отозвать"
        danger
      />
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone?: "emerald" | "amber" | "violet" | "rose" | "blue";
}) {
  return (
    <div className="p-4">
      <div className="text-xs text-zinc-500 dark:text-zinc-400">{label}</div>
      <div className={`mt-1 font-display text-2xl font-bold tabular-nums ${toneCls(tone)}`}>{value}</div>
    </div>
  );
}

function toneCls(tone?: "emerald" | "amber" | "violet" | "rose" | "blue") {
  return tone
    ? {
        emerald: "text-emerald-600 dark:text-emerald-400",
        amber: "text-amber-600 dark:text-amber-400",
        violet: "text-violet-600 dark:text-violet-400",
        rose: "text-rose-600 dark:text-rose-400",
        blue: "text-blue-600 dark:text-blue-400",
      }[tone]
    : "text-zinc-900 dark:text-zinc-100";
}

function KpiCard({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: number | string;
  tone?: "emerald" | "amber" | "violet" | "rose" | "blue";
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="text-xs text-zinc-500 dark:text-zinc-400">{label}</div>
      <div className={`mt-1 font-display text-2xl font-bold tabular-nums ${toneCls(tone)}`}>{value}</div>
      {hint && <div className="mt-0.5 text-[11px] text-zinc-400">{hint}</div>}
    </div>
  );
}
