// Админка HellSpin. Пул призов и логика — на бэкенде, здесь только реальная
// статистика: легендарные выигрыши с анкетой победителя, топ-выигрыши,
// полная история прокрутов со страницами и календарь активности.

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  PageHeader,
  Panel,
  PanelHeader,
  DataTable,
  Badge,
  Btn,
  TextInput,
} from "@/components/admin/ui";
import { AdminPager, type AdminPageSize } from "@/components/admin/AdminPager";
import { AdminUserDrawer } from "@/components/admin/AdminUserDrawer";
import {
  PlumpSpin,
  TrendingUp,
  PlumpUsers as Users,
  Trophy,
  CalendarCheck,
  RefreshCw,
} from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import {
  adminSpinQk,
  fetchAdminSpinHistory,
  fetchAdminSpinOverview,
  fetchAdminSpinStreaks,
  setAdminSpinPrizeActive,
  type SpinRarity,
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

/** Ник + кнопка «Открыть» — открывает полную карточку юзера как в /admin/users. */
function UserCell({
  nick,
  userId,
  onOpen,
}: {
  nick: string | null;
  userId: string | null;
  onOpen: (id: string) => void;
}) {
  if (!nick) return <span className="text-zinc-400">—</span>;
  return (
    <span className="inline-flex items-center gap-2">
      <span className="font-medium">@{nick}</span>
      {userId && (
        <Btn variant="ghost" onClick={() => onOpen(userId)}>
          Открыть
        </Btn>
      )}
    </span>
  );
}

/** Строк на страницу в календаре активности. */
const STREAK_PER_PAGE = 10;

function SpinAdminPage() {
  const qc = useQueryClient();

  const overview = useQuery({ queryKey: adminSpinQk.overview, queryFn: fetchAdminSpinOverview });
  const streaks = useQuery({ queryKey: adminSpinQk.streaks, queryFn: fetchAdminSpinStreaks });

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const [histPage, setHistPage] = useState(1);
  const [histSize, setHistSize] = useState<AdminPageSize>(50);
  const [histRarity, setHistRarity] = useState<"all" | "top" | "low">("all");
  const [prizeFilter, setPrizeFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [streakPage, setStreakPage] = useState(1);
  const [streakSearch, setStreakSearch] = useState("");
  const [debounced, setDebounced] = useState("");

  // Дебаунс поиска через эффект: раньше setTimeout вызывался на каждом рендере
  // и плодил лишние ререндеры/запросы — отсюда и лаги при переключении фильтров.
  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search);
      setHistPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const histParams = useMemo(
    () => ({
      rarity: histRarity,
      q: debounced || undefined,
      prize: prizeFilter ?? undefined,
      page: histPage,
      pageSize: histSize,
    }),
    [histRarity, debounced, prizeFilter, histPage, histSize],
  );
  const history = useQuery({
    queryKey: adminSpinQk.history(histParams),
    queryFn: () => fetchAdminSpinHistory(histParams),
    placeholderData: (prev) => prev,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });

  const historyRows = useMemo(
    () =>
      (history.data?.items ?? []).map((r) => [
        <UserCell key="u" nick={r.nick} userId={r.userId} onOpen={setSelectedUserId} />,
        <span key="p">
          {r.prizeTitle}
          {r.bonus && <span className="ml-1 text-xs text-zinc-400">бонус-спин</span>}
        </span>,
        <Badge key="r" tone={RARITY_TONE[r.rarity]}>
          {RARITY_LABEL[r.rarity]}
        </Badge>,
        <span key="t" className="text-xs">
          {TIER_LABEL[r.tier] ?? r.tier}
        </span>,
        <span key="d" className="text-xs text-zinc-500 dark:text-zinc-400">
          {fmtDate(r.createdAt)}
        </span>,
      ]),
    [history.data],
  );


  const stats = overview.data?.stats;
  const season = overview.data?.season;
  const spinsPerDay = overview.data?.spinsPerDay ?? {};

  // Крупные призы сезона: эпик + легенда, с реальным числом выигрышей.
  // Капсулу ×2 показываем всегда — даже если сезон стартовал до её появления
  // и приз ещё не подтянулся в пул.
  const wonByCode = new Map((overview.data?.byPrize ?? []).map((p) => [p.prizeCode, p.count]));
  // t50 — служебная подмена при пустом пуле, в колесе её нет.
  const rawBig = (overview.data?.prizes ?? []).filter(
    (p) => (p.rarity === "epic" || p.rarity === "legend") && p.code !== "t50",
  );
  const withCapsule =
    overview.data && !rawBig.some((p) => p.code === "boost_x2")
      ? [
          ...rawBig,
          {
            code: "boost_x2",
            title: "Капсула ×2",
            rarity: "legend" as SpinRarity,
            rewardKind: "ticket_boost",
            chancePpm: 50_000,
            limitTotal: null,
            issued: 0,
            active: true,
          },
        ]
      : rawBig;
  const bigPrizes = withCapsule
    .map((p) => ({ ...p, won: wonByCode.get(p.code) ?? 0 }))
    .sort((a, b) => b.won - a.won);
  const bigTotal = bigPrizes.reduce((s, p) => s + p.won, 0);

  const openPrize = (code: string) => {
    setPrizeFilter(code);
    setHistRarity("all");
    setHistPage(1);
  };

  // Календарь активности: фильтр + страницы по 10 строк (данные приходят целиком).
  const streakFiltered = (streaks.data ?? []).filter((s) => {
    const needle = streakSearch.trim().toLowerCase();
    if (!needle) return true;
    return (s.nick ?? "").toLowerCase().includes(needle);
  });
  const streakTotal = streakFiltered.length;
  const streakPages = Math.max(1, Math.ceil(streakTotal / STREAK_PER_PAGE));
  const streakPageSafe = Math.min(streakPage, streakPages);
  const streakPageRows = streakFiltered.slice(
    (streakPageSafe - 1) * STREAK_PER_PAGE,
    streakPageSafe * STREAK_PER_PAGE,
  );

  const refreshAll = () => qc.invalidateQueries({ queryKey: ["admin", "spin"] });

  // Тумблер приза: выключенный остаётся в колесе, но не выпадает.
  const togglePrize = useMutation({
    mutationFn: ({ code, active }: { code: string; active: boolean }) =>
      setAdminSpinPrizeActive(code, active),
    onSuccess: () => qc.invalidateQueries({ queryKey: adminSpinQk.overview }),
  });

  return (
    <div>
      <PageHeader
        title="HellSpin"
        description="Все призы выдаются автоматически. Здесь — статистика и победители."
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
          label="Крупных призов"
          value={fmt(bigTotal)}
          icon={Trophy}
          tone="amber"
          hint="эпик + легенда за сезон"
        />
      </div>

      {/* Статистика крупных призов — клик открывает список победителей */}
      <Panel className="mb-6">
        <PanelHeader>
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-semibold">Крупные призы</span>
          </div>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            Нажми на приз, чтобы увидеть победителей
          </span>
        </PanelHeader>
        <div className="grid grid-cols-2 gap-3 p-4 md:grid-cols-3 lg:grid-cols-4">
          {bigPrizes.map((p) => (
            <button
              key={p.code}
              type="button"
              onClick={() => openPrize(p.code)}
              className={cn(
                "rounded-lg border px-3 py-2.5 text-left transition-colors",
                prizeFilter === p.code
                  ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30"
                  : "border-zinc-200 hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600",
              )}
            >
              <div className="mb-1 flex items-center gap-1.5">
                <Badge tone={RARITY_TONE[p.rarity]}>{RARITY_LABEL[p.rarity]}</Badge>
              </div>
              <div className="text-sm font-medium">{p.title}</div>
              <div className="mt-1 font-mono text-xl font-bold tabular-nums">{fmt(p.won)}</div>
              <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                {p.limitTotal ? `из пула ${fmt(p.limitTotal)}` : "без лимита"}
              </div>
              <span
                role="switch"
                aria-checked={p.active}
                aria-label={`Выдача приза «${p.title}»`}
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  togglePrize.mutate({ code: p.code, active: !p.active });
                }}
                onKeyDown={(e) => {
                  if (e.key !== "Enter" && e.key !== " ") return;
                  e.preventDefault();
                  e.stopPropagation();
                  togglePrize.mutate({ code: p.code, active: !p.active });
                }}
                className={cn(
                  "mt-2 flex items-center gap-1.5 text-[11px] font-medium",
                  p.active ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400",
                )}
              >
                <span
                  className={cn(
                    "relative h-4 w-7 rounded-full transition-colors",
                    p.active ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-700",
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all",
                      p.active ? "left-3.5" : "left-0.5",
                    )}
                  />
                </span>
                {p.active ? "Выдаётся" : "Выключен"}
              </span>
            </button>
          ))}
          {overview.isLoading && (
            <div className="col-span-full py-6 text-center text-sm text-zinc-500">Загрузка…</div>
          )}
          {!overview.isLoading && bigPrizes.length === 0 && (
            <div className="col-span-full py-6 text-center text-sm text-zinc-500">
              Крупных призов в сезоне нет
            </div>
          )}
        </div>
      </Panel>

      {/* История прокрутов с поиском и фильтрами */}
      <Panel className="mb-6">
        <PanelHeader>
          <div className="flex items-center gap-2">
            <PlumpSpin className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
            <span className="text-sm font-semibold">История прокрутов</span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              Всего: {fmt(history.data?.total ?? 0)}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {([
              { key: "all", label: "Все" },
              { key: "top", label: "Эпик и легенда" },
              { key: "low", label: "Обычные и редкие" },
            ] as const).map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => {
                  setHistRarity(f.key);
                  setHistPage(1);
                }}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  histRarity === f.key
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </PanelHeader>

        <div className="flex flex-wrap items-center gap-2 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <TextInput
            placeholder="Поиск по нику…"
            className="max-w-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {prizeFilter && (
            <button
              type="button"
              onClick={() => {
                setPrizeFilter(null);
                setHistPage(1);
              }}
              className="inline-flex items-center gap-1 rounded-full border border-amber-500 px-3 py-1 text-xs font-medium text-amber-600 dark:text-amber-400"
            >
              Приз: {bigPrizes.find((p) => p.code === prizeFilter)?.title ?? prizeFilter} ×
            </button>
          )}
        </div>

        <div className={history.isFetching ? "opacity-60 transition-opacity" : "transition-opacity"}>
          <DataTable headers={["Игрок", "Приз", "Редкость", "Тир", "Дата"]} rows={historyRows} />
        </div>

        {!history.isLoading && (history.data?.items ?? []).length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
            Ничего не найдено
          </div>
        )}
        <AdminPager
          page={histPage}
          pageSize={histSize}
          total={history.data?.total ?? 0}
          onPageChange={setHistPage}
          onPageSizeChange={(s) => {
            setHistSize(s);
            setHistPage(1);
          }}
        />
      </Panel>

      {/* Вероятности */}
      <Panel className="mb-6">
        <PanelHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
            <span className="text-sm font-semibold">Вероятности призов</span>
          </div>
        </PanelHeader>
        <OddsTable />
      </Panel>

      {/* Календарь активности — со страницами, чтобы таблица не тянулась вниз */}
      <Panel className="mb-6">
        <PanelHeader>
          <div className="flex items-center gap-2">
            <CalendarCheck className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
            <span className="text-sm font-semibold">Календарь активности</span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              Всего: {fmt(streakTotal)}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <TextInput
              placeholder="Поиск по нику…"
              className="max-w-[200px]"
              value={streakSearch}
              onChange={(e) => {
                setStreakSearch(e.target.value);
                setStreakPage(1);
              }}
            />
          </div>
        </PanelHeader>
        <DataTable
          headers={["Игрок", "Город", "Телефон", "Дней", "10", "20", "30"]}
          rows={streakPageRows.map((s) => [
            <UserCell nick={s.nick} userId={s.userId} onOpen={setSelectedUserId} />,
            <span className="text-xs">{s.city ?? "—"}</span>,
            <span className="font-mono text-xs">{s.phone ?? "—"}</span>,
            <span className="font-mono text-sm font-semibold">{s.daysCount}</span>,
            <ClaimCell at={s.claimed10At} />,
            <ClaimCell at={s.claimed20At} />,
            <ClaimCell at={s.claimed30At} />,
          ])}
        />
        {!streaks.isLoading && streakTotal === 0 && (
          <div className="px-4 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
            {streakSearch ? "Никого не нашли" : "Пока никто не крутил в этом сезоне"}
          </div>
        )}
        {streakTotal > 0 && (
          <div className="flex items-center justify-between gap-3 border-t border-zinc-200 px-4 py-3 dark:border-zinc-800">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {(streakPageSafe - 1) * STREAK_PER_PAGE + 1}–
              {Math.min(streakPageSafe * STREAK_PER_PAGE, streakTotal)} из {fmt(streakTotal)}
            </span>
            <div className="flex items-center gap-2">
              <Btn
                variant="secondary"
                onClick={() => setStreakPage(Math.max(1, streakPageSafe - 1))}
                disabled={streakPageSafe <= 1}
              >
                Назад
              </Btn>
              <span className="font-mono text-xs">
                {streakPageSafe} / {streakPages}
              </span>
              <Btn
                variant="secondary"
                onClick={() => setStreakPage(Math.min(streakPages, streakPageSafe + 1))}
                disabled={streakPageSafe >= streakPages}
              >
                Вперёд
              </Btn>
            </div>
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

      {selectedUserId && (
        <AdminUserDrawer userId={selectedUserId} onClose={() => setSelectedUserId(null)} />
      )}
    </div>
  );
}

