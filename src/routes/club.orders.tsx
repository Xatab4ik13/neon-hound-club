import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Package, ShoppingBag } from "lucide-react";
import { CdekTracking } from "@/components/club/CdekTracking";
import { ORDERS, type Order } from "@/data/profile";
import { PageHeader } from "@/components/club/PageHeader";

export const Route = createFileRoute("/club/orders")({
  head: () => ({
    meta: [
      { title: "Заказы — клуб HELLHOUND" },
      { name: "description", content: "Мои заказы и трекинг СДЭК." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OrdersPage,
});

type Filter = "all" | "active" | "done";

const STATUS_TONE: Record<Order["status"], string> = {
  "В пути": "border-primary/40 bg-primary/10 text-primary",
  "Доставлено": "border-white/[0.08] bg-white/[0.03] text-muted-foreground",
  "Waitlist": "border-amber-500/40 bg-amber-500/10 text-amber-300",
  "Ожидает оплаты": "border-red-500/40 bg-red-500/10 text-red-300",
};

function OrdersPage() {
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = useMemo(() => {
    if (filter === "active") {
      return ORDERS.filter(
        (o) => o.status === "В пути" || o.status === "Ожидает оплаты" || o.status === "Waitlist",
      );
    }
    if (filter === "done") return ORDERS.filter((o) => o.status === "Доставлено");
    return ORDERS;
  }, [filter]);

  return (
    <main
      className="mx-auto w-full max-w-3xl px-4 py-5 md:py-8"
      style={{ paddingBottom: "calc(40px + env(safe-area-inset-bottom))" }}
    >
      <PageHeader title="Заказы" subtitle={`Всего: ${ORDERS.length}`} />

      {/* iOS segmented filter */}
      <div className="mb-4 inline-flex w-full rounded-xl bg-white/[0.04] p-1">
        <SegBtn active={filter === "all"} onClick={() => setFilter("all")}>
          Все
        </SegBtn>
        <SegBtn active={filter === "active"} onClick={() => setFilter("active")}>
          Активные
        </SegBtn>
        <SegBtn active={filter === "done"} onClick={() => setFilter("done")}>
          Доставлены
        </SegBtn>
      </div>

      {filtered.length === 0 ? (
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
      ) : (
        <ul className="space-y-3">
          {filtered.map((o) => (
            <li
              key={o.id}
              className="overflow-hidden rounded-2xl border border-white/[0.06] bg-card/40"
            >
              <div className="flex items-start gap-3 px-4 py-3.5">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Package className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-semibold leading-tight text-foreground">
                    {o.title}
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      {o.date}
                    </span>
                    <span
                      className={`rounded-full border px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider ${STATUS_TONE[o.status]}`}
                    >
                      {o.status}
                    </span>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="font-mono text-[14px] font-bold tabular-nums text-foreground">
                    {o.price}
                  </div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    #{o.id}
                  </div>
                </div>
              </div>
              <CdekTracking orderId={o.id} />
            </li>
          ))}
        </ul>
      )}
    </main>
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
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground active:bg-white/[0.04]"
      }`}
    >
      {children}
    </button>
  );
}
