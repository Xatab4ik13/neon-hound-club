import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Gift, PlumpTicket, TrendingUp, Trophy, PlumpUsers as Users } from "@/components/ui/icons";
import {
  PageHeader,
  Panel,
  Btn,
  DataTable,
  PanelHeader,
  Field,
  TextInput,
  Modal,
} from "@/components/admin/ui";
import { AdminPager, type AdminPageSize } from "@/components/admin/AdminPager";
import {
  creditTickets,
  fetchAdminTicketsJournal,
  fetchAdminTicketsStats,
} from "@/lib/admin-queries";
import { ApiError } from "@/lib/api";
import { hhToast as toast } from "@/lib/hh-toast";

export const Route = createFileRoute("/admin/tickets")({
  component: TicketsPage,
});

const SOURCE_LABEL: Record<string, string> = {
  admin: "Админ",
  quest: "Квест",
  product_bonus: "Бонус за покупку",
  pass_monthly: "Hell Pass",
  raffle_entry: "Розыгрыш",
  refund: "Возврат",
};


function fmt(n: number): React.ReactNode {
  return {(n).toLocaleString("ru-RU")};
}

function TicketsPage() {
  const [giveOpen, setGiveOpen] = useState(false);

  return (
    <div>
      <PageHeader
        title="Билеты"
        description="Внутренняя валюта клуба. Выдаются через Pass, квесты и магазин."
        actions={
          <Btn variant="primary" onClick={() => setGiveOpen(true)}>
            <Gift className="h-4 w-4" /> Начислить / списать
          </Btn>
        }
      />
      <StatsBlock />
      <div className="mt-4">
        <JournalPanel />
      </div>
      <GiveModal open={giveOpen} onClose={() => setGiveOpen(false)} />
    </div>
  );
}

