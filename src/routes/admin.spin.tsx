// Админка HellSpin. Пул призов и логика — на бэкенде, здесь только реальная
// статистика по прокрутам, лента последних спинов, победители (физика на
// доставку) и календарь активности.

import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  PageHeader,
  Panel,
  PanelHeader,
  DataTable,
  Badge,
  Btn,
} from "@/components/admin/ui";
import {
  PlumpSpin,
  TrendingUp,
  PlumpUsers as Users,
  Phone,
  Package,
  Trophy,
  CalendarCheck,
  RefreshCw,
} from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import {
  adminSpinQk,
  fetchAdminSpinOverview,
  fetchAdminSpinStreaks,
  fetchAdminSpinWinners,
  updateAdminSpinWinner,
  type SpinRarity,
  type SpinShipStatus,
} from "@/lib/admin-spin-api";

export const Route = createFileRoute("/admin/spin")({
  head: () => ({
    meta: [
      { title: "HellSpin — Админ" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: SpinAdminPage,
});

const RARITY_LABEL: Record<SpinRarity, string> = {
  common: "Обычный",
  rare: "Редкий",
  epic: "Эпик",
  legend: "Легенда",
};

const RARITY_TONE: Record<SpinRarity, "zinc" | "emerald" | "amber" | "rose" | "blue" | "violet"> = {
  common: "zinc",
  rare: "emerald",
  epic: "violet",
  legend: "amber",
};

const SHIP_LABEL: Record<SpinShipStatus, string> = {
  pending: "Не связались",
  contacted: "Связались",
  shipped: "Отправлено",
  delivered: "Получено",
};

const SHIP_TONE: Record<SpinShipStatus, "zinc" | "emerald" | "amber" | "rose" | "blue" | "violet"> = {
  pending: "rose",
  contacted: "amber",
  shipped: "blue",
  delivered: "emerald",
};

const SHIP_FLOW: SpinShipStatus[] = ["pending", "contacted", "shipped", "delivered"];

const TIER_LABEL: Record<string, string> = {
  none: "Без Pass",
  silver: "Silver",
  gold: "Gold",
  platinum: "Platinum",
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtDay(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" });
}

function fmt(n: number): string {
  return n.toLocaleString("ru-RU");
}

function SpinAdminPage() {
  const qc = useQueryClient();
  const [source, setSource] = useState<"all" | "spin" | "streak">("all");

  const overview = useQuery({ queryKey: adminSpinQk.overview, queryFn: fetchAdminSpinOverview });
  const winners = useQuery({
    queryKey: adminSpinQk.winners(source),
    queryFn: () => fetchAdminSpinWinners(source),
  });
  const streaks = useQuery({ queryKey: adminSpinQk.streaks, queryFn: fetchAdminSpinStreaks });

  const patchWinner = useMutation({
    mutationFn: ({ id, status }: { id: string; status: SpinShipStatus }) =>
      updateAdminSpinWinner(id, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "spin"] });
    },
  });

  const stats = overview.data?.stats;
  const season = overview.data?.season;
  const spinsPerDay = overview.data?.spinsPerDay ?? {};
  const winnerRows = winners.data ?? [];

  const refreshAll = () => qc.invalidateQueries({ queryKey: ["admin", "spin"] });

  const filters: { key: typeof source; label: string }[] = [
    { key: "all", label: "Все" },
    { key: "spin", label: "Из рулетки" },
    { key: "streak", label: "Календарь" },
  ];

  return (
    <div>
      <PageHeader
        title="HellSpin"
        description="Статистика прокрутов и победители. Пул призов и логика — в коде бэкенда."
        actions={
          <Btn variant="secondary" onClick={refreshAll}>
            <RefreshCw className="h-3.5 w-3.5" /> Обновить
          </Btn>
        }
      />

      {/* KPI */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Спинов сегодня" value={stats ? fmt(stats.spinsToday) : "—"} icon={PlumpSpin} />
        <KpiCard label="За сезон" value={stats ? fmt(stats.spins) : "—"} icon={TrendingUp} />
        <KpiCard label="Крутят" value={stats ? fmt(stats.players) : "—"} icon={Users} hint="уник. игроков" />
        <KpiCard
          label="Ждут доставки"
          value={stats ? fmt(stats.pendingShipments) : "—"}
          icon={Package}
          tone="amber"
        />
      </div>

      {/* Победители (физика + календарь) */}
      <Panel className="mb-6">
        <PanelHeader>
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
            <span className="text-sm font-semibold">Призы на доставку</span>
          </div>
          <div className="flex gap-1.5">
            {filters.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setSource(f.key)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  source === f.key
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </PanelHeader>

        <DataTable
          headers={["Игрок", "Приз", "Источник", "Город", "Телефон", "Статус", "Дата", ""]}
          rows={winnerRows.map((w) => [
            <span className="font-medium">{w.nick ?? "—"}</span>,
            <span>{w.prizeTitle}</span>,
            w.source === "streak" ? (
              <Badge tone="blue">Календарь</Badge>
            ) : (
              <Badge tone="violet">Рулетка</Badge>
            ),
            <span className="text-xs">{w.city ?? "—"}</span>,
            <span className="inline-flex items-center gap-1 font-mono text-xs">
              <Phone className="h-3 w-3 text-zinc-400" />
              {w.phone ?? "—"}
            </span>,
            <Badge tone={SHIP_TONE[w.status]}>{SHIP_LABEL[w.status]}</Badge>,
            <span className="text-xs text-zinc-500 dark:text-zinc-400">{fmtDate(w.createdAt)}</span>,
            <select
              value={w.status}
              disabled={patchWinner.isPending}
              onChange={(e) =>
                patchWinner.mutate({ id: w.id, status: e.target.value as SpinShipStatus })
              }
              className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
            >
              {SHIP_FLOW.map((s) => (
                <option key={s} value={s}>
                  {SHIP_LABEL[s]}
                </option>
              ))}
            </select>,
          ])}
        />

        {winners.isLoading && (
          <div className="px-4 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">Загрузка…</div>
        )}
        {!winners.isLoading && winnerRows.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
            Нет призов в этом фильтре
          </div>
        )}
      </Panel>

      {/* Последние прокруты */}
      <Panel className="mb-6">
        <PanelHeader>
          <div className="flex items-center gap-2">
            <PlumpSpin className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
            <span className="text-sm font-semibold">Последние прокруты</span>
          </div>
        </PanelHeader>
        <DataTable
          headers={["Игрок", "Приз", "Редкость", "Тир", "Дата"]}
          rows={(overview.data?.recent ?? []).map((r) => [
            <span className="font-medium">{r.nick ?? "—"}</span>,
            <span>
              {r.prizeTitle}
              {r.bonus && <span className="ml-1 text-xs text-zinc-400">бонус-спин</span>}
            </span>,
            <Badge tone={RARITY_TONE[r.rarity]}>{RARITY_LABEL[r.rarity]}</Badge>,
            <span className="text-xs">{TIER_LABEL[r.tier] ?? r.tier}</span>,
            <span className="text-xs text-zinc-500 dark:text-zinc-400">{fmtDate(r.createdAt)}</span>,
          ])}
        />
        {!overview.isLoading && (overview.data?.recent ?? []).length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
            Прокрутов пока нет
          </div>
        )}
      </Panel>




      {/* Календарь активности */}
      <Panel className="mb-6">
        <PanelHeader>
          <div className="flex items-center gap-2">
            <CalendarCheck className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
            <span className="text-sm font-semibold">Календарь активности</span>
          </div>
        </PanelHeader>
        <DataTable
          headers={["Игрок", "Город", "Телефон", "Дней", "10", "20", "30"]}
          rows={(streaks.data ?? []).map((s) => [
            <span className="font-medium">{s.nick ?? "—"}</span>,
            <span className="text-xs">{s.city ?? "—"}</span>,
            <span className="font-mono text-xs">{s.phone ?? "—"}</span>,
            <span className="font-mono text-sm font-semibold">{s.daysCount}</span>,
            <ClaimCell at={s.claimed10At} />,
            <ClaimCell at={s.claimed20At} />,
            <ClaimCell at={s.claimed30At} />,
          ])}
        />
        {!streaks.isLoading && (streaks.data ?? []).length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
            Пока никто не крутил в этом сезоне
          </div>
        )}
      </Panel>

      {/* Сезон */}
      <Panel>
        <PanelHeader>
          <span className="text-sm font-semibold">Текущий сезон</span>
          <Badge tone="emerald">{season?.periodKey ?? "—"}</Badge>
        </PanelHeader>
        <div className="space-y-4 p-4">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-zinc-500 dark:text-zinc-400">Период</span>
            <span className="text-sm font-medium">
              {season ? `${fmtDay(season.startsAt)} → ${fmtDay(season.endsAt)}` : "—"}
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-zinc-500 dark:text-zinc-400">Длительность</span>
            <span className="text-sm font-medium">{season ? `${season.daysTotal} дней` : "—"}</span>
          </div>
          <div className="border-t border-zinc-200 pt-3 dark:border-zinc-800">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Спинов в день по тирам
            </p>
            <div className="space-y-1.5">
              {Object.entries(spinsPerDay).map(([tier, spins]) => (
                <div
                  key={tier}
                  className="flex items-center justify-between rounded-md bg-zinc-50 px-3 py-2 dark:bg-zinc-800/50"
                >
                  <span className="text-sm">{TIER_LABEL[tier] ?? tier}</span>
                  <span className="font-mono text-sm font-semibold">{spins}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}

function ClaimCell({ at }: { at: string | null }) {
  if (!at) return <span className="text-xs text-zinc-400">—</span>;
  return <Badge tone="emerald">{fmtDate(at)}</Badge>;
}

function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "default" | "amber";
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</span>
        <Icon
          className={cn(
            "h-4 w-4",
            tone === "amber" ? "text-amber-500" : "text-zinc-400 dark:text-zinc-500",
          )}
        />
      </div>
      <div className="mt-2 text-2xl font-bold tracking-tight">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-zinc-400">{hint}</div>}
    </div>
  );
}
