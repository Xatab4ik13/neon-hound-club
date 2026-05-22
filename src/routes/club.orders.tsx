import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Package, ShoppingBag } from "lucide-react";
import { PageHeader } from "@/components/club/PageHeader";
import { fetchMyOrders, qk, type ShopOrder, type ShopOrderStatus } from "@/lib/queries";

export const Route = createFileRoute("/club/orders")({
  head: () => ({
    meta: [
      { title: "Заказы — клуб HELLHOUND" },
      { name: "description", content: "Мои заказы." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OrdersPage,
});

type Filter = "all" | "active" | "done";

const STATUS_LABEL: Record<ShopOrderStatus, string> = {
  pending_payment: "Ожидает оплаты",
  paid: "Оплачен",
  shipped: "В пути",
  delivered: "Доставлен",
  cancelled: "Отменён",
  refunded: "Возврат",
};

const STATUS_TONE: Record<ShopOrderStatus, string> = {
  pending_payment: "border-red-500/40 bg-red-500/10 text-red-300",
  paid: "border-primary/40 bg-primary/10 text-primary",
  shipped: "border-primary/40 bg-primary/10 text-primary",
  delivered: "border-white/[0.08] bg-white/[0.03] text-muted-foreground",
  cancelled: "border-white/[0.08] bg-white/[0.03] text-muted-foreground",
  refunded: "border-amber-500/40 bg-amber-500/10 text-amber-300",
};

const ACTIVE: ShopOrderStatus[] = ["pending_payment", "paid", "shipped"];
const DONE: ShopOrderStatus[] = ["delivered", "cancelled", "refunded"];

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function OrdersPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: qk.shopOrders,
    queryFn: fetchMyOrders,
  });

  const items = data?.items ?? [];

  const filtered = useMemo(() => {
    if (filter === "active") return items.filter((o) => ACTIVE.includes(o.status));
    if (filter === "done") return items.filter((o) => DONE.includes(o.status));
    return items;
  }, [filter, items]);

  return (
    <main
      className="mx-auto w-full max-w-3xl px-4 py-5 md:py-8"
      style={{ paddingBottom: "calc(40px + env(safe-area-inset-bottom))" }}
    >
      <PageHeader title="Заказы" subtitle={isLoading ? "Загрузка…" : `Всего: ${items.length}`} />

      <div className="mb-4 inline-flex w-full rounded-xl bg-white/[0.04] p-1">
        <SegBtn active={filter === "all"} onClick={() => setFilter("all")}>Все</SegBtn>
        <SegBtn active={filter === "active"} onClick={() => setFilter("active")}>Активные</SegBtn>
        <SegBtn active={filter === "done"} onClick={() => setFilter("done")}>Доставлены</SegBtn>
      </div>

      {isLoading ? (
        <ul className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <li key={i} className="h-20 animate-pulse rounded-2xl border border-white/[0.05] bg-white/[0.03]" />
          ))}
        </ul>
      ) : isError ? (
        <div className="grid place-items-center rounded-2xl border border-dashed border-red-500/30 bg-red-500/[0.04] px-6 py-12 text-center">
          <div className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-red-300">
            Ошибка
          </div>
          <p className="mt-2 max-w-[34ch] text-sm text-muted-foreground/80">
            {(error as Error)?.message ?? "Не получилось загрузить"}
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-4 rounded-xl border border-white/[0.1] px-5 py-2.5 font-mono text-[11px] font-bold uppercase tracking-wider active:scale-95"
          >
            Повторить
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="space-y-3">
          {filtered.map((o) => (
            <OrderCard key={o.id} order={o} />
          ))}
        </ul>
      )}
    </main>
  );
}

function OrderCard({ order }: { order: ShopOrder }) {
  const shortId = order.id.slice(0, 8).toUpperCase();
  return (
    <li className="overflow-hidden rounded-2xl border border-white/[0.06] bg-card/40">
      <div className="flex items-start gap-3 px-4 py-3.5">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <Package className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-semibold leading-tight text-foreground">
            Заказ #{shortId}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {formatDate(order.createdAt)}
            </span>
            <span
              className={`rounded-full border px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider ${STATUS_TONE[order.status]}`}
            >
              {STATUS_LABEL[order.status]}
            </span>
            {order.bonusTicketsTotal > 0 && order.status === "paid" && (
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-primary">
                +{order.bonusTicketsTotal} 🎟
              </span>
            )}
          </div>
          {order.cdekTrack && (
            <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              СДЭК: {order.cdekTrack}
            </div>
          )}
        </div>
        <div className="shrink-0 text-right">
          <div className="font-mono text-[14px] font-bold tabular-nums text-foreground">
            {order.totalRub.toLocaleString("ru-RU")} ₽
          </div>
        </div>
      </div>
    </li>
  );
}

function EmptyState() {
  return (
    <div className="grid place-items-center rounded-2xl border border-dashed border-white/[0.08] bg-card/30 px-6 py-12 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
        <Package className="h-5 w-5" />
      </div>
      <p className="mt-3 max-w-[28ch] text-[13px] text-muted-foreground">
        Здесь пока пусто. Загляни в магазин клуба.
      </p>
      <Link
        to="/club/shop"
        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 font-mono text-[12px] font-bold uppercase tracking-wider text-primary-foreground active:scale-95"
      >
        <ShoppingBag className="h-4 w-4" />В магазин
      </Link>
    </div>
  );
}

function SegBtn({
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
      className={`flex-1 rounded-lg px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wider transition-colors ${
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground active:bg-white/[0.04]"
      }`}
    >
      {children}
    </button>
  );
}
