// Админка · Школа: присвоение user-аккаунтов инструкторам и экономика по занятиям.
// Пока полностью на моках (localStorage), тот же слой, что и в PWA-инструкторе.

import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Badge,
  Btn,
  Modal,
  PageHeader,
  Panel,
  PanelHeader,
  TextInput,
} from "@/components/admin/ui";
import { INSTRUCTOR_ACCOUNTS } from "@/data/instructor-accounts";
import {
  assignInstructorAccount,
  listCandidateUsers,
  useAssignments,
  useEconomy,
  refreshEconomy,
  type CandidateUser,
  type InstructorEconomy,
} from "@/data/admin-school";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/school")({
  component: AdminSchoolPage,
});

type Tab = "accounts" | "economy";

function AdminSchoolPage() {
  const [tab, setTab] = useState<Tab>("accounts");
  const assignments = useAssignments();
  const economy = useEconomy();

  const totals = useMemo(() => {
    return economy.reduce(
      (acc, e) => {
        acc.paidCount += e.paidCount;
        acc.pendingCount += e.pendingCount;
        acc.payout += e.payout;
        acc.gross += e.gross;
        acc.commission += e.commission;
        acc.payoutWeek += e.payoutWeek;
        return acc;
      },
      {
        paidCount: 0,
        pendingCount: 0,
        payout: 0,
        gross: 0,
        commission: 0,
        payoutWeek: 0,
      },
    );
  }, [economy]);

  const assignedCount = Object.keys(assignments).length;

  return (
    <div>
      <PageHeader
        title="Школа"
        description="Инструкторы, привязка аккаунтов и экономика занятий."
        actions={
          <Btn variant="ghost" onClick={() => refreshEconomy()}>
            Обновить
          </Btn>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Инструкторов" value={String(INSTRUCTOR_ACCOUNTS.length)} />
        <StatCard
          label="Привязано аккаунтов"
          value={`${assignedCount} / ${INSTRUCTOR_ACCOUNTS.length}`}
        />
        <StatCard label="Оплачено занятий" value={String(totals.paidCount)} />
        <StatCard
          label="Ожидает оплаты"
          value={String(totals.pendingCount)}
          tone={totals.pendingCount > 0 ? "amber" : "zinc"}
        />
        <StatCard label="Выручка (с учеников)" value={fmtMoney(totals.gross)} />
        <StatCard label="К выплате инструкторам" value={fmtMoney(totals.payout)} />
        <StatCard label="Комиссия платформы" value={fmtMoney(totals.commission)} tone="emerald" />
        <StatCard label="К выплате за 7 дней" value={fmtMoney(totals.payoutWeek)} tone="blue" />
      </div>

      <div className="mb-4 inline-flex rounded-md border border-zinc-200 bg-white p-0.5 dark:border-zinc-800 dark:bg-zinc-900">
        <TabBtn active={tab === "accounts"} onClick={() => setTab("accounts")}>
          Аккаунты
        </TabBtn>
        <TabBtn active={tab === "economy"} onClick={() => setTab("economy")}>
          Экономика
        </TabBtn>
      </div>

      {tab === "accounts" ? (
        <AccountsPanel assignments={assignments} economy={economy} />
      ) : (
        <EconomyPanel economy={economy} />
      )}
    </div>
  );
}

// ============= Accounts =============

function AccountsPanel({
  assignments,
  economy,
}: {
  assignments: Record<string, string>;
  economy: InstructorEconomy[];
}) {
  const [modalFor, setModalFor] = useState<string | null>(null);

  const ecoMap = useMemo(() => {
    const m = new Map<string, InstructorEconomy>();
    economy.forEach((e) => m.set(e.slug, e));
    return m;
  }, [economy]);

  const candidatesByAssigned = useMemo(() => {
    const map = new Map<string, CandidateUser>();
    const all = listCandidateUsers();
    for (const [instrSlug, userSlug] of Object.entries(assignments)) {
      const u = all.find((c) => c.slug === userSlug);
      if (u) map.set(instrSlug, u);
    }
    return map;
  }, [assignments]);

  return (
    <Panel>
      <PanelHeader>
        <div className="text-sm font-medium">Присвоение аккаунтов</div>
        <div className="text-xs text-zinc-500 dark:text-zinc-400">
          Пока моки. Позже привяжем к реальным ролям.
        </div>
      </PanelHeader>
      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {INSTRUCTOR_ACCOUNTS.map((acc) => {
          const assigned = candidatesByAssigned.get(acc.slug);
          const eco = ecoMap.get(acc.slug);
          return (
            <div key={acc.slug} className="flex items-center gap-3 px-4 py-3">
              <img
                src={acc.photo}
                alt={acc.name}
                className="h-10 w-10 flex-shrink-0 rounded-full object-cover"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="font-medium">{acc.name}</div>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    {acc.city}
                  </span>
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs">
                  {assigned ? (
                    <Badge tone="emerald">@{assigned.nick}</Badge>
                  ) : (
                    <Badge tone="amber">аккаунт не присвоен</Badge>
                  )}
                  {eco && eco.paidCount > 0 && (
                    <span className="text-zinc-500 dark:text-zinc-400">
                      {eco.paidCount} оплачено · {fmtMoney(eco.payout)}
                    </span>
                  )}
                  {eco && eco.pendingCount > 0 && (
                    <span className="text-amber-600 dark:text-amber-400">
                      {eco.pendingCount} в ожидании
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-shrink-0 gap-2">
                {assigned && (
                  <Btn
                    variant="ghost"
                    onClick={() => assignInstructorAccount(acc.slug, null)}
                  >
                    Снять
                  </Btn>
                )}
                <Btn variant="primary" onClick={() => setModalFor(acc.slug)}>
                  {assigned ? "Изменить" : "Присвоить"}
                </Btn>
              </div>
            </div>
          );
        })}
      </div>

      <AssignModal
        instructorSlug={modalFor}
        assignments={assignments}
        onClose={() => setModalFor(null)}
      />
    </Panel>
  );
}

function AssignModal({
  instructorSlug,
  assignments,
  onClose,
}: {
  instructorSlug: string | null;
  assignments: Record<string, string>;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");

  const instructor = instructorSlug
    ? INSTRUCTOR_ACCOUNTS.find((a) => a.slug === instructorSlug)
    : null;

  const candidates = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all = listCandidateUsers();
    if (!q) return all;
    return all.filter(
      (c) =>
        c.nick.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q) ||
        (c.city ?? "").toLowerCase().includes(q),
    );
  }, [query]);

  // Reverse map: userSlug -> instructorSlug (для отметки «уже занят»).
  const takenBy = useMemo(() => {
    const m = new Map<string, string>();
    for (const [instr, user] of Object.entries(assignments)) {
      m.set(user, instr);
    }
    return m;
  }, [assignments]);

  const currentUserSlug = instructorSlug ? assignments[instructorSlug] : undefined;

  return (
    <Modal
      open={!!instructor}
      onClose={() => {
        setQuery("");
        onClose();
      }}
      title={instructor ? `Аккаунт для «${instructor.name}»` : ""}
      description="Выбери участника клуба, чей аккаунт будет управлять этим инструктором."
    >
      <div className="space-y-3">
        <TextInput
          autoFocus
          placeholder="Поиск по нику или городу…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="max-h-[50vh] overflow-y-auto overscroll-contain rounded-md border border-zinc-200 dark:border-zinc-800">
          {candidates.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-zinc-500">
              Ничего не найдено
            </div>
          )}
          {candidates.map((c) => {
            const taken = takenBy.get(c.slug);
            const isSelf = taken === instructorSlug;
            const isTaken = !!taken && !isSelf;
            const isCurrent = c.slug === currentUserSlug;
            return (
              <button
                key={c.slug}
                type="button"
                disabled={isTaken}
                onClick={() => {
                  if (!instructorSlug) return;
                  assignInstructorAccount(instructorSlug, c.slug);
                  setQuery("");
                  onClose();
                }}
                className={cn(
                  "flex w-full items-center justify-between gap-3 border-b border-zinc-100 px-3 py-2.5 text-left transition-colors last:border-b-0 dark:border-zinc-800",
                  isTaken
                    ? "cursor-not-allowed opacity-50"
                    : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50",
                  isCurrent && "bg-emerald-50 dark:bg-emerald-900/20",
                )}
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium">@{c.nick}</div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">
                    {c.city ?? "—"} · {c.slug}
                  </div>
                </div>
                {isCurrent && <Badge tone="emerald">выбран</Badge>}
                {isTaken && (
                  <Badge tone="zinc">
                    занят: {INSTRUCTOR_ACCOUNTS.find((a) => a.slug === taken)?.name ?? taken}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}

// ============= Economy =============

function EconomyPanel({ economy }: { economy: InstructorEconomy[] }) {
  const assignments = useAssignments();
  const candidates = useMemo(() => listCandidateUsers(), []);

  return (
    <Panel>
      <PanelHeader>
        <div className="text-sm font-medium">Экономика по инструкторам</div>
        <div className="text-xs text-zinc-500 dark:text-zinc-400">
          Комиссия платформы 20%. Выплаты — раз в неделю.
        </div>
      </PanelHeader>
      <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
        <table className="w-full min-w-max text-sm md:min-w-0">
          <thead className="bg-zinc-50 dark:bg-zinc-900/50">
            <tr className="text-left text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              <th className="whitespace-nowrap px-4 py-2.5 font-medium">Инструктор</th>
              <th className="whitespace-nowrap px-4 py-2.5 font-medium">Аккаунт</th>
              <th className="whitespace-nowrap px-4 py-2.5 font-medium text-right">Оплачено</th>
              <th className="whitespace-nowrap px-4 py-2.5 font-medium text-right">Ожидает</th>
              <th className="whitespace-nowrap px-4 py-2.5 font-medium text-right">Выручка</th>
              <th className="whitespace-nowrap px-4 py-2.5 font-medium text-right">К выплате</th>
              <th className="whitespace-nowrap px-4 py-2.5 font-medium text-right">Комиссия</th>
              <th className="whitespace-nowrap px-4 py-2.5 font-medium text-right">За 7 дней</th>
            </tr>
          </thead>
          <tbody>
            {economy.map((e) => {
              const acc = INSTRUCTOR_ACCOUNTS.find((a) => a.slug === e.slug);
              const userSlug = assignments[e.slug];
              const user = userSlug ? candidates.find((c) => c.slug === userSlug) : null;
              return (
                <tr
                  key={e.slug}
                  className="border-t border-zinc-100 hover:bg-zinc-50/50 dark:border-zinc-800 dark:hover:bg-zinc-800/30"
                >
                  <td className="whitespace-nowrap px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      {acc && (
                        <img
                          src={acc.photo}
                          alt=""
                          className="h-7 w-7 rounded-full object-cover"
                        />
                      )}
                      <div className="font-medium">{acc?.name ?? e.slug}</div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5">
                    {user ? (
                      <span className="text-xs">@{user.nick}</span>
                    ) : (
                      <span className="text-xs text-amber-600 dark:text-amber-400">
                        не присвоен
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums">
                    {e.paidCount}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums">
                    {e.pendingCount > 0 ? (
                      <span className="text-amber-600 dark:text-amber-400">
                        {e.pendingCount}
                      </span>
                    ) : (
                      <span className="text-zinc-400">0</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums">
                    {fmtMoney(e.gross)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums font-medium">
                    {fmtMoney(e.payout)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                    {fmtMoney(e.commission)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums">
                    {fmtMoney(e.payoutWeek)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

// ============= Helpers =============

function fmtMoney(n: number) {
  return `${n.toLocaleString("ru-RU")} ₽`;
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-[5px] px-3 py-1.5 text-sm font-medium transition-colors",
        active
          ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
          : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100",
      )}
    >
      {children}
    </button>
  );
}

function StatCard({
  label,
  value,
  tone = "zinc",
}: {
  label: string;
  value: string;
  tone?: "zinc" | "emerald" | "amber" | "blue";
}) {
  const toneCls = {
    zinc: "",
    emerald: "text-emerald-600 dark:text-emerald-400",
    amber: "text-amber-600 dark:text-amber-400",
    blue: "text-blue-600 dark:text-blue-400",
  }[tone];
  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="text-xs text-zinc-500 dark:text-zinc-400">{label}</div>
      <div className={cn("mt-0.5 text-xl font-semibold tabular-nums", toneCls)}>{value}</div>
    </div>
  );
}
