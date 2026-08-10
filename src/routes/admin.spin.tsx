// Админка HellSpin. Пул призов и логика зашиты в код/бэкенд — здесь только
// статистика по прокрутам + список победителей (особенно физических призов,
// которые надо доставить) + справка по сезону. Данные — моки до бэкенда.

import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
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
  RefreshCw,
} from "@/components/ui/icons";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/spin")({
  head: () => ({
    meta: [
      { title: "HellSpin — Админ" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: SpinAdminPage,
});

/* ----------------- Моки (до бэкенда) ----------------- */

type Rarity = "common" | "rare" | "epic" | "legend";
type PrizeKind = "digital" | "physical";

type Winner = {
  id: string;
  nick: string;
  phone: string;
  prize: string;
  rarity: Rarity;
  kind: PrizeKind;
  date: string; // ISO
};

const RARITY_LABEL: Record<Rarity, string> = {
  common: "Обычный",
  rare: "Редкий",
  epic: "Эпик",
  legend: "Легенда",
};

const RARITY_TONE: Record<Rarity, "zinc" | "emerald" | "amber" | "rose" | "blue" | "violet"> = {
  common: "zinc",
  rare: "emerald",
  epic: "violet",
  legend: "amber",
};

const MOCK_WINNERS: Winner[] = [
  { id: "w1", nick: "Semёn_R", phone: "+7 921 334-11-09", prize: "AirPods 4", rarity: "legend", kind: "physical", date: "2026-08-10T18:42:00Z" },
  { id: "w2", nick: "katya_mx", phone: "+7 916 772-04-51", prize: "Носки (майлстоун 10)", rarity: "rare", kind: "physical", date: "2026-08-10T16:10:00Z" },
  { id: "w3", nick: "darkrider", phone: "+7 905 112-88-43", prize: "100 XP", rarity: "common", kind: "digital", date: "2026-08-10T15:33:00Z" },
  { id: "w4", nick: "nikitaZ", phone: "+7 999 224-67-90", prize: "Ремувка", rarity: "epic", kind: "physical", date: "2026-08-10T14:21:00Z" },
  { id: "w5", nick: "olga_v", phone: "+7 931 558-03-22", prize: "10 билетов", rarity: "epic", kind: "digital", date: "2026-08-10T13:05:00Z" },
  { id: "w6", nick: "maxpayne", phone: "+7 912 880-44-17", prize: "Apple Watch SE", rarity: "legend", kind: "physical", date: "2026-08-09T20:11:00Z" },
  { id: "w7", nick: "yulya_t", phone: "+7 926 331-90-88", prize: "Промокод 20%", rarity: "epic", kind: "digital", date: "2026-08-09T18:50:00Z" },
  { id: "w8", nick: "grisha_77", phone: "+7 903 119-55-02", prize: "1 билет", rarity: "common", kind: "digital", date: "2026-08-09T17:22:00Z" },
  { id: "w9", nick: "andrey_k", phone: "+7 958 220-13-66", prize: "Hell Pass Silver", rarity: "legend", kind: "digital", date: "2026-08-09T16:00:00Z" },
  { id: "w10", nick: "marina_s", phone: "+7 977 442-08-31", prize: "250 XP", rarity: "common", kind: "digital", date: "2026-08-09T14:44:00Z" },
  { id: "w11", nick: "kostya_drift", phone: "+7 910 667-23-89", prize: "PlayStation 5 Slim", rarity: "legend", kind: "physical", date: "2026-08-08T19:30:00Z" },
  { id: "w12", nick: "dashka_v", phone: "+7 914 228-76-15", prize: "Носки (майлстоун 10)", rarity: "rare", kind: "physical", date: "2026-08-08T17:12:00Z" },
];

const MOCK_STATS = {
  spinsToday: 342,
  spinsSeason: 4_810,
  uniquePlayers: 312,
  physicalPending: 6,
};

const SEASON_INFO = {
  label: "Сезон 1",
  startsAt: "11 авг 2026",
  endsAt: "10 сен 2026",
  days: 30,
  tiers: [
    { name: "Без Pass", spins: 1 },
    { name: "Silver", spins: 2 },
    { name: "Gold", spins: 4 },
    { name: "Platinum", spins: 7 },
  ],
  milestones: [
    { day: 10, reward: "Носки" },
    { day: 20, reward: "Silver + носки + 5 билетов" },
    { day: 30, reward: "Gold + носки + ремувка + 20 билетов" },
  ],
};

/* ----------------- Хелперы ----------------- */

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmt(n: number): React.ReactNode {
  return n.toLocaleString("ru-RU");
}

/* ----------------- Страница ----------------- */

function SpinAdminPage() {
  const [filter, setFilter] = useState<"all" | "physical" | "digital">("all");

  const winners = useMemo(() => {
    const list = filter === "all" ? MOCK_WINNERS : MOCK_WINNERS.filter((w) => w.kind === filter);
    return [...list].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [filter]);

  const filters: { key: typeof filter; label: string; count: number }[] = [
    { key: "all", label: "Все", count: MOCK_WINNERS.length },
    { key: "physical", label: "Физические", count: MOCK_WINNERS.filter((w) => w.kind === "physical").length },
    { key: "digital", label: "Цифровые", count: MOCK_WINNERS.filter((w) => w.kind === "digital").length },
  ];

  return (
    <div>
      <PageHeader
        title="HellSpin"
        description="Статистика прокрутов и победители. Пул призов и логика — в коде."
        actions={
          <Btn variant="secondary" onClick={() => { /* мок — бэкенд ещё нет */ }}>
            <RefreshCw className="h-3.5 w-3.5" /> Обновить
          </Btn>
        }
      />

      {/* KPI */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Спинов сегодня" value={fmt(MOCK_STATS.spinsToday)} icon={PlumpSpin} />
        <KpiCard label="За сезон" value={fmt(MOCK_STATS.spinsSeason)} icon={TrendingUp} />
        <KpiCard label="Крутят" value={fmt(MOCK_STATS.uniquePlayers)} icon={Users} hint="уник. игроков" />
        <KpiCard
          label="Ждут доставки"
          value={fmt(MOCK_STATS.physicalPending)}
          icon={Package}
          tone="amber"
        />
      </div>

      {/* Победители */}
      <Panel className="mb-6">
        <PanelHeader>
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
            <span className="text-sm font-semibold">Победители</span>
          </div>
          <div className="flex gap-1.5">
            {filters.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  filter === f.key
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800",
                )}
              >
                {f.label} <span className="opacity-60">{f.count}</span>
              </button>
            ))}
          </div>
        </PanelHeader>

        <DataTable
          headers={["Игрок", "Приз", "Редкость", "Тип", "Телефон", "Дата"]}
          rows={winners.map((w) => [
            <span className="font-medium">{w.nick}</span>,
            <span>{w.prize}</span>,
            <Badge tone={RARITY_TONE[w.rarity]}>{RARITY_LABEL[w.rarity]}</Badge>,
            w.kind === "physical" ? (
              <Badge tone="amber">📦 Физический</Badge>
            ) : (
              <Badge tone="blue">⚡ Цифровой</Badge>
            ),
            <span className="inline-flex items-center gap-1 font-mono text-xs">
              <Phone className="h-3 w-3 text-zinc-400" />
              {w.phone}
            </span>,
            <span className="text-xs text-zinc-500 dark:text-zinc-400">{fmtDate(w.date)}</span>,
          ])}
        />

        {winners.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
            Нет победителей в этом фильтре
          </div>
        )}
      </Panel>

      {/* Сезон */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel>
          <PanelHeader>
            <span className="text-sm font-semibold">Текущий сезон</span>
            <Badge tone="emerald">Активен</Badge>
          </PanelHeader>
          <div className="space-y-4 p-4">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-zinc-500 dark:text-zinc-400">Период</span>
              <span className="text-sm font-medium">
                {SEASON_INFO.startsAt} → {SEASON_INFO.endsAt}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-zinc-500 dark:text-zinc-400">Длительность</span>
              <span className="text-sm font-medium">{SEASON_INFO.days} дней</span>
            </div>
            <div className="border-t border-zinc-200 pt-3 dark:border-zinc-800">
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Спинов в день по тирам
              </p>
              <div className="space-y-1.5">
                {SEASON_INFO.tiers.map((t) => (
                  <div key={t.name} className="flex items-center justify-between rounded-md bg-zinc-50 px-3 py-2 dark:bg-zinc-800/50">
                    <span className="text-sm">{t.name}</span>
                    <span className="font-mono text-sm font-semibold">{t.spins}</span>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-xs text-zinc-400">
              Настройки зашиты в код. Изменения — через разработку.
            </p>
          </div>
        </Panel>

        {/* Майлстоуны */}
        <Panel>
          <PanelHeader>
            <span className="text-sm font-semibold">Награды за стрик</span>
          </PanelHeader>
          <div className="space-y-3 p-4">
            {SEASON_INFO.milestones.map((m) => (
              <div key={m.day} className="flex items-center gap-3 rounded-md bg-zinc-50 px-3 py-2.5 dark:bg-zinc-800/50">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#B6FF3C] font-display text-sm font-black text-black">
                  {m.day}
                </span>
                <span className="text-sm font-medium">{m.reward}</span>
              </div>
            ))}
            <p className="text-xs text-zinc-400">
              Дни подряд — без пропусков. Пропустил день — стрик обнулился.
            </p>
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ----------------- KPI карточка ----------------- */

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
