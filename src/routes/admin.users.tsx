import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader, Panel, DataTable, Btn, TextInput } from "@/components/admin/ui";
import { AdminPager, type AdminPageSize } from "@/components/admin/AdminPager";
import { AdminUserDrawer, formatAgo } from "@/components/admin/AdminUserDrawer";
import {
  adminQk,
  fetchAdminUsers,
  fetchAdminUsersStats,
  fetchAdminPayers,
  type AdminPayer,
  type AdminUsersSort,
  type AdminUsersStats,
} from "@/lib/admin-queries";

export const Route = createFileRoute("/admin/users")({
  component: UsersPage,
});

function UsersPage() {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
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

      <PayersPanel onOpenUser={setSelectedId} />




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
        <AdminUserDrawer userId={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
}

/**
 * Кто реально платит: подтверждённые платежи, число покупок (×2, ×3…),
 * сумма и средний чек. Разбивка по мерчу / Pass / Школе.
 */
/**
 * Кто реально платит: подтверждённые платежи, число покупок (×2, ×3…),
 * сумма и средний чек. Разбивка по мерчу / Pass / Школе.
 * Пагинация по 10 человек на страницу.
 */
function PayersPanel({ onOpenUser }: { onOpenUser: (id: string) => void }) {
  const [days, setDays] = useState<number | null>(null);
  const [repeatOnly, setRepeatOnly] = useState(false);
  const [payersPage, setPayersPage] = useState(1);
  const PAYERS_PAGE_SIZE = 10;

  const payersQ = useQuery({
    queryKey: ["admin", "payers", days, repeatOnly, payersPage],
    queryFn: () =>
      fetchAdminPayers({
        days: days ?? undefined,
        minPayments: repeatOnly ? 2 : 1,
        page: payersPage,
        pageSize: PAYERS_PAGE_SIZE,
      }),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });

  const rub = (n: number) => `${n.toLocaleString("ru-RU")} ₽`;
  const items: AdminPayer[] = payersQ.data?.items ?? [];
  const sum = payersQ.data?.summary;
  const total = payersQ.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAYERS_PAGE_SIZE));
  const from = total === 0 ? 0 : (payersPage - 1) * PAYERS_PAGE_SIZE + 1;
  const to = Math.min(total, payersPage * PAYERS_PAGE_SIZE);

  const periods: { label: string; value: number | null }[] = [
    { label: "30 дней", value: 30 },
    { label: "90 дней", value: 90 },
    { label: "Всё время", value: null },
  ];

  const resetPage = () => setPayersPage(1);

  return (
    <Panel className="mb-4">
      <div className="flex flex-col gap-3 border-b border-zinc-200 p-4 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-semibold">Платящие</div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400">
            {sum
              ? `${sum.payers} плательщиков · повторных ${sum.repeatPayers} · оборот ${rub(sum.revenueRub)} · средний чек ${rub(sum.avgRub)}`
              : "Только подтверждённые платежи"}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {periods.map((p) => (
            <Btn
              key={p.label}
              variant={days === p.value ? "primary" : "ghost"}
              onClick={() => {
                setDays(p.value);
                resetPage();
              }}
            >
              {p.label}
            </Btn>
          ))}
          <Btn
            variant={repeatOnly ? "primary" : "ghost"}
            onClick={() => {
              setRepeatOnly((v) => !v);
              resetPage();
            }}
          >
            Только повторные
          </Btn>
        </div>
      </div>

      <DataTable
        headers={["Ник", "Покупок", "Сумма", "Средний чек", "Мерч", "Hell Pass", "Школа", "Последний платёж", ""]}
        rows={items.map((p) => [
          <span className="font-medium">@{p.nick}</span>,
          <span className="tabular-nums font-semibold">
            {p.payments}
            {p.payments > 1 && (
              <span className="ml-1 rounded bg-amber-500/15 px-1.5 py-0.5 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                ×{p.payments}
              </span>
            )}
          </span>,
          <span className="tabular-nums font-semibold">{rub(p.totalRub)}</span>,
          <span className="tabular-nums">{rub(p.avgRub)}</span>,
          <span className="tabular-nums text-zinc-500 dark:text-zinc-400">{rub(p.shopRub)}</span>,
          <span className="tabular-nums text-zinc-500 dark:text-zinc-400">{rub(p.passRub)}</span>,
          <span className="tabular-nums text-zinc-500 dark:text-zinc-400">{rub(p.schoolRub)}</span>,
          <span className="tabular-nums text-zinc-500 dark:text-zinc-400">
            {new Date(p.lastPaidAt).toLocaleDateString("ru-RU")}
          </span>,
          <Btn variant="ghost" onClick={() => onOpenUser(p.userId)}>
            Открыть
          </Btn>,
        ])}
      />
      {payersQ.isLoading && <div className="p-6 text-center text-sm text-zinc-500">Загрузка…</div>}
      {!payersQ.isLoading && items.length === 0 && (
        <div className="p-6 text-center text-sm text-zinc-500">Платежей за период нет</div>
      )}

      {total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 px-4 py-3 text-[12px] text-muted-foreground dark:border-zinc-800">
          <span>
            {from}–{to} из {total}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={payersPage <= 1}
              onClick={() => setPayersPage((p) => p - 1)}
              className="inline-flex h-8 items-center gap-1 rounded border border-white/10 px-2 text-foreground hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Назад
            </button>
            <span className="px-2">
              {payersPage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={payersPage >= totalPages}
              onClick={() => setPayersPage((p) => p + 1)}
              className="inline-flex h-8 items-center gap-1 rounded border border-white/10 px-2 text-foreground hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Вперёд
            </button>
          </div>
        </div>
      )}
    </Panel>
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

/** Статистика аудитории для рекламодателей: онлайн, DAU/WAU/MAU, время на сайте, прирост. */
function AudienceStats({ stats }: { stats: AdminUsersStats }) {
  const fmt = (n: number) => n.toLocaleString("ru-RU");
  const pct = (n: number, total: number) => (total > 0 ? Math.round((n / total) * 100) : 0);
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
        <div className="border-t border-zinc-200 p-4 dark:border-zinc-800">
          <div className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Устройства
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <AudienceMetric
              label="iOS"
              value={fmt(stats.platforms.ios)}
              hint={`${pct(stats.platforms.ios, stats.platforms.known)}%`}
            />
            <AudienceMetric
              label="Android"
              value={fmt(stats.platforms.android)}
              hint={`${pct(stats.platforms.android, stats.platforms.known)}%`}
            />
            <AudienceMetric
              label="Десктоп"
              value={fmt(stats.platforms.desktop)}
              hint={`${pct(stats.platforms.desktop, stats.platforms.known)}%`}
            />
            <AudienceMetric
              label="Неизвестно"
              value={fmt(stats.platforms.unknown)}
              hint="нет данных об устройстве"
            />
          </div>
          <div className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
            Определяется по устройствам с включёнными пушами ({fmt(stats.platforms.known)} из{" "}
            {fmt(stats.total)} юзеров). У кого пуши не включены — платформа неизвестна.
          </div>
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
