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
        description="Статистика прокрутов и победители."
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

      {/* Вероятности */}
      <Panel className="mb-6">
        <PanelHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
            <span className="text-sm font-semibold">Вероятности призов</span>
          </div>
          <Badge tone="zinc">как в бэкенде</Badge>
        </PanelHeader>
        <OddsTable />
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

/**
 * Таблица шансов. Цифры — копия PRIZE_CONFIG из server/src/lib/spin.ts:
 * веса в ppm нормализуются на сумму всех активных секторов, множитель тира
 * (Gold ×1.2, Platinum ×1.5) применяется только к epic/legend.
 */
const ODDS_ROWS: { title: string; rarity: SpinRarity; ppm: number; note?: string }[] = [
  { title: "100 XP", rarity: "common", ppm: 240_000 },
  { title: "1 билет", rarity: "common", ppm: 180_000 },
  { title: "250 XP", rarity: "common", ppm: 140_000 },
  { title: "3 билета", rarity: "rare", ppm: 100_000 },
  { title: "Бонус-спин", rarity: "rare", ppm: 80_000 },
  { title: "500 XP", rarity: "rare", ppm: 50_000 },
  { title: "10 билетов", rarity: "epic", ppm: 30_000 },
  { title: "Промокод 20%", rarity: "epic", ppm: 30_000 },
  { title: "Ремувка", rarity: "epic", ppm: 20_000, note: "пул 240 на сезон" },
  { title: "Hell Pass Silver", rarity: "legend", ppm: 3_000, note: "пул 60 на сезон" },
  { title: "Jackpot (AirPods → Watch → PS5)", rarity: "legend", ppm: 40, note: "1–15 дн: 40 ppm, 16–25: 150, 26+: 350" },
];

const ODDS_MULT: { tier: string; mult: number }[] = [
  { tier: "Без Pass / Silver", mult: 1 },
  { tier: "Gold", mult: 1.2 },
  { tier: "Platinum", mult: 1.5 },
];

function OddsTable() {
  const [jackpotPpm, setJackpotPpm] = useState(40);

  const rows = ODDS_ROWS.map((r) =>
    r.rarity === "legend" && r.title.startsWith("Jackpot") ? { ...r, ppm: jackpotPpm } : r,
  );

  const columns = ODDS_MULT.map(({ tier, mult }) => {
    const weights = rows.map((r) =>
      r.rarity === "epic" || r.rarity === "legend" ? r.ppm * mult : r.ppm,
    );
    const total = weights.reduce((s, w) => s + w, 0);
    return { tier, mult, weights, total };
  });

  const pct = (w: number, total: number) => {
    const p = (w / total) * 100;
    return p < 0.01 ? p.toFixed(4) : p < 1 ? p.toFixed(3) : p.toFixed(2);
  };

  return (
    <div className="p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-xs text-zinc-500 dark:text-zinc-400">Фаза месяца (шанс jackpot):</span>
        {[
          { label: "1–15", ppm: 40 },
          { label: "16–25", ppm: 150 },
          { label: "26+", ppm: 350 },
        ].map((p) => (
          <button
            key={p.ppm}
            type="button"
            onClick={() => setJackpotPpm(p.ppm)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              jackpotPpm === p.ppm
                ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                : "border-zinc-200 text-zinc-600 dark:border-zinc-800 dark:text-zinc-400",
            )}
          >
            {p.label} дн
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
              <th className="py-2 pr-3 font-medium">Приз</th>
              <th className="py-2 pr-3 font-medium">Вес (ppm)</th>
              {columns.map((c) => (
                <th key={c.tier} className="py-2 pr-3 text-right font-medium">
                  {c.tier}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.title} className="border-b border-zinc-100 last:border-0 dark:border-zinc-800/60">
                <td className="py-2 pr-3">
                  <div className="font-medium">{r.title}</div>
                  <div className="text-[11px] text-zinc-400">
                    {r.rarity}
                    {r.note ? ` · ${r.note}` : ""}
                  </div>
                </td>
                <td className="py-2 pr-3 font-mono text-xs text-zinc-500">
                  {r.ppm.toLocaleString("ru-RU")}
                </td>
                {columns.map((c) => (
                  <td key={c.tier} className="py-2 pr-3 text-right font-mono tabular-nums">
                    {pct(c.weights[i]!, c.total)}%
                  </td>
                ))}
              </tr>
            ))}
            <tr className="text-xs text-zinc-500 dark:text-zinc-400">
              <td className="py-2 pr-3 font-medium">Сумма весов</td>
              <td className="py-2 pr-3" />
              {columns.map((c) => (
                <td key={c.tier} className="py-2 pr-3 text-right font-mono">
                  {Math.round(c.total).toLocaleString("ru-RU")}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
        Веса заданы в ppm (1% = 10 000) и нормализуются на сумму активных секторов, поэтому шанс
        зависит от того, какие сектора доступны. Множитель тира (Gold ×1.2, Platinum ×1.5) действует
        только на epic и legend. Если пул приза исчерпан — сектор выключается (ремувка и Silver
        подменяются на 10 билетов, jackpot — на 50 билетов). Если приз расходуется быстрее графика
        сезона, его вес временно режется ×0.25. В последние 24 часа сезона нераскрытые jackpot-призы
        выдаются принудительно.
      </p>
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