function StatsBlock() {
  const statsQ = useQuery({
    queryKey: ["admin", "tickets", "stats"],
    queryFn: fetchAdminTicketsStats,
    refetchInterval: 60_000,
  });
  const s = statsQ.data;

  const kpis: { label: string; value: React.ReactNode; hint: React.ReactNode; icon: React.ComponentType<{ className?: string }> }[] = [
    {
      label: "На руках сейчас",
      value: s ? fmt(s.totals.balance) : "—",
      hint: s ? <span>{fmt(s.totals.users)} держателей</span> : "",
      icon: PlumpTicket,
    },
    {
      label: "Выпущено всего",
      value: s ? fmt(s.totals.issued) : "—",
      hint: s ? <span>+{fmt(s.last30.issued30)} за 30 дней</span> : "",
      icon: TrendingUp,
    },
    {
      label: "Сожжено в розыгрышах",
      value: s ? fmt(s.totals.spentOnRaffles) : "—",
      hint: s ? <span>всего сожжено: {fmt(s.totals.spent)}</span> : "",
      icon: Trophy,
    },
    {
      label: "Операций",
      value: s ? fmt(s.totals.ops) : "—",
      hint: s ? <span>−{fmt(s.last30.spent30)} расход 30д</span> : "",
      icon: Users,
    },
  ];

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <div
            key={k.label}
            className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex items-start justify-between">
              <div className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                {k.label}
              </div>
              <k.icon className="h-4 w-4 text-zinc-400" />
            </div>
            <div className="mt-2 text-2xl font-bold tabular-nums">{k.value}</div>
            {k.hint && (
              <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{k.hint}</div>
            )}
          </div>
        ))}
      </div>

      {s && s.bySource.length > 0 && (
        <Panel>
          <PanelHeader>
            <div className="flex items-baseline justify-between gap-2">
              <div className="text-sm font-medium">Разбивка по источникам</div>
              <div className="text-xs text-zinc-500">
                Кто откуда получил и сколько из этого реально сжёг · оценка по FIFO
              </div>
            </div>
          </PanelHeader>
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {s.bySource
              .slice()
              .sort((a, b) => b.issued - a.issued)
              .map((r) => {
                const burnPct = r.issued > 0 ? Math.min(100, (r.burned / r.issued) * 100) : 0;
                return (
                  <div key={r.source} className="px-4 py-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <div className="text-sm font-medium">
                        {SOURCE_LABEL[r.source] ?? r.source}
                      </div>
                      <div className="flex gap-4 text-xs tabular-nums">
                        <span className="text-emerald-600 dark:text-emerald-400">
                          выпущено <b className="font-semibold">{fmt(r.issued)}</b>
                        </span>
                        <span className="text-rose-600 dark:text-rose-400">
                          сожжено <b className="font-semibold">{fmt(r.burned)}</b>
                        </span>
                        <span className="text-zinc-700 dark:text-zinc-300">
                          на руках <b className="font-semibold">{fmt(r.held)}</b>
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                      <div
                        className="h-full bg-rose-500/70"
                        style={{ width: `${burnPct}%` }}
                        title={`${burnPct.toFixed(0)}% сожжено`}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </Panel>
      )}
    </div>
  );
}

function JournalPanel() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<AdminPageSize>(50);

  const journalQ = useQuery({
    queryKey: ["admin", "tickets", "journal", page, pageSize],
    queryFn: () => fetchAdminTicketsJournal({ page, pageSize }),
    placeholderData: (prev) => prev,
  });

  const items = journalQ.data?.items ?? [];
  const total = journalQ.data?.total ?? 0;

  return (
    <Panel>
      <PanelHeader>
        <div className="text-sm font-medium">Журнал · {total}</div>
      </PanelHeader>
      <DataTable
        headers={["Дата", "Юзер", "Δ", "Источник", "Причина"]}
        rows={items.map((row) => [
          <span className="tabular-nums text-zinc-500 dark:text-zinc-400">
            {new Date(row.createdAt).toLocaleString("ru-RU", {
              day: "2-digit",
              month: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>,
          <span className="font-medium">@{row.nick ?? "—"}</span>,
          <span
            className={`tabular-nums font-semibold inline-flex items-center ${
              row.amount >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
            }`}
          >
            {row.amount > 0 ? "+" : row.amount < 0 ? "−" : ""}
            {(Math.abs(row.amount))}
          </span>,
          <span className="text-xs uppercase tracking-wider text-zinc-500">
            {SOURCE_LABEL[row.source] ?? row.source}
          </span>,
          <span className="text-sm">{row.reason}</span>,
        ])}
      />
      {journalQ.isLoading && (
        <div className="p-6 text-center text-sm text-zinc-500">Загрузка…</div>
      )}
      {!journalQ.isLoading && items.length === 0 && (
        <div className="p-6 text-center text-sm text-zinc-500">Журнал пуст</div>
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
  );
}

function GiveModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [nick, setNick] = useState("");
  const [amount, setAmount] = useState("10");
  const [reason, setReason] = useState("");

  const mut = useMutation({
    mutationFn: () =>
      creditTickets({
        nick: nick.trim(),
        amount: Number(amount),
        reason: reason.trim() || "Ручное начисление",
        source: "admin",
      }),
    onSuccess: (res) => {
      toast.success(`@${res.user.nick}: баланс ${res.balance}`);
      qc.invalidateQueries({ queryKey: ["admin", "tickets", "journal"] });
      qc.invalidateQueries({ queryKey: ["admin", "tickets", "stats"] });
      setNick("");
      setAmount("10");
      setReason("");
      onClose();
    },
    onError: (e) => {
      if (e instanceof ApiError) {
        toast.error(e.message || "Не получилось");
      } else {
        toast.error("Не получилось");
      }
    },
  });

  const disabled = !nick.trim() || !Number.isFinite(Number(amount)) || Number(amount) === 0;

  return (
    <Modal open={open} onClose={onClose} title="Начислить / списать билеты">
      <div className="space-y-3">
        <Field label="Ник юзера">
          <TextInput value={nick} onChange={(e) => setNick(e.target.value)} placeholder="captain_volk" />
        </Field>
        <Field label="Количество (отрицательное = списать)">
          <TextInput value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="numeric" />
        </Field>
        <Field label="Причина">
          <TextInput value={reason} onChange={(e) => setReason(e.target.value)} placeholder="За активность на канале" />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Btn onClick={onClose}>Отмена</Btn>
          <Btn variant="primary" disabled={disabled || mut.isPending} onClick={() => mut.mutate()}>
            {mut.isPending ? "…" : "Применить"}
          </Btn>
        </div>
      </div>
    </Modal>
  );
}
