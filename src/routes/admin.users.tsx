import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
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

// Детерминированные мок-поля (телефон, ФИО, дата, потрачено)
// до подключения БД. Считаем 1 раз по slug.
type UserMeta = {
  fio: string;
  phone: string;
  registeredAt: string;
  spent: number;
  pass: PassTier;
};

const FIO_FIRST = ["Алексей", "Иван", "Дмитрий", "Сергей", "Павел", "Артём", "Михаил", "Никита", "Роман", "Анна", "Мария", "Олег"];
const FIO_LAST = ["Иванов", "Петров", "Сидоров", "Кузнецов", "Смирнов", "Соколов", "Попов", "Лебедев", "Козлов", "Новиков"];
const TIERS: PassTier[] = ["Silver", "Gold", "Platinum", "—"];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function metaFor(u: PublicUser): UserMeta {
  const h = hash(u.slug);
  const first = FIO_FIRST[h % FIO_FIRST.length];
  const last = FIO_LAST[(h >> 3) % FIO_LAST.length];
  const phone =
    "+7 (" +
    String(900 + (h % 99)).padStart(3, "0") +
    ") " +
    String(100 + ((h >> 5) % 900)).padStart(3, "0") +
    "-" +
    String((h >> 11) % 100).padStart(2, "0") +
    "-" +
    String((h >> 17) % 100).padStart(2, "0");
  const day = (h % 28) + 1;
  const month = ((h >> 4) % 12) + 1;
  const year = 2024 + ((h >> 8) % 3);
  const registeredAt = `${String(day).padStart(2, "0")}.${String(month).padStart(2, "0")}.${year}`;
  const spent = ((h % 90) + 1) * 490 + ((h >> 7) % 30) * 100;
  const pass = TIERS[h % TIERS.length];
  return { fio: `${last} ${first}`, phone, registeredAt, spent, pass };
}

function passTone(t: PassTier) {
  if (t === "Silver") return "zinc" as const;
  if (t === "Gold") return "amber" as const;
  if (t === "Platinum") return "violet" as const;
  return "zinc" as const;
}

function UsersPage() {
  const users = useMemo(() => Object.values(PUBLIC_USERS), []);
  const metas = useMemo(() => {
    const m = new Map<string, UserMeta>();
    users.forEach((u) => m.set(u.slug, metaFor(u)));
    return m;
  }, [users]);

  const [selected, setSelected] = useState<PublicUser | null>(null);
  const [confirmBan, setConfirmBan] = useState(false);
  const [giftOpen, setGiftOpen] = useState(false);
  const [passOpen, setPassOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return users;
    return users.filter((u) => {
      const m = metas.get(u.slug)!;
      return (
        u.nick.toLowerCase().includes(q) ||
        m.fio.toLowerCase().includes(q) ||
        m.phone.includes(q)
      );
    });
  }, [users, metas, query]);

  return (
    <div>
      <PageHeader title="Пользователи" description={`Всего: ${users.length}`} />

      <div className="mb-3 flex gap-2">
        <TextInput
          placeholder="Поиск по нику, ФИО, телефону…"
          className="max-w-md"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Btn>Фильтры</Btn>
      </div>

      <Panel>
        <DataTable
          headers={["Ник", "ФИО", "Телефон", "Ранг", "Pass", "Регистрация", ""]}
          rows={filtered.map((u) => {
            const rank = RANKS.find((r) => r.id === u.rank);
            const m = metas.get(u.slug)!;
            return [
              <span className="font-medium">@{u.nick}</span>,
              <span>{m.fio}</span>,
              <span className="tabular-nums text-zinc-600 dark:text-zinc-300">{m.phone}</span>,
              <Badge tone={u.rank === "vip" ? "violet" : u.rank === "hell-legend" ? "rose" : "zinc"}>
                {rank?.label ?? u.rank}
              </Badge>,
              <Badge tone={passTone(m.pass)}>{m.pass}</Badge>,
              <span className="tabular-nums text-zinc-500 dark:text-zinc-400">{m.registeredAt}</span>,
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
        {selected && (
          <UserCard
            user={selected}
            meta={metas.get(selected.slug)!}
            onGift={() => setGiftOpen(true)}
            onGivePass={() => setPassOpen(true)}
          />
        )}
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
  meta,
  onGift,
  onGivePass,
}: {
  user: PublicUser;
  meta: UserMeta;
  onGift: () => void;
  onGivePass: () => void;
}) {
  const [rank, setRank] = useState(user.rank);
  const [tier, setTier] = useState<PassTier>(meta.pass);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-200 text-xl font-bold dark:bg-zinc-800">
          {user.nick[0].toUpperCase()}
        </div>
        <div>
          <div className="text-lg font-semibold">@{user.nick}</div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400">{meta.fio}</div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400">
            {user.city ?? "—"} • {user.bike ?? "—"}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <InfoRow label="Телефон" value={meta.phone} />
        <InfoRow label="Регистрация" value={meta.registeredAt} />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Metric label="Билеты" value="124" />
        <Metric label="XP" value={`${user.xpPct}%`} />
        <Metric label="Заказов" value="7" />
      </div>

      <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 dark:border-emerald-900/40 dark:bg-emerald-900/20">
        <div className="text-[10px] uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
          Внесено всего
        </div>
        <div className="text-xl font-bold text-emerald-700 dark:text-emerald-300">
          {meta.spent.toLocaleString("ru-RU")} ₽
        </div>
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
            <span className="text-zinc-500">{meta.registeredAt}</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900/50">
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="text-sm font-medium tabular-nums">{value}</div>
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
