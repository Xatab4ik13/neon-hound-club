// Страница возврата после оплаты в Т-Банке (success-redirect).
// Поллим наш бэк по paymentId — источник правды о статусе именно наш webhook,
// а не query-параметры от банка (их можно подделать).

import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, Loader2, Ticket } from "lucide-react";
import { z } from "zod";
import { fetchPaymentStatus, qk, type PaymentStatus } from "@/lib/queries";
import { ApiError } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";

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
  const [status, setStatus] = useState<PaymentStatus | "unknown">("unknown");
  const [refType, setRefType] = useState<"pass" | "order" | null>(null);
  const [error, setError] = useState<string | null>(null);

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
        if (r.status === "confirmed") {
          // Инвалидируем кэши — баланс билетов / pass / заказы могли обновиться.
          qc.invalidateQueries({ queryKey: qk.ticketsBalance });
          qc.invalidateQueries({ queryKey: qk.passMe });
          qc.invalidateQueries({ queryKey: qk.shopOrders });
          return;
        }
        if (r.status === "rejected") return;
        // ещё ждём вебхук
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
  }, [paymentId, qc]);

  if (error) {
    return (
      <main className="mx-auto flex min-h-[60vh] w-full max-w-md flex-col items-center justify-center px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-black uppercase italic">Ошибка</h1>
        <p className="mt-3 font-mono text-xs text-muted-foreground">{error}</p>
        <Link
          to="/club"
          className="mt-6 inline-block font-mono text-xs uppercase tracking-widest text-primary hover:underline"
        >
          ← в клуб
        </Link>
      </main>
    );
  }

  if (status === "confirmed") {
    return (
      <main className="mx-auto flex min-h-[60vh] w-full max-w-md flex-col items-center justify-center px-4 py-16 text-center">
        <CheckCircle2 className="h-14 w-14 text-primary" />
        <h1 className="mt-6 font-display text-3xl font-black uppercase italic">
          Оплата прошла
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {refType === "pass"
            ? "Hell Pass активирован, билеты уже на балансе."
            : "Заказ принят в работу. Письмо с подтверждением придёт на почту."}
        </p>
        <div className="mt-8 flex gap-3">
          <Link
            to={refType === "pass" ? "/club" : "/club/orders"}
            className="inline-flex items-center gap-2 bg-primary px-5 py-3 font-display text-xs font-black uppercase tracking-widest text-primary-foreground"
          >
            {refType === "pass" ? <Ticket className="h-4 w-4" /> : null}
            {refType === "pass" ? "В клуб" : "Мои заказы"}
          </Link>
        </div>
      </main>
    );
  }

  if (status === "rejected") {
    return (
      <main className="mx-auto flex min-h-[60vh] w-full max-w-md flex-col items-center justify-center px-4 py-16 text-center">
        <h1 className="font-display text-3xl font-black uppercase italic">Платёж не прошёл</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Банк не подтвердил оплату. Попробуй ещё раз или другую карту.
        </p>
        <button
          type="button"
          onClick={() => navigate({ to: "/club" })}
          className="mt-6 inline-block font-mono text-xs uppercase tracking-widest text-primary hover:underline"
        >
          ← в клуб
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-md flex-col items-center justify-center px-4 py-16 text-center">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <h1 className="mt-6 font-display text-xl font-black uppercase italic">
        Ждём подтверждение банка…
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Обычно занимает несколько секунд. Не закрывай эту страницу.
      </p>
    </main>
  );
}
