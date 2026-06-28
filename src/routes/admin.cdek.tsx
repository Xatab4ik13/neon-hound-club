import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, RefreshCw } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { fetchAdminOrders, type ShopOrder } from "@/lib/queries";

export const Route = createFileRoute("/admin/cdek")({
  head: () => ({
    meta: [{ title: "СДЭК — Админ" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: AdminCdekPage,
});

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type Filter = "all" | "active" | "no_waybill";

function AdminCdekPage() {
  const [filter, setFilter] = useState<Filter>("active");

  // Берём оплаченные/отправленные/полученные — кандидаты на накладные.
  const paid = useQuery({
    queryKey: ["admin", "orders", "cdek", "paid"],
    queryFn: () => fetchAdminOrders("paid", { page: 1, pageSize: 200 }),
    refetchInterval: 60_000,
  });
  const shipped = useQuery({
    queryKey: ["admin", "orders", "cdek", "shipped"],
    queryFn: () => fetchAdminOrders("shipped", { page: 1, pageSize: 200 }),
    refetchInterval: 60_000,
  });
  const delivered = useQuery({
    queryKey: ["admin", "orders", "cdek", "delivered"],
    queryFn: () => fetchAdminOrders("delivered", { page: 1, pageSize: 200 }),
    refetchInterval: 60_000,
  });

  const isLoading = paid.isLoading || shipped.isLoading || delivered.isLoading;
  const isFetching = paid.isFetching || shipped.isFetching || delivered.isFetching;

  const all: ShopOrder[] = useMemo(() => {
    const items = [
      ...(paid.data?.items ?? []),
      ...(shipped.data?.items ?? []),
      ...(delivered.data?.items ?? []),
    ];
    items.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    return items;
  }, [paid.data, shipped.data, delivered.data]);

  const filtered = all.filter((o) => {
    if (filter === "active") return !!o.cdekUuid && o.status !== "delivered";
    if (filter === "no_waybill") return !o.cdekUuid;
    return true;
  });

  function refetchAll() {
    paid.refetch();
    shipped.refetch();
    delivered.refetch();
  }

  return (
    <div className="flex h-full w-full flex-col">
      <header className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
        <div>
          <h1 className="text-xl font-semibold">СДЭК — накладные</h1>
          <p className="text-xs text-zinc-500">
            Все заказы со статусом «Оплачен» и выше. Создание и обновление статуса — в карточке заказа.
          </p>
        </div>
        <button
          type="button"
          onClick={refetchAll}
          className="inline-flex items-center gap-2 rounded-md border border-zinc-200 px-3 py-1.5 text-xs hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-800"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
          Обновить
        </button>
      </header>

      <div className="flex flex-wrap gap-1.5 border-b border-zinc-200 px-6 py-3 dark:border-zinc-800">
        {(
          [
            ["active", "В пути"],
            ["no_waybill", "Без накладной"],
            ["all", "Все"],
          ] as [Filter, string][]
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setFilter(k)}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition",
              filter === k
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-zinc-400">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-sm text-zinc-500">Накладных нет</div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Создан</th>
                  <th className="px-3 py-2 text-left font-medium">Получатель</th>
                  <th className="px-3 py-2 text-left font-medium">Город</th>
                  <th className="px-3 py-2 text-left font-medium">Трек</th>
                  <th className="px-3 py-2 text-left font-medium">Статус СДЭК</th>
                  <th className="px-3 py-2 text-left font-medium">Обновлено</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => (
                  <tr
                    key={o.id}
                    className="border-t border-zinc-100 transition hover:bg-zinc-50 dark:border-zinc-800/60 dark:hover:bg-zinc-900"
                  >
                    <td className="px-3 py-2.5 text-xs text-zinc-600 dark:text-zinc-400">{fmtDate(o.createdAt)}</td>
                    <td className="px-3 py-2.5">
                      <Link
                        to="/admin/orders"
                        className="font-medium text-zinc-900 hover:underline dark:text-zinc-100"
                      >
                        {o.shipping.fio}
                      </Link>
                      <div className="text-xs text-zinc-500">{o.shipping.phone}</div>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-zinc-600 dark:text-zinc-400">{o.shipping.city}</td>
                    <td className="px-3 py-2.5 font-mono text-xs">
                      {o.cdekTrack || <span className="text-zinc-400">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-xs">
                      {o.cdekStatusName || o.cdekStatusCode || (
                        <span className="text-zinc-400">нет накладной</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-zinc-500">
                      {o.cdekStatusAt ? fmtDate(o.cdekStatusAt) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
