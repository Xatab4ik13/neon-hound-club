import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Gift } from "lucide-react";
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
import { adminQk, creditTickets, fetchAdminTicketsJournal } from "@/lib/admin-queries";
import { ApiError } from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/tickets")({
  component: TicketsPage,
});

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
      <JournalPanel />
      <GiveModal open={giveOpen} onClose={() => setGiveOpen(false)} />
    </div>
  );
}

const SOURCE_LABEL: Record<string, string> = {
  admin: "Админ",
  quest: "Квест",
  product_bonus: "Бонус",
  pass_monthly: "Pass",
  raffle_entry: "Розыгрыш",
  refund: "Возврат",
};

function JournalPanel() {
  const journalQ = useQuery({
    queryKey: ["admin", "tickets", "journal", 100],
    queryFn: () => fetchAdminTicketsJournal(100),
  });

  const items = journalQ.data?.items ?? [];

  return (
    <Panel>
      <PanelHeader>
        <div className="text-sm font-medium">Журнал · {items.length}</div>
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
            className={`tabular-nums font-semibold ${
              row.amount >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
            }`}
          >
            {row.amount > 0 ? "+" : ""}
            {row.amount}
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
      qc.invalidateQueries({ queryKey: ["admin", "tickets", "journal", 100] });
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
