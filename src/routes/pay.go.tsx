// Промежуточная страница для PWA-оплаты.
// Backend вернул { paymentUrl } JSON-ответом, мы пришли сюда с ?u=<encoded>.
// Большая кнопка-ссылка — единственный способ открыть cross-origin банк из
// iOS standalone PWA: top-level <a href> система отдаёт в обычный Safari.
//
// fetch/XHR/location.replace для cross-origin в PWA либо игнорируются, либо
// открываются в шторке SFSafariViewController, которая закрывается на любом
// редиректе с банка → юзер видит белый экран.

import { useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, ShieldCheck } from "@/components/ui/icons";
import { z } from "zod";

const searchSchema = z.object({
  u: z.string().min(8),
  p: z.string().uuid().optional(),
});

export const Route = createFileRoute("/pay/go")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Открой оплату — HELLHOUND" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PayGoPage,
});

function PayGoPage() {
  const { u, p: paymentId } = Route.useSearch();

  // Безопасно декодируем URL банка.
  let paymentUrl = "";
  try {
    paymentUrl = decodeURIComponent(u);
  } catch {
    paymentUrl = "";
  }

  // Доп. страховка — если открыто НЕ в PWA, можем сразу уйти на банк
  // (там обычный браузер, cross-origin navigate проходит без проблем).
  useEffect(() => {
    if (!paymentUrl) return;
    const isStandalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (!isStandalone) {
      window.location.replace(paymentUrl);
    }
  }, [paymentUrl]);

  if (!paymentUrl) {
    return (
      <main className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col items-center justify-center px-6 text-center">
        <h1 className="font-display text-2xl font-black uppercase italic tracking-wider">
          Ссылка устарела
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Открой страницу заказа ещё раз и нажми «Оплатить».
        </p>
        <Link
          to="/club/orders"
          className="mt-6 rounded-2xl border border-white/[0.08] bg-card/40 px-6 py-3 font-mono text-[11px] font-bold uppercase tracking-[0.2em]"
        >
          Мои заказы
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col items-center justify-center px-6 pb-[calc(48px+env(safe-area-inset-bottom))] pt-[calc(48px+env(safe-area-inset-top))] text-center">
      <span className="grid h-16 w-16 place-items-center rounded-full bg-primary/10 text-primary">
        <ShieldCheck className="h-7 w-7" />
      </span>

      <h1 className="mt-6 font-display text-2xl font-black uppercase italic tracking-wider">
        Открой оплату
      </h1>
      <p className="mt-2 max-w-xs text-[14px] leading-relaxed text-muted-foreground">
        Откроется страница банка в&nbsp;Safari. После оплаты вернись в&nbsp;приложение —
        статус заказа обновится автоматически.
      </p>

      {/* Чисто <a> — никакого JS-редиректа: iOS PWA только так отдаёт ссылку в системный Safari */}
      <a
        href={paymentUrl}
        rel="noopener noreferrer"
        className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-display text-sm font-black uppercase italic tracking-widest text-primary-foreground active:scale-[0.99]"
      >
        Открыть оплату
        <ArrowUpRight className="h-4 w-4" />
      </a>

      <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        Защищённое соединение · T-Банк
      </p>

      <div className="mt-10 flex flex-col items-center gap-2">
        {paymentId ? (
          <Link
            to="/pay/success"
            search={{ p: paymentId }}
            className="text-[12px] text-muted-foreground underline-offset-2 hover:underline"
          >
            Я уже оплатил — проверить статус
          </Link>
        ) : null}
        <Link
          to="/club/orders"
          className="text-[12px] text-muted-foreground underline-offset-2 hover:underline"
        >
          Вернуться к заказам
        </Link>
      </div>
    </main>
  );
}
