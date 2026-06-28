import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, Package, X } from "@/components/ui/icons";
import { PageHeader } from "@/components/club/PageHeader";
import { apiFetch } from "@/lib/api";
import { fetchMyOrder, qk, type ShopOrderWithItems, type ShopOrderStatus } from "@/lib/queries";
import { payExistingOrderInPwa } from "@/lib/pwa-pay";

export const Route = createFileRoute("/club/orders/$orderId")({
  head: () => ({
    meta: [
      { title: "Заказ — клуб HELLHOUND" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OrderDetailPage,
});

const STATUS_LABEL: Record<ShopOrderStatus, string> = {
  pending_payment: "Ожидает оплаты",
  paid: "Оплачен",
  shipped: "В пути",
  delivered: "Доставлен",
  cancelled: "Отменён",
  refunded: "Возврат",
};

const STATUS_TONE: Record<ShopOrderStatus, string> = {
  pending_payment: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  paid: "border-primary/40 bg-primary/10 text-primary",
  shipped: "border-primary/40 bg-primary/10 text-primary",
  delivered: "border-white/[0.08] bg-white/[0.03] text-muted-foreground",
  cancelled: "border-white/[0.08] bg-white/[0.03] text-muted-foreground",
  refunded: "border-amber-500/40 bg-amber-500/10 text-amber-300",
};

function OrderDetailPage() {
  const { orderId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: qk.shopOrder(orderId),
    queryFn: () => fetchMyOrder(orderId),
    // если pending — поллим каждые 10с (вдруг успели оплатить в другой вкладке)
    refetchInterval: (q) =>
      (q.state.data as ShopOrderWithItems | undefined)?.status === "pending_payment"
        ? 10_000
        : false,
  });

  const cancelMut = useMutation({
    mutationFn: () =>
      apiFetch<{ ok: true }>(`/api/v1/shop/orders/${orderId}/cancel`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.shopOrders });
      qc.invalidateQueries({ queryKey: qk.shopOrder(orderId) });
      navigate({ to: "/club/orders" });
    },
  });

  if (isLoading) {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-8">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
      </main>
    );
  }

  if (isError || !data) {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-12 text-center">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Заказ не найден
        </p>
        <p className="mt-2 text-xs text-muted-foreground/70">
          {(error as Error)?.message ?? ""}
        </p>
        <Link
          to="/club/orders"
          className="mt-6 inline-block font-mono text-[11px] uppercase tracking-widest text-primary"
        >
          ← к заказам
        </Link>
      </main>
    );
  }

  const order = data;
  const shortId = order.id.slice(0, 8).toUpperCase();
  const isPending = order.status === "pending_payment";

  return (
    <main
      className="mx-auto w-full max-w-2xl px-4 py-5 md:py-8"
      style={{ paddingBottom: "calc(40px + env(safe-area-inset-bottom))" }}
    >
      <Link
        to="/club/orders"
        className="mb-3 inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        к заказам
      </Link>

      <PageHeader
        title={`Заказ #${shortId}`}
        subtitle={new Date(order.createdAt).toLocaleString("ru-RU", {
          day: "2-digit",
          month: "long",
          hour: "2-digit",
          minute: "2-digit",
        })}
      />

      {/* Статус + таймер */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full border px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider ${STATUS_TONE[order.status]}`}
        >
          {STATUS_LABEL[order.status]}
        </span>
        {isPending && order.expiresAt && <PaymentCountdown expiresAt={order.expiresAt} />}
      </div>

      {/* Pay CTA для pending */}
      {isPending && (
        <PayBlock orderId={order.id} totalRub={order.totalRub} expiresAt={order.expiresAt} />
      )}

      {/* Состав */}
      <section className="mt-6 overflow-hidden rounded-2xl border border-white/[0.06] bg-card/40">
        <div className="border-b border-white/[0.06] px-4 py-3 font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Состав
        </div>
        <ul className="divide-y divide-white/[0.04]">
          {order.items.map((it) => (
            <li key={it.id} className="flex items-start gap-3 px-4 py-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <Package className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-foreground">{it.titleSnapshot}</div>
                <div className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  × {it.qty}
                </div>
              </div>
              <div className="shrink-0 font-mono text-sm font-bold tabular-nums text-foreground">
                {(it.priceRubSnapshot * it.qty).toLocaleString("ru-RU")} ₽
              </div>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between border-t border-white/[0.06] bg-black/20 px-4 py-3">
          <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Итого
          </span>
          <span className="font-mono text-base font-bold tabular-nums text-foreground">
            {order.totalRub.toLocaleString("ru-RU")} ₽
          </span>
        </div>
      </section>

      {/* Доставка */}
      <section className="mt-5 rounded-2xl border border-white/[0.06] bg-card/40 p-4">
        <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Доставка
        </div>
        <div className="mt-2 space-y-1 text-sm text-foreground">
          <div>{order.shipping.fio}</div>
          <div className="text-muted-foreground">{order.shipping.phone}</div>
          <div className="text-muted-foreground">
            {[order.shipping.postalCode, order.shipping.city, order.shipping.address]
              .filter(Boolean)
              .join(", ")}
          </div>
        </div>
        {order.cdekTrack && (
          <div className="mt-3 font-mono text-[11px] uppercase tracking-wider text-primary">
            СДЭК трек: {order.cdekTrack}
          </div>
        )}
        {order.comment && (
          <div className="mt-3 rounded-lg bg-black/20 p-3 text-xs text-muted-foreground">
            {order.comment}
          </div>
        )}
      </section>

      {/* Отмена для pending */}
      {isPending && (
        <button
          type="button"
          onClick={() => {
            if (window.confirm("Отменить заказ? Билеты и остатки вернутся.")) cancelMut.mutate();
          }}
          disabled={cancelMut.isPending}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.08] py-3 font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground active:scale-[0.99] disabled:opacity-60"
        >
          <X className="h-4 w-4" />
          Отменить заказ
        </button>
      )}
      {cancelMut.isError && (
        <p className="mt-2 text-center font-mono text-[10px] uppercase tracking-wider text-amber-300">
          {(cancelMut.error as Error).message}
        </p>
      )}
    </main>
  );
}

function PayBlock({
  orderId,
  totalRub,
  expiresAt,
}: {
  orderId: string;
  totalRub: number;
  expiresAt: string | null;
}) {
  const expired = expiresAt ? new Date(expiresAt).getTime() - Date.now() <= 0 : false;
  const [busy, setBusy] = useState(false);

  if (expired) {
    return (
      <div className="mt-5 rounded-2xl border border-amber-500/30 bg-amber-500/[0.06] p-4 text-center">
        <p className="font-mono text-[11px] uppercase tracking-widest text-amber-300">
          Время на оплату вышло
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Заказ будет автоматически удалён в течение минуты.
        </p>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        if (busy) return;
        setBusy(true);
        payExistingOrderInPwa(orderId, "card");
      }}
      disabled={busy}
      className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-display text-sm font-black uppercase italic tracking-widest text-primary-foreground active:scale-[0.99] disabled:opacity-60"
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      Оплатить {totalRub.toLocaleString("ru-RU")} ₽
    </button>
  );
}

function PaymentCountdown({ expiresAt }: { expiresAt: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const ms = new Date(expiresAt).getTime() - now;
  if (ms <= 0) {
    return (
      <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-amber-300">
        время вышло
      </span>
    );
  }
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const label =
    h > 0 ? `${h}ч ${String(m).padStart(2, "0")}м` : `${m}:${String(s).padStart(2, "0")}`;
  return (
    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-amber-300">
      оплатить за {label}
    </span>
  );
}
