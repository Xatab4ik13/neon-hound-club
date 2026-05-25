// Страница возврата после неудачной оплаты в Т-Банке.

import { createFileRoute, Link } from "@tanstack/react-router";
import { XCircle } from "lucide-react";

export const Route = createFileRoute("/pay/fail")({
  head: () => ({
    meta: [
      { title: "Оплата не прошла — HELLHOUND" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PayFailPage,
});

function PayFailPage() {
  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-md flex-col items-center justify-center px-4 py-16 text-center">
      <XCircle className="h-14 w-14 text-destructive" />
      <h1 className="mt-6 font-display text-3xl font-black uppercase italic">
        Платёж отменён
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Банк не списал деньги. Можно попробовать снова — заказ/заявка ждут оплаты.
      </p>
      <div className="mt-8 flex gap-3">
        <Link
          to="/club"
          className="inline-flex items-center gap-2 bg-primary px-5 py-3 font-display text-xs font-black uppercase tracking-widest text-primary-foreground"
        >
          В клуб
        </Link>
        <Link
          to="/club/orders"
          className="inline-flex items-center gap-2 border border-white/10 bg-white/[0.03] px-5 py-3 font-display text-xs font-black uppercase tracking-widest text-foreground"
        >
          Мои заказы
        </Link>
      </div>
    </main>
  );
}
