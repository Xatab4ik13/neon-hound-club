import { createFileRoute, Link } from "@tanstack/react-router";
import { CdekTracking } from "@/components/club/CdekTracking";
import { ORDERS, type Order } from "@/data/profile";
import { ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/club/PageHeader";

export const Route = createFileRoute("/club/orders")({
  head: () => ({
    meta: [
      { title: "Заказы — клуб HELLHOUND" },
      { name: "description", content: "Мои заказы и трекинг CDEK." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OrdersPage,
});

function OrdersPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 md:px-8 md:py-10">
      <PageHeader title="Заказы" subtitle={`Всего: ${ORDERS.length}`} />

      <div className="mb-4 flex items-baseline justify-end">
        <Link
          to="/shop"
          className="group flex items-center gap-1 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-primary"
        >
          В магазин
          <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      <div className="border border-white/[0.06] bg-card/40">
        <ul className="divide-y divide-white/[0.04]">
          {ORDERS.map((o) => (
            <li key={o.id}>
              <div className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-4 py-4 transition-colors hover:bg-white/[0.02] md:px-5">
                <div className="min-w-0">
                  <div className="truncate text-base text-foreground">{o.title}</div>
                  <div className="mt-1 font-mono text-xs uppercase tracking-wider text-muted-foreground">
                    {o.date}
                  </div>
                </div>
                <div className="font-mono text-base tabular-nums text-foreground">{o.price}</div>
                <OrderStatus status={o.status} />
              </div>
              <CdekTracking orderId={o.id} />
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}

function OrderStatus({ status }: { status: Order["status"] }) {
  const tone: Record<Order["status"], string> = {
    "В пути": "border-primary/50 text-primary",
    "Доставлено": "border-white/[0.1] text-muted-foreground",
    "Waitlist": "border-yellow-500/40 text-yellow-400",
    "Ожидает оплаты": "border-red-500/40 text-red-400",
  };
  return (
    <span
      className={`whitespace-nowrap border px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] ${tone[status]}`}
    >
      {status}
    </span>
  );
}
