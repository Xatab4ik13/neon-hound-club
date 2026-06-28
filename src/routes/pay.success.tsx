// Страница возврата после оплаты в Т-Банке.
// Поллим бэк по paymentId — источник правды наш webhook, а не query от банка.

import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, Loader2, Ticket, XCircle, AlertTriangle, Package } from "@/components/ui/icons";
import { z } from "zod";
import { fetchPaymentStatus, qk, type PaymentStatus } from "@/lib/queries";
import { ApiError } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { useCart } from "@/hooks/use-cart";

const searchSchema = z.object({
  p: z.string().uuid().optional(),
});

export const Route = createFileRoute("/pay/success")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Оплата прошла — HELLHOUND" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PaySuccessPage,
});

function PaySuccessPage() {
  const { p: paymentId } = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { clear: clearCart } = useCart();
  const [status, setStatus] = useState<PaymentStatus | "unknown">("unknown");
  const [refType, setRefType] = useState<"pass" | "order" | null>(null);
  const [refId, setRefId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cartClearedRef = useRef(false);

  useEffect(() => {
    if (!paymentId) {
      setError("Не указан идентификатор платежа");
      return;
    }
    let cancelled = false;
    let attempts = 0;
    const tick = async () => {
      if (cancelled) return;
      attempts += 1;
      try {
        const r = await fetchPaymentStatus(paymentId);
        if (cancelled) return;
        setStatus(r.status);
        setRefType(r.refType);
        setRefId(r.refId);
        if (r.status === "confirmed") {
          qc.invalidateQueries({ queryKey: qk.ticketsBalance });
          qc.invalidateQueries({ queryKey: qk.passMe });
          qc.invalidateQueries({ queryKey: qk.shopOrders });
          if (r.refType === "order" && !cartClearedRef.current) {
            cartClearedRef.current = true;
            clearCart();
          }
          return;
        }
        if (r.status === "rejected") return;
        if (attempts < 20) setTimeout(tick, 1500);
      } catch (e) {
        const msg = e instanceof ApiError ? e.message : "Не удалось проверить статус";
        setError(msg);
      }
    };
    void tick();
    return () => {
      cancelled = true;
    };
  }, [paymentId, qc, clearCart]);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center px-5 py-16 text-center">
        {error ? (
          <ErrorState message={error} />
        ) : status === "confirmed" ? (
          <ConfirmedState refType={refType} refId={refId} />
        ) : status === "rejected" ? (
          <RejectedState onBack={() => navigate({ to: "/club" })} />
        ) : (
          <WaitingState />
        )}
      </div>
    </main>
  );
}

function WaitingState() {
  return (
    <>
      <div className="flex h-20 w-20 items-center justify-center rounded-full border border-border/60 bg-card">
        <Loader2 className="h-9 w-9 animate-spin text-primary" />
      </div>
      <h1 className="mt-8 font-display text-3xl font-black uppercase italic leading-none">
        Ждём банк
      </h1>
      <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
        Подтверждение обычно занимает 5–15 секунд
      </p>
      <p className="mt-3 text-sm text-muted-foreground">
        Не закрывай страницу — статус обновится автоматически.
      </p>
    </>
  );
}

function ConfirmedState({
  refType,
  refId,
}: {
  refType: "pass" | "order" | null;
  refId: string | null;
}) {
  const isPass = refType === "pass";
  return (
    <>
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <CheckCircle2 className="h-10 w-10" />
      </div>
      <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.25em] text-primary">
        Успешно
      </p>
      <h1 className="mt-3 font-display text-4xl font-black uppercase italic leading-none">
        {isPass ? "Hell Pass активирован" : "Заказ оплачен"}
      </h1>
      <p className="mt-4 text-sm text-muted-foreground">
        {isPass
          ? "Билеты уже на балансе, доступ к клубу открыт на 30 дней."
          : "Мы получили оплату. Дальше — собираем и отправляем."}
      </p>

      <div className="mt-10 flex w-full flex-col gap-3">
        {isPass ? (
          <Link
            to="/club"
            className="inline-flex items-center justify-center gap-2 bg-primary px-5 py-4 font-display text-xs font-black uppercase tracking-widest text-primary-foreground transition hover:opacity-90"
          >
            <Ticket className="h-4 w-4" />
            В клуб
          </Link>
        ) : refId ? (
          <Link
            to="/club/orders/$orderId"
            params={{ orderId: refId }}
            className="inline-flex items-center justify-center gap-2 bg-primary px-5 py-4 font-display text-xs font-black uppercase tracking-widest text-primary-foreground transition hover:opacity-90"
          >
            <Package className="h-4 w-4" />
            К заказу
          </Link>
        ) : (
          <Link
            to="/club/orders"
            className="inline-flex items-center justify-center gap-2 bg-primary px-5 py-4 font-display text-xs font-black uppercase tracking-widest text-primary-foreground transition hover:opacity-90"
          >
            <Package className="h-4 w-4" />
            Мои заказы
          </Link>
        )}
        <Link
          to="/club"
          className="inline-flex items-center justify-center px-5 py-3 font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground transition hover:text-foreground"
        >
          ← в клуб
        </Link>
      </div>
    </>
  );
}

function RejectedState({ onBack }: { onBack: () => void }) {
  return (
    <>
      <div className="flex h-20 w-20 items-center justify-center rounded-full border border-destructive/40 bg-destructive/10 text-destructive">
        <XCircle className="h-10 w-10" />
      </div>
      <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.25em] text-destructive">
        Отклонено
      </p>
      <h1 className="mt-3 font-display text-4xl font-black uppercase italic leading-none">
        Платёж не прошёл
      </h1>
      <p className="mt-4 text-sm text-muted-foreground">
        Банк не подтвердил оплату. Попробуй ещё раз или другую карту — заказ ждёт оплату 2 часа.
      </p>
      <div className="mt-10 flex w-full flex-col gap-3">
        <Link
          to="/club/orders"
          className="inline-flex items-center justify-center gap-2 bg-primary px-5 py-4 font-display text-xs font-black uppercase tracking-widest text-primary-foreground transition hover:opacity-90"
        >
          <Package className="h-4 w-4" />
          Мои заказы
        </Link>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center justify-center px-5 py-3 font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground transition hover:text-foreground"
        >
          ← в клуб
        </button>
      </div>
    </>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <>
      <div className="flex h-20 w-20 items-center justify-center rounded-full border border-border/60 bg-card text-muted-foreground">
        <AlertTriangle className="h-9 w-9" />
      </div>
      <h1 className="mt-8 font-display text-3xl font-black uppercase italic leading-none">
        Ошибка
      </h1>
      <p className="mt-4 font-mono text-xs text-muted-foreground">{message}</p>
      <Link
        to="/club"
        className="mt-8 inline-block font-mono text-[11px] uppercase tracking-[0.25em] text-primary hover:underline"
      >
        ← в клуб
      </Link>
    </>
  );
}
