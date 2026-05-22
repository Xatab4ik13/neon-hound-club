import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Gift, ChevronLeft, ChevronRight, Search } from "lucide-react";
import {
  PageHeader,
  Panel,
  Btn,
  DataTable,
  PanelHeader,
  Field,
  TextInput,
  Modal,
  ConfirmModal,
} from "@/components/admin/ui";
import { PUBLIC_USERS } from "@/data/users";

export const Route = createFileRoute("/admin/tickets")({
  component: TicketsPage,
});

// большой журнал для проверки пагинации
const LOG = Array.from({ length: 87 }).map((_, i) => {
  const users = Object.values(PUBLIC_USERS);
  const u = users[i % users.length];
  const delta = i % 3 === 0 ? "−20" : i % 2 === 0 ? "+50" : "+10";
  const reasons = [
    "Покупка пакета",
    "Розыгрыш «Шлем AGV»",
    "Кешбэк за заказ",
    "Подарок: Hell Pass",
    "Розыгрыш «Худи Founder»",
  ];
  const day = ((i % 28) + 1).toString().padStart(2, "0");
  return { id: i + 1, date: `${day}.05`, user: u?.nick ?? "guest", delta, reason: reasons[i % reasons.length] };
});

function TicketsPage() {
  const [bulkOpen, setBulkOpen] = useState(false);

  return (
    <div>
      <PageHeader
        title="Билеты"
        description="Внутренняя валюта клуба. Выдаются через челленджи, Pass и магазин."
        actions={
          <Btn variant="primary" onClick={() => setBulkOpen(true)}>
            <Gift className="h-4 w-4" /> Массовая выдача
          </Btn>
        }
      />

      <JournalPanel />

      <BulkGiveModal open={bulkOpen} onClose={() => setBulkOpen(false)} />
    </div>
  );
}

function JournalPanel() {
  const [page, setPage] = useState(1);
  const perPage = 20;
  const pages = Math.ceil(LOG.length / perPage);
  const slice = LOG.slice((page - 1) * perPage, page * perPage);
  return (
    <Panel>
      <PanelHeader>
        <h3 className="text-sm font-semibold">Журнал операций</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            Всего: {LOG.length}
          </span>
          <Btn>Экспорт CSV</Btn>
        </div>
      </PanelHeader>
      <DataTable
        headers={["Дата", "Пользователь", "Изменение", "Причина"]}
        rows={slice.map((l) => [
          l.date,
          <span className="font-medium">{l.user}</span>,
          <span
            className={
              l.delta.startsWith("+")
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-600 dark:text-rose-400"
            }
          >
            {l.delta} 🎟
          </span>,
          <span className="text-zinc-500 dark:text-zinc-400">{l.reason}</span>,
        ])}
      />
      <div className="flex items-center justify-between border-t border-zinc-200 px-4 py-2.5 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
        <span>
          Стр. {page} из {pages} · показано {slice.length} из {LOG.length}
        </span>
        <div className="flex gap-1">
          <Btn variant="ghost" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
            <ChevronLeft className="h-3.5 w-3.5" /> Назад
          </Btn>
          <Btn variant="ghost" onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages}>
            Вперёд <ChevronRight className="h-3.5 w-3.5" />
          </Btn>
        </div>
      </div>
    </Panel>
  );
}

function BulkGiveModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const users = useMemo(() => Object.values(PUBLIC_USERS), []);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [amount, setAmount] = useState(10);
  const [reason, setReason] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const filtered = users.filter((u) => u.nick.toLowerCase().includes(q.toLowerCase()));
  const allFilteredSelected = filtered.length > 0 && filtered.every((u) => selected.has(u.nick));

  const toggle = (nick: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(nick)) next.delete(nick);
      else next.add(nick);
      return next;
    });

  const toggleAll = () =>
    setSelected((s) => {
      const next = new Set(s);
      if (allFilteredSelected) filtered.forEach((u) => next.delete(u.nick));
      else filtered.forEach((u) => next.add(u.nick));
      return next;
    });

  const recipientsLine = Array.from(selected).join(", ");

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="Массовая выдача билетов"
        size="xl"
        footer={
          <>
            <Btn onClick={onClose}>Отмена</Btn>
            <Btn
              variant="primary"
              disabled={selected.size === 0 || amount <= 0}
              onClick={() => setConfirmOpen(true)}
            >
              <Gift className="h-4 w-4" /> Выдать ({selected.size})
            </Btn>
          </>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <div className="mb-2 text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Выберите пользователей ({selected.size} выбрано)
            </div>
            <div className="relative mb-2">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
              <TextInput
                className="pl-7"
                placeholder="Поиск по нику…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <label className="mb-2 flex items-center gap-2 text-xs">
              <input type="checkbox" checked={allFilteredSelected} onChange={toggleAll} />
              Выбрать всех в списке ({filtered.length})
            </label>
            <div className="max-h-72 overflow-y-auto rounded-md border border-zinc-200 dark:border-zinc-800">
              {filtered.map((u) => (
                <label
                  key={u.nick}
                  className="flex cursor-pointer items-center gap-2 border-b border-zinc-100 px-3 py-2 text-sm last:border-0 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/50"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(u.nick)}
                    onChange={() => toggle(u.nick)}
                  />
                  <span className="font-medium">@{u.nick}</span>
                  <span className="text-xs text-zinc-500">{u.city ?? "—"}</span>
                </label>
              ))}
              {filtered.length === 0 && (
                <div className="px-3 py-6 text-center text-xs text-zinc-500">Не найдено</div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <Field label="Получатели (через запятую)" hint="Можно отредактировать вручную">
              <TextInput
                value={recipientsLine}
                onChange={(e) =>
                  setSelected(
                    new Set(
                      e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    ),
                  )
                }
                placeholder="ASPHALT_DOG, vasya_pit, …"
              />
            </Field>
            <Field label="Количество билетов">
              <TextInput
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
              />
            </Field>
            <Field label="Причина (для журнала)">
              <TextInput
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Конкурс в Telegram"
              />
            </Field>
            <div className="rounded-md bg-zinc-100 p-3 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              Будет начислено <b>{amount * selected.size}</b> билетов:
              <br />
              {selected.size} получателей × {amount} 🎟
            </div>
          </div>
        </div>
      </Modal>
      <ConfirmModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          onClose();
        }}
        title="Подтвердить выдачу?"
        message={`Будет начислено ${amount * selected.size} билетов (${selected.size} × ${amount}). Отменить можно только вручную через журнал.`}
        confirmLabel="Выдать"
        danger={false}
      />
    </>
  );
}
