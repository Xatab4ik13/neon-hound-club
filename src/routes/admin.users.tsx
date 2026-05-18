import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Ban, Gift, Crown, Save } from "lucide-react";
import {
  PageHeader,
  Panel,
  DataTable,
  Badge,
  Btn,
  TextInput,
  Drawer,
  Field,
  Select,
  ConfirmModal,
  Modal,
} from "@/components/admin/ui";
import { PUBLIC_USERS, type PublicUser } from "@/data/users";
import { RANKS } from "@/data/ranks";

export const Route = createFileRoute("/admin/users")({
  component: UsersPage,
});

type PassTier = "Silver" | "Gold" | "Platinum" | "—";

function UsersPage() {
  const users = Object.values(PUBLIC_USERS);
  const [selected, setSelected] = useState<PublicUser | null>(null);
  const [confirmBan, setConfirmBan] = useState(false);
  const [giftOpen, setGiftOpen] = useState(false);
  const [passOpen, setPassOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = users.filter((u) =>
    u.nick.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div>
      <PageHeader title="Пользователи" description={`Всего: ${users.length}`} />

      <div className="mb-3 flex gap-2">
        <TextInput
          placeholder="Поиск по нику, email, телефону…"
          className="max-w-md"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Btn>Фильтры</Btn>
      </div>

      <Panel>
        <DataTable
          headers={["Ник", "Город", "Мото", "Ранг", "Pass", "XP", ""]}
          rows={filtered.map((u) => {
            const rank = RANKS.find((r) => r.id === u.rank);
            return [
              <span className="font-medium">{u.nick}</span>,
              u.city ?? "—",
              <span className="text-zinc-500 dark:text-zinc-400">{u.bike ?? "—"}</span>,
              <Badge tone={u.rank === "vip" ? "violet" : u.rank === "hell-legend" ? "rose" : "zinc"}>
                {rank?.label ?? u.rank}
              </Badge>,
              <Badge tone="blue">Silver</Badge>,
              `${u.xpPct}%`,
              <Btn variant="ghost" onClick={() => setSelected(u)}>
                Открыть
              </Btn>,
            ];
          })}
        />
      </Panel>

      <Drawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `@${selected.nick}` : ""}
        footer={
          <>
            <Btn variant="danger" onClick={() => setConfirmBan(true)}>
              <Ban className="h-4 w-4" /> Забанить
            </Btn>
            <Btn variant="primary">
              <Save className="h-4 w-4" /> Сохранить
            </Btn>
          </>
        }
      >
        {selected && <UserCard user={selected} onGift={() => setGiftOpen(true)} onGivePass={() => setPassOpen(true)} />}
      </Drawer>

      <ConfirmModal
        open={confirmBan}
        onClose={() => setConfirmBan(false)}
        onConfirm={() => setSelected(null)}
        title="Забанить пользователя?"
        message={`@${selected?.nick} потеряет доступ к клубу. Можно разбанить позже.`}
        confirmLabel="Забанить"
      />

      {selected && (
        <GiftTicketsModal
          open={giftOpen}
          nick={selected.nick}
          onClose={() => setGiftOpen(false)}
        />
      )}

      {selected && (
        <GivePassModal
          open={passOpen}
          nick={selected.nick}
          onClose={() => setPassOpen(false)}
        />
      )}
    </div>
  );
}

function UserCard({
  user,
  onGift,
  onGivePass,
}: {
  user: PublicUser;
  onGift: () => void;
  onGivePass: () => void;
}) {
  const [rank, setRank] = useState(user.rank);
  const [tier, setTier] = useState<PassTier>("Silver");

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-200 text-xl font-bold dark:bg-zinc-800">
          {user.nick[0].toUpperCase()}
        </div>
        <div>
          <div className="text-lg font-semibold">@{user.nick}</div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400">
            {user.city ?? "—"} • {user.bike ?? "—"}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Metric label="Билеты" value="124" />
        <Metric label="XP" value={`${user.xpPct}%`} />
        <Metric label="Заказов" value="7" />
      </div>

      <Field label="Ранг">
        <Select value={rank} onChange={(e) => setRank(e.target.value as typeof rank)}>
          {RANKS.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Hell Pass">
        <Select value={tier} onChange={(e) => setTier(e.target.value as PassTier)}>
          <option>—</option>
          <option>Silver</option>
          <option>Gold</option>
          <option>Platinum</option>
        </Select>
      </Field>

      <div>
        <div className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Действия
        </div>
        <div className="flex gap-2">
          <Btn onClick={onGift}>
            <Gift className="h-4 w-4" /> Подарить билеты
          </Btn>
          <Btn onClick={onGivePass}>
            <Crown className="h-4 w-4" /> Дать Pass
          </Btn>
        </div>
      </div>

      <div>
        <div className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          История (последние 5)
        </div>
        <ul className="space-y-1.5 text-sm">
          <li className="flex justify-between">
            <span>Покупка пакета 50 🎟</span>
            <span className="text-zinc-500">18.05</span>
          </li>
          <li className="flex justify-between">
            <span>Розыгрыш «Шлем AGV»</span>
            <span className="text-zinc-500">17.05</span>
          </li>
          <li className="flex justify-between">
            <span>Заказ #1037</span>
            <span className="text-zinc-500">15.05</span>
          </li>
          <li className="flex justify-between">
            <span>Продление Gold</span>
            <span className="text-zinc-500">10.05</span>
          </li>
          <li className="flex justify-between">
            <span>Регистрация</span>
            <span className="text-zinc-500">03.04</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900/50">
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="text-base font-semibold">{value}</div>
    </div>
  );
}

function GiftTicketsModal({
  open,
  nick,
  onClose,
}: {
  open: boolean;
  nick: string;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState(10);
  const [reason, setReason] = useState("");
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Подарить билеты @${nick}`}
      size="sm"
      footer={
        <>
          <Btn onClick={onClose}>Отмена</Btn>
          <Btn variant="primary" onClick={onClose}>
            <Gift className="h-4 w-4" /> Выдать
          </Btn>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Количество билетов">
          <TextInput type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
        </Field>
        <Field label="Причина (в журнал)">
          <TextInput value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Победа в конкурсе" />
        </Field>
      </div>
    </Modal>
  );
}

function GivePassModal({
  open,
  nick,
  onClose,
}: {
  open: boolean;
  nick: string;
  onClose: () => void;
}) {
  const [tier, setTier] = useState<"Silver" | "Gold" | "Platinum">("Silver");
  const [months, setMonths] = useState(1);
  const [reason, setReason] = useState("");
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Дать Pass @${nick}`}
      size="sm"
      footer={
        <>
          <Btn onClick={onClose}>Отмена</Btn>
          <Btn variant="primary" onClick={onClose}>
            <Crown className="h-4 w-4" /> Выдать
          </Btn>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Уровень Pass">
          <Select value={tier} onChange={(e) => setTier(e.target.value as typeof tier)}>
            <option value="Silver">Silver — 490 ₽/мес</option>
            <option value="Gold">Gold — 1290 ₽/мес</option>
            <option value="Platinum">Platinum — 2990 ₽/мес</option>
          </Select>
        </Field>
        <Field label="Срок (месяцев)">
          <Select value={String(months)} onChange={(e) => setMonths(Number(e.target.value))}>
            <option value="1">1 месяц (по умолчанию)</option>
            <option value="3">3 месяца</option>
            <option value="6">6 месяцев</option>
            <option value="12">12 месяцев</option>
          </Select>
        </Field>
        <Field label="Причина (в журнал)">
          <TextInput value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Подарок партнёру" />
        </Field>
      </div>
    </Modal>
  );
}
