import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Gift, Trash2, Receipt } from "@/components/ui/icons";
import {
  PageHeader,
  Panel,
  PanelHeader,
  Btn,
  DataTable,
  Field,
  TextInput,
  Modal,
  Badge,
  ConfirmModal,
  Select,
} from "@/components/admin/ui";
import { fetchAdminShopProducts } from "@/lib/admin-queries";
import {
  adminCreatePromoCode,
  adminDeletePromoCode,
  adminListPromoCodes,
  adminPromoStats,
  adminPromoUsage,
  adminUpdatePromoCode,
  promoQk,
  type AdminPromoCodeDto,
} from "@/lib/promo-api";

import { ApiError } from "@/lib/api";
import { hhToast as toast } from "@/lib/hh-toast";

export const Route = createFileRoute("/admin/promo")({
  component: PromoAdminPage,
});

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("ru-RU");
}

function statusBadge(p: AdminPromoCodeDto) {
  if (p.usedAt) return <Badge tone="zinc">Использован</Badge>;
  if (!p.active) return <Badge tone="zinc">Выключен</Badge>;
  if (p.expired) return <Badge tone="rose">Истёк</Badge>;
  return <Badge tone="emerald">Активен</Badge>;
}

const FILTERS = [
  { key: "all", label: "Все" },
  { key: "used", label: "Активированные" },
  { key: "active", label: "Активные" },
  { key: "expired", label: "Истёкшие / выключенные" },
] as const;
type FilterKey = (typeof FILTERS)[number]["key"];

function rub(n: number) {
  return `${n.toLocaleString("ru-RU")} ₽`;
}

