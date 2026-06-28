// Админка заказов: список с фильтром по статусу + детальный просмотр в правой панели.
// Реальные данные с бэка: GET /api/v1/admin/shop/orders, /:id, PATCH /:id.

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, PlumpPackage as Package, Phone, PlumpMap as MapPin, User as UserIcon, RefreshCw, PlumpClose as X } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { ApiError } from "@/lib/api";
import { AdminPager, type AdminPageSize } from "@/components/admin/AdminPager";
import {
  fetchAdminOrders,
  fetchAdminOrder,
  patchAdminOrder,
  qk,
  type ShopOrder,
  type ShopOrderStatus,
} from "@/lib/queries";

export const Route = createFileRoute("/admin/orders")({
  head: () => ({
    meta: [{ title: "Заказы — Админ" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: AdminOrdersPage,
});

const STATUS_LABEL: Record<ShopOrderStatus, string> = {
  pending_payment: "Ждёт оплаты",
  paid: "Оплачен",
  shipped: "Отправлен",
  delivered: "Получен",
  cancelled: "Отменён",
  refunded: "Возврат",
};

const STATUS_TONE: Record<ShopOrderStatus, string> = {
  pending_payment: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  paid: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  shipped: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  delivered: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  cancelled: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  refunded: "bg-zinc-500/15 text-zinc-700 dark:text-zinc-300",
};

const FILTERS: { key: ShopOrderStatus | "all"; label: string }[] = [
  { key: "all", label: "Все" },
  { key: "pending_payment", label: "Ждут оплаты" },
  { key: "paid", label: "Оплачены" },
  { key: "shipped", label: "Отправлены" },
  { key: "delivered", label: "Получены" },
  { key: "cancelled", label: "Отменены" },
  { key: "refunded", label: "Возвраты" },
];

function fmtMoney(n: number) {
  return new Intl.NumberFormat("ru-RU").format(n) + " ₽";
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function AdminOrdersPage() {
  const [filter, setFilter] = useState<ShopOrderStatus | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<AdminPageSize>(50);

  const status = filter === "all" ? undefined : filter;
  const list = useQuery({
    queryKey: [...qk.adminOrders(status), page, pageSize],
    queryFn: () => fetchAdminOrders(status, { page, pageSize }),
    refetchInterval: 30_000,
    placeholderData: (prev) => prev,
  });

  return (
    <div className="flex h-full w-full flex-col">
      <header className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
        <div>
          <h1 className="text-xl font-semibold">Заказы</h1>
          <p className="text-xs text-zinc-500">Реальные заказы магазина. Меняй статус и трек СДЭК.</p>
        </div>
        <button
          type="button"
          onClick={() => list.refetch()}
          className="inline-flex items-center gap-2 rounded-md border border-zinc-200 px-3 py-1.5 text-xs hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-800"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", list.isFetching && "animate-spin")} />
          Обновить
        </button>
      </header>

      <div className="flex flex-wrap gap-1.5 border-b border-zinc-200 px-6 py-3 dark:border-zinc-800">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => {
              setFilter(f.key);
              setPage(1);
            }}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition",
              filter === f.key
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4">
            {list.isLoading ? (
              <div className="flex items-center justify-center py-20 text-zinc-400">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : list.isError ? (
              <div className="rounded-md border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
                Не удалось загрузить заказы.
              </div>
            ) : !list.data?.items.length ? (
              <div className="py-20 text-center text-sm text-zinc-500">Заказов нет</div>
            ) : (
              <OrdersTable
                items={list.data.items}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
            )}
          </div>
          <AdminPager
            page={page}
            pageSize={pageSize}
            total={list.data?.total ?? 0}
            onPageChange={setPage}
            onPageSizeChange={(s) => {
              setPageSize(s);
              setPage(1);
            }}
          />
        </div>

        {selectedId && (
          <OrderDrawer orderId={selectedId} onClose={() => setSelectedId(null)} />
        )}
      </div>
    </div>
  );
}

function OrdersTable({
  items,
  selectedId,
  onSelect,
}: {
  items: ShopOrder[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
      <table className="w-full text-sm">
        <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Создан</th>
            <th className="px-3 py-2 text-left font-medium">Покупатель</th>
            <th className="px-3 py-2 text-left font-medium">Город</th>
            <th className="px-3 py-2 text-right font-medium">Сумма</th>
            <th className="px-3 py-2 text-left font-medium">Статус</th>
            <th className="px-3 py-2 text-left font-medium">Трек</th>
          </tr>
        </thead>
        <tbody>
          {items.map((o) => (
            <tr
              key={o.id}
              onClick={() => onSelect(o.id)}
              className={cn(
                "cursor-pointer border-t border-zinc-100 transition hover:bg-zinc-50 dark:border-zinc-800/60 dark:hover:bg-zinc-900",
                selectedId === o.id && "bg-zinc-100 dark:bg-zinc-800/60",
              )}
            >
              <td className="px-3 py-2.5 text-xs text-zinc-600 dark:text-zinc-400">{fmtDate(o.createdAt)}</td>
              <td className="px-3 py-2.5">
                <div className="font-medium">{o.shipping.fio}</div>
                <div className="text-xs text-zinc-500">{o.shipping.phone}</div>
              </td>
              <td className="px-3 py-2.5 text-xs text-zinc-600 dark:text-zinc-400">{o.shipping.city}</td>
              <td className="px-3 py-2.5 text-right font-mono text-xs font-semibold">{fmtMoney(o.totalRub)}</td>
              <td className="px-3 py-2.5">
                <span className={cn("inline-block rounded-md px-2 py-0.5 text-xs font-medium", STATUS_TONE[o.status])}>
                  {STATUS_LABEL[o.status]}
                </span>
              </td>
              <td className="px-3 py-2.5 font-mono text-xs text-zinc-600 dark:text-zinc-400">
                {o.cdekTrack || "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const NEXT_STATUSES: Record<ShopOrderStatus, ShopOrderStatus[]> = {
  pending_payment: ["paid", "cancelled"],
  paid: ["shipped", "cancelled", "refunded"],
  shipped: ["delivered", "refunded"],
  delivered: ["refunded"],
  cancelled: [],
  refunded: [],
};

function OrderDrawer({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const order = useQuery({
    queryKey: qk.adminOrder(orderId),
    queryFn: () => fetchAdminOrder(orderId),
  });
  const [trackInput, setTrackInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const patch = useMutation({
    mutationFn: (input: { status?: ShopOrderStatus; cdekTrack?: string | null }) =>
      patchAdminOrder(orderId, input),
    onSuccess: () => {
      setError(null);
      qc.invalidateQueries({ queryKey: qk.adminOrder(orderId) });
      qc.invalidateQueries({ queryKey: ["admin", "orders"] });
    },
    onError: (e) => {
      setError(e instanceof ApiError ? e.message : "Не удалось обновить заказ");
    },
  });

  return (
    <aside className="flex w-full max-w-md shrink-0 flex-col border-l border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <header className="flex items-center justify-between border-b border-zinc-200 px-5 py-3 dark:border-zinc-800">
        <div className="text-sm font-semibold">Заказ</div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      {order.isLoading ? (
        <div className="flex flex-1 items-center justify-center text-zinc-400">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : order.isError || !order.data ? (
        <div className="p-5 text-sm text-rose-500">Не удалось загрузить</div>
      ) : (
        <div className="flex-1 space-y-5 overflow-y-auto p-5 text-sm">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">ID</div>
            <div className="mt-0.5 font-mono text-xs">{order.data.id}</div>
            <div className="mt-1 text-xs text-zinc-500">Создан: {fmtDate(order.data.createdAt)}</div>
            <span
              className={cn(
                "mt-2 inline-block rounded-md px-2 py-0.5 text-xs font-medium",
                STATUS_TONE[order.data.status],
              )}
            >
              {STATUS_LABEL[order.data.status]}
            </span>
          </div>

          <Section title="Покупатель">
            <Row icon={UserIcon}>{order.data.shipping.fio}</Row>
            <Row icon={Phone}>{order.data.shipping.phone}</Row>
            <Row icon={MapPin}>
              {order.data.shipping.city}, {order.data.shipping.address}
              {order.data.shipping.postalCode ? `, ${order.data.shipping.postalCode}` : ""}
            </Row>
            {order.data.comment ? (
              <div className="mt-2 rounded-md bg-zinc-50 p-2 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                «{order.data.comment}»
              </div>
            ) : null}
          </Section>

          <Section title="Состав">
            <ul className="space-y-2">
              {order.data.items.map((it) => (
                <li
                  key={it.id}
                  className="flex items-start justify-between gap-3 rounded-md border border-zinc-100 p-2 dark:border-zinc-800"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">{it.titleSnapshot}</div>
                    <div className="text-xs text-zinc-500">
                      {it.qty} × {fmtMoney(it.priceRubSnapshot)}
                      {it.bonusTicketsSnapshot > 0 && ` · +${it.bonusTicketsSnapshot}🎫 за шт.`}
                    </div>
                  </div>
                  <div className="shrink-0 font-mono text-xs font-semibold">
                    {fmtMoney(it.priceRubSnapshot * it.qty)}
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex justify-between border-t border-zinc-100 pt-2 text-sm font-semibold dark:border-zinc-800">
              <span>Итого</span>
              <span className="font-mono">{fmtMoney(order.data.totalRub)}</span>
            </div>
            {order.data.bonusTicketsTotal > 0 && (
              <div className="mt-1 text-right text-xs text-zinc-500">
                Бонус: {order.data.bonusTicketsTotal} 🎫
              </div>
            )}
          </Section>

          <Section title="Трек СДЭК">
            <div className="flex gap-2">
              <input
                type="text"
                value={trackInput || order.data.cdekTrack || ""}
                onChange={(e) => setTrackInput(e.target.value)}
                placeholder="10000000000"
                className="w-full rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              />
              <button
                type="button"
                disabled={patch.isPending}
                onClick={() => patch.mutate({ cdekTrack: (trackInput || order.data!.cdekTrack || "").trim() || null })}
                className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50 dark:bg-white dark:text-zinc-900"
              >
                Сохранить
              </button>
            </div>
          </Section>

          <Section title="Сменить статус">
            <div className="flex flex-wrap gap-1.5">
              {NEXT_STATUSES[order.data.status].length === 0 ? (
                <span className="text-xs text-zinc-500">Финальный статус</span>
              ) : (
                NEXT_STATUSES[order.data.status].map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={patch.isPending}
                    onClick={() => patch.mutate({ status: s })}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-xs font-medium transition disabled:opacity-50",
                      STATUS_TONE[s],
                      "hover:opacity-80",
                    )}
                  >
                    → {STATUS_LABEL[s]}
                  </button>
                ))
              )}
            </div>
            {error && <div className="mt-2 text-xs text-rose-500">{error}</div>}
          </Section>

          {order.data.paidAt && (
            <div className="text-xs text-zinc-500">Оплачен: {fmtDate(order.data.paidAt)}</div>
          )}
          {order.data.shippedAt && (
            <div className="text-xs text-zinc-500">Отправлен: {fmtDate(order.data.shippedAt)}</div>
          )}
        </div>
      )}
    </aside>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 font-mono text-[10px] uppercase tracking-wider text-zinc-500">{title}</div>
      {children}
    </div>
  );
}

function Row({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 py-0.5 text-sm">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-400" />
      <span>{children}</span>
    </div>
  );
}