/**
 * Таблица шансов. Цифры — копия PRIZE_CONFIG из server/src/lib/spin.ts:
 * веса в ppm нормализуются на сумму всех активных секторов, множитель тира
 * (Gold ×1.2, Platinum ×1.5) применяется только к epic/legend.
 */
const ODDS_ROWS: { title: string; rarity: SpinRarity; ppm: number; note?: string }[] = [
  { title: "100 XP", rarity: "common", ppm: 260_000 },
  { title: "250 XP", rarity: "common", ppm: 170_000 },
  { title: "Бонус-спин", rarity: "rare", ppm: 110_000 },
  { title: "1 билет", rarity: "common", ppm: 90_000 },
  { title: "500 XP", rarity: "rare", ppm: 80_000 },
  { title: "Капсула ×2", rarity: "legend", ppm: 50_000, note: "×2 билета на цифру, 24 ч" },
  { title: "1 билет · сектор t3", rarity: "rare", ppm: 40_000, note: "бывшие «3 билета» — теперь 1" },
  { title: "Промокод 20%", rarity: "epic", ppm: 30_000 },
  { title: "Ремувка", rarity: "epic", ppm: 20_000, note: "пул 240 на сезон" },
  { title: "1 билет · сектор t10", rarity: "epic", ppm: 10_000, note: "бывшие «10 билетов» — теперь 1" },
  { title: "Hell Pass Silver", rarity: "legend", ppm: 3_000, note: "пул 60 на сезон" },
  { title: "Jackpot (AirPods → Watch → PS5)", rarity: "legend", ppm: 40, note: "1–15 дн: 40 ppm, 16–25: 150, 26+: 350" },
];