function PromoAdminPage() {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [toDelete, setToDelete] = useState<AdminPromoCodeDto | null>(null);
  const [usageOf, setUsageOf] = useState<AdminPromoCodeDto | null>(null);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [q, setQ] = useState("");

  const listQ = useQuery({
    queryKey: promoQk.admin(),
    queryFn: () => adminListPromoCodes(),
  });

  const statsQ = useQuery({ queryKey: promoQk.adminStats, queryFn: adminPromoStats });

  const items = useMemo(() => {
    const all = listQ.data?.items ?? [];
    const needle = q.trim().toLowerCase();
    return all.filter((p) => {
      if (filter === "used" && !p.usedAt) return false;
      if (filter === "active" && (p.usedAt || !p.active || p.expired)) return false;
      if (filter === "expired" && (p.usedAt || (p.active && !p.expired))) return false;
      if (!needle) return true;
      return (
        p.code.toLowerCase().includes(needle) ||
        (p.userNick ?? "").toLowerCase().includes(needle) ||
        (p.userEmail ?? "").toLowerCase().includes(needle)
      );
    });
  }, [listQ.data, q, filter]);

  const toggleMut = useMutation({
    mutationFn: (p: AdminPromoCodeDto) => adminUpdatePromoCode(p.id, { active: !p.active }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "promo"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Не удалось обновить"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => adminDeletePromoCode(id),
    onSuccess: () => {
      toast.success("Промокод удалён");
      void qc.invalidateQueries({ queryKey: ["admin", "promo"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Не удалось удалить"),
  });

  const s = statsQ.data;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Промокоды"
        description="Скидка в процентах. Товарный промокод даёт скидку только на 1 шт. выбранного товара — билеты за такой заказ не начисляются. Доставка не скидывается никогда."
        actions={
          <Btn variant="primary" onClick={() => setCreateOpen(true)}>
            <Gift className="h-4 w-4" /> Создать промокод
          </Btn>
        }
      />

      {/* Экономика активаций */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Активировано" value={s ? String(s.usedTotal) : "—"} hint={s ? `не использовано: ${s.unusedTotal}` : ""} />
        <StatCard
          label="Докупили что-то ещё"
          value={s ? `${s.withExtras} / ${s.withOrder}` : "—"}
          hint={s ? `${s.extrasSharePct}% заказов с доп. товаром` : ""}
        />
        <StatCard
          label="Доп. товары"
          value={s ? rub(s.extraRub) : "—"}
          hint={s ? `в среднем ${rub(s.avgExtraRub)} на заказ` : ""}
        />
        <StatCard
          label="Выручка по промо"
          value={s ? rub(s.revenueRub) : "—"}
          hint={s ? `доставка ${rub(s.shippingRub)} · скидки ${rub(s.discountRub)}` : ""}
        />
      </div>

      <Panel>
        <PanelHeader>
          <div className="flex w-full flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFilter(f.key)}
                  className={
                    filter === f.key
                      ? "rounded-md bg-zinc-900 px-2.5 py-1 text-xs font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : "rounded-md px-2.5 py-1 text-xs font-medium text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                  }
                >
                  {f.label}
                </button>
              ))}
              <span className="ml-1 text-xs text-zinc-500 dark:text-zinc-400">{items.length}</span>
            </div>
            <TextInput
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Поиск: код, ник, email"
              className="max-w-[240px]"
            />
          </div>
        </PanelHeader>
        <DataTable
          headers={["Код", "Скидка", "Товар", "Владелец", "Срок", "Статус", "Создан", ""]}
          rows={items.map((p) => [
            <span key="c" className="font-mono font-semibold uppercase">
              {p.code}
            </span>,
            `${p.discountPct}%`,
            p.productId ? (
              <span key="p" className="text-emerald-400">
                {p.productTitle ?? "товар"}
              </span>
            ) : (
              "вся корзина"
            ),
            p.userNick ? `@${p.userNick}` : "любой",
            fmtDate(p.expiresAt),
            statusBadge(p),
            fmtDate(p.createdAt),
            <div key="a" className="flex justify-end gap-2">
              {p.usedAt && (
                <Btn onClick={() => setUsageOf(p)}>
                  <Receipt className="h-4 w-4" /> Что купил
                </Btn>
              )}
              <Btn onClick={() => toggleMut.mutate(p)} disabled={!!p.usedAt}>
                {p.active ? "Выключить" : "Включить"}
              </Btn>
              <Btn variant="danger" onClick={() => setToDelete(p)}>
                <Trash2 className="h-4 w-4" />
              </Btn>
            </div>,
          ])}
        />
      </Panel>

      {usageOf && <UsageModal promo={usageOf} onClose={() => setUsageOf(null)} />}


      {createOpen && <CreatePromoModal onClose={() => setCreateOpen(false)} />}

      <ConfirmModal
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={() => {
          if (toDelete) deleteMut.mutate(toDelete.id);
          setToDelete(null);
        }}
        title="Удалить промокод?"
        message={toDelete ? `${toDelete.code} перестанет работать. Действие необратимо.` : ""}
        confirmLabel="Удалить"
      />
    </div>
  );
}

function CreatePromoModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [code, setCode] = useState("");
  const [pct, setPct] = useState("10");
  const [expires, setExpires] = useState("");
  const [note, setNote] = useState("");
  const [productId, setProductId] = useState("");

  const productsQ = useQuery({
    queryKey: ["admin", "shop", "products", "promo-picker"],
    queryFn: fetchAdminShopProducts,
  });

  const mut = useMutation({
    mutationFn: () =>
      adminCreatePromoCode({
        code: code.trim() ? code.trim().toUpperCase() : undefined,
        discountPct: Number(pct),
        productId: productId || null,
        note: note.trim() || undefined,
        expiresAt: expires ? new Date(`${expires}T23:59:59`).toISOString() : null,
      }),
    onSuccess: (res) => {
      toast.success(`Промокод ${res.promo.code} создан`);
      void qc.invalidateQueries({ queryKey: ["admin", "promo"] });
      onClose();
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Не удалось создать"),
  });

  const pctNum = Number(pct);
  const valid = Number.isFinite(pctNum) && pctNum >= 1 && pctNum <= 100;

  return (
    <Modal open onClose={onClose} title="Создать промокод">
      <div className="space-y-3">
        <Field label="Код" hint="Пусто — сгенерируем случайный">
          <TextInput
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="HELL10"
            className="font-mono uppercase"
          />
        </Field>
        <Field label="Скидка, %">
          <TextInput
            type="number"
            min={1}
            max={100}
            value={pct}
            onChange={(e) => setPct(e.target.value)}
          />
        </Field>
        <Field
          label="Товар"
          hint="Пусто — скидка на всю корзину. Выбран товар — купон сработает только если в корзине ровно 1 шт. этого товара, и билеты за заказ не начислятся."
        >
          <Select value={productId} onChange={(e) => setProductId(e.target.value)}>
            <option value="">Вся корзина (обычный промокод)</option>
            {(productsQ.data?.items ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.title} · {p.priceRub} ₽
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Действует до" hint="Пусто — без срока">
          <TextInput type="date" value={expires} onChange={(e) => setExpires(e.target.value)} />
        </Field>
        <Field label="Заметка">
          <TextInput value={note} onChange={(e) => setNote(e.target.value)} placeholder="Акция" />
        </Field>
        <div className="flex justify-end gap-2 pt-1">
          <Btn onClick={onClose}>Отмена</Btn>
          <Btn variant="primary" disabled={!valid || mut.isPending} onClick={() => mut.mutate()}>
            {mut.isPending ? "…" : "Создать"}
          </Btn>
        </div>
      </div>
    </Modal>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        {label}
      </div>
      <div className="mt-1 font-mono text-xl font-bold tabular-nums">{value}</div>
      {hint && <div className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">{hint}</div>}
    </div>
  );
}

const ORDER_STATUS_LABEL: Record<string, string> = {
  pending_payment: "Ждёт оплаты",
  paid: "Оплачен",
  awaiting_stock: "Ждёт поступления",
  ready_to_ship: "Готов к отгрузке",
  waybill_created: "Накладная создана",
  shipped: "Отправлен",
  delivered: "Доставлен",
  cancelled: "Отменён",
  refunded: "Возврат",
};

/** Как активировали промокод: заказ, корзина, доставка, что докупили сверху. */
function UsageModal({ promo, onClose }: { promo: AdminPromoCodeDto; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: promoQk.adminUsage(promo.id),
    queryFn: () => adminPromoUsage(promo.id),
  });
  const o = data?.order ?? null;

  return (
    <Modal open onClose={onClose} title={`Активация ${promo.code}`}>
      {isLoading ? (
        <div className="py-8 text-center text-sm text-zinc-500">Загрузка…</div>
      ) : !o ? (
        <div className="py-8 text-center text-sm text-zinc-500">
          Заказ не найден — промокод помечен использованным без привязки к заказу.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge tone="emerald">{ORDER_STATUS_LABEL[o.status] ?? o.status}</Badge>
            <span className="font-medium">{o.nick ? `@${o.nick}` : "—"}</span>
            <span className="text-zinc-500">{o.email ?? ""}</span>
            <span className="text-zinc-500">{o.city ?? ""}</span>
            <span className="ml-auto text-xs text-zinc-500">
              {new Date(o.createdAt).toLocaleString("ru-RU")}
            </span>
          </div>

          <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
            {o.items.map((i) => (
              <div
                key={i.id}
                className="flex items-center gap-2 border-b border-zinc-100 px-3 py-2 text-sm last:border-0 dark:border-zinc-800"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{i.title}</div>
                  <div className="text-[11px] text-zinc-500">
                    {i.size ? `размер ${i.size} · ` : ""}
                    {i.qty} шт. × {rub(i.priceRub)}
                  </div>
                </div>
                {i.isPromoTarget ? (
                  <Badge tone="emerald">по промокоду</Badge>
                ) : (
                  <Badge tone="zinc">докупил</Badge>
                )}
                <span className="w-24 text-right font-mono tabular-nums">
                  {rub(i.priceRub * i.qty)}
                </span>
              </div>
            ))}
          </div>

          <div className="space-y-1.5 text-sm">
            <Row label="Товары" value={rub(o.subtotalRub)} />
            <Row label={`Скидка по промокоду (${o.discountPct}%)`} value={`−${rub(o.discountRub)}`} />
            <Row label="Доставка СДЭК" value={rub(o.shippingPriceRub)} />
            <Row label="Докупил сверх акционного товара" value={rub(o.extraRub)} strong />
            <Row label="Итого оплачено" value={rub(o.totalRub)} strong />
            <Row label="Билеты за заказ" value={String(o.bonusTicketsTotal)} />
          </div>
        </div>
      )}
    </Modal>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-zinc-500 dark:text-zinc-400">{label}</span>
      <span className={strong ? "font-mono font-bold tabular-nums" : "font-mono tabular-nums"}>
        {value}
      </span>
    </div>
  );
}