/**
 * Веса, которые действовали на первые ~800 прокрутов сезона (до добавления
 * «Капсулы ×2»). Нужны только для сравнительной таблицы.
 */
const OLD_PPM: Record<string, number> = {
  "100 XP": 240_000,
  "250 XP": 140_000,
  "Бонус-спин": 80_000,
  "1 билет": 180_000,
  "500 XP": 50_000,
  "Капсула ×2": 0,
  "1 билет · сектор t3": 100_000,
  "Промокод 20%": 30_000,
  Ремувка: 20_000,
  "1 билет · сектор t10": 30_000,
  "Hell Pass Silver": 3_000,
  "Jackpot (AirPods → Watch → PS5)": 40,
};




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

      <OddsCompare />
    </div>
  );
}

/**
 * Сравнение: веса до добавления «Капсулы ×2» (первые ~800 прокрутов сезона)
 * против актуальных. Проценты считаются для базового тира (без Pass / Silver).
 */
function OddsCompare() {
  const oldTotal = ODDS_ROWS.reduce((s, r) => s + (OLD_PPM[r.title] ?? 0), 0);
  const newTotal = ODDS_ROWS.reduce((s, r) => s + r.ppm, 0);

  const pct = (w: number, total: number) => {
    const p = (w / total) * 100;
    return p < 0.01 ? p.toFixed(4) : p < 1 ? p.toFixed(3) : p.toFixed(2);
  };

  return (
    <div className="mt-6 border-t border-zinc-200 pt-4 dark:border-zinc-800">
      <div className="mb-1 text-sm font-semibold">Было → сейчас</div>
      <div className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
        Слева — веса, по которым прошли первые ~800 прокрутов сезона (капсулы в колесе не было).
        Справа — актуальные. Проценты для базового тира.
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
              <th className="py-2 pr-3 font-medium">Приз</th>
              <th className="py-2 pr-3 text-right font-medium">Было %</th>
              <th className="py-2 pr-3 text-right font-medium">Сейчас %</th>
              <th className="py-2 pr-3 text-right font-medium">Δ</th>
              <th className="py-2 pr-3 text-right font-medium">1 на N прокрутов</th>
            </tr>
          </thead>
          <tbody>
            {ODDS_ROWS.map((r) => {
              const oldPpm = OLD_PPM[r.title] ?? 0;
              const oldP = (oldPpm / oldTotal) * 100;
              const newP = (r.ppm / newTotal) * 100;
              const delta = newP - oldP;
              const oneIn = r.ppm > 0 ? Math.round(newTotal / r.ppm) : null;
              return (
                <tr
                  key={r.title}
                  className="border-b border-zinc-100 last:border-0 dark:border-zinc-800/60"
                >
                  <td className="py-2 pr-3">
                    <div className="font-medium">{r.title}</div>
                    <div className="text-[11px] text-zinc-400">
                      {oldPpm.toLocaleString("ru-RU")} → {r.ppm.toLocaleString("ru-RU")} ppm
                    </div>
                  </td>
                  <td className="py-2 pr-3 text-right font-mono tabular-nums text-zinc-500">
                    {oldPpm === 0 ? "—" : `${pct(oldPpm, oldTotal)}%`}
                  </td>
                  <td className="py-2 pr-3 text-right font-mono tabular-nums font-semibold">
                    {pct(r.ppm, newTotal)}%
                  </td>
                  <td
                    className={cn(
                      "py-2 pr-3 text-right font-mono tabular-nums",
                      Math.abs(delta) < 0.005
                        ? "text-zinc-400"
                        : delta > 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400",
                    )}
                  >
                    {Math.abs(delta) < 0.005
                      ? "0"
                      : `${delta > 0 ? "+" : "−"}${Math.abs(delta) < 1 ? Math.abs(delta).toFixed(3) : Math.abs(delta).toFixed(2)}`}
                  </td>
                  <td className="py-2 pr-3 text-right font-mono tabular-nums text-zinc-500">
                    {oneIn ? `~1 / ${oneIn.toLocaleString("ru-RU")}` : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
        Важное: «10 билетов» раньше стоял на 30 000 ppm (~3,49%) — поэтому падал часто. Сейчас
        10 000 ppm (~1,16%). «Hell Pass Silver» и раньше, и сейчас 3 000 ppm — это ~0,35%, то есть
        примерно 1 на 290 прокрутов; на 800 прокрутов это ожидаемо 2–3 выдачи. Дневных лимитов на
        призы нет — ограничены только сезонные пулы (Ремувка 240, Silver 60) и очередь jackpot.
      </div>
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
